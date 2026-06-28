import * as admin from 'firebase-admin'

const db = admin.firestore()

interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, string>
  sound?: 'default'
}

export async function getExpoPushToken(uid: string): Promise<string | null> {
  const snap = await db.collection('users').doc(uid).get()
  return snap.data()?.expoPushToken ?? null
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  const message: ExpoPushMessage = {
    to: token,
    title,
    body,
    sound: 'default',
    data,
  }

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  })

  if (!res.ok) {
    console.error('[Push] Failed:', await res.text())
  }
}
