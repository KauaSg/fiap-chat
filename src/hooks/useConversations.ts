import { useEffect, useState } from 'react';
import { subscribeConversations } from '../services/conversationService';
import type { ConversationListItem } from '../types/chat';

export function useConversations(uid: string | undefined): {
  conversations: ConversationListItem[];
  loading: boolean;
  error: string;
} {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid) {
      setConversations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeConversations(
      uid,
      (items) => {
        setConversations(items);
        setLoading(false);
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );
  }, [uid]);

  return { conversations, loading, error };
}
