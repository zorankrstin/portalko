import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Role } from '../types';

export interface DirectoryCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  order: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export type DirectoryEntryStatus = 'published' | 'pending' | 'rejected';

export interface DirectoryEntry {
  id: string;
  slug?: string;
  name: string;
  url: string;
  domain: string;
  description: string;
  categoryId: string;
  categoryName: string;
  location?: string;
  logoUrl?: string;
  tags?: string[];
  status: DirectoryEntryStatus;
  isSuggestion: boolean;
  authorId: string;
  authorName: string;
  authorRole: Role;
  createdAt: string;
  updatedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  isVerified?: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  isFeatured?: boolean;
  notifiedStatus?: 'published' | 'rejected';
  notifiedAt?: string;
}

export interface AiDirectorySuggestion {
  suggestedCategoryId: string;
  suggestedCategoryName: string;
  suggestedTags: string[];
  reason: string;
}

export const DIRECTORY_CATEGORIES_COLLECTION = 'directory_categories';
export const DIRECTORY_ENTRIES_COLLECTION = 'directory_entries';

export const DEFAULT_DIRECTORY_CATEGORIES: DirectoryCategory[] = [
  {
    id: 'cat-trgovine',
    name: 'Trgovine in e-nakupovanje',
    slug: 'trgovine-in-e-nakupovanje',
    description: 'Priljubljene slovenske spletne trgovine in trgovske verige',
    order: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-mediji',
    name: 'Mediji in novice',
    slug: 'mediji-in-novice',
    description: 'Informativni portali, televizije, radijske postaje in časopisi',
    order: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-finance',
    name: 'Banke in finance',
    slug: 'banke-in-finance',
    description: 'Slovenske banke, zavarovalnice in finančne storitve',
    order: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-telekom',
    name: 'Telekomunikacije in IT',
    slug: 'telekomunikacije-in-it',
    description: 'Operaterji, tehnološka podjetja in digitalne storitve',
    order: 4,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-turizem',
    name: 'Turizem in gostinstvo',
    slug: 'turizem-in-gostinstvo',
    description: 'Destinacije, nastanitve, terme in kulinarična ponudba',
    order: 5,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-avtomoto',
    name: 'Avto-moto in mobilnost',
    slug: 'avto-moto-in-mobilnost',
    description: 'Avtomobilski portali, servisi, goriva in prevozi',
    order: 6,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat-storitve',
    name: 'Javne storitve in obrt',
    slug: 'javne-storitve-in-obrt',
    description: 'Uporabni portali, pošta, logistika in lokalne storitve',
    order: 7,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const SEED_DIRECTORY_ENTRIES: DirectoryEntry[] = [
  {
    id: 'dir-mimovrste',
    name: 'Mimovrste',
    url: 'https://www.mimovrste.com',
    domain: 'mimovrste.com',
    description: 'Ena največjih slovenskih spletnih trgovin z elektroniko, gospodinjskimi aparati, športno opremo in izdelki za dom.',
    categoryId: 'cat-trgovine',
    categoryName: 'Trgovine in e-nakupovanje',
    location: 'Ljubljana',
    status: 'published',
    isSuggestion: false,
    authorId: 'system',
    authorName: 'Uredništvo Portalko',
    authorRole: 'superadmin',
    isVerified: true,
    verifiedBy: 'Uredništvo Portalko',
    isFeatured: true,
    createdAt: '2026-01-10T09:00:00.000Z',
  },
  {
    id: 'dir-mercator',
    name: 'Mercator',
    url: 'https://www.mercator.si',
    domain: 'mercator.si',
    description: 'Vodilni slovenski trgovec z živili, spletno trgovino in programom zvestobe Pika.',
    categoryId: 'cat-trgovine',
    categoryName: 'Trgovine in e-nakupovanje',
    location: 'Ljubljana',
    status: 'published',
    isSuggestion: false,
    authorId: 'system',
    authorName: 'Uredništvo Portalko',
    authorRole: 'superadmin',
    createdAt: '2026-01-10T09:05:00.000Z',
  },
  {
    id: 'dir-rtvslo',
    name: 'RTV Slovenija',
    url: 'https://www.rtvslo.si',
    domain: 'rtvslo.si',
    description: 'Osrednji slovenski javni medijski portal z novicami, športom, kulturo in arhivom oddaj RTV 365.',
    categoryId: 'cat-mediji',
    categoryName: 'Mediji in novice',
    location: 'Ljubljana',
    status: 'published',
    isSuggestion: false,
    authorId: 'system',
    authorName: 'Uredništvo Portalko',
    authorRole: 'superadmin',
    isVerified: true,
    verifiedBy: 'Uredništvo Portalko',
    isFeatured: true,
    createdAt: '2026-01-10T09:10:00.000Z',
  },
  {
    id: 'dir-24ur',
    name: '24ur.com',
    url: 'https://www.24ur.com',
    domain: '24ur.com',
    description: 'Priljubljen slovenski novičarski portal z aktualnimi domačimi, tujimi in športnimi novicami.',
    categoryId: 'cat-mediji',
    categoryName: 'Mediji in novice',
    location: 'Ljubljana',
    status: 'published',
    isSuggestion: false,
    authorId: 'system',
    authorName: 'Uredništvo Portalko',
    authorRole: 'superadmin',
    createdAt: '2026-01-10T09:15:00.000Z',
  },
  {
    id: 'dir-nlb',
    name: 'NLB d.d.',
    url: 'https://www.nlb.si',
    domain: 'nlb.si',
    description: 'Največja slovenska bančna in finančna skupina s sodobnim mobilnim in spletnim bančništvom.',
    categoryId: 'cat-finance',
    categoryName: 'Banke in finance',
    location: 'Ljubljana',
    status: 'published',
    isSuggestion: false,
    authorId: 'system',
    authorName: 'Uredništvo Portalko',
    authorRole: 'superadmin',
    isVerified: true,
    verifiedBy: 'Uredništvo Portalko',
    isFeatured: true,
    createdAt: '2026-01-10T09:20:00.000Z',
  },
  {
    id: 'dir-telekom',
    name: 'Telekom Slovenije',
    url: 'https://www.telekom.si',
    domain: 'telekom.si',
    description: 'Vodilni slovenski ponudnik mobilnih, internetnih, televizijskih in IKT rešitev.',
    categoryId: 'cat-telekom',
    categoryName: 'Telekomunikacije in IT',
    location: 'Ljubljana',
    status: 'published',
    isSuggestion: false,
    authorId: 'system',
    authorName: 'Uredništvo Portalko',
    authorRole: 'superadmin',
    createdAt: '2026-01-10T09:25:00.000Z',
  },
  {
    id: 'dir-slovenia-info',
    name: 'I Feel Slovenia',
    url: 'https://www.slovenia.info',
    domain: 'slovenia.info',
    description: 'Uradni turistični portal Slovenije z idejami za izlete, kulinariko, terme in doživetja.',
    categoryId: 'cat-turizem',
    categoryName: 'Turizem in gostinstvo',
    location: 'Slovenija',
    status: 'published',
    isSuggestion: false,
    authorId: 'system',
    authorName: 'Uredništvo Portalko',
    authorRole: 'superadmin',
    isVerified: true,
    verifiedBy: 'Uredništvo Portalko',
    isFeatured: true,
    createdAt: '2026-01-10T09:30:00.000Z',
  },
  {
    id: 'dir-petrol',
    name: 'Petrol',
    url: 'https://www.petrol.si',
    domain: 'petrol.si',
    description: 'Slovenska energetska družba s prodajnimi mesti, e-polnilnicami, energenti in eShop ponudbo.',
    categoryId: 'cat-avtomoto',
    categoryName: 'Avto-moto in mobilnost',
    location: 'Ljubljana',
    status: 'published',
    isSuggestion: false,
    authorId: 'system',
    authorName: 'Uredništvo Portalko',
    authorRole: 'superadmin',
    isFeatured: true,
    createdAt: '2026-01-10T09:35:00.000Z',
  },
  {
    id: 'dir-avtonet',
    name: 'Avto.net',
    url: 'https://www.avto.net',
    domain: 'avto.net',
    description: 'Največji slovenski spletni oglasnik za nova in rabljena vozila, motorje ter gospodarska vozila.',
    categoryId: 'cat-avtomoto',
    categoryName: 'Avto-moto in mobilnost',
    location: 'Slovenija',
    status: 'published',
    isSuggestion: false,
    authorId: 'system',
    authorName: 'Uredništvo Portalko',
    authorRole: 'superadmin',
    createdAt: '2026-01-10T09:40:00.000Z',
  },
  {
    id: 'dir-posta',
    name: 'Pošta Slovenije',
    url: 'https://www.posta.si',
    domain: 'posta.si',
    description: 'Sledenje pošiljkam, paketomati, logistične storitve in spletne poštne rešitve po vsej Sloveniji.',
    categoryId: 'cat-storitve',
    categoryName: 'Javne storitve in obrt',
    location: 'Maribor',
    status: 'published',
    isSuggestion: false,
    authorId: 'system',
    authorName: 'Uredništvo Portalko',
    authorRole: 'superadmin',
    isVerified: true,
    verifiedBy: 'Uredništvo Portalko',
    createdAt: '2026-01-10T09:45:00.000Z',
  },
];

export function canPublishDirectoryEntry(role?: Role | null): boolean {
  return role === 'superadmin' || role === 'admin' || role === 'verified';
}

export function canManageDirectory(role?: Role | null): boolean {
  return role === 'superadmin' || role === 'admin';
}

export function normalizeDirectoryUrl(rawUrl: string): { url: string; domain: string } {
  const trimmed = rawUrl.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    const domain = parsed.hostname.replace(/^www\./i, '');
    return { url: parsed.toString(), domain };
  } catch {
    const domain = trimmed.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || trimmed;
    return { url: withProtocol, domain };
  }
}

export function slugifyDirectoryCategory(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `cat-${Date.now()}`;
}

export function getDirectoryEntrySlug(entry: Pick<DirectoryEntry, 'id' | 'name' | 'slug'>): string {
  if (entry.slug && entry.slug.trim()) return entry.slug.trim();
  const base = entry.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || entry.id;
}

export function subscribeToDirectoryCategories(
  callback: (categories: DirectoryCategory[]) => void
): () => void {
  const q = query(collection(db, DIRECTORY_CATEGORIES_COLLECTION), orderBy('order', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback(DEFAULT_DIRECTORY_CATEGORIES);
        return;
      }
      const list: DirectoryCategory[] = snapshot.docs.map((d) => ({
        ...(d.data() as DirectoryCategory),
        id: d.id,
      }));
      callback(list);
    },
    (error) => {
      console.error('Error subscribing to directory categories:', error);
      callback(DEFAULT_DIRECTORY_CATEGORIES);
    }
  );
}

