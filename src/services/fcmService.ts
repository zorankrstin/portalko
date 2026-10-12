import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { app, db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';

let messagingInstance: Messaging | null = null;
let isMessagingSupportedChecked = false;
let isMessagingSupportedResult = false;

/**
 * Checks if browser supports Firebase Cloud Messaging and Service Workers
 */
export async function isFcmSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
  if (!isMessagingSupportedChecked) {
    try {
      isMessagingSupportedResult = await isSupported();
    } catch {
      isMessagingSupportedResult = false;
    }
    isMessagingSupportedChecked = true;
  }
  return isMessagingSupportedResult;
}

/**
 * Gets or initializes the Firebase Messaging instance safely
 */
export async function getFcmMessaging(): Promise<Messaging | null> {
  const supported = await isFcmSupported();
  if (!supported) return null;
  if (!messagingInstance) {
    try {
      messagingInstance = getMessaging(app);
    } catch (err) {
      console.warn('[FCM] getMessaging error:', err);
    }
  }
  return messagingInstance;
}

/**
 * Requests browser push notification permission and registers FCM device token in Firestore
 */
export async function requestFcmToken(userId?: string): Promise<{ token?: string; permission: NotificationPermission; error?: string }> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { permission: 'denied', error: 'Brskalnik ne podpira potisnih sporočil.' };
  }

  try {
    const currentPermission = Notification.permission;
    let permission = currentPermission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return { permission, error: 'Dovoljenje za potisna obvestila je bilo zavrnjeno.' };
    }

    const messaging = await getFcmMessaging();
    if (!messaging) {
      return { permission: 'granted', error: 'FCM ni podprt v tem brskalniku.' };
    }

    // Register service worker if not already registered
    let serviceWorkerRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
        });
      } catch (swErr) {
        console.warn('[FCM] SW registration warning:', swErr);
      }
    }

    const token = await getToken(messaging, {
      serviceWorkerRegistration,
    }).catch((tokenErr) => {
      console.warn('[FCM] getToken note:', tokenErr?.message);
      return undefined;
    });

    if (token) {
      // Store locally
      localStorage.setItem('portalko_fcm_token', token);

      // If user is logged in, register device token in Firestore
      if (userId) {
        await saveFcmTokenToUser(userId, token).catch(() => {});
      }
      return { token, permission: 'granted' };
    }

    return { permission: 'granted' };
  } catch (err: any) {
    console.warn('[FCM] requestFcmToken error:', err);
    return { permission: Notification.permission, error: err?.message };
  }
}

/**
 * Saves FCM device token under user's profile in Firestore
 */
export async function saveFcmTokenToUser(userId: string, token: string): Promise<void> {
  if (!userId || !token) return;
  try {
    const tokenDocRef = doc(db, 'users', userId, 'fcmTokens', token.slice(0, 32));
    await setDoc(tokenDocRef, {
      token,
      userId,
      platform: 'web',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('[FCM] Failed to save token in Firestore:', err);
  }
}

/**
 * Displays a real-time browser system notification directly
 */
export function showBrowserNotification(title: string, options?: NotificationOptions): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const finalOptions: NotificationOptions = {
      icon: '/portalko_logo_clean.png',
      badge: '/favicon.png',
      ...options,
    };
    (finalOptions as any).vibrate = [200, 100, 200];

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, finalOptions);
      }).catch(() => {
        new Notification(title, finalOptions);
      });
    } else {
      new Notification(title, finalOptions);
    }
  } catch (err) {
    console.warn('[FCM] showBrowserNotification error:', err);
  }
}

/**
 * Dispatches an interaction notification record to Firestore for the target author
 * so their active browser sessions immediately receive the alert and trigger a push notification.
 */
