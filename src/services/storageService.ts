import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

export interface UploadedAttachment {
  name: string;
  url: string;
  size: number;
  contentType: string;
}

export const MAX_STORAGE_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per file in Firebase Storage
export const MAX_FALLBACK_IMAGE_BYTES = 1_100_000; // ~1.45 MB Base64, fits cleanly inside Firestore 4.5 MB chunks
export const MAX_FALLBACK_ATTACHMENT_BYTES = 2_500_000; // ~3.33 MB Base64, fits inside Firestore 4.5 MB chunks

let loggedStorageFallbackNotice = false;

function sanitizePathSegment(segment: string): string {
  return (segment || 'anon')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'item';
}

function sanitizeFileName(name: string): string {
  const cleaned = (name || 'file')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned.slice(-80) || 'file';
}

function extensionFromMime(mime: string): string {
  const m = (mime || '').toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  if (m.includes('svg')) return 'svg';
  if (m.includes('pdf')) return 'pdf';
  if (m.includes('mp4')) return 'mp4';
  if (m.includes('webm')) return 'webm';
  return 'bin';
}

/**
 * Optimizes huge camera image files to crisp web-ready JPEG/WebP Blobs (max 1920px)
 * prior to uploading to Firebase Storage, while preserving animated GIFs & SVGs untouched.
 */
export async function optimizeImageFileToBlob(
  file: File,
  maxDimension: number = 1920,
  quality: number = 0.86
): Promise<{ blob: Blob; contentType: string; extension: string }> {
  const mime = (file.type || '').toLowerCase();
  if (mime === 'image/gif' || mime === 'image/svg+xml') {
    return {
      blob: file,
      contentType: file.type,
      extension: extensionFromMime(mime),
    };
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width <= maxDimension && height <= maxDimension && file.size <= 1_200_000) {
          URL.revokeObjectURL(objectUrl);
          resolve({
            blob: file,
            contentType: file.type || 'image/jpeg',
            extension: extensionFromMime(file.type || 'image/jpeg'),
          });
          return;
        }

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve({
            blob: file,
            contentType: file.type || 'image/jpeg',
            extension: extensionFromMime(file.type || 'image/jpeg'),
          });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const targetMime = mime === 'image/png' && file.size < 2_500_000 ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob) {
              resolve({
                blob,
                contentType: targetMime,
                extension: extensionFromMime(targetMime),
              });
            } else {
              resolve({
                blob: file,
                contentType: file.type || 'image/jpeg',
                extension: extensionFromMime(file.type || 'image/jpeg'),
              });
            }
          },
          targetMime,
          quality
        );
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve({
          blob: file,
          contentType: file.type || 'image/jpeg',
          extension: extensionFromMime(file.type || 'image/jpeg'),
        });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        blob: file,
        contentType: file.type || 'image/jpeg',
        extension: extensionFromMime(file.type || 'image/jpeg'),
      });
    };
    img.src = objectUrl;
  });
}

/**
 * Converts a `data:...;base64,...` URI into a Blob + MIME metadata.
 */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; contentType: string; extension: string } {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    throw new Error('Neveljavna oblika podatkovnega URL-ja.');
  }
  const header = dataUrl.slice(0, commaIdx);
  const body = dataUrl.slice(commaIdx + 1);
  const mimeMatch = header.match(/^data:([^;]+)/i);
  const contentType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const isBase64 = /;base64/i.test(header);

  const byteString = isBase64 ? atob(body) : decodeURIComponent(body);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  return {
    blob: new Blob([bytes], { type: contentType }),
    contentType,
    extension: extensionFromMime(contentType),
  };
}

export function isStorageUnauthorizedError(error: unknown): boolean {
  if (!error) return false;
  const errObj = error as { code?: string; status?: number; message?: string; serverResponse?: string };
  const code = String(errObj?.code || '');
  const message = error instanceof Error ? error.message : String(error);
  const serverResponse = String(errObj?.serverResponse || '');

  return (
    code === 'storage/unauthorized' ||
    code === 'storage/unauthenticated' ||
    errObj?.status === 403 ||
    message.includes('storage/unauthorized') ||
    message.includes('storage/unauthenticated') ||
    message.includes('Permission denied') ||
    message.includes('manjkajoča dovoljenja') ||
    message.includes('Nalaganje v Firebase Storage ni dovoljeno') ||
    serverResponse.includes('Permission denied') ||
    serverResponse.includes('"code": 403')
  );
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Pretvorba datoteke v podatkovni URL ni uspela.'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Branje datoteke ni uspelo.'));
    reader.readAsDataURL(blob);
  });
}

