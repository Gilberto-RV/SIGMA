// services/authServices.js
import jwt from 'jsonwebtoken';
import User from '../models/Auth.js';
import { getJwtSecret } from '../config/env.js';

/** Error con código HTTP para que los controladores respondan sin adivinar. */
export class AuthError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

const generateToken = (userId, role) =>
  jwt.sign({ userId, role }, getJwtSecret(), { expiresIn: '2h' });

const formatUser = (user) => ({
  id: user._id,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
});

/**
 * Registra un usuario. El rol ya viene validado por registerSchema
 * (solo `estudiante` o `profesor`); los administradores se crean con scripts/createAdminUser.js.
 */
export const registerUser = async ({ email, password, avatar, role = 'estudiante' }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new AuthError('El usuario ya existe', 409);

  const user = new User({ email, password, avatar, role });
  await user.save();

  return { token: generateToken(user._id, user.role), user: formatUser(user) };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AuthError('Correo o contraseña inválidos', 401);
  }
  return { token: generateToken(user._id, user.role), user: formatUser(user) };
};

export const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AuthError('Usuario no encontrado', 404);
  return formatUser(user);
};

/** Actualiza datos de perfil. El rol y la contraseña no se cambian aquí. */
export const updateUser = async (userId, { avatar }) => {
  const user = await User.findById(userId);
  if (!user) throw new AuthError('Usuario no encontrado', 404);

  user.avatar = avatar;
  await user.save();

  return { updatedUser: formatUser(user), newToken: generateToken(user._id, user.role) };
};

/** Cambia la contraseña verificando la actual (un token robado no basta para cambiarla). */
export const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new AuthError('Usuario no encontrado', 404);
  if (!(await user.comparePassword(currentPassword))) {
    throw new AuthError('La contraseña actual es incorrecta', 401);
  }
  user.password = newPassword;
  await user.save();
};

export const deleteUser = async (userId) => {
  const result = await User.findByIdAndDelete(userId);
  if (!result) throw new AuthError('Usuario no encontrado', 404);
};
