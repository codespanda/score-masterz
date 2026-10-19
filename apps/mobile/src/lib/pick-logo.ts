import { LOGO_SIZE, MAX_LOGO_BYTES } from '@score-masterz/data';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';

/**
 * Lets the user pick and square-crop an image, then shrinks it to LOGO_SIZE and
 * re-encodes it as WebP, lowering quality until it fits in MAX_LOGO_BYTES.
 * Returns null if the user cancelled.
 */
export async function pickOptimisedLogo(): Promise<ArrayBuffer | null> {
  const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
  if (picked.canceled || !picked.assets[0]) return null;
  const asset = picked.assets[0];

  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > LOGO_SIZE || asset.height > LOGO_SIZE) {
    context.resize(asset.width >= asset.height ? { width: LOGO_SIZE } : { height: LOGO_SIZE });
  }
  const image = await context.renderAsync();

  for (const compress of [0.9, 0.8, 0.65, 0.5, 0.35]) {
    const saved = await image.saveAsync({ format: SaveFormat.WEBP, compress });
    const data = await (await fetch(saved.uri)).arrayBuffer();
    if (data.byteLength <= MAX_LOGO_BYTES) return data;
  }
  throw new Error("Couldn't get this logo under 1 MB. Try a simpler image.");
}