async function compressImageBlobForFallback(blob: Blob, maxBytes: number = MAX_FALLBACK_IMAGE_BYTES): Promise<Blob> {
  const mime = (blob.type || '').toLowerCase();
  if (blob.size <= maxBytes || mime === 'image/gif' || mime === 'image/svg+xml') {
    return blob;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = async () => {
      try {
        const attempts: Array<{ maxDim: number; quality: number }> = [
          { maxDim: 1440, quality: 0.80 },
          { maxDim: 1080, quality: 0.72 },
          { maxDim: 820, quality: 0.62 },
          { maxDim: 640, quality: 0.54 },
        ];
        let bestBlob: Blob = blob;

        for (const attempt of attempts) {
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (w > attempt.maxDim || h > attempt.maxDim) {
            if (w > h) {
              h = Math.round((h * attempt.maxDim) / w);
              w = attempt.maxDim;
            } else {
              w = Math.round((w * attempt.maxDim) / h);
              h = attempt.maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) break;
          ctx.drawImage(img, 0, 0, w, h);

          const candidate = await new Promise<Blob | null>((res) =>
            canvas.toBlob((b) => res(b), 'image/jpeg', attempt.quality)
          );
          if (candidate) {
            bestBlob = candidate;
            if (candidate.size <= maxBytes) {
              URL.revokeObjectURL(objectUrl);
              resolve(candidate);
              return;
            }
          }
        }
        URL.revokeObjectURL(objectUrl);
        resolve(bestBlob);
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve(blob);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(blob);
    };
    img.src = objectUrl;
  });
}

function logStorageFallbackOnce(reason?: unknown): void {
  if (loggedStorageFallbackNotice) return;
  loggedStorageFallbackNotice = true;
  console.warn(
    '[Storage Fallback] Firebase Storage trenutno zavrača neposredno nalaganje (storage/unauthorized). Uporabljam optimizirano varnostno shranjevanje v Firestore chunks. Za nalaganje večjih datotek (> 2,5 MB) objavite storage.rules v Firebase Console.',
    reason instanceof Error ? reason.message : reason
  );
}

function mapStorageUploadError(error: any): Error {
  const code = error?.code || '';
  const message = error instanceof Error ? error.message : String(error);

  if (code === 'storage/unauthorized' || code === 'storage/unauthenticated' || message.includes('unauthorized') || message.includes('Permission denied')) {
    return new Error(
      'Nalaganje v Firebase Storage ni dovoljeno (manjkajoča dovoljenja ali prijava). Preverite Firebase Storage pravila ali se prijavite.'
    );
  }
  if (code === 'storage/canceled') {
    return new Error('Nalaganje datoteke v Firebase Storage je bilo preklicano.');
  }
  if (code === 'storage/quota-exceeded') {
    return new Error('Kvota prostora za shranjevanje v Firebase Storage je bila presežena.');
  }
  if (code === 'storage/retry-limit-exceeded') {
    return new Error('Časovna omejitev nalaganja v Firebase Storage je potekla. Preverite internetno povezavo.');
  }
  return new Error(`Napaka pri nalaganju v Firebase Storage: ${message}`);
}

/**
 * Uploads any Blob or File to Firebase Storage and returns its permanent HTTPS download URL.
 */
export async function uploadBlobToFirebaseStorage(
  blobOrFile: Blob | File,
  storagePath: string,
  contentType?: string,
  onPercent?: (percent: number) => void
): Promise<string> {
  if (blobOrFile.size > MAX_STORAGE_FILE_BYTES) {
    throw new Error(
      `Datoteka presega največjo dovoljeno velikost za nalaganje (${Math.round(MAX_STORAGE_FILE_BYTES / (1024 * 1024))} MB).`
    );
  }

  const storageRef = ref(storage, storagePath);
  const metadata = contentType ? { contentType } : undefined;

  return new Promise((resolve, reject) => {
    onPercent?.(0);
    const uploadTask = uploadBytesResumable(storageRef, blobOrFile, metadata);
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onPercent && snapshot.totalBytes > 0) {
          onPercent(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        }
      },
      (error) => {
        reject(mapStorageUploadError(error));
      },
      async () => {
        try {
          onPercent?.(100);
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (err) {
          reject(mapStorageUploadError(err));
        }
      }
    );
  });
}

/**
 * Optimizes an image File (if huge) and uploads it to Firebase Storage, returning its download URL.
 * Automatically falls back to a compact Base64 Data URL (persisted cleanly via Firestore chunking)
 * if Firebase Storage bucket rules reject direct writes (`storage/unauthorized`).
 */
export async function uploadImageFileToStorage(
  file: File,
  folder: string,
  authorId: string = 'user',
  onPercent?: (percent: number) => void
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Izbrana datoteka ni veljavna slika.');
  }
  onPercent?.(0);
  const { blob, contentType, extension } = await optimizeImageFileToBlob(file);
  const safeFolder = folder.split('/').map(sanitizePathSegment).join('/');
  const safeAuthor = sanitizePathSegment(authorId);
  const baseName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
  const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = `${safeFolder}/${safeAuthor}/images/${uniqueId}-${baseName}.${extension}`;

  try {
    return await uploadBlobToFirebaseStorage(blob, storagePath, contentType, onPercent);
  } catch (err) {
    if (!isStorageUnauthorizedError(err)) {
      throw err;
    }
    logStorageFallbackOnce(err);
    const compactBlob = await compressImageBlobForFallback(blob, MAX_FALLBACK_IMAGE_BYTES);
    const dataUrl = await blobToDataUrl(compactBlob);
    onPercent?.(100);
    return dataUrl;
  }
}

