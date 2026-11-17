import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import authorizeRoles from '../middlewares/authorizeRoles.js';
import { validateBody } from '../middlewares/validate.js';
import { updateBuildingSchema } from '../validators/schemas.js';

import { getAllBuildingsController } from '../controllers/building/getAllBuildingsController.js';
import { getBuildingByIdController } from '../controllers/building/getBuildingByIdController.js';
import { updateBuildingController } from '../controllers/building/updateBuildingController.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', getAllBuildingsController);
router.get('/:id', getBuildingByIdController);

router.put('/:id', authorizeRoles('administrador'), validateBody(updateBuildingSchema), updateBuildingController);

export default router;
