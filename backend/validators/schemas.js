// validators/schemas.js
import { z } from 'zod';

const email = z.string().trim().toLowerCase().max(254).pipe(z.email('Correo electrónico inválido'));
const password = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(128);
// Imagen o avatar: URL o ruta relativa ya guardada; solo se limita el tamaño.
const mediaPath = z.string().trim().max(2048).optional();
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Identificador inválido');
const shortText = (max) => z.string().trim().max(max);

/** Roles que un usuario puede elegir al registrarse. `administrador` solo se crea con scripts/createAdminUser.js. */
export const SELF_ASSIGNABLE_ROLES = ['estudiante', 'profesor'];

export const registerSchema = z.object({
  email,
  password,
  avatar: mediaPath,
  role: z.enum(SELF_ASSIGNABLE_ROLES, { message: 'Rol no permitido' }).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'La contraseña es obligatoria').max(128),
});

// Estricto: rechaza `role` o `password` en vez de ignorarlos en silencio.
export const updateProfileSchema = z
  .strictObject({ avatar: mediaPath })
  .refine((data) => data.avatar !== undefined, { message: 'No se proporcionaron cambios' });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es obligatoria').max(128),
    newPassword: password,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña debe ser distinta de la actual',
    path: ['newPassword'],
  });

const stringList = z.union([z.string(), z.array(z.string())]).transform((value) =>
  (Array.isArray(value) ? value : [value]).map((item) => item.trim()).filter(Boolean)
);

const eventFields = {
  title: shortText(200).min(1, 'El título es obligatorio'),
  description: shortText(5000).optional(),
  building_assigned: stringList.optional(),
  classroom: shortText(100).optional(),
  date_time: z.coerce.date({ message: 'Fecha y hora inválidas' }),
  organizer: shortText(200).min(1, 'El organizador es obligatorio'),
  category: z
    .union([objectId, z.array(objectId)])
    .transform((value) => (Array.isArray(value) ? value : [value]))
    .optional(),
  status: z.enum(['programado', 'en_curso', 'finalizado', 'cancelado']).optional(),
  media: mediaPath,
};

export const createEventSchema = z.object(eventFields);
export const updateEventSchema = z
  .object(eventFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'No se proporcionaron cambios' });

const floorFlag = z.boolean().optional();

export const updateBuildingSchema = z
  .object({
    geo_id: shortText(50).optional(),
    name: shortText(200).min(1).optional(),
    description: shortText(5000).optional(),
    media: mediaPath,
    accessibility: z.boolean().optional(),
    floors: z.number().int().min(0).max(50).optional(),
    availability: z.boolean().optional(),
    student_frequency: shortText(50).optional(),
    id_services: z.array(shortText(100)).optional(),
    bathrooms: z
      .object({ floor_1: floorFlag, floor_2: floorFlag, floor_3: floorFlag, floor_4: floorFlag, floor_5: floorFlag })
      .optional(),
    entrances: z
      .array(
        z.object({
          entrance_id: shortText(50).optional(),
          description: shortText(500).optional(),
          location_hint: shortText(500).optional(),
        })
      )
      .optional(),
    id_careers: z.array(shortText(100)).optional(),
    subjects: z
      .array(
        z.object({
          name: shortText(200).optional(),
          id_subjects: shortText(100).nullable().optional(),
          floor: z.number().int().min(0).max(50).nullable().optional(),
        })
      )
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No se proporcionaron cambios' });
