// controllers/auth/registerController.js
import { registerUser } from '../../services/authServices.js';

// req.body ya viene validado y limpio por registerSchema.
const registerController = async (req, res) => {
  try {
    const { token, user } = await registerUser(req.body);
    res.status(201).json({ token, user });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export default registerController;
