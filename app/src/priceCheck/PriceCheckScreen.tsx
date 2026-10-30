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
import type { AppStackParamList } from '../navigation/RootNavigator';
import { useVehicle } from '../garage/useVehicles';
import { checkRepairPrice } from './checkRepairPrice';

type Props = NativeStackScreenProps<AppStackParamList, 'PriceCheck'>;

export default function PriceCheckScreen({ route, navigation }: Props) {
  const { vehicleId } = route.params;
  const { data: vehicle } = useVehicle(vehicleId);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function handleCheck() {
    if (!vehicle) return;
    if (!description.trim()) {
      setError("Describe what's being repaired.");
      return;
    }
    const quotedPrice = Number(price);
    if (!Number.isFinite(quotedPrice) || quotedPrice <= 0) {
      setError('Enter the price you were quoted.');
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
      const result = await checkRepairPrice(vehicleDescription, description.trim(), quotedPrice);
      setIsChecking(false);
      navigation.navigate('PriceCheckResult', {
        vehicleId,
        repairDescription: description.trim(),
        quotedPrice,
        typicalLowCost: result.typicalLowCost,
        typicalHighCost: result.typicalHighCost,
        verdict: result.verdict,
        explanation: result.explanation,
      });
    } catch (err) {
      setIsChecking(false);
      setError(err instanceof Error ? err.message : 'Could not check this price right now.');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>WHAT WERE YOU QUOTED?</Text>
      <Text style={styles.subtitle}>
        Enter a repair a shop has already diagnosed and the price they quoted you. We'll compare it to a typical
        cost range -- this isn't a verdict on this specific shop.
      </Text>

      <Text style={styles.sectionLabel}>What's being repaired?</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder='e.g. "Brake job, new rotors and pads, front and rear"'
        multiline
        numberOfLines={5}
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.sectionLabel}>Price You Were Quoted</Text>
      <TextInput
        style={styles.input}
        placeholder="$ 0"
        keyboardType="decimal-pad"
        value={price}
        onChangeText={setPrice}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.primaryButton} onPress={handleCheck} disabled={isChecking || !vehicle}>
        {isChecking ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>CHECK PRICE</Text>}
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 12, marginBottom: 8 },
  input: {
    color: '#111',
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
