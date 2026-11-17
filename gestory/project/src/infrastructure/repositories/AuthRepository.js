import { httpClient } from '../http/HttpClient.js';

export class AuthRepository {
  async login(credentials) {
    const response = await httpClient.post('/auth/login', credentials);
    return response.data;
  }

  async logout() {
    return Promise.resolve();
  }

  async getCurrentUser() {
    const response = await httpClient.get('/auth/me');
    return response.data;
  }

  // El backend solo permite actualizar el avatar; el correo y el rol no se cambian desde el perfil.
  async updateProfile(userData) {
    const response = await httpClient.put('/auth/me', { avatar: userData.avatar ?? '' });
    return response.data;
  }

  async changePassword(passwords) {
    return httpClient.put('/auth/change-password', passwords);
  }
}