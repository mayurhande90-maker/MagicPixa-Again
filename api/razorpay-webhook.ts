
import crypto from 'crypto';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error("Firebase Admin Init Error:", e);
    }
}

const db = admin.firestore();

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // 1. Verify Webhook Signature
    // Use the raw request body for verification
    // Note: Vercel normally provides JSON, so we re-stringify it. 
    // For extreme security, use the raw buffer if available.
    const bodyString = JSON.stringify(req.body);
    const expectedSignature = crypto
        .createHmac('sha256', secret || '')
        .update(bodyString)
        .digest('hex');

    if (expectedSignature !== signature) {
        console.error("Invalid Webhook Signature");
        return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    // 2. Handle Payment Captured Event
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
        const payment = event.payload.payment.entity;
        const { userId, packName, credits, price, type } = payment.notes || {};

        if (!userId || !credits) {
            console.error("Missing metadata in Razorpay notes", payment.notes);
            return res.status(200).json({ status: 'ok', warning: 'Metadata missing' });
        }

        try {
            const userRef = db.collection('users').doc(userId);
            const purchaseRef = db.collection('purchases').doc(payment.id); // Use payment ID for idempotency

            // Start atomic transaction
            await db.runTransaction(async (transaction) => {
                const purchaseDoc = await transaction.get(purchaseRef);
                
                // 3. Idempotency Check: Don't process same payment twice
                if (purchaseDoc.exists) {
                    return; 
                }

                // Get current user stats
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists) throw new Error("User not found");

                const userData = userDoc.data() || {};
                const creditAmount = parseInt(credits);
                const pricePaid = parseInt(price) || 0;

                // 4. Perform Updates
                transaction.update(userRef, {
                    credits: admin.firestore.FieldValue.increment(creditAmount),
                    totalCreditsAcquired: admin.firestore.FieldValue.increment(creditAmount),
                    totalSpent: admin.firestore.FieldValue.increment(pricePaid),
                    plan: type === 'plan' ? packName : (userData.plan || 'Free'),
                    // Storage Tier Logic
                    ...(type === 'plan' && (packName.includes('Studio') || packName.includes('Agency')) ? { 
                        storageTier: 'unlimited', 
                        basePlan: packName,
                        lastTierPurchaseDate: admin.firestore.FieldValue.serverTimestamp() 
                    } : {})
                });

                // 5. Log Transaction for User
                const txRef = userRef.collection('transactions').doc();
                transaction.set(txRef, {
                    feature: type === 'plan' ? `Purchase: ${packName}` : `Credit Refill`,
                    cost: 0,
                    creditChange: `+${creditAmount}`,
                    date: admin.firestore.FieldValue.serverTimestamp(),
                    pricePaid: pricePaid,
                    paymentId: payment.id,
                    method: 'webhook'
                });

                // 6. Log Global Purchase Record
                transaction.set(purchaseRef, {
                    userId,
                    paymentId: payment.id,
                    packName,
                    creditsAdded: creditAmount,
                    amountPaid: pricePaid,
                    status: 'success',
                    purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
                    method: 'razorpay_webhook'
                });
            });

            console.log(`Webhook: Successfully credited user ${userId} with ${credits} credits.`);
            return res.status(200).json({ status: 'ok' });

        } catch (error: any) {
            console.error("Webhook processing error:", error);
            return res.status(500).json({ error: 'Internal processing error' });
        }
    }

    // Acknowledge other events but do nothing
    return res.status(200).json({ status: 'ignored' });
}
