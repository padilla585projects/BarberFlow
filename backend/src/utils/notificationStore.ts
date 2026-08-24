import * as admin from 'firebase-admin'

export async function storeNotification(
  uid: string | null | undefined,
  notification: {
    title: string;
    body: string;
    type: string;
    data?: Record<string, string>;
  },
): Promise<void> {
  // Walk-in appointments carry no client account.
  if (!uid) return
  await admin.firestore()
    .collection('users')
    .doc(uid)
    .collection('notifications')
    .add({
      ...notification,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
}
