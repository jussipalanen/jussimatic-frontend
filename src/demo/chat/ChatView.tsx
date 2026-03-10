import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ask } from '../../api/chatApi';
import {
  DEFAULT_LANGUAGE,
  getStoredLanguage,
  setStoredLanguage,
  translations,
} from '../../i18n';
import type { Language } from '../../i18n';
import { formatBotHtml, formatTimestamp, getBotText } from './chatHelpers';
import type { ChatMessage } from './types';
import { usePersistedMessages } from './usePersistedMessages';

function ChatView() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const [showTips, setShowTips] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const { messages, setMessages, clearMessages } = usePersistedMessages();
  const endOfListRef = useRef<HTMLDivElement | null>(null);
  const t = translations[language] ?? translations[DEFAULT_LANGUAGE];

  useEffect(() => {
    setStoredLanguage(language);
  }, [language]);

  useEffect(() => {
    endOfListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const appendMessage = (nextMessage: ChatMessage) => {
    setMessages((prev) => [...prev, nextMessage]);
  };

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
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
      const response = await ask(language, userMessage);
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

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleTipClick = (example: string) => {
    setMessage(example);
    setShowTips(false);
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
      <header className="bg-gray-800 py-4 px-4 sm:px-6 border-b border-gray-700">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t.chat.title}</h1>
            <p className="text-sm text-gray-400 mt-1">{t.chat.subtitle}</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <label htmlFor="language" className="sr-only">
              {t.chat.languageLabel}
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-1.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="en">English</option>
              <option value="fi">Finnish</option>
            </select>
            <button
              onClick={() => navigate('/')}
              className="text-sm sm:text-base text-gray-400 hover:text-white"
            >
              ← {t.chat.back}
            </button>
          </div>
        </div>
      </header>

      <main className="grow flex flex-col p-3 sm:p-4 min-h-0">
        <div className="flex-1 min-h-0 bg-gray-800 rounded-lg p-4 mb-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-gray-300 max-w-xl mx-auto py-8">
              <p className="text-lg font-medium mb-2">{t.chat.empty}</p>
              <p className="text-sm text-gray-400 mb-5">{t.chat.quickStart}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {t.chat.exampleQuestions.map((example, index) => (
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
                  {t.chat.exampleQuestions.map((example, index) => (
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

      <footer className="bg-gray-800 py-6 px-4 text-center border-t border-gray-700">
        <div className="flex justify-center items-center gap-4 mb-3">
          <a
            href="https://github.com/jussipalanen/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="GitHub"
          >
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
          <a
            href="https://www.linkedin.com/in/jussi-alanen-38628a75/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="LinkedIn"
          >
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
        </div>
        <p className="text-gray-400">&copy; {year} Jussimatic (Jussi Alanen). {t.footer}</p>
      </footer>
    </div>
  );
}

export default ChatView;
