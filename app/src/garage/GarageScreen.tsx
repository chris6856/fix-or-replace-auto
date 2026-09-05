import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Vehicle } from '@fixorreplace/types';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useVehicles } from './useVehicles';
import VehiclePhotoCircle from './VehiclePhotoCircle';
import { openRepairFacilitySearch, useLatestShopName } from './researchRepairFacility';

type Props = NativeStackScreenProps<AppStackParamList, 'Garage'>;

export default function GarageScreen({ navigation }: Props) {
  const { data: vehicles, isLoading, error } = useVehicles();
  const [isResearchModalVisible, setIsResearchModalVisible] = useState(false);
  const [manualShopName, setManualShopName] = useState('');

  // Most vehicles already have a shop name saved from their last repair
  // estimate, so this only prompts when there's genuinely nothing to go on
  // yet -- it never blocks the button, just asks once for that lookup.
  function handleResearch(shopName: string | null | undefined) {
    if (shopName) {
      openRepairFacilitySearch(shopName);
    } else {
      setManualShopName('');
      setIsResearchModalVisible(true);
    }
  }

  function handleManualSearch() {
    const trimmed = manualShopName.trim();
    if (!trimmed) return;
    openRepairFacilitySearch(trimmed);
    setIsResearchModalVisible(false);
  }

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
                onResearch={handleResearch}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
          <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddVehicle')}>
            <Text style={styles.addButtonText}>+ ADD VEHICLE</Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={isResearchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsResearchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Research Repair Facility</Text>
            <Text style={styles.modalHelper}>What's the name of the repair shop?</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Joe's Auto Repair"
              value={manualShopName}
              onChangeText={setManualShopName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelButton} onPress={() => setIsResearchModalVisible(false)}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSearchButton} onPress={handleManualSearch}>
                <Text style={styles.modalSearchButtonText}>Search</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

function VehicleCard({
  vehicle,
  onPress,
  onCheckSymptom,
  onResearch,
}: {
  vehicle: Vehicle;
  onPress: () => void;
  onCheckSymptom: () => void;
  onResearch: (shopName: string | null | undefined) => void;
}) {
  const { data: shopName } = useLatestShopName(vehicle.id);

  return (
    <View style={styles.card}>
      <Pressable onPress={onPress}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardTitle}>
              {vehicle.nickname ?? `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            </Text>
            <Text style={styles.cardSubtitle}>
              {vehicle.year} {vehicle.make} {vehicle.model}
              {vehicle.trim ? ` ${vehicle.trim}` : ''}
            </Text>
          </View>
          <VehiclePhotoCircle vehicle={vehicle} size={48} />
        </View>
        <Text style={styles.cardMileage}>{vehicle.currentMileage.toLocaleString()} miles</Text>
        <View style={styles.fixOrReplaceButton}>
          <Text style={styles.fixOrReplaceButtonText}>FIX OR REPLACE?</Text>
        </View>
      </Pressable>
      <Pressable style={styles.symptomButton} onPress={onCheckSymptom}>
        <Text style={styles.symptomButtonText}>SOMETHING'S GOING ON WITH THE CAR</Text>
      </Pressable>
      <Pressable style={styles.symptomButton} onPress={() => onResearch(shopName)}>
        <Text style={styles.symptomButtonText}>RESEARCH REPAIR FACILITY</Text>
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
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitleBlock: { flex: 1, marginRight: 12 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalHelper: { fontSize: 14, color: '#555', marginTop: 8, marginBottom: 12 },
  modalInput: {
    color: '#111',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 16 },
  modalCancelButton: { paddingVertical: 10, paddingHorizontal: 12 },
  modalCancelButtonText: { fontSize: 15, color: '#666', fontWeight: '600' },
  modalSearchButton: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  modalSearchButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
