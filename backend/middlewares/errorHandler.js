// middlewares/errorHandler.js
/**
 * Middleware centralizado de manejo de errores para Express.
 * Respeta `err.status` (p. ej. 400 de un JSON mal formado) y en producción
 * no expone mensajes internos de errores 500 ni el stack.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const statusCode =
    err.status || err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  const isProduction = process.env.NODE_ENV === 'production';

  if (statusCode >= 500) {
    console.error(`🔴 [ERROR ${statusCode}] ${req.method} ${req.originalUrl}:`, err.message);
    if (!isProduction && err.stack) console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 && isProduction ? 'Error interno del servidor' : err.message || 'Error',
    ...(!isProduction && statusCode >= 500 && { stack: err.stack }),
  });
};

export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};
