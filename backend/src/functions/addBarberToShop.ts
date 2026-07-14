import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Request, Response } from 'express';

/**
 * HTTP Function to add a barber to a barbershop
 * Usage: POST /addBarberToShop
 * Body: { barbershopId: string, barberUID: string }
 */
export const addBarberToShop = functions.https.onRequest(
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
      const { barbershopId, barberUID } = req.body;

      if (!barbershopId || !barberUID) {
        res.status(400).json({ error: 'Missing barbershopId or barberUID' });
        return;
      }

      const db = admin.firestore();

      // Get barbershop document
      const barbershopDoc = await db.collection('barbershops').doc(barbershopId).get();
      if (!barbershopDoc.exists) {
        res.status(404).json({ error: `Barbershop ${barbershopId} not found` });
        return;
      }

      const barbershopData = barbershopDoc.data()!;
      const barbershopName = barbershopData.name;

      // Get barber user document
      const barberDoc = await db.collection('users').doc(barberUID).get();
      if (!barberDoc.exists) {
        res.status(404).json({ error: `User ${barberUID} not found` });
        return;
      }

      console.log(`Adding barber ${barberUID} to barbershop ${barbershopId} (${barbershopName})`);

      // 1. Add barber UID to barbershop's barbers array
      const currentBarbers = barbershopData.barbers || [];
      if (!currentBarbers.includes(barberUID)) {
        await db.collection('barbershops').doc(barbershopId).update({
          barbers: admin.firestore.FieldValue.arrayUnion(barberUID)
        });
        console.log(`Added barber ${barberUID} to barbershop barbers array`);
      } else {
        console.log(`Barber ${barberUID} already exists in barbershop`);
      }

      // 2. Add membership to barber user document
      const membership = {
        barbershopId,
        barbershopName,
        role: 'barber',
        joinedAt: admin.firestore.Timestamp.now()
      };

      const barberData = barberDoc.data()!;
      const currentMemberships = barberData.memberships || [];

      // Check if membership already exists
      const existingMembership = currentMemberships.find(
        (m: any) => m.barbershopId === barbershopId
      );

      // Also sync legacy top-level fields (role, barbershopId, activeBarbershopId).
      // firestore.rules' isBarberOf()/isOwnerOf() and several client queries still
      // read these flat fields directly, so they must stay in sync with
      // memberships[] or the barber ends up with "Missing or insufficient
      // permissions" errors on their own shop's data.
      const userUpdate: admin.firestore.UpdateData<admin.firestore.DocumentData> = {
        role: 'barber',
        barbershopId,
        activeBarbershopId: barbershopId
      };

      if (!existingMembership) {
        userUpdate.memberships = admin.firestore.FieldValue.arrayUnion(membership);
      } else {
        console.log(`Membership already exists for barber`);
      }

      await db.collection('users').doc(barberUID).update(userUpdate);
      console.log(`Synced role/barbershopId/activeBarbershopId and membership for barber user ${barberUID}`);

      console.log(`Successfully added barber ${barberUID} to barbershop ${barbershopId}`);

      res.status(200).json({
        success: true,
        message: `Barber ${barberUID} added to barbershop ${barbershopId}`,
        barbershop: {
          id: barbershopId,
          name: barbershopName
        },
        membership: membership
      });
    } catch (error) {
      console.error('Error adding barber to shop:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }
);
