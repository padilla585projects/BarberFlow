import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Request, Response } from 'express';

/**
 * HTTP Function to update user role
 * Usage: POST /updateUserRole
 * Body: { uid: string, role: string }
 */
export const updateUserRole = functions.https.onRequest(
  async (req: Request, res: Response) => {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      const { uid, role } = req.body;

      if (!uid || !role) {
        res.status(400).json({ error: 'Missing uid or role' });
        return;
      }

      console.log(`Updating user ${uid} with role: ${role}`);

      // Update Firestore document (or create if it doesn't exist)
      await admin.firestore().collection('users').doc(uid).set(
        { role: role },
        { merge: true }
      );

      console.log(`Successfully updated user ${uid}`);

      res.status(200).json({
        success: true,
        message: `User ${uid} updated with role: ${role}`
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }
);
