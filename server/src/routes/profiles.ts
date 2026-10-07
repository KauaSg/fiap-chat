import { Router } from 'express';
import { admin } from '../services/firebaseAdmin.js';

export const profilesRouter = Router();

async function sharesConversation(viewerId: string, targetId: string): Promise<boolean> {
  const firestore = admin.firestore();
  const directId = [viewerId, targetId].sort().join('_');
  const direct = await firestore.collection('directConversations').doc(directId).get();
  if (direct.exists) return true;

  const groups = await firestore.collection('groups').where('memberIds', 'array-contains', viewerId).get();
  return groups.docs.some((group) => {
    const memberIds = (group.data().memberIds ?? []) as string[];
    return memberIds.includes(targetId);
  });
}

profilesRouter.get('/:uid', async (req, res) => {
  const viewerId = req.authUser?.uid;
  const targetId = req.params.uid;
  if (!viewerId) return res.status(401).json({ error: 'Não autenticado.' });

  if (viewerId !== targetId && !(await sharesConversation(viewerId, targetId))) {
    return res.status(403).json({ error: 'Você não possui uma conversa em comum com este usuário.' });
  }

  const profile = await admin.firestore().collection('users').doc(targetId).get();
  if (!profile.exists) return res.status(404).json({ error: 'Perfil não encontrado.' });
  return res.json(profile.data());
});
