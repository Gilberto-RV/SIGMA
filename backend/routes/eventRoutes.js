import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import authorizeRoles from '../middlewares/authorizeRoles.js';
import { validateBody } from '../middlewares/validate.js';
import { createEventSchema, updateEventSchema } from '../validators/schemas.js';

import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventStatistics,
  getCategories
} from '../controllers/events/eventController.js';

const router = express.Router();

router.use(authMiddleware);

// Rutas fijas antes de '/:id' para que no las capture el parámetro.
router.get('/statistics/general', getEventStatistics);
router.get('/categories/list', getCategories);

router.get('/', getAllEvents);
router.get('/:id', getEventById);
router.post('/', authorizeRoles('administrador'), validateBody(createEventSchema), createEvent);
router.put('/:id', authorizeRoles('administrador'), validateBody(updateEventSchema), updateEvent);
router.delete('/:id', authorizeRoles('administrador'), deleteEvent);

export default router;
