import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ask } from './api/chatApi';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
}

function ChatView() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    const userMessageObj: Message = {
      id: Date.now(),
      text: userMessage,
      isUser: true,
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessageObj]);
    setMessage('');
    setIsLoading(true);

    try {
      // Call the API with language "en" and the user's message
      const response = await ask('en', userMessage);
      
      // Add API response to chat
      const botMessage: Message = {
        id: Date.now() + 1,
        text: response.response?.answer || JSON.stringify(response?.answer) || 'No response from API.',
        isUser: false,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      // Handle error
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: 'Sorry, there was an error processing your request.',
        isUser: false,
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

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 py-4 px-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Chat</h1>
          <button 
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white"
          >
            ← Back
          </button>
        </div>
      </header>

      {/* Chat content */}
      <main className="flex-grow flex flex-col p-4">
        <div className="flex-grow bg-gray-800 rounded-lg p-4 mb-4 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-400 text-center">Start your conversation...</p>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Type your message..." 
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
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 py-6 px-4 text-center border-t border-gray-700">
        <p className="text-gray-400">&copy; {year} Jussimatic. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default ChatView;
