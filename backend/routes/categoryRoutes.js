// routes/categoryRoutes.js
import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getCategories } from '../controllers/events/eventController.js';

const router = express.Router();

// Gestory consulta GET /api/categories para el formulario de eventos.
router.get('/', authMiddleware, getCategories);

export default router;
