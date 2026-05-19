import { EventRepository } from '../../core/repositories/EventRepository';
import { Event } from '../../core/entities/Event';
import api from '../../core/config/api';

export class HttpEventRepository extends EventRepository {
  constructor() {
    super();
    this.fallbackEvents = [
      new Event({
        id: '1',
        title: 'Semana de la Ciencia',
        description: 'Eventos y conferencias sobre ciencias naturales',
        image: 'https://images.pexels.com/photos/2280549/pexels-photo-2280549.jpeg',
        date: new Date('2024-02-15'),
        location: 'Laboratorio de Ciencias',
        isActive: true,
      }),
      new Event({
        id: '2',
        title: 'Torneo Deportivo Inter-Grupos',
        description: 'Competencias deportivas entre diferentes grupos',
        image: 'https://images.pexels.com/photos/416978/pexels-photo-416978.jpeg',
        date: new Date('2024-02-20'),
        location: 'Centro Deportivo',
        isActive: true,
      }),
      new Event({
        id: '3',
        title: 'Conferencia Magistral',
        description: 'Conferencia sobre innovación educativa',
        image: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg',
        date: new Date('2024-02-25'),
        location: 'Auditorio',
        isActive: true,
      }),
    ];
  }

  _extractEventsArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.events && Array.isArray(data.events)) return data.events;
    if (data.data && Array.isArray(data.data)) return data.data;
    return [];
  }

  async getAllEvents() {
    try {
      const response = await api.get('/events');
      const eventsList = this._extractEventsArray(response.data);
      if (eventsList.length > 0) {
        console.log(`✅ ${eventsList.length} eventos obtenidos exitosamente desde la base de datos.`);
        return eventsList.map(item => Event.fromJSON(item));
      }
    } catch (error) {
      console.warn('⚠️ Error al obtener eventos de la base de datos:', error.message);
      if (error.response) {
        console.warn(`   Status del servidor: ${error.response.status}. Detalle:`, error.response.data);
      } else {
        console.warn(`   ¿El backend está encendido en ${api.defaults.baseURL}? Verifica la IP.`);
      }
    }
    return [...this.fallbackEvents];
  }

  async getActiveEvents() {
    try {
      const response = await api.get('/events');
      const eventsList = this._extractEventsArray(response.data);
      if (eventsList.length > 0) {
        console.log(`✅ ${eventsList.length} eventos activos obtenidos exitosamente desde la base de datos.`);
        return eventsList
          .map(item => Event.fromJSON(item))
          .filter(event => event.isActive);
      }
    } catch (error) {
      console.warn('⚠️ Error al obtener eventos activos de la base de datos:', error.message);
      if (error.response) {
        console.warn(`   Status del servidor: ${error.response.status}. Detalle:`, error.response.data);
      } else {
        console.warn(`   ¿El backend está encendido en ${api.defaults.baseURL}? Verifica la IP.`);
      }
    }
    return this.fallbackEvents.filter(event => event.isActive);
  }

  async getEventById(id) {
    try {
      const response = await api.get('/events/' + id);
      if (response.data) {
        const eventData = response.data.event || response.data;
        return Event.fromJSON(eventData);
      }
    } catch (error) {
      console.warn(`⚠️ Error al obtener evento con id ${id}:`, error);
    }
    const event = this.fallbackEvents.find(e => e.id === id);
    if (event) return event;
    throw new Error('Evento no encontrado');
  }
}
