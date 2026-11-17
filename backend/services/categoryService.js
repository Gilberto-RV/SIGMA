// services/categoryService.js
import Categories from '../models/Categories.js';

const DEFAULT_CATEGORIES = [
  { nombre: 'academica', descripcion: 'Conferencias, talleres y actividades académicas' },
  { nombre: 'cultural', descripcion: 'Arte, música y actividades culturales' },
  { nombre: 'deportiva', descripcion: 'Torneos y actividades deportivas' },
  { nombre: 'social', descripcion: 'Convivencias y actividades sociales' },
  { nombre: 'otro', descripcion: 'Otras actividades' },
];

/**
 * Crea las categorías del enum del modelo si la colección está vacía.
 * Sin categorías, el formulario de eventos de Gestory no permite guardar.
 * @returns {Promise<number>} Número de categorías creadas.
 */
export async function ensureDefaultCategories() {
  const count = await Categories.estimatedDocumentCount();
  if (count > 0) return 0;
  await Categories.insertMany(DEFAULT_CATEGORIES);
  return DEFAULT_CATEGORIES.length;
}
