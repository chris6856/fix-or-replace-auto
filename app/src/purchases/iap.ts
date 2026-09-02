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

/**
 * Runs one purchase end to end: connects to Play Billing, requests the
 * purchase, waits for the result, sends the purchase token to
 * verify-purchase (the only source of truth for "did this actually get
 * paid for" -- never trust the client's own claim), and consumes the
 * product on success so it can be bought again for a future decision.
 */
export async function purchaseProduct(productId: ProductId): Promise<PurchaseResult> {
  let iap: Awaited<ReturnType<typeof loadIAP>>;
  try {
    iap = await loadIAP();
  } catch {
    return { success: false, error: 'In-app purchases are not available in this build.' };
  }

  const { initConnection, endConnection, requestPurchase, purchaseUpdatedListener, purchaseErrorListener, finishTransaction } =
    iap;

  try {
    await initConnection();

    const purchase = await new Promise<{ productId: string; purchaseToken?: string }>((resolve, reject) => {
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

      requestPurchase({ skus: [productId] }).catch((err: unknown) => {
        updateSub.remove();
        errorSub.remove();
        reject(err);
      });
    });

    if (!purchase.purchaseToken) {
      throw new Error('Purchase completed but no purchase token was returned.');
    }

    const { data, error } = await supabase.functions.invoke<{ verified: boolean; error?: string }>(
      'verify-purchase',
      { body: { productId, purchaseToken: purchase.purchaseToken } },
    );

    if (error || !data || !data.verified) {
      return { success: false, error: data?.error ?? error?.message ?? 'Could not verify this purchase.' };
    }

    // Consumable: this unlocks one decision, not the app forever, so it
    // needs to be purchasable again next time.
    await finishTransaction({ purchase: purchase as never, isConsumable: true });

    return { success: true };
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
