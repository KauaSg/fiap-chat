import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { admin } from '../services/firebaseAdmin.js';

declare global {
  namespace Express {
    interface Request {
      authUser?: DecodedIdToken;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação ausente.' });
    return;
  }

  try {
    req.authUser = await admin.auth().verifyIdToken(header.slice('Bearer '.length));
    next();
  } catch {
    res.status(401).json({ error: 'Token de autenticação inválido.' });
  }
}
