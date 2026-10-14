import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AdminActivityLog, AdminActionType, AdminActionCategory } from '../types';

const ACTIVITY_LOGS_COLLECTION = 'activity_logs';
const LOCAL_STORAGE_KEY = 'portalko_admin_activity_logs_cache';

// Seed demo activity logs to ensure immediate rich visualization
export const DEFAULT_SAMPLE_LOGS: AdminActivityLog[] = [
  {
    id: 'log-seed-1',
    adminId: 'admin-1',
    adminName: 'Zoran Krstin',
    adminEmail: 'zoran.krstin@gmail.com',
    adminRole: 'superadmin',
    actionType: 'role_change',
    category: 'users',
    targetId: 'u_102',
    targetTitle: 'Marko Zupan',
    details: 'Spremenjena vloga uporabnika »Marko Zupan« iz »registered« v »moderator«.',
    metadata: {
      oldRole: 'registered',
      newRole: 'moderator',
      reason: 'Dodelitev pooblastil za moderiranje dogodkov'
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString() // 35 min ago
  },
  {
    id: 'log-seed-2',
    adminId: 'admin-1',
    adminName: 'Zoran Krstin',
    adminEmail: 'zoran.krstin@gmail.com',
    adminRole: 'superadmin',
    actionType: 'banner_create',
    category: 'banners',
    targetId: 'banner-main-spring-fair',
    targetTitle: 'Pomladni kulinarični sejem 2026',
    details: 'Ustvarjena nova promocijska slikovna pasica »Pomladni kulinarični sejem 2026« na poziciji Glavna vsebina.',
    metadata: {
      position: 'main_container',
      type: 'image',
      isActive: true,
      order: 1
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString() // 2 hours ago
  },
  {
    id: 'log-seed-3',
    adminId: 'admin-1',
    adminName: 'Zoran Krstin',
    adminEmail: 'zoran.krstin@gmail.com',
    adminRole: 'superadmin',
    actionType: 'registration_confirm',
    category: 'users',
    targetId: 'u_103',
    targetTitle: 'Ana Horvat',
    details: 'Ročno potrjena registracija in veljavnost e-poštnega naslova za uporabnika »Ana Horvat«.',
    metadata: {
      targetEmail: 'ana.horvat@siol.net',
      previousStatus: 'unconfirmed'
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString() // 4 hours ago
  },
  {
    id: 'log-seed-4',
    adminId: 'admin-1',
    adminName: 'Zoran Krstin',
    adminEmail: 'zoran.krstin@gmail.com',
    adminRole: 'superadmin',
    actionType: 'banner_toggle',
    category: 'banners',
    targetId: 'banner-right-cafe',
    targetTitle: 'Pražarna Kave Mestni Trg',
    details: 'Aktivirano prikazovanje promocijske pasice »Pražarna Kave Mestni Trg« na desni stranski vrstici.',
    metadata: {
      position: 'right_sidebar',
      isActive: true
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString() // 8 hours ago
  },
  {
    id: 'log-seed-5',
    adminId: 'admin-1',
    adminName: 'Zoran Krstin',
    adminEmail: 'zoran.krstin@gmail.com',
    adminRole: 'superadmin',
    actionType: 'settings_update',
    category: 'settings',
    targetId: 'portal_global_config',
    targetTitle: 'Sistemske nastavitve portala',
    details: 'Posodobljena privzeta nadomestna slika za manjkajoče ali nedelujoče slike v objavah.',
    metadata: {
      useFallbackForMissingImages: true,
      useFallbackForBrokenImages: true
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
  }
];

// In-memory cache
let cachedLogs: AdminActivityLog[] = (() => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [...DEFAULT_SAMPLE_LOGS];
})();

function updateCache(logs: AdminActivityLog[]) {
  // Sort descending by createdAt
  cachedLogs = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cachedLogs));
  } catch {}
}

/**
 * Log a critical administrator action into Firestore and local cache
 */
export async function logAdminActivity(
  logData: {
    adminId: string;
    adminName: string;
    adminEmail: string;
    adminRole: string;
    actionType: AdminActionType;
    category: AdminActionCategory;
    targetId?: string;
    targetTitle?: string;
    details: string;
    metadata?: Record<string, any>;
    createdAt?: string;
  }
): Promise<AdminActivityLog> {
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const finalLog: AdminActivityLog = {
    id: logId,
    adminId: logData.adminId || 'unknown_admin',
    adminName: logData.adminName || 'Administrator',
    adminEmail: logData.adminEmail || '',
    adminRole: logData.adminRole || 'admin',
    actionType: logData.actionType,
    category: logData.category,
    targetId: logData.targetId,
    targetTitle: logData.targetTitle,
    details: logData.details,
    metadata: logData.metadata || {},
    createdAt: logData.createdAt || new Date().toISOString()
  };

  // Immediate optimistic update to memory cache
  const updatedList = [finalLog, ...cachedLogs.filter(l => l.id !== logId)];
  updateCache(updatedList);

  // Sync to Firestore
  try {
    const logRef = doc(db, ACTIVITY_LOGS_COLLECTION, logId);
    await setDoc(logRef, finalLog);
  } catch (error) {
    console.warn('[activityLogService] Firestore setDoc error (saved to local cache):', error);
  }

  return finalLog;
}

/**
 * Real-time listener for admin activity logs from Firestore
 */
export function subscribeToAdminActivityLogs(
  callback: (logs: AdminActivityLog[]) => void,
  limitCount: number = 100
): () => void {
  // Emit current cache immediately
  callback(cachedLogs);

  try {
    const q = query(collection(db, ACTIVITY_LOGS_COLLECTION), limit(limitCount));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: AdminActivityLog[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              adminId: data.adminId || '',
              adminName: data.adminName || 'Administrator',
              adminEmail: data.adminEmail || '',
              adminRole: data.adminRole || 'admin',
              actionType: data.actionType || 'role_change',
              category: data.category || 'users',
              targetId: data.targetId,
              targetTitle: data.targetTitle,
              details: data.details || '',
              metadata: data.metadata || {},
              createdAt: data.createdAt || new Date().toISOString()
            };
          });

          // Merge with any local logs and sort newest first
          const mergedMap = new Map<string, AdminActivityLog>();
          cachedLogs.forEach(l => mergedMap.set(l.id, l));
          loaded.forEach(l => mergedMap.set(l.id, l));
          const allLogs = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          updateCache(allLogs);
          callback(allLogs);
        } else {
          // If Firestore is empty, seed initial sample logs
          seedDefaultLogs().catch(() => {});
          callback(cachedLogs);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, ACTIVITY_LOGS_COLLECTION);
        callback(cachedLogs);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn('[activityLogService] Subscribe error, returning cached logs:', error);
    callback(cachedLogs);
    return () => {};
  }
}

