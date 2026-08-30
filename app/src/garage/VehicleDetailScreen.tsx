import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useVehicle } from './useVehicles';
import { useDecisionDraft } from '../decision/DecisionDraftContext';
import { useDecisionHistory, type DecisionHistoryItem } from '../decision/decisionHistory';
import { recommendationLabel } from '../decision/RecommendationBadge';
import { formatCurrency } from '../decision/explainResult';

type Props = NativeStackScreenProps<AppStackParamList, 'VehicleDetail'>;

export default function VehicleDetailScreen({ route, navigation }: Props) {
  const { vehicleId } = route.params;
  const { data: vehicle, isLoading, error } = useVehicle(vehicleId);
  const { data: history } = useDecisionHistory(vehicleId);
  const { startDraft } = useDecisionDraft();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !vehicle) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Couldn't load this vehicle.</Text>
      </View>
    );
  }

  const { year: vehicleYear, currentMileage } = vehicle;
  function handleStartRepairIntake() {
    startDraft(vehicleId, vehicleYear, currentMileage);
    navigation.navigate('MileageCheck');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{vehicle.nickname ?? `${vehicle.year} ${vehicle.make} ${vehicle.model}`}</Text>
      <Text style={styles.subtitle}>
        {vehicle.year} {vehicle.make} {vehicle.model}
        {vehicle.trim ? ` ${vehicle.trim}` : ''}
      </Text>
      <Text style={styles.mileage}>{vehicle.currentMileage.toLocaleString()} miles</Text>

      <Pressable style={styles.primaryButton} onPress={handleStartRepairIntake}>
        <Text style={styles.primaryButtonText}>I HAVE A REPAIR ESTIMATE</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>Previous Decisions</Text>
      {!history || history.length === 0 ? (
        <Text style={styles.emptyText}>None yet.</Text>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DecisionRow item={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

function DecisionRow({ item }: { item: DecisionHistoryItem }) {
  const date = new Date(item.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return (
    <View style={styles.decisionRow}>
      <Text style={styles.decisionDate}>{date}</Text>
      <Text style={styles.decisionCategory}>{item.category}</Text>
      <View style={styles.decisionFooter}>
        <Text style={styles.decisionCost}>{formatCurrency(item.cost)}</Text>
        <Text style={styles.decisionRecommendation}>{recommendationLabel(item.recommendation)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#c62828' },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 15, color: '#555', marginTop: 4 },
  mileage: { fontSize: 15, color: '#555', marginTop: 2, marginBottom: 24 },
  primaryButton: {
    height: 56,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#999' },
  separator: { height: 10 },
  decisionRow: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 10,
    padding: 12,
  },
  decisionDate: { fontSize: 12, color: '#999' },
  decisionCategory: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  decisionFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  decisionCost: { fontSize: 14, color: '#333' },
  decisionRecommendation: { fontSize: 13, fontWeight: '700' },
});
