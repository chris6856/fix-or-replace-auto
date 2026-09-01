import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useVehicle } from '../garage/useVehicles';
import { diagnoseSymptom } from './diagnoseSymptom';

type Props = NativeStackScreenProps<AppStackParamList, 'SymptomCheck'>;

export default function SymptomCheckScreen({ route, navigation }: Props) {
  const { vehicleId } = route.params;
  const { data: vehicle } = useVehicle(vehicleId);
  const [symptom, setSymptom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function handleCheck() {
    if (!vehicle) return;
    if (!symptom.trim()) {
      setError('Describe what you noticed.');
      return;
    }

    setError(null);
    setIsChecking(true);

    const vehicleDescription = [
      `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      vehicle.trim,
      vehicle.engine,
      vehicle.drivetrain,
    ]
      .filter(Boolean)
      .join(', ');

    try {
      const result = await diagnoseSymptom(vehicleDescription, symptom.trim());
      setIsChecking(false);
      navigation.navigate('SymptomResult', {
        vehicleId,
        symptomDescription: symptom.trim(),
        possibleIssues: result.possibleIssues,
        urgentSafetyNote: result.urgentSafetyNote,
      });
    } catch (err) {
      setIsChecking(false);
      setError(err instanceof Error ? err.message : 'Could not check this symptom right now.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WHAT DID YOU NOTICE?</Text>
      <Text style={styles.subtitle}>
        Describe a sound, feeling, smell, or warning light. We'll suggest possible causes to ask a mechanic about --
        this isn't a diagnosis.
      </Text>

      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder='e.g. "Grinding noise and vibration when I press the brake pedal, especially at low speed"'
        multiline
        numberOfLines={5}
        value={symptom}
        onChangeText={setSymptom}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.primaryButton} onPress={handleCheck} disabled={isChecking || !vehicle}>
        {isChecking ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>CHECK SYMPTOM</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
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
