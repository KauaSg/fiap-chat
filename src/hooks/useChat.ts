import { useEffect, useState } from 'react';
import { subscribeMessages } from '../services/chatService';
import type { ChatMessage } from '../types/chat';

export function useChat(conversationId: string): {
  messages: ChatMessage[];
  loading: boolean;
  error: string;
} {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    return subscribeMessages(
      conversationId,
      (nextMessages) => {
        setMessages(nextMessages);
        setLoading(false);
      },
      (message) => {
        setError(message);
        setLoading(false);
      },
    );
  }, [conversationId]);

  return { messages, loading, error };
}
