import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type ProductId = 'unlock_decision' | 'unlock_full_report';

export const PRODUCT_PRICES: Record<ProductId, string> = {
  unlock_decision: '$0.99',
  unlock_full_report: '$1.99',
};

// react-native-iap resolves its native module at import time, which
// throws immediately in plain Expo Go (same reason as
// @react-native-google-signin/google-signin and the ML Kit OCR module --
// see [[expo-go-native-modules-gotcha]]). Loading it dynamically means
// Expo Go testing of every OTHER feature keeps working; purchasing
// itself genuinely cannot function outside a real signed build talking
// to Play Billing, dynamic import or not.
async function loadIAP() {
  return import('react-native-iap');
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
}

interface PurchaseLike {
  productId: string;
  purchaseToken?: string | null;
}

/**
 * supabase-js's own error.message for a non-2xx Edge Function response is
 * always the generic "Edge Function returned a non-2xx status code" --
 * the actual JSON body (with our specific error text) is on
 * error.context, a Response, and has to be read separately. See the
 * FunctionsHttpError JSDoc example in @supabase/functions-js.
 */
async function extractInvokeErrorMessage(error: unknown): Promise<string | null> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      // response wasn't JSON -- fall through to the generic message
    }
  }
  return error instanceof Error ? error.message : null;
}

async function verifyAndConsume(
  iap: Awaited<ReturnType<typeof loadIAP>>,
  productId: ProductId,
  purchase: PurchaseLike,
): Promise<PurchaseResult> {
  if (!purchase.purchaseToken) {
    return { success: false, error: 'Purchase completed but no purchase token was returned.' };
  }

  const { data, error } = await supabase.functions.invoke<{ verified: boolean; error?: string }>(
    'verify-purchase',
    { body: { productId, purchaseToken: purchase.purchaseToken } },
  );

  if (error || !data || !data.verified) {
    const message = data?.error ?? (await extractInvokeErrorMessage(error)) ?? 'Could not verify this purchase.';
    return { success: false, error: message };
  }

  // Consumable: this unlocks one decision, not the app forever, so it
  // needs to be purchasable again next time.
  await iap.finishTransaction({ purchase: purchase as never, isConsumable: true });

  return { success: true };
}

/**
 * Runs one purchase end to end: connects to Play Billing, requests the
 * purchase, waits for the result, sends the purchase token to
 * verify-purchase (the only source of truth for "did this actually get
 * paid for" -- never trust the client's own claim), and consumes the
 * product on success so it can be bought again for a future decision.
 *
 * If a previous attempt got the purchase from Google but then failed
 * before consuming it (a dropped connection, verify-purchase erroring,
 * app killed mid-flow), Play now considers the product "already owned"
 * and refuses a fresh purchase -- requestPurchase surfaces that as an
 * AlreadyOwned error. Recovered here by looking up that leftover
 * purchase via getAvailablePurchases and running it through the same
 * verify-and-consume path, rather than leaving the user stuck.
 */
export async function purchaseProduct(productId: ProductId): Promise<PurchaseResult> {
  let iap: Awaited<ReturnType<typeof loadIAP>>;
  try {
    iap = await loadIAP();
  } catch {
    return { success: false, error: 'In-app purchases are not available in this build.' };
  }

  const { initConnection, endConnection, requestPurchase, purchaseUpdatedListener, purchaseErrorListener } = iap;

  try {
    await initConnection();

    let purchase: PurchaseLike;
    try {
      purchase = await new Promise<PurchaseLike>((resolve, reject) => {
        const updateSub = purchaseUpdatedListener((event) => {
          if (event.productId !== productId) return;
          updateSub.remove();
          errorSub.remove();
          resolve(event);
        });
        const errorSub = purchaseErrorListener((purchaseError) => {
          updateSub.remove();
          errorSub.remove();
          reject(purchaseError);
        });

        requestPurchase({
          request: { google: { skus: [productId] } },
          type: 'in-app',
        }).catch((err: unknown) => {
          updateSub.remove();
          errorSub.remove();
          reject(err);
        });
      });
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: unknown }).code : null;
      if (code !== 'already-owned') throw err;

      const owned = await iap.getAvailablePurchases();
      const leftover = owned.find((p) => p.productId === productId);
      if (!leftover) {
        return {
          success: false,
          error: 'Google Play says this is already purchased, but no pending purchase could be found to recover.',
        };
      }
      purchase = leftover;
    }

    return await verifyAndConsume(iap, productId, purchase);
  } catch (err) {
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Purchase was not completed.';
    // A user backing out of the Play Billing sheet surfaces as an error
    // here too -- treat it the same as any other non-completion rather
    // than showing an alarming message for a plain cancellation.
    return { success: false, error: message };
  } finally {
    try {
      await endConnection();
    } catch {
      // best-effort cleanup only
    }
  }
}
