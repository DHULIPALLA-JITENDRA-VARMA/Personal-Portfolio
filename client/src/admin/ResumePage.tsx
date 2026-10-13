import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { RESUME_URL, adminGetProfile, adminRemoveResume, adminUploadResume } from '../api';
import { ConfirmButton, Notice, PageHeader, useLoad } from './ui';

const MAX_BYTES = 5 * 1024 * 1024;

export default function ResumePage() {
  const { data, error, reload } = useLoad(adminGetProfile);
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) return setStatus({ kind: 'error', text: 'The resume must be a PDF of 5MB or less.' });
    setBusy(true);
    setStatus(null);
    try {
      await adminUploadResume(file);
      setStatus({ kind: 'success', text: `Uploaded “${file.name}”. It is now live at the Download Resume link.` });
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message });
    }
    setBusy(false);
    await reload();
  }

  async function remove() {
    setStatus(null);
    try {
      await adminRemoveResume();
      setStatus({ kind: 'success', text: 'Resume removed. The download link is hidden on the public site.' });
    } catch (err) {
      setStatus({ kind: 'error', text: (err as Error).message });
    }
    await reload();
  }

  return (
    <>
      <PageHeader title="Resume" description="Upload the PDF served by the public Download Resume link. Every download is counted on the dashboard." />
      <Notice>{error}</Notice>
      {status && <Notice kind={status.kind}>{status.text}</Notice>}
      <section className="panel max-w-2xl p-6 md:p-8">
        <p className="text-sm text-gray-400">Current file</p>
        <p className="mt-1 text-xl text-cream">{data ? (data.has_resume ? 'A resume is uploaded.' : 'No resume uploaded yet.') : 'Checking'}</p>
        <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className="btn-primary px-5 py-2.5" disabled={busy} onClick={() => input.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden /> {busy ? 'Uploading' : data?.has_resume ? 'Replace PDF' : 'Upload PDF'}
          </button>
          {data?.has_resume && (
            <>
              <a className="btn-ghost px-5" href={RESUME_URL}>
                <Download className="h-4 w-4" aria-hidden /> Download
              </a>
              <ConfirmButton label="Remove resume" onConfirm={remove}>
                Remove
              </ConfirmButton>
            </>
          )}
        </div>
        <p className="mt-5 text-xs text-muted">PDF only, up to 5MB. Uploading a new file replaces the old one.</p>
      </section>
    </>
  );
}
