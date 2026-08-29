import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';
import { decodeVin, extractVinCandidate, VinDecodeError } from './vinDecode';

type Props = NativeStackScreenProps<AppStackParamList, 'ScanVin'>;
type ScanMode = 'barcode' | 'text';

export default function ScanVinScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<ScanMode>('barcode');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  async function handleVinFound(vin: string) {
    setIsProcessing(true);
    setError(null);
    try {
      const decoded = await decodeVin(vin);
      navigation.replace('ConfirmVehicle', { decoded });
    } catch (err) {
      setError(err instanceof VinDecodeError ? err.message : 'Could not decode this VIN. Try again.');
      setIsProcessing(false);
    }
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (isProcessing) return;
    const candidate = extractVinCandidate(result.data);
    if (!candidate) {
      setError("Couldn't read a valid VIN from that barcode. Try again or enter it manually.");
      return;
    }
    handleVinFound(candidate);
  }

  async function handleCapturePhoto() {
    if (isProcessing || !cameraRef.current) return;
    setIsProcessing(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) throw new Error('No photo captured.');

      const result = await TextRecognition.recognize(photo.uri);
      const candidate = extractVinCandidate(result.text);
      if (!candidate) {
        setError("Couldn't find a 17-character VIN in that photo. Get closer and make sure it's well lit, then try again.");
        setIsProcessing(false);
        return;
      }
      await handleVinFound(candidate);
    } catch (err) {
      setError(err instanceof VinDecodeError ? err.message : "Couldn't read that photo. Try again.");
      setIsProcessing(false);
    }
  }

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>Camera access is needed to scan a VIN.</Text>
        <Pressable style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>ALLOW CAMERA ACCESS</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('AddVehicle', undefined)}>
          <Text style={styles.linkText}>Enter VIN or vehicle details manually instead</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={mode === 'barcode' ? { barcodeTypes: ['code39', 'code128'] } : undefined}
        onBarcodeScanned={mode === 'barcode' ? handleBarcodeScanned : undefined}
      />

      <View style={styles.modeSwitch}>
        <ModeButton label="Barcode" active={mode === 'barcode'} onPress={() => setMode('barcode')} />
        <ModeButton label="Text" active={mode === 'text'} onPress={() => setMode('text')} />
      </View>

      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.instructions}>
          {mode === 'barcode'
            ? "Point your camera at the VIN barcode -- usually on the driver's-side door jamb."
            : "Line up the VIN plate at the base of the windshield (driver's side), then tap capture."}
        </Text>

        {isProcessing && <ActivityIndicator color="#fff" style={styles.spinner} />}
        {error && <Text style={styles.error}>{error}</Text>}

        {mode === 'text' && !isProcessing && (
          <Pressable style={styles.captureButton} onPress={handleCapturePhoto}>
            <View style={styles.captureButtonInner} />
          </Pressable>
        )}

        <Pressable onPress={() => navigation.navigate('AddVehicle', undefined)}>
          <Text style={styles.linkTextLight}>Enter manually instead</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ModeButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.modeButton, active && styles.modeButtonActive]} onPress={onPress}>
      <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  permissionText: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
  modeSwitch: {
    position: 'absolute',
    top: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 4,
  },
  modeButton: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 16 },
  modeButtonActive: { backgroundColor: '#fff' },
  modeButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modeButtonTextActive: { color: '#111' },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 48,
  },
  scanFrame: {
    position: 'absolute',
    top: '30%',
    width: '80%',
    height: 90,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
  },
  instructions: { color: '#fff', textAlign: 'center', fontSize: 14, marginBottom: 16 },
  spinner: { marginBottom: 16 },
  error: { color: '#ff8a80', textAlign: 'center', marginBottom: 16 },
  primaryButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  captureButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  captureButtonInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff' },
  linkText: { color: '#555', textAlign: 'center' },
  linkTextLight: { color: '#fff', textAlign: 'center', textDecorationLine: 'underline' },
});
