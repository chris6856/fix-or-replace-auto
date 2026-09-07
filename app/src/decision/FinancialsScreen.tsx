import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { VehicleCondition } from '@fixorreplace/types';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft } from './DecisionDraftContext';
import { useUpdateVehicleFinancials } from '../garage/useVehicles';

type Props = NativeStackScreenProps<AppStackParamList, 'Financials'>;
type HasLoanAnswer = 'yes' | 'no' | 'not_sure';

const CONDITION_OPTIONS: VehicleCondition[] = ['excellent', 'good', 'fair', 'poor'];

export default function FinancialsScreen({ navigation }: Props) {
  const { draft, updateDraft } = useDecisionDraft();
  const updateFinancials = useUpdateVehicleFinancials();

  const [hasLoan, setHasLoan] = useState<HasLoanAnswer | null>(
    draft?.hasLoan === 'not_sure' ? 'not_sure' : draft?.hasLoan ?? null,
  );
  const [loanPayoff, setLoanPayoff] = useState(draft && draft.loanPayoff > 0 ? String(draft.loanPayoff) : '');
  const [condition, setCondition] = useState<VehicleCondition | null>(draft?.conditionBeforeThisProblem ?? null);
  const [error, setError] = useState<string | null>(null);

  if (!draft) return null;
  const { vehicleId, reliabilityBucket } = draft;

  async function handleContinue() {
    if (!hasLoan) {
      setError('Let us know if you owe money on it.');
      return;
    }
    if (!condition) {
      setError("Choose the vehicle's condition before this problem.");
      return;
    }

    const parsedPayoff = hasLoan === 'yes' ? Number(loanPayoff) || 0 : 0;
    setError(null);

    updateDraft({ hasLoan, loanPayoff: parsedPayoff, conditionBeforeThisProblem: condition });

    try {
      await updateFinancials.mutateAsync({
        id: vehicleId,
        currentLoanPayoff: parsedPayoff,
        condition,
        reliabilityBucket: reliabilityBucket ?? 'reliable',
      });
      navigation.navigate('CurrentValue');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this vehicle.');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>ABOUT YOUR CURRENT VEHICLE</Text>

      <Text style={styles.sectionLabel}>Do you owe money on it?</Text>
      <View style={styles.optionsRow}>
        {(['no', 'yes', 'not_sure'] as const).map((option) => (
          <Pressable
            key={option}
            style={[styles.optionChip, hasLoan === option && styles.optionChipSelected]}
            onPress={() => setHasLoan(option)}
          >
            <Text style={[styles.optionChipText, hasLoan === option && styles.optionChipTextSelected]}>
              {option === 'no' ? 'No' : option === 'yes' ? 'Yes' : 'Not Sure'}
            </Text>
          </Pressable>
        ))}
      </View>

      {hasLoan === 'yes' && (
        <>
          <Text style={styles.sectionLabel}>Approximate Loan Payoff</Text>
          <TextInput
            style={styles.input}
            placeholder="$ 0"
            keyboardType="decimal-pad"
            value={loanPayoff}
            onChangeText={setLoanPayoff}
          />
          <Text style={styles.helperText}>Not monthly payment. We need the payoff balance.</Text>
        </>
      )}

      <Text style={styles.sectionLabel}>Overall condition before this problem</Text>
      <View style={styles.optionsRow}>
        {CONDITION_OPTIONS.map((option) => (
          <Pressable
            key={option}
            style={[styles.optionChip, condition === option && styles.optionChipSelected]}
            onPress={() => setCondition(option)}
          >
            <Text style={[styles.optionChipText, condition === option && styles.optionChipTextSelected]}>
              {option[0].toUpperCase() + option.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.primaryButton} onPress={handleContinue} disabled={updateFinancials.isPending}>
        {updateFinancials.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>CONTINUE</Text>
        )}
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 16, marginBottom: 8 },
  optionsRow: { flexDirection: 'row', gap: 8 },
  optionChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  optionChipSelected: { backgroundColor: '#111', borderColor: '#111' },
  optionChipText: { fontSize: 13, color: '#333' },
  optionChipTextSelected: { color: '#fff', fontWeight: '700' },
  input: {
    color: '#111',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  helperText: { fontSize: 12, color: '#888', marginTop: 4 },
  error: { color: '#c62828', marginTop: 16, textAlign: 'center' },
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
