import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList, UnlockedTier } from '../navigation/RootNavigator';
import { purchaseProduct, PRODUCT_PRICES, type ProductId } from '../purchases/iap';

type Props = NativeStackScreenProps<AppStackParamList, 'Paywall'>;

export default function PaywallScreen({ route, navigation }: Props) {
  const { result, upgradeOnly } = route.params;
  const [purchasing, setPurchasing] = useState<ProductId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePurchase(productId: ProductId) {
    setPurchasing(productId);
    setError(null);

    const outcome = await purchaseProduct(productId);

    setPurchasing(null);
    if (!outcome.success) {
      setError(outcome.error ?? 'Purchase was not completed.');
      return;
    }

    const unlockedTier: UnlockedTier = productId === 'unlock_full_report' ? 'full' : 'decision';
    navigation.replace('Result', { result, unlockedTier });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{upgradeOnly ? 'SEE THE FULL BREAKDOWN' : 'YOUR ANALYSIS IS READY'}</Text>
      <Text style={styles.subtitle}>
        {upgradeOnly ? 'Unlock the full report to keep going.' : "Choose how you'd like to see it."}
      </Text>

      {!upgradeOnly && (
        <Pressable
          style={styles.optionCard}
          onPress={() => handlePurchase('unlock_decision')}
          disabled={purchasing !== null}
        >
          {purchasing === 'unlock_decision' ? (
            <ActivityIndicator />
          ) : (
            <>
              <Text style={styles.optionPrice}>{PRODUCT_PRICES.unlock_decision}</Text>
              <Text style={styles.optionTitle}>Just the Decision</Text>
              <Text style={styles.optionDescription}>
                See the recommendation -- fix it, replace it, get another quote, or too close to call.
              </Text>
            </>
          )}
        </Pressable>
      )}

      <Pressable
        style={[styles.optionCard, styles.optionCardFeatured]}
        onPress={() => handlePurchase('unlock_full_report')}
        disabled={purchasing !== null}
      >
        {purchasing === 'unlock_full_report' ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text style={styles.optionPrice}>{PRODUCT_PRICES.unlock_full_report}</Text>
            <Text style={styles.optionTitle}>Full Report</Text>
            <Text style={styles.optionDescription}>
              Everything: side-by-side breakdown, 24-month outlook, repair threshold, mechanic questions, saved to
              your history, and an emailed PDF report.
            </Text>
          </>
        )}
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 6, marginBottom: 28 },
  optionCard: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 12,
    padding: 20,
    marginBottom: 14,
    minHeight: 90,
    justifyContent: 'center',
  },
  optionCardFeatured: { borderColor: '#111', borderWidth: 2 },
  optionPrice: { fontSize: 22, fontWeight: '800' },
  optionTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  optionDescription: { fontSize: 13, color: '#666', marginTop: 6, lineHeight: 19 },
  error: { color: '#c62828', textAlign: 'center', marginTop: 8 },
});
