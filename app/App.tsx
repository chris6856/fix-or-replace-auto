import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import { configureGoogleSignIn } from './src/auth/socialSignIn';
import { DecisionDraftProvider } from './src/decision/DecisionDraftContext';
import RootNavigator from './src/navigation/RootNavigator';

configureGoogleSignIn();

const queryClient = new QueryClient();

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DecisionDraftProvider>
            <RootNavigator />
          </DecisionDraftProvider>
        </AuthProvider>
      </QueryClientProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
