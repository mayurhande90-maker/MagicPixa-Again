
import { db } from '../firebase';
import { createTicket } from './supportService';
import firebase from 'firebase/compat/app';
import { PixaTogetherConfig } from './imageToolsService';

interface RefundResult {
    success: boolean;
    type: 'refund' | 'ticket';
    message: string;
}

export const processRefundRequest = async (
  userId: string, 
  userEmail: string, 
  cost: number, 
  reason: string,
  imageUrl: string,
  creationId?: string,
  config?: PixaTogetherConfig
): Promise<RefundResult> => {
    if (!db) throw new Error("DB not initialized");

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) throw new Error("User not found");

    const now = new Date().getTime();
    // Check last refund time. If undefined, treat as 0 (eligible).
    const lastRefund = userData.lastAutomatedRefund?.toMillis ? userData.lastAutomatedRefund.toMillis() : (userData.lastAutomatedRefund || 0);
    const hoursSinceLast = (now - lastRefund) / (1000 * 60 * 60);

    // POLICY: Eligible for auto-refund if > 24 hours since last automated refund
    if (hoursSinceLast > 24) {
        
        await db.runTransaction(async (t) => {
            // 1. Give credits back
            t.update(userRef, {
                credits: firebase.firestore.FieldValue.increment(cost),
                lastAutomatedRefund: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 2. Log transaction
            const txRef = userRef.collection('transactions').doc();
            t.set(txRef, {
                feature: 'Refund: Pixa Together',
                creditChange: `+${cost}`,
                reason: reason,
                date: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        // 3. IMPORTANT: We do not explicitly delete the Creation document by ID here because 
        // passing the exact ID back from the UI requires tighter state coupling.
        // Instead, the frontend should remove it from view.
        // In a strict backend, we would pass creationId and delete it here.
        
        return { 
            success: true, 
            type: 'refund', 
            message: `${cost} credits have been refunded to your account.` 
        };

    } else {
        // Fallback: Create Support Ticket with Detailed Info
        let description = `User reported poor quality generation.\nReason: ${reason}`;
        
        if (config) {
            description += `\n\n--- Generation Settings ---\n`;
            description += `Mode: ${config.mode}\n`;
            description += `Relationship: ${config.relationship}\n`;
            if (config.mode === 'creative') {
                description += `Mood: ${config.mood}\n`;
                description += `Environment: ${config.environment}\n`;
                description += `Pose: ${config.pose}\n`;
                if(config.customDescription) description += `Custom: ${config.customDescription}\n`;
            }
            description += `Locks: Age(${config.locks.age}), Hair(${config.locks.hair})\n`;
        }

        await createTicket(userId, userEmail, {
            type: 'refund',
            subject: 'Refund Request: Pixa Together',
            description: description,
            refundAmount: cost,
            // Store the creation ID in a field that AdminPanel can look for (reusing relatedTransactionId or adding custom metadata)
            // Ideally we should add a specific field to Ticket type, but for now we can append to description or use a generic field if available.
            // Let's assume we can add custom fields to the Firestore doc even if not in Typescript strict interface immediately, 
            // or better, map it to `relatedTransactionId` as a placeholder for "Related Entity ID"
            relatedTransactionId: creationId 
        });

        return { 
            success: true, 
            type: 'ticket', 
            message: "Request sent to support team for review. You will be notified shortly." 
        };
    }
};
