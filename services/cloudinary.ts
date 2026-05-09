import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

type UploadKind = 'dish' | 'profile' | 'vendor';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

const LIMITS: Record<UploadKind, { maxInputBytes: number; maxWidth: number; quality: number; folder: string }> = {
  dish: { maxInputBytes: 5 * 1024 * 1024, maxWidth: 1200, quality: 0.78, folder: 'redrush/dishes' },
  profile: { maxInputBytes: 5 * 1024 * 1024, maxWidth: 900, quality: 0.72, folder: 'redrush/profiles' },
  vendor: { maxInputBytes: 5 * 1024 * 1024, maxWidth: 1400, quality: 0.78, folder: 'redrush/vendors' },
};

export function isCloudinaryConfigured() {
  return !!CLOUD_NAME && !!UPLOAD_PRESET;
}

function getFileName(uri: string, kind: UploadKind) {
  const rawName = uri.split('/').pop()?.split('?')[0];
  return rawName && rawName.includes('.') ? rawName : `${kind}-${Date.now()}.jpg`;
}

async function uriToUploadFile(uri: string, name: string) {
  if (Platform.OS === 'web') {
    return fetch(uri).then(response => response.blob());
  }

  return {
    uri,
    name,
    type: 'image/jpeg',
  } as unknown as Blob;
}

export async function pickCompressAndUploadImage(kind: UploadKind) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured. Add EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET.');
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Allow photo library access to upload an image.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.9,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const limit = LIMITS[kind];

  if (asset.fileSize && asset.fileSize > limit.maxInputBytes) {
    throw new Error('Image is too large. Please choose an image under 5 MB.');
  }

  const resized = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: limit.maxWidth } }],
    {
      compress: limit.quality,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  const formData = new FormData();
  formData.append('file', await uriToUploadFile(resized.uri, getFileName(resized.uri, kind)));
  formData.append('upload_preset', UPLOAD_PRESET!);
  formData.append('folder', limit.folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.secure_url) {
    throw new Error(payload.error?.message || 'Image upload failed. Please try again.');
  }

  return String(payload.secure_url);
}
