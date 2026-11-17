// src/infrastructure/repositories/HttpAuthRepository.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthRepository } from '../../core/repositories/AuthRepository';
import { User } from '../../core/entities/User';
import api from '../../core/config/api';

export class HttpAuthRepository extends AuthRepository {
  async login(email, password) {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const { token, user } = data;

      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('currentUser', JSON.stringify(user));

      return User.fromJSON(user);
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al iniciar sesión');
    }
  }

  async register(email, password, avatar = null, role = 'estudiante') {
    try {
      const { data } = await api.post('/auth/register', { email, password, avatar, role });
      const { token, user } = data;

      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('currentUser', JSON.stringify(user));

      return User.fromJSON(user);
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al registrar');
    }
  }

  async logout() {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('currentUser');
  }

  async getCurrentUser() {
    const userJson = await AsyncStorage.getItem('currentUser');
    return userJson ? User.fromJSON(JSON.parse(userJson)) : null;
  }

  async isAuthenticated() {
    const token = await AsyncStorage.getItem('authToken');
    return !!token;
  }
  // El backend solo permite cambiar el avatar desde el perfil (no el rol ni el correo).
  async updateProfile(userData) {
    const { data } = await api.put('/auth/me', { avatar: userData.avatar ?? '' });

    if (!data?.user) {
        throw new Error('Usuario no retornado desde backend');
    }

    if (data.token) {
        await AsyncStorage.setItem('authToken', data.token); // token actualizado
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    }

    await AsyncStorage.setItem('currentUser', JSON.stringify(data.user));
    return User.fromJSON(data.user);
  }
  async changePassword(currentPassword, newPassword) {
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
    } catch (error) {
      throw new Error(error.response?.data?.error || error.response?.data?.details?.[0]?.message || 'No se pudo cambiar la contraseña');
    }
  }

  async deleteAccount() {
    await api.delete('/auth/me');
    await this.logout();
  }

}