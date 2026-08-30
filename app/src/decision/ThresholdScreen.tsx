import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useDecisionDraft } from './DecisionDraftContext';
import RecommendationBadge from './RecommendationBadge';
import { formatCurrency } from './explainResult';

type Props = NativeStackScreenProps<AppStackParamList, 'Threshold'>;

export default function ThresholdScreen({ route, navigation }: Props) {
  const { result } = route.params;
  const { input, output } = result;
  const { draft, clearDraft } = useDecisionDraft();

  const estimate = input.keep.currentRepairCost;
  const margin = Math.abs(output.repairThreshold - estimate);
  const isBelow = estimate <= output.repairThreshold;

  function handleDone() {
    const vehicleId = draft?.vehicleId;
    clearDraft();
    if (vehicleId) navigation.navigate('VehicleDetail', { vehicleId });
    else navigation.navigate('Garage');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>YOUR REPAIR THRESHOLD</Text>
      <Text style={styles.threshold}>{formatCurrency(output.repairThreshold)}</Text>

      <Text style={styles.explanation}>
        Based on the replacement option you entered, your vehicle's condition, mileage, recent repair history, and
        current value, repairing remains financially competitive up to approximately this amount.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Your estimate: {formatCurrency(estimate)}</Text>
        <Text style={styles.marginText}>
          {formatCurrency(margin)} {isBelow ? 'BELOW THRESHOLD' : 'ABOVE THRESHOLD'}
        </Text>
        <RecommendationBadge recommendation={output.recommendation} />
      </View>

      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('WhatIf', { result })}>
        <Text style={styles.primaryButtonText}>CHANGE THE NUMBERS</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={handleDone}>
        <Text style={styles.secondaryButtonText}>DONE FOR NOW</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 16, fontWeight: '700', color: '#666', textAlign: 'center' },
  threshold: { fontSize: 40, fontWeight: '800', textAlign: 'center', marginVertical: 8 },
  explanation: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  card: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cardLabel: { fontSize: 14, color: '#333' },
  marginText: { fontSize: 18, fontWeight: '800', marginTop: 8 },
  primaryButton: {
    marginTop: 28,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#333' },
});
