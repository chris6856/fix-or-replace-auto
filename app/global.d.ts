// react-native-iap ships raw .ts source (via its package.json's
// "react-native" export condition, which Expo's tsconfig resolves the
// same way Metro does) rather than pre-built declarations, and that
// source references the bare `global` identifier RN apps commonly use
// without importing a type for it. This is a standard ambient shim, not
// specific to that one library -- harmless, type-only, no runtime effect.
declare const global: typeof globalThis;
