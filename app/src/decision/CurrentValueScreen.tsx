import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft } from './DecisionDraftContext';
import { useVehicle } from '../garage/useVehicles';

type Props = NativeStackScreenProps<AppStackParamList, 'CurrentValue'>;

export default function CurrentValueScreen({ navigation }: Props) {
  const { draft, updateDraft, clearDraft } = useDecisionDraft();
  const { data: vehicle } = useVehicle(draft?.vehicleId ?? '');
  const [workingValue, setWorkingValue] = useState(
    draft?.currentVehicleValueWorking ? String(draft.currentVehicleValueWorking) : '',
  );

  if (!draft) return null;

  const parsedValue = Number(workingValue) || 0;
  // Manual entry for now -- see build plan milestone 10 ("valuation provider
  // swap-in"), which replaces this with a real fetched value behind the
  // VehicleValuationProvider interface without touching this screen's UI.
  const low = Math.round(parsedValue * 0.85);
  const high = Math.round(parsedValue * 1.15);
  const equity = parsedValue - draft.loanPayoff;

  const vehicleId = draft.vehicleId;
  function handleFinish() {
    updateDraft({ currentVehicleValueWorking: parsedValue, currentVehicleValueLow: low, currentVehicleValueHigh: high });
    clearDraft();
    navigation.navigate('VehicleDetail', { vehicleId });
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
      <TextInput
        style={styles.input}
        placeholder="$ 0"
        keyboardType="decimal-pad"
        value={workingValue}
        onChangeText={setWorkingValue}
      />
      <Text style={styles.helperText}>You can adjust this -- a real market valuation is coming in a future update.</Text>

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

      <Pressable style={styles.primaryButton} onPress={handleFinish} disabled={parsedValue <= 0}>
        <Text style={styles.primaryButtonText}>FINISH FOR NOW</Text>
      </Pressable>
      <Text style={styles.comingSoon}>
        Comparing this against a replacement vehicle is coming in a future update -- everything you entered will carry
        over automatically once that's ready.
      </Text>
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
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
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
  comingSoon: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 16, lineHeight: 18 },
});
