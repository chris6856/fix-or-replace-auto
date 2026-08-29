import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Vehicle } from '@fixorreplace/types';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useVehicles } from './useVehicles';
import { useAuth } from '../auth/AuthContext';

type Props = NativeStackScreenProps<AppStackParamList, 'Garage'>;

export default function GarageScreen({ navigation }: Props) {
  const { data: vehicles, isLoading, error } = useVehicles();
  const { signOut } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Couldn't load your garage. Pull to refresh or try again shortly.</Text>
      </View>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>LET'S BUILD YOUR GARAGE</Text>
        <Text style={styles.subtitle}>Add the vehicles your household currently owns.</Text>
        <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddVehicle')}>
          <Text style={styles.addButtonText}>+ ADD VEHICLE</Text>
        </Pressable>
        <Pressable onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MY GARAGE</Text>
      <FlatList
        data={vehicles}
        keyExtractor={(vehicle) => vehicle.id}
        renderItem={({ item }) => (
          <VehicleCard vehicle={item} onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddVehicle')}>
        <Text style={styles.addButtonText}>+ ADD VEHICLE</Text>
      </Pressable>
      <Pressable onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function VehicleCard({ vehicle, onPress }: { vehicle: Vehicle; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.cardTitle}>{vehicle.nickname ?? `${vehicle.year} ${vehicle.make} ${vehicle.model}`}</Text>
      <Text style={styles.cardSubtitle}>
        {vehicle.year} {vehicle.make} {vehicle.model}
        {vehicle.trim ? ` ${vehicle.trim}` : ''}
      </Text>
      <Text style={styles.cardMileage}>{vehicle.currentMileage.toLocaleString()} miles</Text>
      <View style={styles.fixOrReplaceButton}>
        <Text style={styles.fixOrReplaceButtonText}>FIX OR REPLACE?</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#555', marginBottom: 24 },
  errorText: { color: '#c62828', textAlign: 'center' },
  card: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardSubtitle: { fontSize: 14, color: '#555', marginTop: 2 },
  cardMileage: { fontSize: 14, color: '#555', marginTop: 2, marginBottom: 12 },
  fixOrReplaceButton: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#111',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  fixOrReplaceButtonText: { fontSize: 13, fontWeight: '700' },
  separator: { height: 12 },
  addButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  signOutText: { textAlign: 'center', color: '#888', marginTop: 16 },
});
