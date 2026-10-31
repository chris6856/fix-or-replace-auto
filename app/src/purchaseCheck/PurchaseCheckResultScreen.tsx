import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PurchaseVerdict } from '@fixorreplace/types';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { formatCurrency } from '../decision/explainResult';
import { evaluatePurchase } from './evaluatePurchase';
import { savePurchaseCheck } from './purchaseCheckHistory';

type Props = NativeStackScreenProps<AppStackParamList, 'PurchaseCheckResult'>;

const VERDICT_COLOR: Record<PurchaseVerdict, string> = {
  below_market: '#2e7d32',
  at_market: '#555',
  above_market: '#b8860b',
};

const VERDICT_LABEL: Record<PurchaseVerdict, string> = {
  below_market: 'BELOW MARKET VALUE',
  at_market: 'AT MARKET VALUE',
  above_market: 'ABOVE MARKET VALUE',
};

export default function PurchaseCheckResultScreen({ route, navigation }: Props) {
  const { decoded, mileage, zip, askingPrice, marketValue, valueLow, valueHigh, verdict } = route.params;
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { differenceFromMarket, differencePercent } = evaluatePurchase(askingPrice, marketValue, valueLow, valueHigh);
  const isBelow = differenceFromMarket < 0;

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      await savePurchaseCheck({
        vin: decoded.vin,
        year: decoded.year,
        make: decoded.make,
        model: decoded.model,
        trim: decoded.trim,
        mileage,
        zip,
        askingPrice,
        marketValue,
        valueLow,
        valueHigh,
        verdict,
      });
      navigation.navigate('Garage');
    } catch (err) {
      setIsSaving(false);
      setError(err instanceof Error ? err.message : 'Could not save this purchase check.');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.vehicleLabel}>
        {decoded.year} {decoded.make} {decoded.model}
        {decoded.trim ? ` ${decoded.trim}` : ''}
      </Text>
      <Text style={styles.subLabel}>{mileage.toLocaleString()} miles</Text>
      <Text style={styles.askingPrice}>{formatCurrency(askingPrice)} asking</Text>

      <View style={styles.verdictCard}>
        <Text style={[styles.verdictLabel, { color: VERDICT_COLOR[verdict] }]}>{VERDICT_LABEL[verdict]}</Text>
        <Text style={styles.rangeText}>
          Market value: {formatCurrency(marketValue)} (typical range {formatCurrency(valueLow)} -{' '}
          {formatCurrency(valueHigh)})
        </Text>
        <Text style={styles.differenceText}>
          About {formatCurrency(Math.abs(differenceFromMarket))} ({Math.abs(differencePercent).toFixed(1)}%)
          {isBelow ? ' below the predicted market value.' : ' above the predicted market value.'}
        </Text>
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Based on MarketCheck's market data for this exact VIN. Actual negotiating room still depends on the
          vehicle's condition, local demand, and any dealer fees not reflected here.
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
  vehicleLabel: { fontSize: 20, fontWeight: '800' },
  subLabel: { fontSize: 14, color: '#666', marginTop: 4 },
  askingPrice: { fontSize: 28, fontWeight: '800', marginTop: 8, marginBottom: 20 },
  verdictCard: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  verdictLabel: { fontSize: 15, fontWeight: '800' },
  rangeText: { fontSize: 15, color: '#333', marginTop: 8, fontWeight: '600' },
  differenceText: { fontSize: 14, color: '#555', marginTop: 10, lineHeight: 20 },
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
