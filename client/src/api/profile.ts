import { get, put } from './http';
import type { AdminProfile, Profile } from './types';

export const getProfile = (signal?: AbortSignal) => get<Profile>('/profile', signal);

export const adminGetProfile = () => get<AdminProfile>('/admin/profile');
export const adminUpdateProfile = (input: Partial<Omit<AdminProfile, 'has_resume' | 'updated_at'>>) =>
  put<AdminProfile>('/admin/profile', input);