export function subscribeToDirectoryEntries(
  callback: (entries: DirectoryEntry[]) => void
): () => void {
  const q = query(collection(db, DIRECTORY_ENTRIES_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback(SEED_DIRECTORY_ENTRIES);
        return;
      }
      const list: DirectoryEntry[] = snapshot.docs.map((d) => ({
        ...(d.data() as DirectoryEntry),
        id: d.id,
      }));
      callback(list);
    },
    (error) => {
      console.error('Error subscribing to directory entries:', error);
      callback(SEED_DIRECTORY_ENTRIES);
    }
  );
}

export async function ensureDirectoryCategoriesSeeded(createdBy?: string): Promise<void> {
  const snap = await getDocs(collection(db, DIRECTORY_CATEGORIES_COLLECTION));
  if (!snap.empty) return;
  await Promise.all(
    DEFAULT_DIRECTORY_CATEGORIES.map((cat) =>
      setDoc(doc(db, DIRECTORY_CATEGORIES_COLLECTION, cat.id), {
        ...cat,
        createdBy: createdBy || 'system',
      })
    )
  );
}

export async function createDirectoryCategory(input: {
  name: string;
  description?: string;
  order: number;
  createdBy?: string;
}): Promise<DirectoryCategory> {
  await ensureDirectoryCategoriesSeeded(input.createdBy);
  const slug = slugifyDirectoryCategory(input.name);
  const id = `cat-${slug}-${Date.now().toString(36).slice(-4)}`;
  const payload: DirectoryCategory = {
    id,
    name: input.name.trim(),
    slug,
    description: input.description?.trim() || '',
    order: input.order,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy || 'admin',
  };
  await setDoc(doc(db, DIRECTORY_CATEGORIES_COLLECTION, id), payload);
  return payload;
}

