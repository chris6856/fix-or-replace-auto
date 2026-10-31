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
import { decodeVin, isValidVinFormat, VinDecodeError, type DecodedVehicle } from '../garage/vinDecode';
import { marketCheckValuationProvider } from '../decision/marketCheckValuationProvider';
import { evaluatePurchase } from './evaluatePurchase';

type Props = NativeStackScreenProps<AppStackParamList, 'PurchaseCheck'>;

export default function PurchaseCheckScreen({ route, navigation }: Props) {
  const [decoded, setDecoded] = useState<DecodedVehicle | null>(route.params?.decoded ?? null);
  const [vin, setVin] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);
  const [mileage, setMileage] = useState('');
  const [zip, setZip] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function handleDecodeVin() {
    setError(null);
    if (!isValidVinFormat(vin.trim())) {
      setError("That doesn't look like a valid VIN -- check for typos (VINs never contain I, O, or Q).");
      return;
    }
    setIsDecoding(true);
    try {
      const result = await decodeVin(vin);
      setDecoded(result);
    } catch (err) {
      setError(err instanceof VinDecodeError ? err.message : 'Could not decode this VIN.');
    } finally {
      setIsDecoding(false);
    }
  }

  async function handleCheck() {
    if (!decoded) return;
    const parsedMileage = Number(mileage);
    if (!Number.isFinite(parsedMileage) || parsedMileage <= 0) {
      setError('Enter the mileage.');
      return;
    }
    if (!/^\d{5}$/.test(zip.trim())) {
      setError('Enter a 5-digit ZIP code.');
      return;
    }
    const parsedAskingPrice = Number(askingPrice);
    if (!Number.isFinite(parsedAskingPrice) || parsedAskingPrice <= 0) {
      setError('Enter the asking price.');
      return;
    }

    setError(null);
    setIsChecking(true);
    try {
      const valuation = await marketCheckValuationProvider.getValuation({
        vin: decoded.vin,
        year: decoded.year,
        make: decoded.make,
        model: decoded.model,
        trim: decoded.trim,
        mileage: parsedMileage,
        zip: zip.trim(),
        condition: 'good',
      });

      const { verdict } = evaluatePurchase(
        parsedAskingPrice,
        valuation.workingValue,
        valuation.valueLow,
        valuation.valueHigh,
      );

      navigation.navigate('PurchaseCheckResult', {
        decoded,
        mileage: parsedMileage,
        zip: zip.trim(),
        askingPrice: parsedAskingPrice,
        marketValue: valuation.workingValue,
        valueLow: valuation.valueLow,
        valueHigh: valuation.valueHigh,
        verdict,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not look up a market value for this vehicle.');
    } finally {
      setIsChecking(false);
    }
  }

  if (!decoded) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>WHAT ARE YOU LOOKING AT?</Text>
        <Text style={styles.subtitle}>
          Enter the VIN from the listing -- a real market value needs the exact vehicle, not just the year, make,
          and model.
        </Text>

        <Text style={styles.sectionLabel}>Recommended</Text>
        <Pressable
          style={styles.scanButton}
          onPress={() => navigation.navigate('ScanVin', { purpose: 'purchaseCheck' })}
        >
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

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.primaryButton, vin.trim().length !== 17 && styles.buttonDisabled]}
          onPress={handleDecodeVin}
          disabled={vin.trim().length !== 17 || isDecoding}
        >
          {isDecoding ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>LOOK UP VIN</Text>}
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>IS THIS A FAIR PRICE?</Text>

      <View style={styles.vehicleCard}>
        <Text style={styles.vehicleLabel}>
          {decoded.year} {decoded.make} {decoded.model}
          {decoded.trim ? ` ${decoded.trim}` : ''}
        </Text>
        <Pressable onPress={() => setDecoded(null)} hitSlop={10}>
          <Text style={styles.changeLink}>Not the right vehicle?</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Mileage</Text>
      <TextInput style={styles.input} placeholder="0" keyboardType="number-pad" value={mileage} onChangeText={setMileage} />

      <Text style={styles.sectionLabel}>ZIP Code</Text>
      <TextInput
        style={styles.input}
        placeholder="5-digit ZIP"
        keyboardType="number-pad"
        maxLength={5}
        value={zip}
        onChangeText={setZip}
      />

      <Text style={styles.sectionLabel}>Asking Price</Text>
      <TextInput
        style={styles.input}
        placeholder="$ 0"
        keyboardType="decimal-pad"
        value={askingPrice}
        onChangeText={setAskingPrice}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.primaryButton} onPress={handleCheck} disabled={isChecking}>
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
  buttonDisabled: { opacity: 0.4 },
  error: { color: '#c62828', marginTop: 8, marginBottom: 8, textAlign: 'center' },
  primaryButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  vehicleCard: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  vehicleLabel: { fontSize: 16, fontWeight: '700' },
  changeLink: { fontSize: 13, color: '#666', textDecorationLine: 'underline', marginTop: 6 },
});