/**
 * Uploads any file attachment (PDF, DOCX, ZIP, image, video, etc.) to Firebase Storage.
 * Falls back to Firestore-chunked Data URL for attachments <= 2.5 MB if Storage rules reject direct writes.
 */
export async function uploadAttachmentFileToStorage(
  file: File,
  folder: string,
  authorId: string = 'user',
  onPercent?: (percent: number) => void
): Promise<UploadedAttachment> {
  const safeFolder = folder.split('/').map(sanitizePathSegment).join('/');
  const safeAuthor = sanitizePathSegment(authorId);
  const safeName = sanitizeFileName(file.name);
  const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = `${safeFolder}/${safeAuthor}/files/${uniqueId}-${safeName}`;
  const contentType = file.type || 'application/octet-stream';

  try {
    const url = await uploadBlobToFirebaseStorage(file, storagePath, contentType, onPercent);
    return {
      name: file.name,
      url,
      size: file.size,
      contentType,
    };
  } catch (err) {
    if (!isStorageUnauthorizedError(err)) {
      throw err;
    }
    if (file.size > MAX_FALLBACK_ATTACHMENT_BYTES) {
      throw new Error(
        `Datoteka "${file.name}" presega 2,5 MB za varnostno shranjevanje brez Firebase Storage. Za nalaganje večjih datotek objavite storage.rules v Firebase Console (Storage → Rules).`
      );
    }
    logStorageFallbackOnce(err);
    const dataUrl = await blobToDataUrl(file);
    onPercent?.(100);
    return {
      name: file.name,
      url: dataUrl,
      size: file.size,
      contentType,
    };
  }
}

/**
 * If `value` is a Base64 `data:` URL, uploads it to Firebase Storage and returns the HTTPS download URL.
 * Existing HTTP(S) URLs are returned unchanged.
 * Falls back cleanly to the compact `data:` URL when Firebase Storage returns `storage/unauthorized`.
 */
export async function uploadDataUrlIfPresent(
  value: string | undefined,
  folder: string,
  authorId: string = 'user',
  onPercent?: (percent: number) => void
): Promise<string | undefined> {
  if (!value || typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!trimmed.startsWith('data:')) {
    return trimmed;
  }

  const { blob, contentType, extension } = dataUrlToBlob(trimmed);
  const safeFolder = folder.split('/').map(sanitizePathSegment).join('/');
  const safeAuthor = sanitizePathSegment(authorId);
  const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = `${safeFolder}/${safeAuthor}/media/${uniqueId}.${extension}`;

  try {
    return await uploadBlobToFirebaseStorage(blob, storagePath, contentType, onPercent);
  } catch (err) {
    if (!isStorageUnauthorizedError(err)) {
      throw err;
    }
    logStorageFallbackOnce(err);
    if (contentType.startsWith('image/') && blob.size > MAX_FALLBACK_IMAGE_BYTES) {
      const compactBlob = await compressImageBlobForFallback(blob, MAX_FALLBACK_IMAGE_BYTES);
      const compactDataUrl = await blobToDataUrl(compactBlob);
      onPercent?.(100);
      return compactDataUrl;
    }
    onPercent?.(100);
    return trimmed;
  }
}

/**
 * Scans rich-text HTML content for inline Base64 `data:` media URLs (`src="data:..."` or `href="data:..."`),
 * uploads each unique blob to Firebase Storage, and replaces the embedded Base64 data with the Storage HTTPS URL.
 */
export async function replaceDataUrlsInHtmlWithStorage(
  html: string,
  folder: string,
  authorId: string = 'user',
  onPercent?: (percent: number) => void
): Promise<string> {
  if (!html || !html.includes('data:')) return html;

  const dataUrlRegex = /(["'])(data:(?:image|video|audio|application)\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)\1/g;
  const uniqueDataUrls = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = dataUrlRegex.exec(html)) !== null) {
    if (match[2]) uniqueDataUrls.add(match[2]);
  }

  if (uniqueDataUrls.size === 0) return html;

  const items = Array.from(uniqueDataUrls);
  const itemProgress = new Array<number>(items.length).fill(0);
  const emitOverall = () => {
    if (!onPercent) return;
    const sum = itemProgress.reduce((a, b) => a + b, 0);
    onPercent(Math.round(sum / items.length));
  };

  const replacements = new Map<string, string>();
  await Promise.all(
    items.map(async (dataUrl, index) => {
      try {
        const uploadedUrl = await uploadDataUrlIfPresent(dataUrl, `${folder}/inline`, authorId, (pct) => {
          itemProgress[index] = pct;
          emitOverall();
        });
        if (uploadedUrl && uploadedUrl !== dataUrl) {
          replacements.set(dataUrl, uploadedUrl);
        }
      } catch (err) {
        if (!isStorageUnauthorizedError(err)) {
          throw err;
        }
        logStorageFallbackOnce(err);
      }
      itemProgress[index] = 100;
      emitOverall();
    })
  );

  let updatedHtml = html;
  for (const [dataUrl, downloadUrl] of replacements.entries()) {
    updatedHtml = updatedHtml.split(dataUrl).join(downloadUrl);
  }
  return updatedHtml;
}
