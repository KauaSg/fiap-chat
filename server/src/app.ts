import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { initializeFirebaseAdmin } from './services/firebaseAdmin.js';
import { authenticate } from './middleware/authenticate.js';
import { conversationsRouter } from './routes/conversations.js';
import { groupsRouter } from './routes/groups.js';
import { notificationsRouter } from './routes/notifications.js';
import { profilesRouter } from './routes/profiles.js';

initializeFirebaseAdmin();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'fiap-chat-api' });
});

app.use(authenticate);
app.use('/conversations', conversationsRouter);
app.use('/groups', groupsRouter);
app.use('/notifications', notificationsRouter);
app.use('/profiles', profilesRouter);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  process.stdout.write(`FIAP Chat API online na porta ${port}\n`);
});
