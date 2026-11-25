import { useState } from 'react';
import { Menu, User, LogOut } from 'lucide-react';
import { AuthUseCases } from '../../../application/usecases/AuthUseCases.js';
import { useNavigate } from 'react-router-dom';
import './Header.scss';

const authUseCases = new AuthUseCases();

export function Header({ onToggleSidebar }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const currentUser = authUseCases.getCurrentUser();

  const handleLogout = async () => {
    try {
      await authUseCases.logout();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-btn" onClick={onToggleSidebar} aria-label="Abrir menú">
          <Menu size={20} />
        </button>
      </div>
      
      <div className="header-right">
        {/* Se quitó la campana con un contador fijo en "3": no había notificaciones reales. */}
        <div className="user-menu">
          <button
            className="user-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-haspopup="menu"
            aria-expanded={showUserMenu}
            aria-label="Menú de la cuenta"
          >
            <div className="user-avatar">
              <User size={18} />
            </div>
            <span className="user-name">{currentUser?.email}</span>
          </button>
          
          {showUserMenu && (
            <div className="user-dropdown">
              <button onClick={() => navigate('/admin/ajustes')}>
                <User size={16} />
                Perfil
              </button>
              <button onClick={handleLogout} className="logout-btn">
                <LogOut size={16} />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}