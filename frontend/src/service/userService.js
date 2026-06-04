import api from '../api/axios';

export const getUsers = () => api.get('/users');

export const createUser = (data) => {
  return api.post('/users', {
    name: data.name,
    email: data.email,
    password: data.password,
    role: data.role,
    phone_number: data.phone_number, // ✅ FIX INI
    gender: data.gender
  });
};

export const deleteUser = (id) => api.delete(`/users/${id}`);