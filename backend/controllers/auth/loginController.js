// controllers/auth/loginController.js
import { loginUser } from '../../services/authServices.js';

const loginController = async (req, res) => {
  try {
    const { token, user } = await loginUser(req.body);
    res.status(200).json({ message: 'Inicio de sesión exitoso', token, user });
  } catch (error) {
    res.status(error.status || 401).json({ error: error.message });
  }
};

export default loginController;
