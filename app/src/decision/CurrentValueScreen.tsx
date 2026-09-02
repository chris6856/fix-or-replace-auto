import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft } from './DecisionDraftContext';
import { useVehicle } from '../garage/useVehicles';
import { marketCheckValuationProvider } from './marketCheckValuationProvider';

type Props = NativeStackScreenProps<AppStackParamList, 'CurrentValue'>;
type FetchState = 'loading' | 'fetched' | 'unavailable';

export default function CurrentValueScreen({ navigation }: Props) {
  const { draft, updateDraft } = useDecisionDraft();
  const { data: vehicle } = useVehicle(draft?.vehicleId ?? '');

  const [workingValue, setWorkingValue] = useState(
    draft?.currentVehicleValueWorking ? String(draft.currentVehicleValueWorking) : '',
  );
  const [fetchState, setFetchState] = useState<FetchState>('loading');
  const [fetchedRange, setFetchedRange] = useState<{ low: number; high: number } | null>(null);
  const [fetchedTradeValue, setFetchedTradeValue] = useState<number | null>(null);

  useEffect(() => {
    if (!vehicle || !draft) return;

    let cancelled = false;
    marketCheckValuationProvider
      .getValuation({
        vin: vehicle.vin,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim,
        mileage: draft.currentMileage,
        zip: vehicle.zip,
        condition: draft.conditionBeforeThisProblem ?? vehicle.condition,
      })
      .then((valuation) => {
        if (cancelled) return;
        setWorkingValue(String(valuation.workingValue));
        setFetchedRange({ low: valuation.valueLow, high: valuation.valueHigh });
        setFetchedTradeValue(valuation.tradeValue);
        setFetchState('fetched');
      })
      .catch(() => {
        if (!cancelled) setFetchState('unavailable');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle]);

  if (!draft) return null;

  const parsedValue = Number(workingValue) || 0;
  const low = fetchedRange?.low ?? Math.round(parsedValue * 0.85);
  const high = fetchedRange?.high ?? Math.round(parsedValue * 1.15);
  const equity = parsedValue - draft.loanPayoff;

  function handleContinue() {
    updateDraft({
      currentVehicleValueWorking: parsedValue,
      currentVehicleValueLow: low,
      currentVehicleValueHigh: high,
      // Seeds Screen 16's as-is value with the real trade-in estimate when
      // we have one, rather than falling back to the (higher) retail figure.
      ...(fetchedTradeValue !== null ? { currentVehicleTradeValue: fetchedTradeValue } : {}),
    });
    navigation.navigate('ReplacementQuestion');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>YOUR VEHICLE TODAY</Text>
      {vehicle && (
        <Text style={styles.subtitle}>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </Text>
      )}
      <Text style={styles.mileage}>{draft.currentMileage.toLocaleString()} miles</Text>

      <Text style={styles.sectionLabel}>Working Estimate of Current Value</Text>
      {fetchState === 'loading' ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>Looking up a market value...</Text>
        </View>
      ) : (
        <TextInput
          style={styles.input}
          placeholder="$ 0"
          keyboardType="decimal-pad"
          value={workingValue}
          onChangeText={(text) => {
            setWorkingValue(text);
            setFetchedRange(null); // once hand-edited, stop treating this as the fetched figure
          }}
        />
      )}
      <Text style={styles.helperText}>
        {fetchState === 'fetched'
          ? 'Estimated from real market data -- you can adjust it.'
          : vehicle?.vin
            ? "We couldn't get an automatic market value for this specific VIN -- that happens sometimes even for common vehicles. Enter your best estimate below."
            : 'Add a VIN to this vehicle for an automatic market value next time -- for now, enter your best estimate below.'}
      </Text>

      {parsedValue > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryRange}>
            Estimated range: ${low.toLocaleString()}-${high.toLocaleString()}
          </Text>
          {draft.loanPayoff > 0 && (
            <Text style={styles.summaryLine}>Loan payoff: ${draft.loanPayoff.toLocaleString()}</Text>
          )}
          <Text style={styles.summaryEquity}>
            Estimated equity: {equity >= 0 ? '+' : '-'}${Math.abs(equity).toLocaleString()}
          </Text>
        </View>
      )}

      <Pressable style={styles.primaryButton} onPress={handleContinue} disabled={parsedValue <= 0}>
        <Text style={styles.primaryButtonText}>CONTINUE</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#555' },
  mileage: { fontSize: 15, color: '#555', marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 8 },
  input: {
    color: '#111',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  loadingText: { fontSize: 14, color: '#666' },
  helperText: { fontSize: 12, color: '#888', marginTop: 4 },
  summaryCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  summaryRange: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  summaryLine: { fontSize: 14, color: '#555', marginBottom: 4 },
  summaryEquity: { fontSize: 15, fontWeight: '700' },
  primaryButton: {
    marginTop: 28,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
