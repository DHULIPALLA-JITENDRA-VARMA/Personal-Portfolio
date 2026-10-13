import { adminCollection, get } from './http';
import type { Experience } from './types';

export const getExperience = (signal?: AbortSignal) => get<Experience[]>('/experience', signal);
export const adminExperience = adminCollection<Experience>('experience');
