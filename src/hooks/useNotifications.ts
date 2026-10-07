import { useEffect, useState } from 'react';
import { registerPushDevice } from '../services/notificationService';

export function useNotifications(uid: string | undefined): { error: string } {
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid) {
      return;
    }
    void registerPushDevice(uid).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Falha ao registrar notificações.');
    });
  }, [uid]);

  return { error };
}
