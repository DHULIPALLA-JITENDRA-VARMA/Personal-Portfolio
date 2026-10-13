import { Check, Mail, MapPin, Phone } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { ApiError, CONTACT_LIMITS, sendMessage, validateContact, type ContactInput, type Profile } from '../api';
import { PillButton } from '../components/PillButton';
import { Spinner } from '../components/PageState';
import { WordsPullUpMultiStyle } from '../components/WordsPullUpMultiStyle';

const EMPTY: ContactInput = { name: '', email: '', subject: '', body: '', website: '' };
type Errors = Partial<Record<keyof ContactInput, string>>;
type Status = { kind: 'idle' | 'sending' | 'sent' } | { kind: 'error'; message: string };

export function Contact({ profile }: { profile: Profile }) {
  const uid = useId();
  const [values, setValues] = useState<ContactInput>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ContactInput, boolean>>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const set = (field: keyof ContactInput, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    // Once a field has been visited, re-validate it live so the error clears as soon as it is fixed.
    if (touched[field]) setErrors((e) => ({ ...e, [field]: validateContact(next)[field] }));
    if (status.kind === 'error') setStatus({ kind: 'idle' });
  };
  const blur = (field: keyof ContactInput) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((e) => ({ ...e, [field]: validateContact(values)[field] }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validateContact(values);
    setErrors(found);
    setTouched({ name: true, email: true, subject: true, body: true });
    const firstInvalid = (['name', 'email', 'subject', 'body'] as const).find((f) => found[f]);
    if (firstInvalid) {
      document.getElementById(`${uid}-${firstInvalid}`)?.focus();
      return;
    }
    setStatus({ kind: 'sending' });
    try {
      await sendMessage(values);
      setStatus({ kind: 'sent' });
      setValues(EMPTY);
      setTouched({});
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.details.length) setErrors(err.fields);
      const message =
        err instanceof ApiError && err.status === 429
          ? 'You have sent several messages recently. Please try again in a little while, or email me directly.'
          : err instanceof ApiError && err.status === 400
            ? 'Please check the highlighted fields and try again.'
            : 'Something went wrong while sending your message. Please try again, or email me directly.';
      setStatus({ kind: 'error', message });
    }
  }

  const field = (name: 'name' | 'email' | 'subject' | 'body') => ({
    id: `${uid}-${name}`,
    name,
    value: values[name],
    'aria-invalid': errors[name] ? (true as const) : undefined,
    'aria-describedby': errors[name] ? `${uid}-${name}-error` : undefined,
    onBlur: () => blur(name),
  });
  const errorText = (name: keyof ContactInput) =>
    errors[name] && (
      <p id={`${uid}-${name}-error`} className="mt-1.5 text-xs text-danger">
        {errors[name]}
      </p>
    );

  return (
    <section id="contact" className="bg-black px-4 py-10 md:px-6 md:py-16">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-x-12 gap-y-10 rounded-2xl bg-surface p-6 sm:p-10 md:rounded-[2rem] lg:grid-cols-2 lg:p-16">
        <div className="flex flex-col">
          <p className="eyebrow mb-6">Contact</p>
          <h2 className="text-3xl leading-[1] text-cream sm:text-4xl md:text-5xl">
            <WordsPullUpMultiStyle
              align="left"
              segments={[
                { text: "Let's build", className: 'font-normal' },
                { text: 'something', className: 'font-serif italic' },
                { text: 'together.', className: 'font-normal' },
              ]}
            />
          </h2>
          <p className="mt-6 max-w-sm text-sm text-gray-400 md:text-base">
            Have an opportunity, a project or a question? Send a message and it lands straight in my inbox.
          </p>

          <ul className="mt-10 space-y-3 text-sm text-primary/80 lg:mt-auto lg:pt-10">
            {profile.email && (
              <li>
                <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-3 break-all transition-colors duration-200 hover:text-cream">
                  <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {profile.email}
                </a>
              </li>
            )}
            {profile.phone && (
              <li>
                <a href={`tel:${profile.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-3 transition-colors duration-200 hover:text-cream">
                  <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {profile.phone}
                </a>
              </li>
            )}
            {profile.location && (
              <li className="flex items-center gap-3">
                <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {profile.location}
              </li>
            )}
          </ul>
        </div>

        {status.kind === 'sent' ? (
          <div role="status" className="flex min-h-[320px] flex-col items-start justify-center rounded-2xl bg-card p-8">
            <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-black">
              <Check className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="text-2xl text-cream">Message sent.</h3>
            <p className="mt-2 text-sm text-gray-400">Thank you for reaching out. I will get back to you soon.</p>
            <button type="button" className="link-arrow mt-8 underline decoration-primary/40 underline-offset-4" onClick={() => setStatus({ kind: 'idle' })}>
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-5" aria-label="Contact form">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-name`} className="label">Name</label>
                <input {...field('name')} onChange={(e) => set('name', e.target.value)} type="text" autoComplete="name" maxLength={CONTACT_LIMITS.name[1]} required className="input" />
                {errorText('name')}
              </div>
              <div>
                <label htmlFor={`${uid}-email`} className="label">Email</label>
                <input {...field('email')} onChange={(e) => set('email', e.target.value)} type="email" autoComplete="email" inputMode="email" required className="input" />
                {errorText('email')}
              </div>
            </div>
            <div>
              <label htmlFor={`${uid}-subject`} className="label">
                Subject <span className="text-gray-600">(optional)</span>
              </label>
              <input {...field('subject')} onChange={(e) => set('subject', e.target.value)} type="text" maxLength={CONTACT_LIMITS.subject[1]} className="input" />
              {errorText('subject')}
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor={`${uid}-body`} className="label">Message</label>
                <span className="text-[11px] tabular-nums text-gray-500" aria-hidden>
                  {values.body.length}/{CONTACT_LIMITS.body[1]}
                </span>
              </div>
              <textarea {...field('body')} onChange={(e) => set('body', e.target.value)} rows={6} maxLength={CONTACT_LIMITS.body[1]} required className="input resize-y" />
              {errorText('body')}
            </div>

            {/* Honeypot: invisible to people and assistive tech; bots that fill it are dropped server-side. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Website
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set('website', e.target.value)} />
              </label>
            </div>

            {status.kind === 'error' && (
              <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {status.message}
              </p>
            )}

            <PillButton type="submit" disabled={status.kind === 'sending'} icon={status.kind === 'sending' ? <Spinner /> : undefined}>
              {status.kind === 'sending' ? 'Sending' : 'Send message'}
            </PillButton>
          </form>
        )}
      </div>
    </section>
  );
}
