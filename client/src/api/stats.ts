import { get } from './http';
import type { Stats } from './types';

export const getStats = (days = 30) => get<Stats>(`/admin/stats?days=${days}`);
