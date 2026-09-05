import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { decodeVin, isValidVinFormat, VinDecodeError } from './vinDecode';

type Props = NativeStackScreenProps<AppStackParamList, 'AddVehicle'>;

export default function AddVehicleScreen({ navigation, route }: Props) {
  const prefill = route.params?.prefill;

  const [vin, setVin] = useState(prefill?.vin ?? '');
  const [year, setYear] = useState(prefill ? String(prefill.year) : '');
  const [make, setMake] = useState(prefill?.make ?? '');
  const [model, setModel] = useState(prefill?.model ?? '');
  const [trim, setTrim] = useState(prefill?.trim ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);

  async function handleDecodeVin() {
    setError(null);
    if (!isValidVinFormat(vin.trim())) {
      setError("That doesn't look like a valid VIN -- check for typos (VINs never contain I, O, or Q).");
      return;
    }
    setIsDecoding(true);
    try {
      const decoded = await decodeVin(vin);
      navigation.navigate('ConfirmVehicle', { decoded });
    } catch (err) {
      setError(err instanceof VinDecodeError ? err.message : 'Could not decode this VIN.');
    } finally {
      setIsDecoding(false);
    }
  }

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>ADD A VEHICLE</Text>

      <Text style={styles.sectionLabel}>Recommended</Text>
      <Pressable style={styles.scanButton} onPress={() => navigation.navigate('ScanVin')}>
        <Text style={styles.scanButtonText}>SCAN VIN</Text>
      </Pressable>

      <Text style={styles.orText}>or</Text>

      <Text style={styles.sectionLabel}>Enter VIN</Text>
      <TextInput
        style={styles.input}
        placeholder="17-character VIN"
        autoCapitalize="characters"
        maxLength={17}
        value={vin}
        onChangeText={setVin}
      />
      <Pressable
        style={[styles.secondaryButton, vin.trim().length !== 17 && styles.buttonDisabled]}
        onPress={handleDecodeVin}
        disabled={vin.trim().length !== 17 || isDecoding}
      >
        {isDecoding ? <ActivityIndicator /> : <Text style={styles.secondaryButtonText}>LOOK UP VIN</Text>}
      </Pressable>

      <Text style={styles.orText}>or</Text>

      <Text style={styles.sectionLabel}>Enter Vehicle Manually</Text>
      <TextInput style={styles.input} placeholder="Year" keyboardType="number-pad" value={year} onChangeText={setYear} />
      <TextInput style={styles.input} placeholder="Make" value={make} onChangeText={setMake} />
      <TextInput style={styles.input} placeholder="Model" value={model} onChangeText={setModel} />
      <TextInput style={styles.input} placeholder="Trim (optional)" value={trim} onChangeText={setTrim} />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.primaryButton} onPress={handleContinue}>
        <Text style={styles.primaryButtonText}>CONTINUE</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 12, marginBottom: 8 },
  orText: { textAlign: 'center', color: '#888', marginVertical: 12 },
  input: {
    color: '#111',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  scanButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#111' },
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
