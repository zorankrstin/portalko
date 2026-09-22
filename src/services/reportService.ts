import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { cleanDataForFirestore } from './firestoreService';
import { ReportItem, ReportReason, ReportStatus, ReportTargetType } from '../types';
import { deletePostInFirestore, deleteAdInFirestore, deleteEventInFirestore } from './firestoreService';

export const REPORT_REASONS: Array<{ id: ReportReason; label: string; description: string }> = [
  {
    id: 'spam',
    label: 'Neželena pošta ali spam',
    description: 'Ponavljajoče objave, nepooblaščena samopromocija ali vsiljive povezave.'
  },
  {
    id: 'inappropriate',
    label: 'Neprimerna ali žaljiva vsebina',
    description: 'Sovražni govor, osebne žalitve, nasilje, nadlegovanje ali nedovoljene vsebine.'
  },
  {
    id: 'fraud',
    label: 'Prevara ali sumljiva ponudba',
    description: 'Lažno predstavljanje, poskus goljufije, sumljiva plačila ali nerealne ponudbe.'
  },
  {
    id: 'misinformation',
    label: 'Zavajajoče ali napačne informacije',
    description: 'Neresnična dejstva, namerno zavajanje kupcev ali izmišljene novice.'
  },
  {
    id: 'copyright',
    label: 'Kršitev avtorskih pravic',
    description: 'Uporaba fotografij, logotipov ali besedil brez privolitve lastnika.'
  },
  {
    id: 'illegal',
    label: 'Nezakonita vsebina ali prepovedani artikli',
    description: 'Prodaja ali promocija predmetov, ki so z zakonodajo RS prepovedani.'
  },
  {
    id: 'other',
    label: 'Drugo',
    description: 'Druga kršitev pravil skupnosti (navedite podrobnosti v opisu).'
  },
];

const LOCAL_STORAGE_REPORTS_KEY = 'portalko_local_reports';

function getLocalReports(): ReportItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalReports(reports: ReportItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(reports));
  } catch (err) {
    console.warn('Failed to save reports locally', err);
  }
}

export interface CreateReportInput {
  targetId: string;
  targetType: ReportTargetType;
  targetTitle: string;
  targetAuthor?: string;
  targetUrl?: string;
  reason: ReportReason;
  reasonLabel: string;
  details?: string;
  reporterId?: string | null;
  reporterEmail?: string | null;
  reporterName?: string | null;
}

/**
 * Submits a new content report to Firestore (with local fallback).
 */
export async function submitReport(input: CreateReportInput): Promise<string> {
  const reportId = `report-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const reportData: ReportItem = {
    id: reportId,
    targetId: input.targetId,
    targetType: input.targetType,
    targetTitle: input.targetTitle || 'Brez naslova',
    targetAuthor: input.targetAuthor || undefined,
    targetUrl: input.targetUrl || window.location.href,
    reason: input.reason,
    reasonLabel: input.reasonLabel,
    details: input.details?.trim() || undefined,
    reporterId: input.reporterId || null,
    reporterEmail: input.reporterEmail?.trim() || null,
    reporterName: input.reporterName?.trim() || null,
    status: 'pending',
    actionTaken: 'none',
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, 'reports', reportId);
    const cleaned = cleanDataForFirestore({
      ...reportData,
      _serverTimestamp: serverTimestamp(),
    });
    await setDoc(docRef, cleaned);
  } catch (err) {
    console.warn('Firestore report creation failed, saving to local state fallback:', err);
    handleFirestoreError(err, OperationType.WRITE, `reports/${reportId}`);
  }

  // Always mirror in local storage for resilient offline/fallback experience
  const localList = getLocalReports();
  saveLocalReports([reportData, ...localList]);

  return reportId;
}

/**
 * Subscribes to real-time updates for reports.
 */
export function subscribeToReports(callback: (reports: ReportItem[]) => void): () => void {
  try {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const firestoreReports: ReportItem[] = [];
        snapshot.forEach((docSnap) => {
          firestoreReports.push(docSnap.data() as ReportItem);
        });

        // Merge with local fallback to ensure reports never disappear
        const localReports = getLocalReports();
        const map = new Map<string, ReportItem>();
        localReports.forEach(r => map.set(r.id, r));
        firestoreReports.forEach(r => map.set(r.id, r));

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        callback(merged);
      },
      (err) => {
        console.warn('Reports real-time subscription error, using local fallback:', err);
        callback(getLocalReports());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Error setting up reports listener:', err);
    callback(getLocalReports());
    return () => {};
  }
}

/**
 * Updates status and admin notes for a report.
 */
export async function updateReportStatus(
  reportId: string, 
  status: ReportStatus, 
  adminNotes?: string,
  actionTaken?: 'none' | 'deleted_target' | 'dismissed' | 'warned_author'
): Promise<void> {
  const updatePayload: Partial<ReportItem> = {
    status,
    updatedAt: new Date().toISOString(),
  };

  if (adminNotes !== undefined) {
    updatePayload.adminNotes = adminNotes;
  }
  if (actionTaken !== undefined) {
    updatePayload.actionTaken = actionTaken;
  }

  try {
    const docRef = doc(db, 'reports', reportId);
    await updateDoc(docRef, cleanDataForFirestore(updatePayload));
  } catch (err) {
    console.warn('Failed to update report in Firestore, updating locally:', err);
  }

  // Update locally
  const localList = getLocalReports();
  const updated = localList.map(r => r.id === reportId ? { ...r, ...updatePayload } : r);
  saveLocalReports(updated);
}

/**
 * Deletes a report from Firestore and local storage.
 */
export async function deleteReportFromFirestore(reportId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'reports', reportId));
  } catch (err) {
    console.warn('Failed to delete report from Firestore, removing locally:', err);
  }

  const localList = getLocalReports();
  saveLocalReports(localList.filter(r => r.id !== reportId));
}

/**
 * Deletes the content flagged by a report directly from Firestore.
 */
export async function deleteReportedContent(targetId: string, targetType: ReportTargetType): Promise<void> {
  if (targetType === 'ad') {
    await deleteAdInFirestore(targetId);
  } else if (targetType === 'event') {
    await deleteEventInFirestore(targetId);
  } else if (targetType === 'post' || targetType === 'deal') {
    await deletePostInFirestore(targetId);
  }
}