/**
 * Seeds initial demo logs to Firestore if collection is empty
 */
async function seedDefaultLogs(): Promise<void> {
  try {
    for (const log of DEFAULT_SAMPLE_LOGS) {
      const ref = doc(db, ACTIVITY_LOGS_COLLECTION, log.id);
      await setDoc(ref, log, { merge: true }).catch(() => {});
    }
  } catch (error) {
    console.warn('[activityLogService] Could not seed default logs:', error);
  }
}

/**
 * Delete a single activity log entry
 */
export async function deleteAdminActivityLog(logId: string): Promise<void> {
  const updated = cachedLogs.filter(l => l.id !== logId);
  updateCache(updated);

  try {
    await deleteDoc(doc(db, ACTIVITY_LOGS_COLLECTION, logId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ACTIVITY_LOGS_COLLECTION}/${logId}`);
  }
}

/**
 * Clear all activity logs
 */
export async function clearAllAdminActivityLogs(): Promise<void> {
  updateCache([]);
  try {
    const snap = await getDocs(collection(db, ACTIVITY_LOGS_COLLECTION));
    const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.warn('[activityLogService] Could not clear all logs:', error);
  }
}

/**
 * Export logs as JSON file download
 */
export function exportAdminActivityLogsAsJson(logs: AdminActivityLog[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `dnevnik_aktivnosti_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Export logs as CSV file download
 */
export function exportAdminActivityLogsAsCsv(logs: AdminActivityLog[]): void {
  const headers = ['ID', 'Datum in Čas', 'Administrator', 'E-pošta', 'Vloga Admina', 'Kategorija', 'Tip Akcije', 'Ciljni element', 'Podrobnosti'];
  const rows = logs.map(l => [
    `"${l.id}"`,
    `"${new Date(l.createdAt).toLocaleString('sl-SI')}"`,
    `"${(l.adminName || '').replace(/"/g, '""')}"`,
    `"${(l.adminEmail || '').replace(/"/g, '""')}"`,
    `"${l.adminRole}"`,
    `"${l.category}"`,
    `"${l.actionType}"`,
    `"${(l.targetTitle || l.targetId || '').replace(/"/g, '""')}"`,
    `"${(l.details || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', encodeURI(csvContent));
  downloadAnchor.setAttribute('download', `dnevnik_aktivnosti_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
