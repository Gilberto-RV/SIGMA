import { NavLink } from 'react-router-dom';
import { 
  BarChart3, 
  Calendar, 
  FileText, 
  Building2, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Database,
  Brain
} from 'lucide-react';
import './Sidebar.scss';

const menuItems = [
  { path: '/admin/dashboard', icon: BarChart3, label: 'Tablero' },
  { path: '/admin/bigdata', icon: Database, label: 'Big Data' },
  { path: '/admin/ml', icon: Brain, label: 'Machine Learning' },
  { path: '/admin/calendario', icon: Calendar, label: 'Calendario' },
  { path: '/admin/eventos', icon: FileText, label: 'Eventos' },
  { path: '/admin/edificios', icon: Building2, label: 'Edificios' },
  { path: '/admin/ajustes', icon: Settings, label: 'Ajustes' }
];

export function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-mark"><Building2 size={22} /></span>
          {!collapsed && (
            <span className="logo-text">
              Gestory
              <small>SIGMA-BULL</small>
            </span>
          )}
        </div>
        <button
          className="toggle-btn"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Secciones del panel">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
            >
              <IconComponent size={20} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}