export async function updateDirectoryCategory(
  id: string,
  updates: Partial<Pick<DirectoryCategory, 'name' | 'description' | 'order'>>
): Promise<void> {
  const payload: Record<string, unknown> = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  if (updates.name) {
    payload.name = updates.name.trim();
    payload.slug = slugifyDirectoryCategory(updates.name);
  }
  await updateDoc(doc(db, DIRECTORY_CATEGORIES_COLLECTION, id), payload);
}

export async function deleteDirectoryCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, DIRECTORY_CATEGORIES_COLLECTION, id));
}

export async function createDirectoryEntry(input: {
  name: string;
  url: string;
  description: string;
  categoryId: string;
  categoryName: string;
  location?: string;
  logoUrl?: string;
  tags?: string[];
  isVerified?: boolean;
  authorId: string;
  authorName: string;
  authorRole: Role;
}): Promise<DirectoryEntry> {
  const canPublish = canPublishDirectoryEntry(input.authorRole);
  const { url, domain } = normalizeDirectoryUrl(input.url);
  const id = `dir-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const cleanTags = Array.isArray(input.tags)
    ? input.tags.map((t) => t.replace(/^#/, '').trim().toLowerCase()).filter(Boolean).slice(0, 6)
    : [];

  const entry: DirectoryEntry = {
    id,
    slug: slugifyDirectoryCategory(input.name),
    name: input.name.trim(),
    url,
    domain,
    description: input.description.trim(),
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    location: input.location?.trim() || 'Slovenija',
    ...(input.logoUrl?.trim() ? { logoUrl: input.logoUrl.trim() } : {}),
    ...(cleanTags.length > 0 ? { tags: cleanTags } : {}),
    ...(input.isVerified ? { isVerified: true, verifiedBy: input.authorName, verifiedAt: now } : {}),
    status: canPublish ? 'published' : 'pending',
    isSuggestion: !canPublish,
    authorId: input.authorId,
    authorName: input.authorName,
    authorRole: input.authorRole,
    createdAt: now,
  };

  await setDoc(doc(db, DIRECTORY_ENTRIES_COLLECTION, id), entry);
  return entry;
}

export async function updateDirectoryEntryMetadata(
  id: string,
  updates: { categoryId: string; categoryName: string; tags?: string[] }
): Promise<void> {
  const cleanTags = Array.isArray(updates.tags)
    ? updates.tags.map((t) => t.replace(/^#/, '').trim().toLowerCase()).filter(Boolean).slice(0, 6)
    : undefined;

  await updateDoc(doc(db, DIRECTORY_ENTRIES_COLLECTION, id), {
    categoryId: updates.categoryId,
    categoryName: updates.categoryName,
    ...(cleanTags ? { tags: cleanTags } : {}),
    updatedAt: new Date().toISOString(),
  });
}

export async function requestAiDirectorySuggestions(input: {
  name: string;
  url?: string;
  description: string;
  categories: DirectoryCategory[];
}): Promise<AiDirectorySuggestion> {
  const res = await fetch('/api/directory/ai-suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name,
      url: input.url || '',
      description: input.description,
      categories: input.categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
      })),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'AI analiza ni uspela.');
  }

  return {
    suggestedCategoryId: data.suggestedCategoryId,
    suggestedCategoryName: data.suggestedCategoryName,
    suggestedTags: Array.isArray(data.suggestedTags) ? data.suggestedTags : [],
    reason: data.reason || '',
  };
}

export async function updateDirectoryEntryStatus(
  id: string,
  status: DirectoryEntryStatus,
  approvedBy?: string
): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(doc(db, DIRECTORY_ENTRIES_COLLECTION, id), {
    status,
    isSuggestion: status === 'pending',
    updatedAt: now,
    ...(status === 'published' && approvedBy ? { approvedBy, approvedAt: now } : {}),
  });
}

export async function updateDirectoryEntryVerified(
  id: string,
  isVerified: boolean,
  adminName?: string
): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(doc(db, DIRECTORY_ENTRIES_COLLECTION, id), {
    isVerified,
    updatedAt: now,
    ...(isVerified ? { verifiedBy: adminName || 'Admin', verifiedAt: now } : {}),
  });
}

export async function bulkUpdateDirectoryEntriesVerified(
  ids: string[],
  isVerified: boolean,
  adminName?: string
): Promise<void> {
  if (ids.length === 0) return;
  const now = new Date().toISOString();
  await Promise.all(
    ids.map((id) =>
      updateDoc(doc(db, DIRECTORY_ENTRIES_COLLECTION, id), {
        isVerified,
        updatedAt: now,
        ...(isVerified ? { verifiedBy: adminName || 'Admin', verifiedAt: now } : {}),
      })
    )
  );
}

export async function updateDirectoryEntryFeatured(
  id: string,
  isFeatured: boolean
): Promise<void> {
  await updateDoc(doc(db, DIRECTORY_ENTRIES_COLLECTION, id), {
    isFeatured,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteDirectoryEntry(id: string): Promise<void> {
  await deleteDoc(doc(db, DIRECTORY_ENTRIES_COLLECTION, id));
}

export async function bulkUpdateDirectoryEntriesStatus(
  ids: string[],
  status: DirectoryEntryStatus,
  approvedBy?: string
): Promise<void> {
  if (ids.length === 0) return;
  const now = new Date().toISOString();
  await Promise.all(
    ids.map((id) =>
      updateDoc(doc(db, DIRECTORY_ENTRIES_COLLECTION, id), {
        status,
        isSuggestion: status === 'pending',
        updatedAt: now,
        ...(status === 'published' && approvedBy ? { approvedBy, approvedAt: now } : {}),
      })
    )
  );
}

export async function bulkUpdateDirectoryEntriesCategory(
  ids: string[],
  categoryId: string,
  categoryName: string
): Promise<void> {
  if (ids.length === 0) return;
  const now = new Date().toISOString();
  await Promise.all(
    ids.map((id) =>
      updateDoc(doc(db, DIRECTORY_ENTRIES_COLLECTION, id), {
        categoryId,
        categoryName,
        updatedAt: now,
      })
    )
  );
}

export async function bulkDeleteDirectoryEntries(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await Promise.all(ids.map((id) => deleteDoc(doc(db, DIRECTORY_ENTRIES_COLLECTION, id))));
}

export function canNotifyDirectoryAuthor(entry: DirectoryEntry): boolean {
  if (!entry.authorId) return false;
  if (entry.authorId === 'system' || entry.authorId.startsWith('guest-')) return false;
  return true;
}

export async function notifyDirectoryEntryAuthor(
  entry: DirectoryEntry,
  decision: 'published' | 'rejected',
  adminName: string,
  customMessage?: string
): Promise<boolean> {
  if (!canNotifyDirectoryAuthor(entry)) return false;

  const isApproved = decision === 'published';
  const title = isApproved
    ? `Vnos v Imenik odobren: ${entry.name}`
    : `Predlog za Imenik zavrnjen: ${entry.name}`;

  const defaultBody = isApproved
    ? `Vaš predlog spletne strani »${entry.name}« (${entry.domain}) je bil odobren in je zdaj javno objavljen v slovenskem spletnem imeniku.`
    : `Vaš predlog spletne strani »${entry.name}« (${entry.domain}) žal ni bil odobren za objavo v slovenskem spletnem imeniku.`;

  const body = customMessage?.trim()
    ? `${defaultBody} Opomba uredništva: ${customMessage.trim()}`
    : defaultBody;

  const nowIso = new Date().toISOString();

  await addDoc(collection(db, 'users', entry.authorId, 'notifications'), {
    senderName: adminName || 'Uredništvo Portalko',
    senderAvatar: '',
    type: 'system',
    title,
    body,
    targetId: entry.id,
    targetType: 'directory',
    postTitle: entry.name,
    read: false,
    createdAt: nowIso,
    timestamp: Date.now(),
  });

  await updateDoc(doc(db, DIRECTORY_ENTRIES_COLLECTION, entry.id), {
    notifiedStatus: decision,
    notifiedAt: nowIso,
  }).catch(() => {});

  return true;
}

export async function notifyAllReviewedDirectorySuggesters(
  entries: DirectoryEntry[],
  adminName: string,
  customMessage?: string
): Promise<{ sentCount: number; skippedCount: number }> {
  const eligible = entries.filter(
    (e) =>
      (e.status === 'published' || e.status === 'rejected') &&
      canNotifyDirectoryAuthor(e) &&
      e.notifiedStatus !== e.status
  );

  let sentCount = 0;
  let skippedCount = 0;

  for (const entry of eligible) {
    try {
      const sent = await notifyDirectoryEntryAuthor(
        entry,
        entry.status === 'published' ? 'published' : 'rejected',
        adminName,
        customMessage
      );
      if (sent) sentCount += 1;
      else skippedCount += 1;
    } catch {
      skippedCount += 1;
    }
  }

  return { sentCount, skippedCount };
}
