import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Building2, Users, TrendingUp, CalendarX } from 'lucide-react';
import { Card } from '../components/common/Card.jsx';
import { EventUseCases } from '../../application/usecases/EventUseCases.js';
import { BuildingUseCases } from '../../application/usecases/BuildingUseCases.js';
import './DashboardPage.scss';

const eventoUseCases = new EventUseCases();
const buildingUseCases = new BuildingUseCases();

const STATUS_LABELS = {
  programado: { label: 'Programado', className: 'badge--primary' },
  en_curso: { label: 'En curso', className: 'badge--success' },
  finalizado: { label: 'Finalizado', className: 'badge--secondary' },
  cancelado: { label: 'Cancelado', className: 'badge--danger' },
};

const MAX_ROWS = 5;

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function DashboardPage() {
  const [stats, setStats] = useState({
    totalEventos: 0,
    eventosProximos: 0,
    buildingsDisponibles: 0,
    totalBuildings: 0,
    ocupacionPromedio: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [events, buildingList] = await Promise.all([
        eventoUseCases.getAllEvents(),
        buildingUseCases.getAllBuildings()
      ]);

      // Calcular estadísticas de eventos
      const now = new Date();
      const eventosProximos = events.filter(event => {
        if (!event.date_time) return false;
        const eventDate = new Date(event.date_time);
        return eventDate >= now && event.status !== 'cancelado';
      });

      // Calcular ocupación promedio (eventos activos vs totales)
      const eventosActivos = events.filter(e => e.status === 'en_curso' || e.status === 'programado');
      const ocupacionPromedio = events.length > 0
        ? Math.round((eventosActivos.length / events.length) * 100)
        : 0;

      // Obtener edificios disponibles
      const buildingsDisponibles = buildingList.filter(b =>
        b.availability === true || b.availability === 'true' || b.isDisponible?.() === true
      );

      setStats({
        totalEventos: events.length || 0,
        eventosProximos: eventosProximos.length || 0,
        buildingsDisponibles: buildingsDisponibles.length || 0,
        totalBuildings: buildingList.length || 0,
        ocupacionPromedio: ocupacionPromedio || 0
      });
      setUpcomingEvents(
        [...eventosProximos].sort((a, b) => new Date(a.date_time) - new Date(b.date_time)).slice(0, MAX_ROWS)
      );
      setBuildings(buildingList);
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  // Antes cada tarjeta mostraba un porcentaje fijo ("+12% vs mes anterior") que no se calculaba;
  // ahora el texto secundario explica de dónde sale el número.
  const statsCards = [
    {
      title: 'Total de eventos',
      value: stats.totalEventos,
      icon: <Calendar size={24} />,
      color: 'blue',
      detail: 'Registrados en el sistema'
    },
    {
      title: 'Eventos próximos',
      value: stats.eventosProximos,
      icon: <TrendingUp size={24} />,
      color: 'green',
      detail: 'Desde hoy, sin cancelados'
    },
    {
      title: 'Edificios disponibles',
      value: stats.buildingsDisponibles,
      icon: <Building2 size={24} />,
      color: 'purple',
      detail: `De ${stats.totalBuildings} edificios`
    },
    {
      title: 'Eventos activos',
      value: `${stats.ocupacionPromedio}%`,
      icon: <Users size={24} />,
      color: 'orange',
      detail: 'Programados o en curso'
    }
  ];

  const header = (
    <div className="page-header">
      <div>
        <h1>Tablero</h1>
        <p>Resumen de eventos y edificios del campus</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard-page">
        {header}
        <div className="loading-message" role="status">Cargando estadísticas…</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {header}

      {loadError && (
        <div className="dashboard-alert" role="alert">
          No se pudieron cargar los datos. Revisa que el backend esté en marcha y vuelve a cargar la página.
        </div>
      )}

      <div className="stats-grid">
        {statsCards.map((stat, index) => (
          <Card key={index} className={`stat-card stat-card--${stat.color}`}>
            <div className="stat-content">
              <div className="stat-icon" aria-hidden="true">{stat.icon}</div>
              <div className="stat-info">
                <p className="stat-value">{stat.value}</p>
                <p className="stat-title">{stat.title}</p>
                <span className="stat-change neutral">{stat.detail}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="dashboard-content">
        <div className="dashboard-row">
          <Card title="Próximos eventos" className="recent-events">
            {upcomingEvents.length === 0 ? (
              <div className="empty-panel">
                <CalendarX size={32} aria-hidden="true" />
                <p>No hay eventos próximos.</p>
                <Link to="/admin/eventos" className="empty-panel__link">Crear un evento</Link>
              </div>
            ) : (
              <ul className="dashboard-list">
                {upcomingEvents.map(event => {
                  const status = STATUS_LABELS[event.status] || STATUS_LABELS.programado;
                  return (
                    <li key={event.id} className="dashboard-list__item">
                      <div className="dashboard-list__main">
                        <span className="dashboard-list__title">{event.title}</span>
                        <span className="dashboard-list__meta">
                          {formatDateTime(event.date_time)}
                          {event.building_assigned?.[0]?.name ? ` · ${event.building_assigned[0].name}` : ''}
                        </span>
                      </div>
                      <span className={`badge ${status.className}`}>{status.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link to="/admin/eventos" className="dashboard-list__more">Ver todos los eventos</Link>
          </Card>

          <Card title="Estado de edificios" className="building-status">
            {buildings.length === 0 ? (
              <div className="empty-panel">
                <Building2 size={32} aria-hidden="true" />
                <p>No hay edificios registrados.</p>
              </div>
            ) : (
              <ul className="dashboard-list dashboard-list--compact">
                {buildings.map(b => (
                  <li key={b.id} className="dashboard-list__item">
                    <span className="dashboard-list__title">{b.name}</span>
                    <span className={`badge ${b.availability ? 'badge--success' : 'badge--danger'}`}>
                      {b.availability ? 'Disponible' : 'No disponible'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
