import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../lib/supabase';

interface AuthResult {
  error: string | null;
}

export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
export const isGoogleSignInConfigured = Boolean(googleWebClientId);

// @react-native-google-signin/google-signin resolves its native module the
// moment it's evaluated (TurboModuleRegistry.getEnforcing at module scope),
// which throws immediately in plain Expo Go -- it isn't part of Expo's SDK,
// so Expo Go's binary doesn't include it. Loading it dynamically, only when
// a Google sign-in action actually happens, means Expo Go users (and
// anyone before real Google credentials are configured, since the button
// is gated behind isGoogleSignInConfigured) never trigger that import at
// all, and a real dev-client build without the module still fails
// gracefully inside the try/catch below instead of crashing app startup.
async function loadGoogleSignIn() {
  return import('@react-native-google-signin/google-signin');
}

/** Call once at app startup, before any Google sign-in button can be pressed. */
export async function configureGoogleSignIn(): Promise<void> {
  if (!googleWebClientId) return;
  try {
    const { GoogleSignin } = await loadGoogleSignIn();
    GoogleSignin.configure({ webClientId: googleWebClientId });
  } catch {
    // No native Google Sign-In module available (e.g. running in Expo Go) --
    // the button stays hidden behind isGoogleSignInConfigured regardless.
  }
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple(): Promise<AuthResult> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { error: 'Apple sign-in did not return an identity token.' };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    return { error: error?.message ?? null };
  } catch (err) {
    if (isUserCancellation(err)) return { error: null };
    return { error: err instanceof Error ? err.message : 'Apple sign-in failed.' };
  }
}

export async function signInWithGoogle(): Promise<AuthResult> {
  if (!isGoogleSignInConfigured) {
    return { error: 'Google sign-in is not configured yet.' };
  }

  let googleSignIn: Awaited<ReturnType<typeof loadGoogleSignIn>>;
  try {
    googleSignIn = await loadGoogleSignIn();
  } catch {
    return { error: 'Google sign-in is not available in this build.' };
  }

  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = googleSignIn;

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response) || !response.data.idToken) {
      return { error: null }; // user canceled or Google didn't return an ID token
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: response.data.idToken,
    });

    return { error: error?.message ?? null };
  } catch (err) {
    if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
      return { error: null };
    }
    return { error: err instanceof Error ? err.message : 'Google sign-in failed.' };
  }
}

function isUserCancellation(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && 'code' in err && err.code === 'ERR_REQUEST_CANCELED');
}
