import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<AppStackParamList, 'ConfirmVehicle'>;

export default function ConfirmVehicleScreen({ route, navigation }: Props) {
  const { decoded } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>We found:</Text>
      <Text style={styles.title}>
        {decoded.year} {decoded.make} {decoded.model}
        {decoded.trim ? ` ${decoded.trim}` : ''}
      </Text>

      <View style={styles.detailsList}>
        {decoded.engine && <Text style={styles.detail}>{decoded.engine}</Text>}
        {decoded.body && <Text style={styles.detail}>{decoded.body}</Text>}
        {decoded.drivetrain && <Text style={styles.detail}>{decoded.drivetrain}</Text>}
      </View>

      <Text style={styles.question}>Is this your vehicle?</Text>

      <Pressable
        style={styles.primaryButton}
        onPress={() =>
          navigation.navigate('VehicleProfile', {
            draft: {
              vin: decoded.vin,
              year: decoded.year,
              make: decoded.make,
              model: decoded.model,
              trim: decoded.trim,
            },
          })
        }
      >
        <Text style={styles.primaryButtonText}>YES</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() =>
          navigation.navigate('AddVehicle', {
            prefill: {
              vin: decoded.vin,
              year: decoded.year,
              make: decoded.make,
              model: decoded.model,
              trim: decoded.trim,
            },
          })
        }
      >
        <Text style={styles.secondaryButtonText}>EDIT</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  label: { fontSize: 14, color: '#666', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
  detailsList: { marginBottom: 32 },
  detail: { fontSize: 15, color: '#555', marginBottom: 2 },
  question: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  primaryButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '700', color: '#333' },
});
