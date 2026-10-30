import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PriceVerdict } from '@fixorreplace/types';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { formatCurrency } from '../decision/explainResult';
import { savePriceCheck } from './priceCheckHistory';

type Props = NativeStackScreenProps<AppStackParamList, 'PriceCheckResult'>;

const VERDICT_COLOR: Record<PriceVerdict, string> = {
  below_typical: '#2e7d32',
  within_typical: '#555',
  above_typical: '#b8860b',
};

const VERDICT_LABEL: Record<PriceVerdict, string> = {
  below_typical: 'BELOW TYPICAL RANGE',
  within_typical: 'WITHIN TYPICAL RANGE',
  above_typical: 'ABOVE TYPICAL RANGE',
};

export default function PriceCheckResultScreen({ route, navigation }: Props) {
  const { vehicleId, repairDescription, quotedPrice, typicalLowCost, typicalHighCost, verdict, explanation } =
    route.params;
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      await savePriceCheck(
        vehicleId,
        repairDescription,
        quotedPrice,
        typicalLowCost,
        typicalHighCost,
        verdict,
        explanation,
      );
      navigation.navigate('VehicleDetail', { vehicleId });
    } catch (err) {
      setIsSaving(false);
      setError(err instanceof Error ? err.message : 'Could not save this price check.');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.repairLabel}>YOU WERE QUOTED</Text>
      <Text style={styles.repairText}>{repairDescription}</Text>
      <Text style={styles.quotedPrice}>{formatCurrency(quotedPrice)}</Text>

      <View style={styles.verdictCard}>
        <Text style={[styles.verdictLabel, { color: VERDICT_COLOR[verdict] }]}>{VERDICT_LABEL[verdict]}</Text>
        <Text style={styles.rangeText}>
          Typical range: {formatCurrency(typicalLowCost)} - {formatCurrency(typicalHighCost)}
        </Text>
        <Text style={styles.explanationText}>{explanation}</Text>
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          This is a general estimate based on typical U.S. repair costs, not real-time or local pricing. Actual
          fair prices vary by region, shop type, and parts used -- use this as a starting point for a conversation
          with your shop, not a final answer.
        </Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.primaryButton} onPress={handleSave} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>SAVE</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  repairLabel: { fontSize: 12, fontWeight: '700', color: '#999' },
  repairText: { fontSize: 15, color: '#333', marginTop: 4 },
  quotedPrice: { fontSize: 28, fontWeight: '800', marginTop: 8, marginBottom: 20 },
  verdictCard: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  verdictLabel: { fontSize: 15, fontWeight: '800' },
  rangeText: { fontSize: 15, color: '#333', marginTop: 8, fontWeight: '600' },
  explanationText: { fontSize: 14, color: '#555', marginTop: 10, lineHeight: 20 },
  disclaimer: { marginTop: 8, marginBottom: 8 },
  disclaimerText: { fontSize: 12, color: '#999', lineHeight: 17, textAlign: 'center' },
  error: { color: '#c62828', marginTop: 8, textAlign: 'center' },
  primaryButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
