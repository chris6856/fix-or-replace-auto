import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useVehicle } from './useVehicles';

type Props = NativeStackScreenProps<AppStackParamList, 'VehicleDetail'>;

export default function VehicleDetailScreen({ route }: Props) {
  const { vehicleId } = route.params;
  const { data: vehicle, isLoading, error } = useVehicle(vehicleId);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{vehicle.nickname ?? `${vehicle.year} ${vehicle.make} ${vehicle.model}`}</Text>
      <Text style={styles.subtitle}>
        {vehicle.year} {vehicle.make} {vehicle.model}
        {vehicle.trim ? ` ${vehicle.trim}` : ''}
      </Text>
      <Text style={styles.mileage}>{vehicle.currentMileage.toLocaleString()} miles</Text>

      {/* The repair intake flow (blueprint Screens 9-14) lands in milestone 5. */}
      <Pressable style={styles.disabledButton} disabled>
        <Text style={styles.disabledButtonText}>I HAVE A REPAIR ESTIMATE</Text>
        <Text style={styles.comingSoon}>Coming soon</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>Previous Decisions</Text>
      <Text style={styles.emptyText}>None yet.</Text>
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
  disabledButton: {
    height: 56,
    borderRadius: 8,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButtonText: { fontSize: 15, fontWeight: '700', color: '#999' },
  comingSoon: { fontSize: 11, color: '#aaa', marginTop: 2 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#999' },
});
