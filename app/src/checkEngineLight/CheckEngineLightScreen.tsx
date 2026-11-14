import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { diagnoseCheckEngineLight } from './diagnoseCheckEngineLight';
import { AFFILIATE_SCANNERS, AFFILIATE_DISCLOSURE } from './affiliateScanners';

type Props = NativeStackScreenProps<AppStackParamList, 'CheckEngineLight'>;
type Flashing = 'steady' | 'flashing' | 'not_sure';

const DTC_PATTERN = /^[PCBU]\d{4}$/;

export default function CheckEngineLightScreen({ route, navigation }: Props) {
  const { vehicleId } = route.params;
  const { data: vehicle } = useVehicle(vehicleId);
  const [hasCodes, setHasCodes] = useState<boolean | null>(null);
  const [codes, setCodes] = useState('');
  const [flashing, setFlashing] = useState<Flashing>('not_sure');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function handleCheck() {
    if (!vehicle) return;
    const parsedCodes = codes
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    if (parsedCodes.length === 0) {
      setError('Enter at least one code.');
      return;
    }
    if (!parsedCodes.some((c) => DTC_PATTERN.test(c))) {
      setError("Those don't look like typical codes (e.g. P0300) -- double-check for typos, or continue anyway.");
    } else {
      setError(null);
    }

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
      const result = await diagnoseCheckEngineLight(
        vehicleDescription,
        parsedCodes,
        flashing === 'flashing',
        notes.trim() || null,
      );
      setIsChecking(false);
      navigation.navigate('CheckEngineLightResult', {
        vehicleId,
        dtcCodes: parsedCodes,
        isFlashing: flashing === 'flashing',
        symptomNotes: notes.trim() || null,
        possibleCauses: result.possibleCauses,
        urgentSafetyNote: result.urgentSafetyNote,
      });
    } catch (err) {
      setIsChecking(false);
      setError(err instanceof Error ? err.message : 'Could not check these codes right now.');
    }
  }

  if (hasCodes === null) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>CHECK ENGINE LIGHT ON?</Text>
        <Text style={styles.subtitle}>
          Have you already pulled the diagnostic trouble codes with an OBD2 scanner?
        </Text>

        <Pressable style={styles.primaryButton} onPress={() => setHasCodes(true)}>
          <Text style={styles.primaryButtonText}>YES, I HAVE THE CODES</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => setHasCodes(false)}>
          <Text style={styles.secondaryButtonText}>NO, I DON'T HAVE A SCANNER</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (hasCodes === false) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>GET A SCANNER FIRST</Text>
        <Text style={styles.subtitle}>
          You'll need the diagnostic trouble codes to check what's going on. A basic Bluetooth OBD2 scanner works
          with a free phone app.
        </Text>

        {AFFILIATE_SCANNERS.map((scanner) => (
          <View key={scanner.name} style={styles.scannerCard}>
            <Image source={scanner.image} style={styles.scannerImage} resizeMode="contain" />
            <Text style={styles.scannerTier}>{scanner.tier.toUpperCase()}</Text>
            <Text style={styles.scannerName}>{scanner.name}</Text>
            <Text style={styles.scannerPrice}>{scanner.price}</Text>
            <Text style={styles.scannerDescription}>{scanner.description}</Text>
            {scanner.affiliateUrl ? (
              <Pressable style={styles.scannerButton} onPress={() => Linking.openURL(scanner.affiliateUrl!)}>
                <Text style={styles.scannerButtonText}>VIEW ON AMAZON</Text>
              </Pressable>
            ) : (
              <View style={[styles.scannerButton, styles.scannerButtonDisabled]}>
                <Text style={styles.scannerButtonTextDisabled}>LINK COMING SOON</Text>
              </View>
            )}
          </View>
        ))}

        <Text style={styles.disclosure}>{AFFILIATE_DISCLOSURE}</Text>

        <Pressable style={styles.secondaryButton} onPress={() => setHasCodes(true)}>
          <Text style={styles.secondaryButtonText}>I HAVE CODES NOW</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>ENTER YOUR CODES</Text>

      <Text style={styles.sectionLabel}>Diagnostic Trouble Codes</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. P0300, P0171"
        autoCapitalize="characters"
        value={codes}
        onChangeText={setCodes}
      />

      <Text style={styles.sectionLabel}>Is the check engine light flashing?</Text>
      <View style={styles.flashingRow}>
        <FlashingButton label="Steady" active={flashing === 'steady'} onPress={() => setFlashing('steady')} />
        <FlashingButton label="Flashing" active={flashing === 'flashing'} onPress={() => setFlashing('flashing')} />
        <FlashingButton label="Not Sure" active={flashing === 'not_sure'} onPress={() => setFlashing('not_sure')} />
      </View>

      <Text style={styles.sectionLabel}>Anything else you've noticed? (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="e.g. Rough idle, loss of power when accelerating"
        multiline
        numberOfLines={3}
        value={notes}
        onChangeText={setNotes}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.primaryButton} onPress={handleCheck} disabled={isChecking || !vehicle}>
        {isChecking ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>CHECK CODES</Text>}
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FlashingButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.flashingButton, active && styles.flashingButtonActive]} onPress={onPress}>
      <Text style={[styles.flashingButtonText, active && styles.flashingButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 16, marginBottom: 8 },
  input: {
    color: '#111',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  flashingRow: { flexDirection: 'row', gap: 8 },
  flashingButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashingButtonActive: { backgroundColor: '#111', borderColor: '#111' },
  flashingButtonText: { fontSize: 13, fontWeight: '700', color: '#111' },
  flashingButtonTextActive: { color: '#fff' },
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
  secondaryButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#111' },
  scannerCard: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  scannerImage: {
    width: 140,
    height: 140,
    marginBottom: 10,
  },
  scannerTier: { fontSize: 11, fontWeight: '800', color: '#b8860b', letterSpacing: 0.5 },
  scannerName: { fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  scannerPrice: { fontSize: 18, fontWeight: '800', marginTop: 6 },
  scannerDescription: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 6 },
  scannerButton: {
    marginTop: 14,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  scannerButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  scannerButtonDisabled: { backgroundColor: '#eee' },
  scannerButtonTextDisabled: { color: '#999', fontSize: 13, fontWeight: '700' },
  disclosure: { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 16, lineHeight: 15 },
});
