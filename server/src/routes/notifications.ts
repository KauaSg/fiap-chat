import { Router } from 'express';
import { admin } from '../services/firebaseAdmin.js';
import { resolveRecipients } from '../services/recipientResolver.js';
import { sendNotifications } from '../services/notificationSender.js';
import type { ChatMessage } from '../types.js';

export const notificationsRouter = Router();

notificationsRouter.post('/messages', async (req, res) => {
  const uid = req.authUser?.uid;
  const conversationId = typeof req.body?.conversationId === 'string' ? req.body.conversationId : '';
  const messageId = typeof req.body?.messageId === 'string' ? req.body.messageId : '';
  if (!uid) return res.status(401).json({ error: 'Não autenticado.' });
  if (!conversationId || !messageId) return res.status(400).json({ error: 'conversationId e messageId são obrigatórios.' });

  const messageSnapshot = await admin.database().ref(`messages/${conversationId}/${messageId}`).get();
  if (!messageSnapshot.exists()) return res.status(404).json({ error: 'Mensagem não encontrada.' });
  const message = messageSnapshot.val() as ChatMessage;
  if (message.senderId !== uid) return res.status(403).json({ error: 'O remetente não corresponde ao usuário autenticado.' });

  const dispatchId = `${conversationId}--${messageId}`;
  const dispatchRef = admin.firestore().collection('notificationDispatches').doc(dispatchId);
  const acquired = await admin.firestore().runTransaction(async (transaction) => {
    const current = await transaction.get(dispatchRef);
    if (current.exists && current.data()?.status === 'sent') return false;
    if (current.exists && current.data()?.status === 'processing') return false;
    transaction.set(dispatchRef, { status: 'processing', conversationId, messageId, startedAt: Date.now() });
    return true;
  });

  if (!acquired) return res.json({ ok: true, duplicate: true });

  try {
    const resolution = await resolveRecipients(message);
    const result = await sendNotifications({
      devices: resolution.devices,
      conversationId,
      conversationType: message.conversationType,
    });
    await dispatchRef.set({
      status: 'sent',
      conversationId,
      messageId,
      recipientIds: resolution.recipientIds,
      attempted: result.attempted,
      finishedAt: Date.now(),
    }, { merge: true });
    return res.json({ ok: true, recipients: resolution.recipientIds.length, attempted: result.attempted });
  } catch (cause: unknown) {
    await dispatchRef.set({ status: 'failed', failedAt: Date.now() }, { merge: true });
    return res.status(500).json({ error: cause instanceof Error ? cause.message : 'Falha ao enviar notificações.' });
  }
});
