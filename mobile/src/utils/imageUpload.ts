import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../services/firebase';

/**
 * Pick an image from the device library and upload it to Firebase Storage.
 * @param storagePath  Full path inside the Storage bucket (e.g. `barbershops/abc/gallery/photo.jpg`)
 * @returns The public download URL, or `null` if the user cancelled.
 */
export async function pickAndUploadImage(storagePath: string): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Se necesitan permisos para acceder a la galería.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.7,
  });

  if (result.canceled || result.assets.length === 0) return null;

  const uri = result.assets[0].uri;
  const response = await fetch(uri);
  const blob = await response.blob();

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob);

  return getDownloadURL(storageRef);
}

/**
 * Delete a file from Firebase Storage by its full download URL.
 * Extracts the storage path from the URL before creating the ref.
 */
export async function deleteStorageFile(downloadUrl: string): Promise<void> {
  // Download URLs look like:
  // https://firebasestorage.googleapis.com/v0/b/BUCKET/o/ENCODED_PATH?alt=media&token=...
  const pathMatch = decodeURIComponent(downloadUrl).match(/\/o\/(.+?)(\?|$)/);
  if (!pathMatch) {
    throw new Error('Could not extract storage path from download URL');
  }
  const storagePath = pathMatch[1];
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}
