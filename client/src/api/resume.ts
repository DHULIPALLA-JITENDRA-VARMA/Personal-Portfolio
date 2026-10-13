import { API_BASE, del, upload } from './http';

/** Direct download link. The server logs the `resume_download` event itself. */
export const RESUME_URL = `${API_BASE}/resume`;

export const adminUploadResume = (file: File) => upload<{ has_resume: true; size: number }>('/admin/resume', file);
export const adminRemoveResume = () => del('/admin/resume');
