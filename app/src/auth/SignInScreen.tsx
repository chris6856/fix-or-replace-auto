import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from './AuthContext';
import { isAppleSignInAvailable, isGoogleSignInConfigured, signInWithApple, signInWithGoogle } from './socialSignIn';

type Mode = 'signIn' | 'signUp';

export default function SignInScreen() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<Mode>('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  async function handleEmailSubmit() {
    setError(null);
    setIsSubmitting(true);
    if (mode === 'signUp') {
      const result = await signUpWithEmail(email, password);
      setIsSubmitting(false);
      if (result.error) setError(result.error);
      else if (result.needsEmailConfirmation) setConfirmationSentTo(email);
    } else {
      const result = await signInWithEmail(email, password);
      setIsSubmitting(false);
      if (result.error) setError(result.error);
    }
  }

  async function handleApple() {
    setError(null);
    const result = await signInWithApple();
    if (result.error) setError(result.error);
  }

  async function handleGoogle() {
    setError(null);
    const result = await signInWithGoogle();
    if (result.error) setError(result.error);
  }

  if (confirmationSentTo) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.confirmationText}>
          We sent a confirmation link to {confirmationSentTo}. Tap it, then come back here and sign in.
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            setConfirmationSentTo(null);
            setMode('signIn');
          }}
        >
          <Text style={styles.primaryButtonText}>BACK TO SIGN IN</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/welcome-background.jpg')}
      style={styles.container}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <Pressable onPress={() => setMode(mode === 'signUp' ? 'signIn' : 'signUp')}>
        <Text style={styles.switchModeTextTop}>
          {mode === 'signUp' ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
        </Text>
      </Pressable>

      <Image source={require('../../assets/icon.png')} style={styles.icon} />

      <Text style={styles.title}>{mode === 'signUp' ? 'Create Your Account' : 'Welcome Back'}</Text>

      {appleAvailable && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={8}
          style={styles.appleButton}
          onPress={handleApple}
        />
      )}

      {isGoogleSignInConfigured && (
        <Pressable style={styles.socialButton} onPress={handleGoogle}>
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </Pressable>
      )}

      {(appleAvailable || isGoogleSignInConfigured) && <Text style={styles.orText}>or</Text>}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.primaryButton} onPress={handleEmailSubmit} disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>{mode === 'signUp' ? 'CREATE ACCOUNT' : 'SIGN IN'}</Text>
        )}
      </Pressable>

      <Text style={styles.disclaimer}>Your vehicles and repair decisions will be saved securely to your account.</Text>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  // Faded well below full opacity, matching the Welcome screen, so the
  // photo reads as mood/texture behind the form rather than content.
  backgroundImage: { opacity: 0.26 },
  switchModeTextTop: { textAlign: 'center', color: '#666', marginBottom: 16 },
  icon: { width: 72, height: 72, borderRadius: 16, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  confirmationText: { fontSize: 15, color: '#444', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  appleButton: { width: '100%', height: 48, marginBottom: 12 },
  socialButton: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  socialButtonText: { fontSize: 16, fontWeight: '600' },
  orText: { textAlign: 'center', color: '#888', marginVertical: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: '#111',
    borderRadius: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: '#c62828', marginBottom: 8, textAlign: 'center' },
  disclaimer: { textAlign: 'center', color: '#888', fontSize: 12, marginTop: 24 },
});
