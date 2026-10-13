import { adminCollection, get } from './http';
import type { Skill, SkillGroup } from './types';

export const getSkills = (signal?: AbortSignal) => get<SkillGroup[]>('/skills', signal);
export const adminSkills = adminCollection<Skill>('skills');
