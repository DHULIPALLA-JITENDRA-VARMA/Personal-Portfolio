import { del, get, patch, post, put, upload } from './http';
import type { Project, ProjectInput } from './types';

export const getProjects = (opts: { featured?: boolean } = {}, signal?: AbortSignal) =>
  get<Project[]>(`/projects${opts.featured ? '?featured=1' : ''}`, signal);
export const getProject = (slug: string, signal?: AbortSignal) =>
  get<Project>(`/projects/${encodeURIComponent(slug)}`, signal);

export const adminProjects = {
  list: () => get<Project[]>('/admin/projects'),
  create: (input: ProjectInput) => post<Project>('/admin/projects', input),
  update: (id: number, input: ProjectInput) => put<Project>(`/admin/projects/${id}`, input),
  /** Publish / feature toggles. */
  toggle: (id: number, input: Pick<ProjectInput, 'published' | 'featured'>) =>
    patch<Project>(`/admin/projects/${id}`, input),
  reorder: (ids: number[]) => patch<{ ok: true }>('/admin/projects/reorder', { ids }),
  remove: (id: number) => del(`/admin/projects/${id}`),
  uploadImage: (id: number, file: File) => upload<Project>(`/admin/projects/${id}/image`, file),
  removeImage: (id: number) => del(`/admin/projects/${id}/image`),
};
