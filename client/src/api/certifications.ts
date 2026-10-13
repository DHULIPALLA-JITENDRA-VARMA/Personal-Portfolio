import { adminCollection, get } from './http';
import type { Certification } from './types';

export const getCertifications = (signal?: AbortSignal) => get<Certification[]>('/certifications', signal);
export const adminCertifications = adminCollection<Certification>('certifications');
