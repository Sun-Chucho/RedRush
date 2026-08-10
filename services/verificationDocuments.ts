import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export type VerificationRole = 'rider' | 'vendor';
export type VerificationDocumentKind = 'government-id' | 'license' | 'insurance' | 'business-registration';

export async function pickAndUploadVerificationDocument(
  userId: string,
  role: VerificationRole,
  kind: VerificationDocumentKind
) {
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user?.id !== userId) throw new Error('Please sign in again before uploading.');

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.9,
  });
  if (picked.canceled || !picked.assets[0]) return null;
  if (picked.assets[0].fileSize && picked.assets[0].fileSize! > 8 * 1024 * 1024) {
    throw new Error('Document image must be smaller than 8 MB.');
  }

  const prepared = await ImageManipulator.manipulateAsync(
    picked.assets[0].uri,
    [{ resize: { width: 1800 } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
  );
  const bytes = await fetch(prepared.uri).then(response => response.arrayBuffer());
  const path = `${userId}/${role}/${kind}-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('verification-documents')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;

  return path;
}

export async function createVerificationDocumentUrl(path: string) {
  const { data, error } = await supabase.storage
    .from('verification-documents')
    .createSignedUrl(path, 10 * 60);
  if (error) throw error;
  return data.signedUrl;
}
