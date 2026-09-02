import { Image, StyleSheet, Text, View } from 'react-native';
import type { Vehicle } from '@fixorreplace/types';

/** Photo if the vehicle has one, otherwise a circle with its first initial. */
export default function VehiclePhotoCircle({ vehicle, size = 48 }: { vehicle: Vehicle; size?: number }) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (vehicle.photoUrl) {
    return <Image source={{ uri: vehicle.photoUrl }} style={[styles.image, dimension]} />;
  }

  const initial = (vehicle.nickname ?? vehicle.make).charAt(0).toUpperCase();
  return (
    <View style={[styles.placeholder, dimension]}>
      <Text style={[styles.placeholderText, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: '#e2e2e2' },
  placeholder: { backgroundColor: '#e2e2e2', alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontWeight: '800', color: '#888' },
});
