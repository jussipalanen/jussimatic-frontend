import { useEffect, useRef, useState } from 'react';
import { useLocaleNavigate } from '../../hooks/useLocaleNavigate';
import { ask } from '../../api/chatApi';
import {
  DEFAULT_LANGUAGE,
  getStoredLanguage,
  translations,
} from '../../i18n';
import type { Language } from '../../i18n';
import { formatBotHtml, formatTimestamp, getBotText } from './chatHelpers';
import type { ChatMessage } from './types';
import { usePersistedMessages } from './usePersistedMessages';
import Header from '../../components/Header';

function ChatView() {
  const navigate = useLocaleNavigate();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const [showTips, setShowTips] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const { messages, setMessages, clearMessages } = usePersistedMessages();
  const endOfListRef = useRef<HTMLDivElement | null>(null);
  const t = translations[language] ?? translations[DEFAULT_LANGUAGE];
  const suggestions = t.chat.exampleQuestions;

  useEffect(() => {
    const handler = (event: Event) => setLanguage((event as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    endOfListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const appendMessage = (nextMessage: ChatMessage) => {
    setMessages((prev) => [...prev, nextMessage]);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage = text.trim();
    const userMessageObj: ChatMessage = {
      id: Date.now(),
      text: userMessage,
      isUser: true,
      createdAt: Date.now(),
    };

    appendMessage(userMessageObj);
    setMessage('');
    setIsLoading(true);

    setShowTips(false);

    try {
      const history = messages.map((m) => ({
        role: (m.isUser ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text,
      }));
      const response = await ask(userMessage, language, history);
      const botText = getBotText(response, t.chat.noResponse);

      const botImages = Array.isArray(response?.images)
        ? response.images.filter((img: { dataUri?: string }) => Boolean(img?.dataUri))
        : undefined;

      const botMessage: ChatMessage = {
        id: Date.now() + 1,
        text: botText,
        isUser: false,
        createdAt: Date.now(),
        images: botImages,
      };

      appendMessage(botMessage);
    } catch (error) {
      appendMessage({
        id: Date.now() + 1,
        text: t.chat.error,
        isUser: false,
        createdAt: Date.now(),
      });
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => void sendMessage(message);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTipClick = (example: string) => {
    setShowTips(false);
    void sendMessage(example);
  };

  const handleCopy = async (msg: ChatMessage) => {
    if (msg.isUser) return;

    try {
      await navigator.clipboard.writeText(msg.text);
      setCopiedId(msg.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Ignore clipboard failures.
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Header
        title={t.chat.title}
        subtitle={t.chat.subtitle}
        language={language}
        onLanguageChange={setLanguage}
        backLabel={t.chat.back}
        onBack={() => navigate('/')}
        containerClassName="w-full"
      />

      <main className="grow flex flex-col p-3 sm:p-4 min-h-0">
        <div className="flex-1 min-h-0 bg-gray-800 rounded-lg p-4 mb-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-gray-300 max-w-xl mx-auto py-8">
              <p className="text-lg font-medium mb-2">{t.chat.empty}</p>
              <p className="text-sm text-gray-400 mb-5">{t.chat.quickStart}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleTipClick(example)}
                    className="px-3 py-1.5 rounded-full text-sm bg-gray-700 hover:bg-gray-600 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] sm:max-w-[72%] lg:max-w-[62%] rounded-lg px-4 py-3 ${
                      msg.isUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100 fade-in-message'
                    }`}
                  >
                    {msg.isUser ? (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    ) : (
                      <div
                        className="bot-message"
                        dangerouslySetInnerHTML={{ __html: formatBotHtml(msg.text) }}
                      />
                    )}

                    {!msg.isUser && Array.isArray(msg.images) && msg.images.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.images.map((img) => (
                          <img
                            key={img.dataUri}
                            src={img.dataUri}
                            alt="AI generated"
                            className="max-w-[320px] max-h-50 h-auto object-contain rounded-lg"
                          />
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between gap-4">
                      <div className="text-xs text-gray-400">
                        {formatTimestamp(msg.createdAt, language)}
                      </div>
                      {!msg.isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopy(msg)}
                          className="text-xs text-gray-400 hover:text-white"
                        >
                          {copiedId === msg.id ? t.chat.copied : t.chat.copy}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] sm:max-w-[72%] rounded-lg px-4 py-2 bg-gray-700 text-gray-100">
                    <div className="typing-indicator" aria-label="AI is typing">
                      <span className="typing-dot" />
                      <span className="typing-dot typing-dot--2" />
                      <span className="typing-dot typing-dot--3" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={endOfListRef} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2 relative">
            <textarea
              rows={2}
              placeholder={t.chat.inputPlaceholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={isLoading}
              className="w-full grow bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 resize-none"
            />
            <button
              onClick={() => void handleSend()}
              disabled={isLoading || !message.trim()}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? t.chat.sending : t.chat.send}
            </button>

            <button
              onClick={() => setShowTips((prev) => !prev)}
              className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              title={t.chat.tips}
              aria-label={t.chat.tips}
            >
              ?
            </button>

            {showTips && (
              <div className="absolute bottom-full left-0 sm:left-auto sm:right-0 mb-2 w-full sm:w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 z-10">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-300">{t.chat.tips}</h3>
                  <button
                    onClick={() => setShowTips(false)}
                    className="text-gray-400 hover:text-white"
                    aria-label={t.chat.closeTips}
                  >
                    x
                  </button>
                </div>
                <div className="space-y-2">
                  {suggestions.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleTipClick(example)}
                      className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={clearMessages}
              className="text-sm text-gray-400 hover:text-white"
            >
              {t.chat.clearMessages}
            </button>
          </div>
        </div>
      </main>

    </div>
  );
}

export default ChatView;
