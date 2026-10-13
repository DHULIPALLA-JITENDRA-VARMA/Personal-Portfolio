import { adminCollection, get } from './http';
import type { Achievement } from './types';

export const getAchievements = (signal?: AbortSignal) => get<Achievement[]>('/achievements', signal);
export const adminAchievements = adminCollection<Achievement>('achievements');
