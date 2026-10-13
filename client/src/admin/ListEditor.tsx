import { ChevronDown, ChevronUp, Pencil, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ApiError } from '../api';
import { ConfirmButton, Field, IconButton, Notice, PageHeader, move, useLoad } from './ui';

export interface FieldDef {
  name: string;
  label: string;
  /** `lines` edits a string[] as one entry per line. */
  type?: 'text' | 'textarea' | 'lines' | 'url';
  required?: boolean;
  hint?: string;
}

interface CollectionApi<T> {
  list: () => Promise<T[]>;
  create: (input: Partial<Omit<T, 'id'>>) => Promise<T>;
  update: (id: number, input: Partial<Omit<T, 'id'>>) => Promise<T>;
  remove: (id: number) => Promise<void>;
  reorder: (ids: number[]) => Promise<unknown>;
}

interface Props<T extends { id: number }> {
  title: string;
  singular: string;
  description: string;
  api: CollectionApi<T>;
  fields: FieldDef[];
  primary: (item: T) => string;
  secondary?: (item: T) => string;
}

type Values = Record<string, string>;

// One generic editor drives Skills, Experience, Education, Certifications and Achievements:
// each page is just a field list (see collections.tsx).
export function ListEditor<T extends { id: number }>({ title, singular, description, api, fields, primary, secondary }: Props<T>) {
  const { data: items, setData, error, loading, reload } = useLoad(api.list);
  const [editing, setEditing] = useState<{ id: number | null; values: Values } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);

  const toValues = (item?: T): Values =>
    Object.fromEntries(
      fields.map((f) => {
        const raw = item ? (item as Record<string, unknown>)[f.name] : undefined;
        return [f.name, Array.isArray(raw) ? raw.join('\n') : String(raw ?? '')];
      }),
    );
  const fromValues = (values: Values) =>
    Object.fromEntries(
      fields.map((f) => [f.name, f.type === 'lines' ? values[f.name].split('\n').map((l) => l.trim()).filter(Boolean) : values[f.name]]),
    ) as Partial<Omit<T, 'id'>>;

  const open = (item?: T) => {
    setFieldErrors({});
    setActionError('');
    setEditing({ id: item?.id ?? null, values: toValues(item) });
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setActionError('');
    try {
      if (editing.id === null) await api.create(fromValues(editing.values));
      else await api.update(editing.id, fromValues(editing.values));
      setEditing(null);
      await reload();
    } catch (err) {
      if (err instanceof ApiError) setFieldErrors(err.fields);
      setActionError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function run(optimistic: T[], action: () => Promise<unknown>) {
    setActionError('');
    setData(optimistic);
    try {
      await action();
    } catch (err) {
      setActionError((err as Error).message);
    }
    await reload();
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          !editing && (
            <button type="button" className="btn-primary" onClick={() => open()}>
              <Plus className="h-4 w-4" aria-hidden /> Add {singular}
            </button>
          )
        }
      />
      <Notice>{error || actionError}</Notice>

      {editing && (
        <form onSubmit={onSubmit} className="panel mb-6 max-w-3xl space-y-5 p-6 md:p-8" aria-label={`${editing.id === null ? 'Add' : 'Edit'} ${singular}`}>
          <h2 className="text-xl text-cream">{editing.id === null ? `Add ${singular}` : `Edit ${singular}`}</h2>
          {fields.map((f, fieldIndex) => {
            const common = {
              className: 'input',
              required: f.required,
              value: editing.values[f.name],
              onChange: (e: { target: { value: string } }) => setEditing({ ...editing, values: { ...editing.values, [f.name]: e.target.value } }),
            };
            return (
              <Field key={f.name} label={f.label} hint={f.hint} error={fieldErrors[f.name]}>
                {f.type === 'textarea' || f.type === 'lines' ? (
                  <textarea {...common} rows={f.type === 'lines' ? 5 : 3} className="input resize-y" />
                ) : (
                  <input {...common} autoFocus={fieldIndex === 0} type={f.type === 'url' ? 'url' : 'text'} placeholder={f.type === 'url' ? 'https://' : undefined} />
                )}
              </Field>
            );
          })}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary px-6 py-2.5" disabled={saving}>
              {saving ? 'Saving' : 'Save'}
            </button>
            <button type="button" className="btn-ghost px-5" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && !items && <div className="h-40 animate-pulse rounded-2xl bg-white/5" />}
      {items && items.length === 0 && <p className="panel p-8 text-sm text-gray-400">Nothing here yet.</p>}
      {items && items.length > 0 && (
        <ul className="panel divide-y divide-white/[0.06]">
          {items.map((item, i) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 md:px-6">
              <div className="flex gap-1">
                <IconButton label={`Move ${primary(item)} up`} disabled={i === 0} onClick={() => { const next = move(items, i, i - 1); void run(next, () => api.reorder(next.map((x) => x.id))); }}>
                  <ChevronUp className="h-4 w-4" aria-hidden />
                </IconButton>
                <IconButton label={`Move ${primary(item)} down`} disabled={i === items.length - 1} onClick={() => { const next = move(items, i, i + 1); void run(next, () => api.reorder(next.map((x) => x.id))); }}>
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </IconButton>
              </div>
              <div className="min-w-0 flex-1 basis-48">
                <p className="truncate text-sm text-cream">{primary(item)}</p>
                {secondary && secondary(item) && <p className="truncate text-xs text-muted">{secondary(item)}</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost" onClick={() => { open(item); window.scrollTo({ top: 0 }); }}>
                  <Pencil className="h-4 w-4" aria-hidden /> Edit
                </button>
                <ConfirmButton label={`Delete ${primary(item)}`} onConfirm={() => run(items.filter((x) => x.id !== item.id), () => api.remove(item.id))}>
                  Delete
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
