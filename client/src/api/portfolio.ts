import { get } from './http';
import type { Portfolio } from './types';

/** Everything the public home page needs, in one request. */
export const getPortfolio = (signal?: AbortSignal) => get<Portfolio>('/portfolio', signal);
