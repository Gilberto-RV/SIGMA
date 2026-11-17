// src/hooks/useAuth.js

import { useCallback } from 'react';
import { serviceContainer } from '../infrastructure/di/ServiceContainer';

export const useAuth = () => {
  const authUseCases = serviceContainer.get('authUseCases');

  const logout = useCallback(async () => {
    await authUseCases.logout();
  }, []);

  const updateProfile = useCallback(async (userData) => {
    return await authUseCases.updateProfile(userData);
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    return await authUseCases.changePassword(currentPassword, newPassword);
  }, []);

  const deleteAccount = useCallback(async () => {
    return await authUseCases.deleteAccount();
  }, []);

  return {
    logout,
    updateProfile,
    changePassword,
    deleteAccount,
  };
};
