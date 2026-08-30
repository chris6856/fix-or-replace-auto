import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft } from './DecisionDraftContext';
import { useUpdateVehicleMileage } from '../garage/useVehicles';

type Props = NativeStackScreenProps<AppStackParamList, 'MileageCheck'>;

export default function MileageCheckScreen({ navigation }: Props) {
  const { draft, updateDraft } = useDecisionDraft();
  const updateMileage = useUpdateVehicleMileage();
  const [isEditing, setIsEditing] = useState(false);
  const [newMileage, setNewMileage] = useState(draft ? String(draft.currentMileage) : '');
  const [error, setError] = useState<string | null>(null);

  if (!draft) return null; // shouldn't happen -- VehicleDetailScreen always starts the draft first
  const { vehicleId } = draft;

  function handleConfirmCorrect() {
    navigation.navigate('RepairEstimate');
  }

  async function handleSaveUpdate() {
    const parsed = parseInt(newMileage, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Enter a valid mileage.');
      return;
    }
    setError(null);
    try {
      await updateMileage.mutateAsync({ id: vehicleId, currentMileage: parsed });
      updateDraft({ currentMileage: parsed });
      navigation.navigate('RepairEstimate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update mileage.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CURRENT MILEAGE</Text>
      <Text style={styles.lastReportedLabel}>Last reported:</Text>
      <Text style={styles.mileage}>{draft.currentMileage.toLocaleString()}</Text>

      {!isEditing ? (
        <>
          <Text style={styles.question}>Is this still approximately correct?</Text>
          <Pressable style={styles.primaryButton} onPress={handleConfirmCorrect}>
            <Text style={styles.primaryButtonText}>YES</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => setIsEditing(true)}>
            <Text style={styles.secondaryButtonText}>UPDATE</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="New mileage"
            keyboardType="number-pad"
            value={newMileage}
            onChangeText={setNewMileage}
            autoFocus
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={styles.primaryButton} onPress={handleSaveUpdate} disabled={updateMileage.isPending}>
            {updateMileage.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>SAVE</Text>}
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 24, textAlign: 'center' },
  lastReportedLabel: { fontSize: 14, color: '#666', textAlign: 'center' },
  mileage: { fontSize: 36, fontWeight: '800', textAlign: 'center', marginBottom: 32 },
  question: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  error: { color: '#c62828', textAlign: 'center', marginBottom: 12 },
  primaryButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '700', color: '#333' },
});
