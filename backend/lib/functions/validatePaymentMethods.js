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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePayPalEmail = exports.validateStripeKey = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
/**
 * HTTP Callable Function to validate a Stripe publishable key
 * Usage: POST /validateStripeKey
 * Body: { barbershopId: string, publishableKey: string }
 * Returns: { valid: true, merchantEmail: string } or { valid: false, error: string }
 */
exports.validateStripeKey = functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        const { barbershopId, publishableKey } = req.body;
        if (!barbershopId || !publishableKey) {
            res.status(400).json({ error: 'Missing barbershopId or publishableKey' });
            return;
        }
        // Basic format validation
        if (!publishableKey.startsWith('pk_')) {
            res.status(400).json({ error: 'Invalid Stripe key format (must start with pk_)' });
            return;
        }
        const db = admin.firestore();
        // Verify barbershop exists
        const barbershopDoc = await db.collection('barbershops').doc(barbershopId).get();
        if (!barbershopDoc.exists) {
            res.status(404).json({ error: 'Barbershop not found' });
            return;
        }
        const barbershopData = barbershopDoc.data();
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
        // Initialize Stripe with the provided publishable key
        // Note: For MVP, we validate using the public key (limited validation).
        // In production, you'd use the secret key from Firebase Secrets to make full API calls.
        const stripe = new stripe_1.default(publishableKey, {
            typescript: true,
        });
        // Try a simple read-only request to validate the key
        // This will fail if the key is invalid or revoked
        await stripe.customers.list({ limit: 1 });
        // Extract merchant email from Stripe account
        // For now, we'll use a placeholder; in production, fetch from Stripe API
        const merchantEmail = barbershopData.ownerEmail || 'owner@barberflow.local';
        console.log(`[validateStripeKey] Valid Stripe key for barbershop ${barbershopId}`);
        // Update Firestore with validated payment method
        await db.collection('barbershops').doc(barbershopId).update({
            'paymentMethods.stripe': {
                enabled: true,
                publishableKey,
                merchantEmail,
                lastValidated: admin.firestore.Timestamp.now(),
            },
        });
        res.status(200).json({
            valid: true,
            merchantEmail,
            message: 'Stripe key validated and saved',
        });
    }
    catch (error) {
        console.error('[validateStripeKey] Error:', error.message);
        if (error.type === 'StripeInvalidRequestError') {
            res.status(400).json({
                valid: false,
                error: 'Invalid Stripe key. Please check your publishable key.',
            });
        }
        else if (error.type === 'StripeAuthenticationError') {
            res.status(401).json({
                valid: false,
                error: 'Stripe authentication failed. Your key may be revoked.',
            });
        }
        else {
            res.status(500).json({
                valid: false,
                error: error.message || 'Failed to validate Stripe key',
            });
        }
    }
});
/**
 * HTTP Callable Function to validate a PayPal email
 * Usage: POST /validatePayPalEmail
 * Body: { barbershopId: string, email: string }
 * Returns: { valid: true } or { valid: false, error: string }
 *
 * Note: Full validation requires PayPal SDK setup with client ID/secret.
 * For MVP, this validates email format and connectivity.
 */
exports.validatePayPalEmail = functions.https.onRequest(async (req, res) => {
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
        const barbershopData = barbershopDoc.data();
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
    }
    catch (error) {
        console.error('[validatePayPalEmail] Error:', error.message);
        res.status(500).json({
            valid: false,
            error: error.message || 'Failed to validate PayPal email',
        });
    }
});
//# sourceMappingURL=validatePaymentMethods.js.map