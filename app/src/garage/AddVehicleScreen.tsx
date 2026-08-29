import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<AppStackParamList, 'AddVehicle'>;

// VIN scan/decode (blueprint Screens 4-5) lands in milestone 4 (NHTSA vPIC
// integration). For now this is manual entry only, as scoped for milestone 3.
export default function AddVehicleScreen({ navigation }: Props) {
  const [vin, setVin] = useState('');
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [trim, setTrim] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleContinue() {
    const parsedYear = parseInt(year, 10);
    if (!parsedYear || parsedYear < 1900 || parsedYear > 2100) {
      setError('Enter a valid model year.');
      return;
    }
    if (!make.trim() || !model.trim()) {
      setError('Make and model are required.');
      return;
    }

    navigation.navigate('VehicleProfile', {
      draft: {
        vin: vin.trim() || null,
        year: parsedYear,
        make: make.trim(),
        model: model.trim(),
        trim: trim.trim() || null,
      },
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ADD A VEHICLE</Text>
      <Text style={styles.sectionLabel}>Enter Vehicle Manually</Text>

      <TextInput style={styles.input} placeholder="Year" keyboardType="number-pad" value={year} onChangeText={setYear} />
      <TextInput style={styles.input} placeholder="Make" value={make} onChangeText={setMake} />
      <TextInput style={styles.input} placeholder="Model" value={model} onChangeText={setModel} />
      <TextInput style={styles.input} placeholder="Trim (optional)" value={trim} onChangeText={setTrim} />

      <Text style={styles.sectionLabel}>VIN (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter VIN"
        autoCapitalize="characters"
        value={vin}
        onChangeText={setVin}
      />
      <Text style={styles.helperText}>Scan VIN and auto-decode are coming in a later update.</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.primaryButton} onPress={handleContinue}>
        <Text style={styles.primaryButtonText}>CONTINUE</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 12, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  helperText: { fontSize: 12, color: '#888', marginBottom: 8 },
  error: { color: '#c62828', marginTop: 8, textAlign: 'center' },
  primaryButton: {
    marginTop: 20,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
