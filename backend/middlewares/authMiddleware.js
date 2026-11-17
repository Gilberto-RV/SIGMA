// middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env.js';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Formato esperado: Bearer TOKEN
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: Token no proporcionado' });
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = {
      userId: decoded.userId || decoded.id,
      role: decoded.role,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export default authMiddleware;
