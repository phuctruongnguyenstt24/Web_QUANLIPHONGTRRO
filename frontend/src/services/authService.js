import api from './api';

export const authService = {
  login: (identifier, password) => api.post('/auth/login', { identifier, password }),
  googleLogin: (credential) => api.post('/auth/google', { credential }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  getMe: () => api.get('/auth/me'),
};