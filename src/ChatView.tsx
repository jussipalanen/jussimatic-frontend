import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ask } from './api/chatApi';
import {
  DEFAULT_LANGUAGE,
  getStoredLanguage,
  setStoredLanguage,
  translations,
} from './i18n';
import type { Language } from './i18n';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  createdAt?: number;
  images?: { dataUri: string }[];
}

const MESSAGES_STORAGE_KEY = 'jussimatic-chat-messages';

function ChatView() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return [];

    try {
      const stored = window.localStorage.getItem(MESSAGES_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? (parsed as Message[]) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = translations[language] ?? translations[DEFAULT_LANGUAGE];

  const formatTimestamp = (value?: number) => {
    if (!value) return '';
    const date = new Date(value);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  useEffect(() => {
    setStoredLanguage(language);
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage errors.
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    const userMessageObj: Message = {
      id: Date.now(),
      text: userMessage,
      isUser: true,
      createdAt: Date.now(),
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessageObj]);
    setMessage('');
    setIsLoading(true);

    try {
      // Call the API with the selected language and the user's message
      const response = await ask(language, userMessage);
      
      // Add API response to chat
      let botText = t.chat.noResponse;
      if (typeof response === 'object' && response !== null) {
        if ('answer' in response && typeof response.answer === 'string') {
          botText = response.answer;
        } else if ('response' in response && typeof response.response === 'string') {
          botText = response.response;
        }
      }

      const botImages = Array.isArray(response?.images)
        ? response.images.filter((img: { dataUri?: string }) => Boolean(img?.dataUri))
        : undefined;
      const botMessage: Message = {
        id: Date.now() + 1,
        text: botText,
        isUser: false,
        createdAt: Date.now(),
        images: botImages,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      // Handle error
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: t.chat.error,
        isUser: false,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearMessages = () => {
    setMessages([]);

    if (typeof window === 'undefined') return;

    try {
      window.localStorage.removeItem(MESSAGES_STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 py-4 px-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t.chat.title}</h1>

          <div className="flex items-center gap-3">
            <label htmlFor="language" className="sr-only">
              {t.chat.languageLabel}
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="en">English</option>
              <option value="fi">Finnish</option>
            </select>
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white"
            >
              ← {t.chat.back}
            </button>
          </div>
        </div>
      </header>

      {/* Chat content */}
      <main className="flex-grow flex flex-col p-4 min-h-0">
        <div className="grow min-h-0 bg-gray-800 rounded-lg p-4 mb-4 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-400 text-center">{t.chat.empty}</p>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
                    className={`max-w-[60%] rounded-lg px-4 py-2 ${
                msg.isUser
            ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-100 fade-in-message'
              }`}
            >
              <div>{msg.text}</div>
              {!msg.isUser && Array.isArray(msg.images) && msg.images.length > 0 && (
                <div className="mt-2 space-y-2">
                  {msg.images.map((img) => (
                    <img
                      key={img.dataUri}
                      src={img.dataUri}
                      alt="AI generated"
                      className="max-w-[320px] max-h-[200px] h-auto object-contain rounded-lg"
                    />
                  ))}
                </div>
              )}
              {msg.createdAt && (
                <div className="mt-2 text-xs text-gray-400">
            {formatTimestamp(msg.createdAt)}
                </div>
              )}
            </div>
          </div>
              ))}
              {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[70%] rounded-lg px-4 py-2 bg-gray-700 text-gray-100">
              <div className="typing-indicator" aria-label="AI is typing">
                <span className="typing-dot" />
                <span className="typing-dot typing-dot--2" />
                <span className="typing-dot typing-dot--3" />
              </div>
            </div>
          </div>
              )}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder={t.chat.inputPlaceholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-grow bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !message.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? t.chat.sending : t.chat.send}
            </button>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleClearMessages}
              className="text-sm text-gray-400 hover:text-white"
            >
              {t.chat.clearMessages}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 py-6 px-4 text-center border-t border-gray-700">
        <p className="text-gray-400">&copy; {year} Jussimatic. {t.footer}</p>
      </footer>
    </div>
  );
}

export default ChatView;
