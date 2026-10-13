import { z } from 'zod';

const text = (max, min = 0) => z.string().trim().min(min, min ? 'Required' : undefined).max(max);
const sortOrder = z.number().int().min(0).max(100000);
export const url = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Must be an http(s) URL or empty');
const bool = z.union([z.boolean(), z.literal(0), z.literal(1)]).transform((v) => (v ? 1 : 0));

export const reorderSchema = z.object({ ids: z.array(z.number().int().positive()).min(1).max(500) });

export const profileSchema = z
  .object({
    name: text(80, 1),
    headline: text(160),
    summary: text(2000),
    email: z.string().trim().max(254).pipe(z.email()),
    phone: text(30),
    show_phone: bool,
    location: text(120),
    linkedin_url: url,
    github_url: url,
  })
  .partial();

export const projectSchema = z.object({
  title: text(120, 1),
  slug: text(80).optional(),
  tagline: text(200).default(''),
  description_md: text(20000).default(''),
  tech_stack: z.array(text(40, 1)).max(30).default([]),
  live_url: url.default(''),
  repo_url: url.default(''),
  featured: bool.default(0),
  published: bool.default(0),
  sort_order: sortOrder.optional(),
});

// Simple list resources handled by the generic CRUD router. `json` lists array columns.
export const collections = {
  skills: {
    schema: z.object({ category: text(60, 1), name: text(80, 1), sort_order: sortOrder.optional() }),
  },
  experience: {
    json: ['bullets'],
    schema: z.object({
      role: text(120, 1),
      company: text(120, 1),
      start: text(40).default(''),
      end: text(40).default(''),
      bullets: z.array(text(400, 1)).max(20).default([]),
      sort_order: sortOrder.optional(),
    }),
  },
  education: {
    schema: z.object({
      degree: text(160, 1),
      institution: text(200, 1),
      start: text(40).default(''),
      end: text(40).default(''),
      score: text(40).default(''),
      sort_order: sortOrder.optional(),
    }),
  },
  certifications: {
    schema: z.object({ title: text(200, 1), issuer: text(120).default(''), url: url.default(''), sort_order: sortOrder.optional() }),
  },
  achievements: {
    schema: z.object({ title: text(200, 1), description: text(600).default(''), sort_order: sortOrder.optional() }),
  },
};

// For updates every field is optional and defaults are dropped, so omitted fields stay untouched.
export const partialOf = (schema) =>
  z.object(Object.fromEntries(Object.entries(schema.shape).map(([k, v]) => [k, (v.removeDefault ? v.removeDefault() : v).optional()])));
