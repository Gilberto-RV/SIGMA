// routes/geoRoutes.js
import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import authorizeRoles from '../middlewares/authorizeRoles.js';
import { getAllLayers, getVersion, getLayer, putLayer } from '../controllers/geoController.js';

const router = express.Router();

// Lectura pública: son los mismos datos que la app ya trae empaquetados (mapa del campus).
router.get('/', getAllLayers);
router.get('/version', getVersion);
router.get('/:layer', getLayer);

// Edición solo para administradores (editor de Gestory).
router.put('/:layer', authMiddleware, authorizeRoles('administrador'), putLayer);

export default router;
