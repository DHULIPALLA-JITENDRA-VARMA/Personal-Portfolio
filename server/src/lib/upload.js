import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { HttpError } from '../middleware/errors.js';

const startsWith = (buf, bytes, offset = 0) => bytes.every((b, i) => buf[offset + i] === b);

// File type is decided by the leading "magic bytes" of the content. The client-supplied
// filename and Content-Type are ignored because both are trivially forged.
const SIGNATURES = {
  jpg: (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  png: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  webp: (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8),
  pdf: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]),
};

export const detectType = (buffer, allowed) =>
  allowed.find((type) => buffer.length >= 12 && SIGNATURES[type](buffer)) || null;

export const memoryUpload = (maxBytes) =>
  multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes, files: 1 } }).single('file');

// Stores the buffer under a random name, so user input never becomes part of a filesystem path.
export function saveUpload(uploadDir, file, allowed, prefix = '') {
  if (!file) throw new HttpError(400, 'No file uploaded (expected multipart field "file")');
  const type = detectType(file.buffer, allowed);
  if (!type) throw new HttpError(415, `Unsupported file type. Allowed: ${allowed.join(', ')}`);
  fs.mkdirSync(uploadDir, { recursive: true });
  const filename = `${prefix}${crypto.randomBytes(16).toString('hex')}.${type}`;
  fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
  return filename;
}

export function removeUpload(uploadDir, filename) {
  if (!filename) return;
  fs.rmSync(path.join(uploadDir, path.basename(filename)), { force: true });
}
