import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Vehicle } from '@fixorreplace/types';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useCreateVehicle } from './useVehicles';

type Props = NativeStackScreenProps<AppStackParamList, 'VehicleProfile'>;

type PrimaryDriver = NonNullable<Vehicle['primaryDriver']>;

const DRIVER_OPTIONS: { value: PrimaryDriver; label: string }[] = [
  { value: 'me', label: 'Me' },
  { value: 'spouse_partner', label: 'Spouse/Partner' },
  { value: 'child', label: 'Child' },
  { value: 'other', label: 'Other' },
];

export default function VehicleProfileScreen({ route, navigation }: Props) {
  const { draft } = route.params;
  const createVehicle = useCreateVehicle();

  const [mileage, setMileage] = useState('');
  const [nickname, setNickname] = useState('');
  const [primaryDriver, setPrimaryDriver] = useState<PrimaryDriver | null>(null);
  const [zip, setZip] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const parsedMileage = parseInt(mileage, 10);
    if (!Number.isFinite(parsedMileage) || parsedMileage < 0) {
      setError('Enter the current mileage.');
      return;
    }
    if (!/^\d{5}$/.test(zip)) {
      setError('Enter a valid 5-digit ZIP code.');
      return;
    }

    setError(null);
    try {
      await createVehicle.mutateAsync({
        vin: draft.vin,
        year: draft.year,
        make: draft.make,
        model: draft.model,
        trim: draft.trim,
        nickname: nickname.trim() || null,
        primaryDriver: primaryDriver ?? undefined,
        zip,
        currentMileage: parsedMileage,
      });
      navigation.popToTop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this vehicle.');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>
        {draft.year} {draft.make} {draft.model}
        {draft.trim ? ` ${draft.trim}` : ''}
      </Text>

      <Text style={styles.sectionLabel}>Current Mileage</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 155000"
        keyboardType="number-pad"
        value={mileage}
        onChangeText={setMileage}
      />

      <Text style={styles.sectionLabel}>Vehicle Nickname (optional)</Text>
      <TextInput style={styles.input} placeholder="e.g. Daughter's Escape" value={nickname} onChangeText={setNickname} />

      <Text style={styles.sectionLabel}>Who primarily drives it?</Text>
      <View style={styles.optionsRow}>
        {DRIVER_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={[styles.optionChip, primaryDriver === option.value && styles.optionChipSelected]}
            onPress={() => setPrimaryDriver(option.value)}
          >
            <Text style={[styles.optionChipText, primaryDriver === option.value && styles.optionChipTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>ZIP Code</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 48073"
        keyboardType="number-pad"
        maxLength={5}
        value={zip}
        onChangeText={setZip}
      />
      <Text style={styles.helperText}>Used for vehicle valuation and taxes/fees where possible.</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.primaryButton} onPress={handleSave} disabled={createVehicle.isPending}>
        {createVehicle.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>SAVE VEHICLE</Text>
        )}
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 12, marginBottom: 8 },
  input: {
    color: '#111',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  helperText: { fontSize: 12, color: '#888', marginTop: 4 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  optionChipSelected: { backgroundColor: '#111', borderColor: '#111' },
  optionChipText: { fontSize: 14, color: '#333' },
  optionChipTextSelected: { color: '#fff', fontWeight: '700' },
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
