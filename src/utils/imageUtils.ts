/**
 * Utility to process user-uploaded image files in browser:
 * Converts and scales image using an in-memory Canvas to a high-quality, lightweight
 * JPEG Base64 Data URL (max 1200px, adaptive quality starting at 0.82) so it permanently
 * persists in Firestore documents without requiring external bucket configuration or expiring blob URLs.
 */
export function compressImageFileToDataUrl(
  file: File,
  maxDimension: number = 1200,
  maxTargetChars: number = 550_000
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Izbrana datoteka ni veljavna slika.'));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(rawDataUrl);
          }
          ctx.drawImage(img, 0, 0, width, height);

          const qualities = [0.82, 0.72, 0.62, 0.5];
          let dataUrl = canvas.toDataURL('image/jpeg', qualities[0]);
          for (let i = 1; i < qualities.length && dataUrl.length > maxTargetChars; i++) {
            dataUrl = canvas.toDataURL('image/jpeg', qualities[i]);
          }

          // If still oversized for huge panoramas, downscale once more
          if (dataUrl.length > maxTargetChars && (width > 900 || height > 900)) {
            const scale = 900 / Math.max(width, height);
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            const ctx2 = canvas.getContext('2d');
            if (ctx2) {
              ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
              dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            }
          }

          resolve(dataUrl);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => reject(new Error('Napaka pri nalaganju slike.'));
      img.src = rawDataUrl;
    };
    reader.onerror = () => reject(new Error('Napaka pri branju datoteke.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Estimates the UTF-8 byte size of a Firestore document payload including
 * conservative document field metadata overhead.
 */
export function estimatePayloadUtf8Bytes(data: unknown): number {
  try {
    const json = JSON.stringify(data) || '';
    const utf8Bytes = typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(json).length
      : unescape(encodeURIComponent(json)).length;
    const fieldCount = data && typeof data === 'object' ? Object.keys(data as Record<string, unknown>).length : 0;
    return utf8Bytes + 128 + fieldCount * 32;
  } catch {
    return 0;
  }
}

export function formatBytesSlovenian(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2).replace('.', ',')} MB`;
}

/**
 * Checks whether an avatar string is a dummy/placeholder generator service
 * (such as ui-avatars.com, dicebear.com, avatar.iran.liara.run, etc.)
 */
export function isDummyAvatar(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return true;
  return (
    trimmed.includes('ui-avatars.com') ||
    trimmed.includes('dicebear.com') ||
    trimmed.includes('avatar.iran.liara.run') ||
    trimmed.includes('gravatar.com/avatar/placeholder') ||
    trimmed.includes('placeholder.com') ||
    trimmed.includes('dummyimage.com') ||
    trimmed.includes('via.placeholder') ||
    trimmed.includes('/placeholder')
  );
}

/**
 * Returns true if an avatar URL is an authentic image uploaded or set by a user
 * (e.g. Base64 Data URL, Google account photo, or user-uploaded URL),
 * and NOT an artificial dummy placeholder service.
 */
export function isUserUploadedAvatar(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (isDummyAvatar(trimmed)) return false;
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  );
}

/**
 * Fallback image references (revoked hardcoded stock photos; defaults to empty, configured via Admin Dashboard)
 */
export const DEFAULT_EVENT_IMAGE = '';
export const DEFAULT_POST_IMAGE = '';
