// controllers/auth/authUD.js
import * as authService from '../../services/authServices.js';

const fail = (res, error, fallbackStatus = 400) =>
  res.status(error.status || fallbackStatus).json({ error: error.message });

export const getProfile = async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.userId);
    res.json({ user });
  } catch (error) {
    fail(res, error);
  }
};

// req.body validado por updateProfileSchema: solo `avatar`.
export const updateProfile = async (req, res) => {
  try {
    const { updatedUser, newToken } = await authService.updateUser(req.user.userId, req.body);
    res.json({ token: newToken, user: updatedUser });
  } catch (error) {
    fail(res, error);
  }
};

// req.body validado por changePasswordSchema.
export const changePassword = async (req, res) => {
  try {
    await authService.changePassword(req.user.userId, req.body);
    res.json({ message: 'Contraseña actualizada' });
  } catch (error) {
    fail(res, error);
  }
};

export const deleteAccount = async (req, res) => {
  try {
    await authService.deleteUser(req.user.userId);
    res.status(204).send();
  } catch (error) {
    fail(res, error);
  }
};
