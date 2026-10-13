import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, adminGetProfile, adminUpdateProfile, type AdminProfile } from '../api';
import { Field, Notice, PageHeader, Toggle, useLoad } from './ui';

type Form = Pick<AdminProfile, 'name' | 'headline' | 'summary' | 'email' | 'phone' | 'show_phone' | 'location' | 'linkedin_url' | 'github_url'>;

export default function ProfilePage() {
  const { data, error, loading } = useLoad(adminGetProfile);
  const [form, setForm] = useState<Form | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      const { has_resume: _r, updated_at: _u, ...rest } = data;
      setForm(rest);
    }
  }, [data]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setStatus(null);
    setFieldErrors({});
    try {
      await adminUpdateProfile(form);
      setStatus({ kind: 'success', text: 'Profile saved. The public site updates within a minute.' });
    } catch (err) {
      if (err instanceof ApiError) setFieldErrors(err.fields);
      setStatus({ kind: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const text = (key: Exclude<keyof Form, 'show_phone'>, label: string, props: { type?: string; hint?: string } = {}) => (
    <Field label={label} error={fieldErrors[key]} hint={props.hint}>
      <input className="input" type={props.type ?? 'text'} value={form?.[key] ?? ''} onChange={(e) => set(key, e.target.value)} />
    </Field>
  );

  return (
    <>
      <PageHeader title="Profile" description="Your name, headline and contact details as shown on the public site." />
      <Notice>{error}</Notice>
      {loading && !form && <div className="h-64 animate-pulse rounded-2xl bg-white/5" />}
      {form && (
        <form onSubmit={onSubmit} className="panel max-w-3xl space-y-5 p-6 md:p-8">
          {status && <Notice kind={status.kind}>{status.text}</Notice>}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {text('name', 'Name')}
            {text('location', 'Location')}
          </div>
          {text('headline', 'Headline', { hint: 'Separate roles with " · " (the first one is highlighted on the home page).' })}
          <Field label="Summary" error={fieldErrors.summary}>
            <textarea className="input resize-y" rows={5} value={form.summary} onChange={(e) => set('summary', e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {text('email', 'Email', { type: 'email' })}
            {text('phone', 'Phone', { type: 'tel' })}
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 px-4 py-3">
            <div>
              <p className="text-sm text-cream">Show phone number publicly</p>
              <p className="mt-0.5 text-xs text-gray-500">While off, the number never leaves the server.</p>
            </div>
            <Toggle label="Show phone number publicly" checked={form.show_phone} onChange={(v) => set('show_phone', v)} />
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {text('linkedin_url', 'LinkedIn URL', { type: 'url' })}
            {text('github_url', 'GitHub URL', { type: 'url' })}
          </div>
          <button type="submit" className="btn-primary px-6 py-2.5" disabled={saving}>
            {saving ? 'Saving' : 'Save profile'}
          </button>
        </form>
      )}
    </>
  );
}
