// controllers/events/eventController.js
import mongoose from 'mongoose';
import Event from '../../models/Event.js';
import Categories from '../../models/Categories.js';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const populateEvent = (query) =>
  query
    .populate({ path: 'building_assigned', select: 'name description' })
    .populate({ path: 'category', select: 'nombre descripcion' });

/** Listar eventos */
export const getAllEvents = async (req, res) => {
  try {
    const events = await populateEvent(Event.find().sort({ date_time: 1 }));
    res.json({ events });
  } catch (error) {
    console.error('Error al obtener eventos:', error.message);
    res.status(500).json({ message: 'Error al obtener eventos' });
  }
};

/** Obtener evento por ID */
export const getEventById = async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(404).json({ message: 'Evento no encontrado' });
  }
  try {
    const event = await populateEvent(Event.findById(req.params.id));
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    res.json({ event });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el evento' });
  }
};

/**
 * Crear evento. req.body ya viene validado por createEventSchema.
 * Antes este controlador llamaba a métodos inexistentes (`new Event().createEvent`)
 * y respondía 500 siempre.
 */
export const createEvent = async (req, res) => {
  try {
    const created = await Event.create(req.body);
    const event = await populateEvent(Event.findById(created._id));
    res.status(201).json({ event });
  } catch (error) {
    res.status(400).json({ message: 'Error al crear evento', error: error.message });
  }
};

/** Actualizar evento. req.body validado por updateEventSchema. */
export const updateEvent = async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(404).json({ message: 'Evento no encontrado' });
  }
  try {
    const updated = await populateEvent(
      Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    );
    if (!updated) return res.status(404).json({ message: 'Evento no encontrado' });
    res.json({ event: updated });
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar evento', error: error.message });
  }
};

/** Eliminar evento */
export const deleteEvent = async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(404).json({ message: 'Evento no encontrado' });
  }
  try {
    const deleted = await Event.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Evento no encontrado' });
    res.json({ message: 'Evento eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar evento' });
  }
};

/** Estadísticas generales: total, por estado y próximos. */
export const getEventStatistics = async (req, res) => {
  try {
    const [total, byStatus, upcoming] = await Promise.all([
      Event.countDocuments(),
      Event.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Event.countDocuments({ date_time: { $gte: new Date() } }),
    ]);
    res.json({
      total,
      upcoming,
      byStatus: Object.fromEntries(byStatus.map(({ _id, count }) => [_id, count])),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};

/** Categorías de eventos (arreglo de { _id, nombre, descripcion }). */
export const getCategories = async (req, res) => {
  try {
    const categories = await Categories.find().sort({ nombre: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener categorías' });
  }
};
