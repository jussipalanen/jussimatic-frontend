import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../api/authApi';

function LogoutView() {
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          await logoutUser(token);
        } catch (error) {
          console.error('Logout error:', error);
        }
        localStorage.removeItem('auth_token');
      }
      navigate('/', { replace: true });
    };

    performLogout();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-white/60 text-sm">Logging out…</div>
    </div>
  );
}

export default LogoutView;
