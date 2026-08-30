import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft } from './DecisionDraftContext';
import { useVehicle } from '../garage/useVehicles';
import RecommendationBadge from './RecommendationBadge';
import { formatCurrency } from './explainResult';
import { saveDecision } from './saveDecision';

type Props = NativeStackScreenProps<AppStackParamList, 'SaveDecision'>;

export default function SaveDecisionScreen({ route, navigation }: Props) {
  const { result, explanation } = route.params;
  const { input, output } = result;
  const { draft, clearDraft } = useDecisionDraft();
  const { data: vehicle } = useVehicle(draft?.vehicleId ?? '');
  const queryClient = useQueryClient();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!draft) return null;

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      await saveDecision(draft!, input, output, explanation || null);
      queryClient.invalidateQueries({ queryKey: ['decisions', draft!.vehicleId] });
      const vehicleId = draft!.vehicleId;
      clearDraft();
      navigation.navigate('VehicleDetail', { vehicleId });
    } catch (err) {
      setIsSaving(false);
      setError(err instanceof Error ? err.message : 'Could not save this decision.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SAVE THIS DECISION?</Text>

      <View style={styles.card}>
        <Text style={styles.vehicleName}>
          {vehicle?.nickname ?? (vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '')}
        </Text>
        <Text style={styles.repairCategory}>{draft.repairCategory ?? 'General Repair'}</Text>
        <Text style={styles.repairCost}>{formatCurrency(input.keep.currentRepairCost)}</Text>
        <RecommendationBadge recommendation={output.recommendation} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.primaryButton} onPress={handleSave} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>SAVE</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 24 },
  card: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  vehicleName: { fontSize: 18, fontWeight: '800' },
  repairCategory: { fontSize: 15, color: '#555', marginTop: 8 },
  repairCost: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  error: { color: '#c62828', textAlign: 'center', marginTop: 16 },
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
