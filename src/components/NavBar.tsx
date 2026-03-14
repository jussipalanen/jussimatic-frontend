import { useNavigate } from 'react-router-dom';
import NavActions from './NavActions';

interface NavBarProps {
  /** Optional callback to open a login modal. If not provided, navigates to /?auth=login */
  onLoginClick?: () => void;
}

export default function NavBar({ onLoginClick }: NavBarProps) {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <button
            onClick={() => navigate('/')}
            className="text-white font-bold text-lg hover:text-blue-400 transition-colors"
          >
            Jussimatic
          </button>
          <NavActions onLoginClick={onLoginClick} />
        </div>
      </div>
    </nav>
  );
}
