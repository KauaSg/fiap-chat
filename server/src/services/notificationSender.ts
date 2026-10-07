import { admin } from './firebaseAdmin.js';
import type { ConversationType, DeviceRegistration } from '../types.js';

type ResolvedDevice = DeviceRegistration & { userId: string };

type SendInput = {
  devices: ResolvedDevice[];
  conversationId: string;
  conversationType: ConversationType;
};

export type SendResult = {
  attempted: number;
  disabledDevices: Array<{ userId: string; deviceId: string }>;
};

function isPermanentFcmFailure(code: string | undefined): boolean {
  return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token';
}

export async function sendNotifications(input: SendInput): Promise<SendResult> {
  const disabledDevices: Array<{ userId: string; deviceId: string }> = [];
  const fcmDevices = input.devices.filter((device) => device.nativeProvider === 'fcm' && device.nativeToken);
  const expoDevices = input.devices.filter((device) => !(device.nativeProvider === 'fcm' && device.nativeToken) && device.expoToken);

  if (fcmDevices.length > 0) {
    const response = await admin.messaging().sendEachForMulticast({
      tokens: fcmDevices.map((device) => device.nativeToken),
      notification: {
        title: 'Nova mensagem',
        body: 'Você recebeu uma nova mensagem.',
      },
      data: {
        conversationId: input.conversationId,
        conversationType: input.conversationType,
      },
    });

    response.responses.forEach((item, index) => {
      if (!item.success && isPermanentFcmFailure(item.error?.code)) {
        const device = fcmDevices[index];
        if (device) disabledDevices.push({ userId: device.userId, deviceId: device.deviceId });
      }
    });
  }

  if (expoDevices.length > 0) {
    const payload = expoDevices.map((device) => ({
      to: device.expoToken,
      title: 'Nova mensagem',
      body: 'Você recebeu uma nova mensagem.',
      sound: 'default',
      data: {
        conversationId: input.conversationId,
        conversationType: input.conversationType,
      },
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Falha ao enviar notificações pelo Expo Push Service.');

    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'data' in body && Array.isArray(body.data)) {
      body.data.forEach((ticket: unknown, index: number) => {
        if (
          typeof ticket === 'object' && ticket !== null &&
          'status' in ticket && ticket.status === 'error' &&
          'details' in ticket && typeof ticket.details === 'object' && ticket.details !== null &&
          'error' in ticket.details && ticket.details.error === 'DeviceNotRegistered'
        ) {
          const device = expoDevices[index];
          if (device) disabledDevices.push({ userId: device.userId, deviceId: device.deviceId });
        }
      });
    }
  }

  for (const device of disabledDevices) {
    await admin.firestore().collection('users').doc(device.userId).collection('devices').doc(device.deviceId).set(
      { enabled: false, updatedAt: Date.now() },
      { merge: true },
    );
  }

  return { attempted: fcmDevices.length + expoDevices.length, disabledDevices };
}
