import { Router } from 'express';
import { admin } from '../services/firebaseAdmin.js';
import { syncConversationAccess } from '../services/accessSync.js';
import type { ChatGroup, NotificationPolicy } from '../types.js';

export const groupsRouter = Router();

const allowedPolicies = new Set<NotificationPolicy>([
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
]);

function normalizeMembers(ownerId: string, raw: unknown): string[] {
  if (!Array.isArray(raw)) return [ownerId];
  const ids = raw.filter((value): value is string => typeof value === 'string' && value.length > 0);
  return [...new Set([ownerId, ...ids])];
}

function validLimit(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 2;
}

async function verifyUsers(ids: string[]): Promise<boolean> {
  const firestore = admin.firestore();
  const docs = await Promise.all(ids.map((uid) => firestore.collection('users').doc(uid).get()));
  return docs.every((snapshot) => snapshot.exists);
}

groupsRouter.post('/', async (req, res) => {
  const ownerId = req.authUser?.uid;
  if (!ownerId) return res.status(401).json({ error: 'Não autenticado.' });

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const photoUrl = typeof req.body?.photoUrl === 'string' ? req.body.photoUrl : '';
  const memberIds = normalizeMembers(ownerId, req.body?.memberIds);
  const memberLimit = req.body?.memberLimit;
  const notificationPolicy = req.body?.notificationPolicy;

  if (!name) return res.status(400).json({ error: 'Informe o nome do grupo.' });
  if (!validLimit(memberLimit)) return res.status(400).json({ error: 'Limite de integrantes inválido.' });
  if (memberIds.length < 2) return res.status(400).json({ error: 'O grupo deve possuir dois ou mais integrantes.' });
  if (memberIds.length > memberLimit) return res.status(409).json({ error: 'O grupo ultrapassa o limite configurado.' });
  if (typeof notificationPolicy !== 'string' || !allowedPolicies.has(notificationPolicy as NotificationPolicy)) {
    return res.status(400).json({ error: 'Política de notificações inválida.' });
  }
  if (!(await verifyUsers(memberIds))) return res.status(400).json({ error: 'Há integrantes inválidos.' });

  const ref = admin.firestore().collection('groups').doc();
  const now = Date.now();
  const group: ChatGroup = {
    id: ref.id,
    name,
    photoUrl,
    ownerId,
    memberIds,
    memberLimit,
    notificationPolicy: notificationPolicy as NotificationPolicy,
    createdAt: now,
    updatedAt: now,
  };
  const { id, ...stored } = group;
  await ref.set(stored);
  await syncConversationAccess(id, memberIds);
  return res.status(201).json(group);
});

groupsRouter.patch('/:groupId', async (req, res) => {
  const uid = req.authUser?.uid;
  if (!uid) return res.status(401).json({ error: 'Não autenticado.' });

  const ref = admin.firestore().collection('groups').doc(req.params.groupId);
  let updatedGroup: ChatGroup | null = null;

  try {
    await admin.firestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error('NOT_FOUND');
      const current = { id: snapshot.id, ...snapshot.data() } as ChatGroup;
      if (current.ownerId !== uid) throw new Error('FORBIDDEN');

      const memberIds = req.body?.memberIds === undefined ? current.memberIds : normalizeMembers(uid, req.body.memberIds);
      const memberLimit = req.body?.memberLimit === undefined ? current.memberLimit : req.body.memberLimit;
      const notificationPolicy = req.body?.notificationPolicy === undefined ? current.notificationPolicy : req.body.notificationPolicy;
      const name = req.body?.name === undefined ? current.name : String(req.body.name).trim();
      const photoUrl = req.body?.photoUrl === undefined ? current.photoUrl : String(req.body.photoUrl);

      if (!name) throw new Error('INVALID_NAME');
      if (!validLimit(memberLimit)) throw new Error('INVALID_LIMIT');
      if (memberIds.length < 2) throw new Error('TOO_FEW_MEMBERS');
      if (memberIds.length > memberLimit) throw new Error('LIMIT_EXCEEDED');
      if (typeof notificationPolicy !== 'string' || !allowedPolicies.has(notificationPolicy as NotificationPolicy)) throw new Error('INVALID_POLICY');
      if (!(await verifyUsers(memberIds))) throw new Error('INVALID_MEMBERS');

      updatedGroup = {
        ...current,
        name,
        photoUrl,
        memberIds,
        memberLimit,
        notificationPolicy: notificationPolicy as NotificationPolicy,
        updatedAt: Date.now(),
      };
      const { id, ...stored } = updatedGroup;
      transaction.set(ref, stored);
    });
  } catch (cause: unknown) {
    const code = cause instanceof Error ? cause.message : '';
    const map: Record<string, [number, string]> = {
      NOT_FOUND: [404, 'Grupo não encontrado.'],
      FORBIDDEN: [403, 'Somente o proprietário pode alterar o grupo.'],
      INVALID_NAME: [400, 'Nome do grupo inválido.'],
      INVALID_LIMIT: [400, 'Limite de integrantes inválido.'],
      TOO_FEW_MEMBERS: [400, 'O grupo deve possuir dois ou mais integrantes.'],
      LIMIT_EXCEEDED: [409, 'O limite não pode ser menor que a quantidade atual de integrantes.'],
      INVALID_POLICY: [400, 'Política de notificações inválida.'],
      INVALID_MEMBERS: [400, 'Há integrantes inválidos.'],
    };
    const resolved = map[code] ?? [500, 'Falha ao atualizar grupo.'];
    return res.status(resolved[0]).json({ error: resolved[1] });
  }

  // A atribuição ocorre dentro do callback da transação; explicite o tipo após
  // a conclusão para evitar que o TypeScript reduza este ramo a `never`.
  const savedGroup = updatedGroup as ChatGroup | null;
  if (!savedGroup) return res.status(500).json({ error: 'Falha ao atualizar grupo.' });
  await syncConversationAccess(savedGroup.id, savedGroup.memberIds);
  return res.json(savedGroup);
});
