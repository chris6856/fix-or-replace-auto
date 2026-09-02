import { ActivityIndicator, FlatList, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Vehicle } from '@fixorreplace/types';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useVehicles } from './useVehicles';

type Props = NativeStackScreenProps<AppStackParamList, 'Garage'>;

export default function GarageScreen({ navigation }: Props) {
  const { data: vehicles, isLoading, error } = useVehicles();

  return (
    <ImageBackground
      source={require('../../assets/welcome-background.jpg')}
      style={styles.container}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Couldn't load your garage. Pull to refresh or try again shortly.</Text>
        </View>
      ) : !vehicles || vehicles.length === 0 ? (
        <View style={styles.content}>
          <Text style={styles.title}>LET'S BUILD YOUR GARAGE</Text>
          <Text style={styles.subtitle}>Add the vehicles your household currently owns.</Text>
          <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddVehicle')}>
            <Text style={styles.addButtonText}>+ ADD VEHICLE</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.title}>MY GARAGE</Text>
          <FlatList
            data={vehicles}
            keyExtractor={(vehicle) => vehicle.id}
            renderItem={({ item }) => (
              <VehicleCard
                vehicle={item}
                onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })}
                onCheckSymptom={() => navigation.navigate('SymptomCheck', { vehicleId: item.id })}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
          <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddVehicle')}>
            <Text style={styles.addButtonText}>+ ADD VEHICLE</Text>
          </Pressable>
        </View>
      )}
    </ImageBackground>
  );
}

function VehicleCard({
  vehicle,
  onPress,
  onCheckSymptom,
}: {
  vehicle: Vehicle;
  onPress: () => void;
  onCheckSymptom: () => void;
}) {
  return (
    <View style={styles.card}>
      <Pressable onPress={onPress}>
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
      <Pressable style={styles.symptomButton} onPress={onCheckSymptom}>
        <Text style={styles.symptomButtonText}>SOMETHING'S GOING ON WITH THE CAR</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  // Faded well below full opacity, matching the Welcome and Sign In
  // screens, so the photo reads as mood/texture behind the content.
  backgroundImage: { opacity: 0.26 },
  content: { flex: 1, padding: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#555', marginBottom: 24 },
  errorText: { color: '#c62828', textAlign: 'center' },
  card: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
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
  symptomButton: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  symptomButtonText: { fontSize: 13, fontWeight: '700', color: '#555', textDecorationLine: 'underline' },
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
});
