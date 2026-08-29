import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { supabase } from '../lib/supabase';

interface AuthResult {
  error: string | null;
}

export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
export const isGoogleSignInConfigured = Boolean(googleWebClientId);

/** Call once at app startup, before any Google sign-in button can be pressed. */
export function configureGoogleSignIn(): void {
  if (googleWebClientId) {
    GoogleSignin.configure({ webClientId: googleWebClientId });
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
