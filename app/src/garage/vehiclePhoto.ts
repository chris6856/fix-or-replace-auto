import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

/**
 * Opens the photo library, lets the user crop to a square, and uploads
 * the result to the vehicle-photos Storage bucket at
 * {userId}/{vehicleId}.jpg -- that path convention is what the bucket's
 * storage policies check against to scope writes to the owner. Returns
 * null if the user cancels or denies the permission (not an error case).
 */
export async function pickAndUploadVehiclePhoto(vehicleId: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library access is needed to add a vehicle photo.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });
  if (result.canceled || !result.assets[0]) return null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Not signed in');

  const response = await fetch(result.assets[0].uri);
  const blob = await response.blob();
  const arrayBuffer = await new Response(blob).arrayBuffer();

  const path = `${user.id}/${vehicleId}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('vehicle-photos')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('vehicle-photos').getPublicUrl(path);

  // Cache-bust: the path (and therefore the URL) stays the same when a
  // photo is replaced, so without this a device that already cached the
  // old image would keep showing it.
  return `${publicUrl}?t=${Date.now()}`;
}
