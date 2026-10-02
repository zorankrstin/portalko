/**
 * Utility to process user-uploaded image files in browser:
 * Converts and scales image using an in-memory Canvas to a high-quality, lightweight
 * JPEG Base64 Data URL (max 1200x900, quality 0.82) so it permanently persists
 * in Firestore documents without requiring external bucket configuration or expiring blob URLs.
 */
export function compressImageFileToDataUrl(file: File, maxDimension: number = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Izbrana datoteka ni veljavna slika.'));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
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
            return resolve(e.target?.result as string);
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(dataUrl);
        } catch {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Napaka pri nalaganju slike.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Napaka pri branju datoteke.'));
    reader.readAsDataURL(file);
  });
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
