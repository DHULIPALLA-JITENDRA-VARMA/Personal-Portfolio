import { adminCollection, get } from './http';
import type { Education } from './types';

export const getEducation = (signal?: AbortSignal) => get<Education[]>('/education', signal);
export const adminEducation = adminCollection<Education>('education');
