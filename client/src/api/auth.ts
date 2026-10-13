import { get, post } from './http';

export interface Session {
  username: string;
}

export const login = (username: string, password: string) => post<Session>('/admin/login', { username, password });
export const logout = () => post<{ ok: true }>('/admin/logout');
export const me = () => get<Session>('/admin/me');
