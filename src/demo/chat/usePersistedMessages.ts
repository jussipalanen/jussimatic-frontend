import { useEffect, useState } from 'react';
import type { ChatMessage } from './types';

const MESSAGES_STORAGE_KEY = 'jussimatic-chat-messages';

function readStoredMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(MESSAGES_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function usePersistedMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => readStoredMessages());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage errors.
    }
  }, [messages]);

  const clearMessages = () => {
    setMessages([]);

    if (typeof window === 'undefined') return;

    try {
      window.localStorage.removeItem(MESSAGES_STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
  };

  return { messages, setMessages, clearMessages };
}
