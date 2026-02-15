
// This file is effectively a proxy now for dbService in frontend-only mode
import * as dbService from './dbService';
import { AdminStats, User } from '../types';

export const getStats = async (): Promise<AdminStats> => {
  return await dbService.getAdminStats();
};

export const getUsers = async (): Promise<User[]> => {
  // In frontend mode, we access local storage directly or via db helper
  const users = JSON.parse(localStorage.getItem('qieyu_users') || '[]');
  return users;
};

export const deleteUser = async (id: string, adminId: string): Promise<void> => {
  await dbService.adminDeleteUser(id, adminId);
};
