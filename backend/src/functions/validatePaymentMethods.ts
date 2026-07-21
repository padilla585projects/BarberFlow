import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Request, Response } from 'express';

/**
 * HTTP Callable Function to validate a PayPal email
 * Usage: POST /validatePayPalEmail
 * Body: { barbershopId: string, email: string }
 * Returns: { valid: true } or { valid: false, error: string }
 *
 * Note: Full validation requires PayPal SDK setup with client ID/secret.
 * For MVP, this validates email format and connectivity.
 */
export const validatePayPalEmail = functions.https.onRequest(
  async (req: Request, res: Response) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      const { barbershopId, email } = req.body;

      if (!barbershopId || !email) {
        res.status(400).json({ error: 'Missing barbershopId or email' });
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      const db = admin.firestore();

      // Verify barbershop exists
      const barbershopDoc = await db.collection('barbershops').doc(barbershopId).get();
      if (!barbershopDoc.exists) {
        res.status(404).json({ error: 'Barbershop not found' });
        return;
      }

      const barbershopData = barbershopDoc.data()!;

      // Get ID token from Authorization header and verify it
      const bearerToken = (req.headers.authorization || '').split(' ')[1];
      if (!bearerToken) {
        res.status(401).json({ error: 'Missing authorization token' });
        return;
      }

      const decodedToken = await admin.auth().verifyIdToken(bearerToken);
      const userId = decodedToken.uid;

      // Verify user owns this barbershop
      if (barbershopData.ownerId !== userId) {
        res.status(403).json({ error: 'Not authorized to update this barbershop' });
        return;
      }

      // TODO: Implement PayPal SDK validation
      // For MVP, we'll just validate email format and store it
      // Production flow:
      // 1. Initialize PayPal SDK with client ID/secret from Firebase Secrets
      // 2. Create a test payment of $0.01 to verify the account
      // 3. Capture or cancel the payment immediately
      // 4. Return success/failure based on API response

      console.log(`[validatePayPalEmail] Email format valid for ${email}`);

      // Update Firestore with validated payment method
      await db.collection('barbershops').doc(barbershopId).update({
        'paymentMethods.paypal': {
          enabled: true,
          email,
          lastValidated: admin.firestore.Timestamp.now(),
        },
      });

      res.status(200).json({
        valid: true,
        message: 'PayPal email validated and saved',
      });
    } catch (error: any) {
      console.error('[validatePayPalEmail] Error:', error.message);

      res.status(500).json({
        valid: false,
        error: error.message || 'Failed to validate PayPal email',
      });
    }
  }
);
