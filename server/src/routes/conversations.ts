import { Router } from 'express';
import { admin } from '../services/firebaseAdmin.js';
import { syncConversationAccess } from '../services/accessSync.js';

export const conversationsRouter = Router();

conversationsRouter.post('/direct', async (req, res) => {
  const uid = req.authUser?.uid;
  const otherUserId = typeof req.body?.otherUserId === 'string' ? req.body.otherUserId : '';
  if (!uid) return res.status(401).json({ error: 'Não autenticado.' });
  if (!otherUserId || otherUserId === uid) return res.status(400).json({ error: 'Usuário inválido para conversa individual.' });

  const firestore = admin.firestore();
  const other = await firestore.collection('users').doc(otherUserId).get();
  if (!other.exists) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const participantIds = [uid, otherUserId].sort() as [string, string];
  const id = participantIds.join('_');
  const ref = firestore.collection('directConversations').doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    await ref.set({ participantIds, createdAt: Date.now() });
  }
  await syncConversationAccess(id, participantIds);
  return res.json({ id });
});
