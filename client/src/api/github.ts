import { get } from './http';
import type { ReposResponse } from './types';

export const getRepos = (signal?: AbortSignal) => get<ReposResponse>('/github/repos', signal);
