import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useVehicle } from '../garage/useVehicles';
import { useDecisionDraft } from './DecisionDraftContext';
import RecommendationBadge from './RecommendationBadge';
import { explainResult, formatCurrency } from './explainResult';

type Props = NativeStackScreenProps<AppStackParamList, 'Result'>;

export default function ResultScreen({ route, navigation }: Props) {
  const { result } = route.params;
  const { input, output } = result;
  const { draft } = useDecisionDraft();
  const { data: vehicle } = useVehicle(draft?.vehicleId ?? '');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FIX OR REPLACE?</Text>
      {vehicle && (
        <Text style={styles.subtitle}>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </Text>
      )}
      {draft && <Text style={styles.mileage}>{draft.currentMileage.toLocaleString()} miles</Text>}

      <RecommendationBadge recommendation={output.recommendation} />

      <View style={styles.compareRow}>
        <View style={styles.compareColumn}>
          <Text style={styles.compareLabel}>Current Repair</Text>
          <Text style={styles.compareValue}>{formatCurrency(input.keep.currentRepairCost)}</Text>
        </View>
        <Text style={styles.versus}>versus</Text>
        <View style={styles.compareColumn}>
          <Text style={styles.compareLabel}>Net Cost to Replace</Text>
          <Text style={styles.compareValue}>{formatCurrency(output.netReplacementAcquisitionCost)}</Text>
        </View>
      </View>

      <Text style={styles.explanation}>{explainResult(input, output)}</Text>

      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('SideBySide', { result })}>
        <Text style={styles.primaryButtonText}>SEE THE FULL BREAKDOWN</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'center', marginTop: 4 },
  mileage: { fontSize: 14, color: '#777', textAlign: 'center', marginBottom: 8 },
  compareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 20 },
  compareColumn: { alignItems: 'center', flex: 1 },
  compareLabel: { fontSize: 13, color: '#666', marginBottom: 4 },
  compareValue: { fontSize: 22, fontWeight: '800' },
  versus: { fontSize: 13, color: '#999', marginHorizontal: 8 },
  explanation: { fontSize: 15, color: '#333', lineHeight: 22, textAlign: 'center', marginBottom: 28 },
  primaryButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
