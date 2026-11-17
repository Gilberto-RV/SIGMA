// middlewares/validate.js

/**
 * Valida req.body con un esquema zod. Si es válido, reemplaza req.body por los datos limpios
 * (sin campos desconocidos); si no, responde 400 con el detalle por campo.
 * @param {import('zod').ZodType} schema
 */
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: result.error.issues.map((issue) => ({
        field: issue.path.join('.') || '(body)',
        message: issue.message,
      })),
    });
  }
  req.body = result.data;
  return next();
};
