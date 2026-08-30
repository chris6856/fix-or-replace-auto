import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ReliabilityBucket } from '@fixorreplace/types';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft } from './DecisionDraftContext';

type Props = NativeStackScreenProps<AppStackParamList, 'VehicleHistory'>;

const RELIABILITY_OPTIONS: { value: ReliabilityBucket; emoji: string; label: string; description: string }[] = [
  { value: 'reliable', emoji: '\u{1F7E2}', label: 'RELIABLE', description: 'Mostly routine maintenance and normal repairs.' },
  { value: 'some_problems', emoji: '\u{1F7E1}', label: 'SOME PROBLEMS', description: 'Several repairs or problems recently.' },
  { value: 'problem_vehicle', emoji: '\u{1F534}', label: 'PROBLEM VEHICLE', description: 'Frequent repairs, breakdowns or recurring problems.' },
];

type RecentRepairsAnswer = 'amount' | 'none' | 'not_sure';

export default function VehicleHistoryScreen({ navigation }: Props) {
  const { draft, updateDraft } = useDecisionDraft();
  const [reliabilityBucket, setReliabilityBucket] = useState<ReliabilityBucket | null>(draft?.reliabilityBucket ?? null);
  const [recentRepairsAnswer, setRecentRepairsAnswer] = useState<RecentRepairsAnswer>(
    draft && draft.recentRepairsSum > 0 ? 'amount' : 'not_sure',
  );
  const [recentRepairsAmount, setRecentRepairsAmount] = useState(
    draft && draft.recentRepairsSum > 0 ? String(draft.recentRepairsSum) : '',
  );
  const [error, setError] = useState<string | null>(null);

  if (!draft) return null;

  function handleContinue() {
    if (!reliabilityBucket) {
      setError('Choose how this vehicle has been.');
      return;
    }

    const recentRepairsSum = recentRepairsAnswer === 'amount' ? Number(recentRepairsAmount) || 0 : 0;

    updateDraft({ reliabilityBucket, recentRepairsSum });
    navigation.navigate('Financials');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HOW HAS THIS VEHICLE BEEN?</Text>
      <Text style={styles.subtitle}>Other than this repair:</Text>

      {RELIABILITY_OPTIONS.map((option) => (
        <Pressable
          key={option.value}
          style={[styles.reliabilityCard, reliabilityBucket === option.value && styles.reliabilityCardSelected]}
          onPress={() => setReliabilityBucket(option.value)}
        >
          <Text style={styles.reliabilityLabel}>
            {option.emoji} {option.label}
          </Text>
          <Text style={styles.reliabilityDescription}>{option.description}</Text>
        </Pressable>
      ))}

      <Text style={styles.sectionLabel}>Major repairs in the last 12 months</Text>
      <View style={styles.optionsRow}>
        {(['amount', 'none', 'not_sure'] as const).map((option) => (
          <Pressable
            key={option}
            style={[styles.optionChip, recentRepairsAnswer === option && styles.optionChipSelected]}
            onPress={() => setRecentRepairsAnswer(option)}
          >
            <Text style={[styles.optionChipText, recentRepairsAnswer === option && styles.optionChipTextSelected]}>
              {option === 'amount' ? '$ Amount' : option === 'none' ? 'None' : 'Not Sure'}
            </Text>
          </Pressable>
        ))}
      </View>
      {recentRepairsAnswer === 'amount' && (
        <TextInput
          style={styles.input}
          placeholder="$ 0"
          keyboardType="decimal-pad"
          value={recentRepairsAmount}
          onChangeText={setRecentRepairsAmount}
        />
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.primaryButton} onPress={handleContinue}>
        <Text style={styles.primaryButtonText}>CONTINUE</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  reliabilityCard: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  reliabilityCardSelected: { borderColor: '#111', borderWidth: 2 },
  reliabilityLabel: { fontSize: 15, fontWeight: '700' },
  reliabilityDescription: { fontSize: 13, color: '#666', marginTop: 2 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 20, marginBottom: 8 },
  optionsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
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
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
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
