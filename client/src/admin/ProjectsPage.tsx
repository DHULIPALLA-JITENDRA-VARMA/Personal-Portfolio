import { ChevronDown, ChevronUp, ImagePlus, Pencil, Plus } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { ApiError, adminProjects, type Project, type ProjectInput } from '../api';
import { ConfirmButton, Field, IconButton, Notice, PageHeader, Toggle, move, useLoad } from './ui';

interface FormState {
  id: number | null;
  title: string;
  slug: string;
  tagline: string;
  description_md: string;
  tech_stack: string;
  live_url: string;
  repo_url: string;
  published: boolean;
  featured: boolean;
}

const blank: FormState = { id: null, title: '', slug: '', tagline: '', description_md: '', tech_stack: '', live_url: '', repo_url: '', published: false, featured: false };
const toForm = (p: Project): FormState => ({ ...p, tech_stack: p.tech_stack.join(', ') });

function ProjectForm({ initial, onDone, onCancel }: { initial: FormState; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setErrors({});
    const { id, slug, tech_stack, ...rest } = form;
    const input: ProjectInput = { ...rest, tech_stack: tech_stack.split(',').map((t) => t.trim()).filter(Boolean) };
    if (id !== null || slug.trim()) input.slug = slug.trim() || undefined;
    try {
      if (id === null) await adminProjects.create(input);
      else await adminProjects.update(id, input);
      onDone();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fields);
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel mb-6 space-y-5 p-6 md:p-8" aria-label={form.id === null ? 'New project' : 'Edit project'}>
      <h2 className="text-xl text-cream">{form.id === null ? 'New project' : `Edit “${initial.title}”`}</h2>
      <Notice>{error}</Notice>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Title" error={errors.title}>
          <input className="input" required autoFocus value={form.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Slug" error={errors.slug} hint={form.id === null ? 'Leave empty to generate it from the title.' : 'Changing this changes the public URL.'}>
          <input className="input" value={form.slug} onChange={(e) => set('slug', e.target.value)} />
        </Field>
      </div>
      <Field label="Tagline" error={errors.tagline}>
        <input className="input" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
      </Field>
      <Field label="Description (Markdown)" error={errors.description_md}>
        <textarea className="input resize-y font-mono" rows={10} value={form.description_md} onChange={(e) => set('description_md', e.target.value)} />
      </Field>
      <Field label="Tech stack" hint="Comma-separated, e.g. React, Node.js, Docker" error={errors.tech_stack}>
        <input className="input" value={form.tech_stack} onChange={(e) => set('tech_stack', e.target.value)} />
      </Field>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Live URL" error={errors.live_url}>
          <input className="input" type="url" placeholder="https://" value={form.live_url} onChange={(e) => set('live_url', e.target.value)} />
        </Field>
        <Field label="Repository URL" error={errors.repo_url}>
          <input className="input" type="url" placeholder="https://" value={form.repo_url} onChange={(e) => set('repo_url', e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <span className="flex items-center gap-3 text-sm text-cream">
          <Toggle label="Published" checked={form.published} onChange={(v) => set('published', v)} /> Published
        </span>
        <span className="flex items-center gap-3 text-sm text-cream">
          <Toggle label="Featured" checked={form.featured} onChange={(v) => set('featured', v)} /> Featured
        </span>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary px-6 py-2.5" disabled={saving}>
          {saving ? 'Saving' : form.id === null ? 'Create project' : 'Save changes'}
        </button>
        <button type="button" className="btn-ghost px-5" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function ProjectsPage() {
  const { data: projects, setData, error, loading, reload } = useLoad(adminProjects.list);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [actionError, setActionError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<number | null>(null);

  // Optimistic UI: apply the change locally, then reconcile with the server (and roll back on failure).
  async function run(optimistic: Project[] | null, action: () => Promise<unknown>) {
    setActionError('');
    if (optimistic) setData(optimistic);
    try {
      await action();
    } catch (err) {
      setActionError((err as Error).message);
    }
    await reload();
  }

  const patch = (p: Project, change: Pick<ProjectInput, 'published' | 'featured'>) =>
    run(projects!.map((x) => (x.id === p.id ? { ...x, ...change } : x)), () => adminProjects.toggle(p.id, change));

  const reorder = (from: number, to: number) => {
    const next = move(projects!, from, to);
    return run(next, () => adminProjects.reorder(next.map((p) => p.id)));
  };

  const pickImage = (id: number) => {
    uploadTarget.current = id;
    fileInput.current?.click();
  };
  const onFile = (file: File | undefined) => {
    const id = uploadTarget.current;
    if (!file || id === null) return;
    if (file.size > 2 * 1024 * 1024) return setActionError('Images must be 2MB or smaller.');
    void run(null, () => adminProjects.uploadImage(id, file));
  };

  return (
    <>
      <PageHeader
        title="Projects"
        description="Drafts stay hidden until published. Featured projects lead the public list."
        actions={
          !editing && (
            <button type="button" className="btn-primary" onClick={() => setEditing(blank)}>
              <Plus className="h-4 w-4" aria-hidden /> New project
            </button>
          )
        }
      />
      <Notice>{error || actionError}</Notice>
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />

      {editing && (
        <ProjectForm
          key={editing.id ?? 'new'}
          initial={editing}
          onCancel={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            void reload();
          }}
        />
      )}

      {loading && !projects && <div className="h-48 animate-pulse rounded-2xl bg-white/5" />}
      {projects && projects.length === 0 && <p className="panel p-8 text-sm text-gray-400">No projects yet. Create the first one.</p>}
      {projects && projects.length > 0 && (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-white/[0.06]">
                <th scope="col" className="px-4 py-3 font-normal">Order</th>
                <th scope="col" className="px-4 py-3 font-normal">Project</th>
                <th scope="col" className="px-4 py-3 font-normal">Published</th>
                <th scope="col" className="px-4 py-3 font-normal">Featured</th>
                <th scope="col" className="px-4 py-3 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr key={p.id} className="border-b border-white/[0.06] last:border-0">
                  <td className="px-4 py-4">
                    <div className="flex gap-1">
                      <IconButton label={`Move ${p.title} up`} disabled={i === 0} onClick={() => reorder(i, i - 1)}>
                        <ChevronUp className="h-4 w-4" aria-hidden />
                      </IconButton>
                      <IconButton label={`Move ${p.title} down`} disabled={i === projects.length - 1} onClick={() => reorder(i, i + 1)}>
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      </IconButton>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {p.image ? (
                        <img src={p.image} alt="" className="h-11 w-16 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[10px] text-muted">No image</span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-cream">{p.title}</p>
                        <p className="truncate text-xs text-muted">/projects/{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Toggle label={`Published: ${p.title}`} checked={p.published} onChange={(v) => patch(p, { published: v })} />
                  </td>
                  <td className="px-4 py-4">
                    <Toggle label={`Featured: ${p.title}`} checked={p.featured} onChange={(v) => patch(p, { featured: v })} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="btn-ghost" onClick={() => pickImage(p.id)}>
                        <ImagePlus className="h-4 w-4" aria-hidden /> Image
                      </button>
                      <button type="button" className="btn-ghost" onClick={() => { setEditing(toForm(p)); window.scrollTo({ top: 0 }); }}>
                        <Pencil className="h-4 w-4" aria-hidden /> Edit
                      </button>
                      <ConfirmButton label={`Delete ${p.title}`} onConfirm={() => run(projects.filter((x) => x.id !== p.id), () => adminProjects.remove(p.id))}>
                        Delete
                      </ConfirmButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">Images: JPG, PNG or WebP up to 2MB.</p>
    </>
  );
}
