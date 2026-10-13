export interface Profile {
  name: string;
  headline: string;
  summary: string;
  email: string;
  /** Present only when the owner enabled `show_phone`. */
  phone?: string;
  location: string;
  linkedin_url: string;
  github_url: string;
  has_resume: boolean;
  updated_at: string;
}
export interface AdminProfile extends Profile {
  phone: string;
  show_phone: boolean;
}

export interface Skill {
  id: number;
  category: string;
  name: string;
  sort_order: number;
}
export interface SkillGroup {
  category: string;
  items: Array<Pick<Skill, 'id' | 'name'>>;
}

export interface Project {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  description_md: string;
  tech_stack: string[];
  live_url: string;
  repo_url: string;
  image: string | null;
  featured: boolean;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
export type ProjectInput = Partial<
  Pick<Project, 'title' | 'slug' | 'tagline' | 'description_md' | 'tech_stack' | 'live_url' | 'repo_url' | 'featured' | 'published'>
>;

export interface Experience {
  id: number;
  role: string;
  company: string;
  start: string;
  end: string;
  bullets: string[];
  sort_order: number;
}
export interface Education {
  id: number;
  degree: string;
  institution: string;
  start: string;
  end: string;
  score: string;
  sort_order: number;
}
export interface Certification {
  id: number;
  title: string;
  issuer: string;
  url: string;
  sort_order: number;
}
export interface Achievement {
  id: number;
  title: string;
  description: string;
  sort_order: number;
}

export interface Portfolio {
  profile: Profile;
  skills: SkillGroup[];
  projects: Project[];
  experience: Experience[];
  education: Education[];
  certifications: Certification[];
  achievements: Achievement[];
}

export interface Repo {
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  updated_at: string;
  url: string;
}
export interface ReposResponse {
  username: string;
  repos: Repo[];
  /** True when GitHub was unreachable and an older cached copy is being served. */
  stale: boolean;
  fetched_at: string | null;
}

export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  body: string;
  /** Honeypot. Must stay empty. */
  website?: string;
}

export type MessageStatus = 'new' | 'read' | 'archived';
export interface Message {
  id: number;
  name: string;
  email: string;
  subject: string;
  body: string;
  status: MessageStatus;
  created_at: string;
}
export interface MessagePage {
  items: Message[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  unread: number;
}

export interface StatTotal {
  value: number;
  previous: number;
  /** null when the previous period had no data to compare against. */
  change_pct: number | null;
}
export interface Stats {
  days: number;
  range: { from: string; to: string };
  totals: Record<'page_views' | 'unique_visitors' | 'project_clicks' | 'resume_downloads' | 'outbound_clicks' | 'messages', StatTotal>;
  visitors_per_day: Array<{ date: string; views: number; unique: number }>;
  top_pages: Array<{ path: string; views: number }>;
  top_projects: Array<{ path: string; clicks: number }>;
  resume_downloads_per_day: Array<{ date: string; count: number }>;
  outbound_clicks: Array<{ kind: 'LinkedIn' | 'GitHub' | 'Live demo'; url: string; count: number }>;
  messages_per_day: Array<{ date: string; count: number }>;
}

export type EventType = 'page_view' | 'project_click' | 'resume_download' | 'outbound_click';
