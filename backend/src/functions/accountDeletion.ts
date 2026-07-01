import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const storage = admin.storage().bucket()

const REGION = 'europe-west1'

/**
 * Helper to delete all documents in a subcollection.
 * Firestore does not cascade-delete subcollections, so we must
 * fetch and delete every document manually.
 */
async function deleteSubcollection(parentPath: string, subcollection: string): Promise<number> {
  const snap = await db.collection(`${parentPath}/${subcollection}`).get()
  if (snap.empty) return 0

  const batch = db.batch()
  snap.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()
  return snap.size
}

/**
 * Helper to delete a file from Storage if it exists.
 * Swallows 404 errors silently (file may not exist).
 */
async function deleteStorageFile(filePath: string): Promise<boolean> {
  try {
    const file = storage.file(filePath)
    const [exists] = await file.exists()
    if (exists) {
      await file.delete()
      return true
    }
  } catch (err) {
    console.warn(`[AccountDeletion] Could not delete storage file ${filePath}:`, err)
  }
  return false
}

/**
 * Helper to delete all files under a Storage prefix (folder).
 */
async function deleteStorageFolder(prefix: string): Promise<number> {
  try {
    const [files] = await storage.getFiles({ prefix })
    if (files.length === 0) return 0
    await Promise.all(files.map((file) => file.delete()))
    return files.length
  } catch (err) {
    console.warn(`[AccountDeletion] Could not delete storage folder ${prefix}:`, err)
  }
  return 0
}

/**
 * Scheduled function that runs daily at 03:00 Europe/Madrid.
 * Processes account deletion requests by finding user documents with
 * `accountDeletionRequested === true` and purging all associated data:
 *   - Firestore subcollections (notifications, pointsHistory, portfolio,
 *     schedule, scheduleTemplates)
 *   - The user document itself
 *   - Firebase Auth user record
 *   - Storage profile photo and portfolio photos
 *
 * Each user deletion is wrapped in try/catch so that one failure does not
 * prevent subsequent users from being processed.
 */
export const processAccountDeletions = onSchedule(
  {
    schedule: '0 3 * * *',
    timeZone: 'Europe/Madrid',
    region: REGION,
    timeoutSeconds: 300,
  },
  async () => {
    const usersSnap = await db
      .collection('users')
      .where('accountDeletionRequested', '==', true)
      .get()

    if (usersSnap.empty) {
      console.log('[AccountDeletion] No pending deletion requests.')
      return
    }

    console.log(`[AccountDeletion] Found ${usersSnap.size} account(s) to delete.`)

    let successCount = 0
    let errorCount = 0

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id
      try {
        console.log(`[AccountDeletion] Processing deletion for user ${uid}...`)

        // 1. Delete Firestore subcollections
        const subcollections = [
          'notifications',
          'pointsHistory',
          'portfolio',
          'schedule',
          'scheduleTemplates',
        ]

        for (const sub of subcollections) {
          const count = await deleteSubcollection(`users/${uid}`, sub)
          if (count > 0) {
            console.log(`[AccountDeletion]   Deleted ${count} docs from ${sub}`)
          }
        }

        // 2. Delete the user document from Firestore
        await userDoc.ref.delete()
        console.log(`[AccountDeletion]   Deleted user document`)

        // 3. Delete the user from Firebase Auth
        try {
          await admin.auth().deleteUser(uid)
          console.log(`[AccountDeletion]   Deleted Auth user`)
        } catch (authErr: any) {
          // user-not-found is acceptable (may have been deleted already)
          if (authErr?.code === 'auth/user-not-found') {
            console.log(`[AccountDeletion]   Auth user already deleted`)
          } else {
            throw authErr
          }
        }

        // 4. Delete profile photo from Storage
        const deletedProfile = await deleteStorageFile(`users/${uid}/profile.jpg`)
        if (deletedProfile) {
          console.log(`[AccountDeletion]   Deleted profile photo`)
        }

        // 5. Delete portfolio photos from Storage
        const portfolioCount = await deleteStorageFolder(`portfolios/${uid}/`)
        if (portfolioCount > 0) {
          console.log(`[AccountDeletion]   Deleted ${portfolioCount} portfolio photo(s)`)
        }

        successCount++
        console.log(`[AccountDeletion] Successfully deleted account ${uid}`)
      } catch (err) {
        errorCount++
        console.error(`[AccountDeletion] Error deleting account ${uid}:`, err)
        // Continue with next user — don't let one failure stop the batch
      }
    }

    console.log(
      `[AccountDeletion] Finished. ${successCount} deleted, ${errorCount} failed.`,
    )
  },
)
