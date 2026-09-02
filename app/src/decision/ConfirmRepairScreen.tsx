import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft } from './DecisionDraftContext';

type Props = NativeStackScreenProps<AppStackParamList, 'ConfirmRepair'>;
type SafetyAnswer = 'yes' | 'no' | 'not_sure';

function safetyAnswerFromDraft(isSafetyIssue: boolean | null): SafetyAnswer {
  if (isSafetyIssue === true) return 'yes';
  if (isSafetyIssue === false) return 'no';
  return 'not_sure';
}

export default function ConfirmRepairScreen({ navigation }: Props) {
  const { draft, updateDraft } = useDecisionDraft();
  const [category, setCategory] = useState(draft?.repairCategory ?? '');
  const [cost, setCost] = useState(draft ? String(draft.totalRepairEstimate) : '');
  const [safety, setSafety] = useState<SafetyAnswer>(safetyAnswerFromDraft(draft?.isSafetyIssue ?? null));

  if (!draft) return null;

  function handleContinue() {
    updateDraft({
      repairCategory: category.trim() || 'General Repair',
      totalRepairEstimate: Number(cost) || draft!.totalRepairEstimate,
      isSafetyIssue: safety === 'not_sure' ? null : safety === 'yes',
    });
    navigation.navigate('VehicleHistory');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HERE'S WHAT WE HEARD</Text>

      <Text style={styles.sectionLabel}>Repair</Text>
      <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="e.g. Suspension Repair" />

      <Text style={styles.sectionLabel}>Estimated Cost</Text>
      <TextInput style={styles.input} value={cost} onChangeText={setCost} keyboardType="decimal-pad" />

      <Text style={styles.sectionLabel}>Did the shop say the vehicle is unsafe to drive?</Text>
      <View style={styles.optionsRow}>
        {(['yes', 'no', 'not_sure'] as const).map((option) => (
          <Pressable
            key={option}
            style={[styles.optionChip, safety === option && styles.optionChipSelected]}
            onPress={() => setSafety(option)}
          >
            <Text style={[styles.optionChipText, safety === option && styles.optionChipTextSelected]}>
              {option === 'yes' ? 'Yes' : option === 'no' ? 'No' : 'Not Sure'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.primaryButton} onPress={handleContinue}>
        <Text style={styles.primaryButtonText}>CORRECT -- CONTINUE</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 16, marginBottom: 8 },
  input: {
    color: '#111',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
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
  optionChipText: { fontSize: 14, color: '#333' },
  optionChipTextSelected: { color: '#fff', fontWeight: '700' },
  primaryButton: {
    marginTop: 32,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
