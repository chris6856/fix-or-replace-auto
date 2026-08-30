import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft } from './DecisionDraftContext';
import { extractRepairDetails } from './aiExtractRepair';

type Props = NativeStackScreenProps<AppStackParamList, 'RepairEstimate'>;

export default function RepairEstimateScreen({ navigation }: Props) {
  const { draft, updateDraft } = useDecisionDraft();
  const [estimate, setEstimate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!draft) return null;

  async function handleContinue() {
    const parsedEstimate = Number(estimate);
    if (!Number.isFinite(parsedEstimate) || parsedEstimate <= 0) {
      setError('Enter the total repair estimate.');
      return;
    }
    if (!description.trim()) {
      setError("Describe what's being repaired.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    // Claude structures the description (category + safety flag) -- if the
    // Edge Function isn't deployed yet or the call fails, fall back to
    // manual entry on the next screen rather than blocking the flow.
    const extraction = await extractRepairDetails(description.trim());

    updateDraft({
      totalRepairEstimate: parsedEstimate,
      repairDescriptionRaw: description.trim(),
      repairCategory: extraction?.category ?? null,
      isSafetyIssue: extraction?.isSafetyIssue ?? null,
    });

    setIsSubmitting(false);
    navigation.navigate('ConfirmRepair');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WHAT DID THE SHOP TELL YOU?</Text>

      <Text style={styles.sectionLabel}>Total Repair Estimate</Text>
      <TextInput
        style={styles.input}
        placeholder="$ 0"
        keyboardType="decimal-pad"
        value={estimate}
        onChangeText={setEstimate}
      />

      <Text style={styles.sectionLabel}>What's being repaired?</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder='e.g. "They said it needs about $4,000 worth of suspension work."'
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.primaryButton} onPress={handleContinue} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>CONTINUE</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 12, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  error: { color: '#c62828', marginTop: 16, textAlign: 'center' },
  primaryButton: {
    marginTop: 24,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
