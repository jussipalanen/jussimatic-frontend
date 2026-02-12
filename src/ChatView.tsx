import { useNavigate } from 'react-router-dom';

function ChatView() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

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
          <p className="text-gray-400 text-center">Start your conversation...</p>
        </div>

        {/* Input area */}
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Type your message..." 
            className="flex-grow bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg">
            Send
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
