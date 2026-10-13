import { del, get, patch } from './http';
import type { Message, MessagePage, MessageStatus } from './types';

export const adminMessages = {
  list: (opts: { status?: MessageStatus; page?: number; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (opts.status) params.set('status', opts.status);
    if (opts.page) params.set('page', String(opts.page));
    if (opts.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return get<MessagePage>(`/admin/messages${qs ? `?${qs}` : ''}`);
  },
  unreadCount: () => get<{ unread: number }>('/admin/messages/unread-count'),
  setStatus: (id: number, status: MessageStatus) => patch<Message>(`/admin/messages/${id}`, { status }),
  remove: (id: number) => del(`/admin/messages/${id}`),
};
