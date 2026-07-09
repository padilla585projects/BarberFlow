"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.addBarberToShop = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * HTTP Function to add a barber to a barbershop
 * Usage: POST /addBarberToShop
 * Body: { barbershopId: string, barberUID: string }
 */
exports.addBarberToShop = functions.https.onRequest(async (req, res) => {
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
        const barbershopData = barbershopDoc.data();
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
        }
        else {
            console.log(`Barber ${barberUID} already exists in barbershop`);
        }
        // 2. Add membership to barber user document
        const membership = {
            barbershopId,
            barbershopName,
            role: 'barber',
            joinedAt: admin.firestore.Timestamp.now()
        };
        const barberData = barberDoc.data();
        const currentMemberships = barberData.memberships || [];
        // Check if membership already exists
        const existingMembership = currentMemberships.find((m) => m.barbershopId === barbershopId);
        if (!existingMembership) {
            await db.collection('users').doc(barberUID).update({
                memberships: admin.firestore.FieldValue.arrayUnion(membership)
            });
            console.log(`Added membership to barber user ${barberUID}`);
        }
        else {
            console.log(`Membership already exists for barber`);
        }
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
    }
    catch (error) {
        console.error('Error adding barber to shop:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
    }
});
//# sourceMappingURL=addBarberToShop.js.map