// scripts/createAdminUser.js
// Única vía para crear administradores (el registro público no permite ese rol).
//
// Uso:
//   ADMIN_EMAIL=admin@ejemplo.mx ADMIN_PASSWORD='una-contraseña-larga' npm run create-admin
// o definir ADMIN_EMAIL y ADMIN_PASSWORD en backend/.env (solo localmente; no subirlo a git).
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/Auth.js';

const MIN_PASSWORD_LENGTH = 12;

const createAdminUser = async () => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('❌ Define ADMIN_EMAIL y ADMIN_PASSWORD (variables de entorno o backend/.env).');
    process.exit(1);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`❌ ADMIN_PASSWORD debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      existingUser.role = 'administrador';
      existingUser.password = password; // se hashea en el pre-save
      await existingUser.save();
      console.log(`✅ ${email} actualizado como administrador (contraseña restablecida).`);
    } else {
      await new User({ email, password, role: 'administrador' }).save();
      console.log(`✅ Administrador ${email} creado.`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdminUser();