export async function sendTargetAuthorNotification(params: {
  targetAuthorId?: string;
  senderId?: string;
  senderName: string;
  senderAvatar?: string;
  type: 'comment' | 'like';
  postTitle?: string;
  targetId: string;
  targetType: 'post' | 'ad' | 'event' | 'deal' | 'blog' | 'news' | string;
  commentSnippet?: string;
}): Promise<void> {
  let { targetAuthorId, senderId, senderName, senderAvatar, type, postTitle, targetId, targetType, commentSnippet } = params;

  // If targetAuthorId is not provided, try to fetch the author from Firestore
  if (!targetAuthorId && targetId) {
    try {
      const colName = targetType === 'event' ? 'events' : targetType === 'ad' ? 'ads' : 'posts';
      const snap = await getDoc(doc(db, colName, targetId));
      if (snap.exists()) {
        const d = snap.data();
        targetAuthorId = d.authorId || d.userId;
        if (!postTitle) {
          postTitle = d.title || d.name;
        }
      }
    } catch {
      // ignore
    }
  }

  // Don't notify if no targetAuthorId or if user likes/comments on their own post
  if (!targetAuthorId || (senderId && senderId === targetAuthorId)) return;

  const title = type === 'comment'
    ? `💬 Nov komentar od ${senderName}`
    : `❤️ Všeček od ${senderName}`;

  let body = '';
  if (type === 'comment') {
    body = postTitle
      ? `${senderName} je komentiral vašo objavo »${postTitle}«: "${commentSnippet || ''}"`
      : `${senderName} je komentiral vašo vsebino: "${commentSnippet || ''}"`;
  } else {
    body = postTitle
      ? `${senderName} je všečkal vašo objavo »${postTitle}«.`
      : `${senderName} je všečkal vašo vsebino na Portalko.net.`;
  }

  const notificationData = {
    userId: targetAuthorId,
    senderId: senderId || 'guest',
    senderName,
    senderAvatar: senderAvatar || '',
    type,
    title,
    body,
    targetId,
    targetType,
    postTitle: postTitle || '',
    read: false,
    createdAt: new Date().toISOString(),
    timestamp: Date.now(),
  };

  try {
    // 1. Write to user's real-time notifications subcollection in Firestore
    const notifsCol = collection(db, 'users', targetAuthorId, 'notifications');
    await addDoc(notifsCol, notificationData);
  } catch (err) {
    console.warn('[FCM] Could not write notification to Firestore:', err);
  }
}

/**
 * Listens in real-time for incoming FCM foreground push notifications
 */
export function listenForForegroundFcm(onMessageReceived: (payload: any) => void): () => void {
  let unsubscribe: (() => void) | undefined;
  getFcmMessaging().then((messaging) => {
    if (messaging) {
      unsubscribe = onMessage(messaging, (payload) => {
        console.log('[FCM] Foreground push message received:', payload);
        onMessageReceived(payload);

        // Also trigger native browser notification if user gave permission
        const title = payload.notification?.title || payload.data?.title || 'Novo obvestilo';
        const body = payload.notification?.body || payload.data?.body || '';
        showBrowserNotification(title, { body, data: payload.data });
      });
    }
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}

/**
 * Subscribes to real-time notification events in Firestore for the current logged-in user.
 * Whenever a new notification is created for them (comment or like on their post),
 * triggers a browser system notification and updates in-app notification center.
 */
export function subscribeToUserNotifications(
  userId: string,
  onNewNotification: (notif: any) => void
): () => void {
  if (!userId) return () => {};

  try {
    const notifsCol = collection(db, 'users', userId, 'notifications');
    const q = query(notifsCol, orderBy('timestamp', 'desc'), limit(20));

    let isInitialLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          onNewNotification({ id: change.doc.id, ...data });

          // Fire native browser push notification
          showBrowserNotification(data.title || 'Portalko.net Novo obvestilo', {
            body: data.body || 'Imate novo interakcijo.',
            tag: `portalko-${data.type}-${data.targetId}`,
            data: {
              url: `/?post=${data.targetId}&type=${data.targetType}`,
              targetId: data.targetId,
              targetType: data.targetType,
            },
          });
        }
      });
    }, (err) => {
      console.warn('[FCM subscribeToUserNotifications] note:', err);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('[FCM] subscribeToUserNotifications init failed:', err);
    return () => {};
  }
}
