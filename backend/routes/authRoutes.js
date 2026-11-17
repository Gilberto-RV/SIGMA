// routes/authRoutes.js
import express from 'express';
import registerController from '../controllers/auth/registerController.js';
import loginController from '../controllers/auth/loginController.js';
import * as authUD from '../controllers/auth/authUD.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { validateBody } from '../middlewares/validate.js';
import { createAuthRateLimiter } from '../config/security.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/schemas.js';

const router = express.Router();
const authLimiter = createAuthRateLimiter();

router.post('/register', authLimiter, validateBody(registerSchema), registerController);
router.post('/login', authLimiter, validateBody(loginSchema), loginController);

// Requieren autenticación
router.get('/me', authMiddleware, authUD.getProfile);
router.put('/me', authMiddleware, validateBody(updateProfileSchema), authUD.updateProfile);
router.put('/change-password', authMiddleware, authLimiter, validateBody(changePasswordSchema), authUD.changePassword);
router.delete('/me', authMiddleware, authUD.deleteAccount);

export default router;
