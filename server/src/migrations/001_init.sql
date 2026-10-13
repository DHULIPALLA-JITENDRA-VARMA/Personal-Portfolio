CREATE TABLE profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT '',
  headline TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  show_phone INTEGER NOT NULL DEFAULT 0,
  location TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT NOT NULL DEFAULT '',
  github_url TEXT NOT NULL DEFAULT '',
  resume_file TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  description_md TEXT NOT NULL DEFAULT '',
  tech_stack TEXT NOT NULL DEFAULT '[]',
  live_url TEXT NOT NULL DEFAULT '',
  repo_url TEXT NOT NULL DEFAULT '',
  image TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE experience (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  company TEXT NOT NULL,
  start TEXT NOT NULL DEFAULT '',
  "end" TEXT NOT NULL DEFAULT '',
  bullets TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE education (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  degree TEXT NOT NULL,
  institution TEXT NOT NULL,
  start TEXT NOT NULL DEFAULT '',
  "end" TEXT NOT NULL DEFAULT '',
  score TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE certifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  issuer TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at TEXT NOT NULL,
  ip_hash TEXT
);
CREATE INDEX idx_messages_status_created ON messages (status, created_at);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('page_view', 'project_click', 'resume_download', 'outbound_click')),
  path TEXT NOT NULL DEFAULT '',
  ref TEXT NOT NULL DEFAULT '',
  visitor_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_events_type_created ON events (type, created_at);

CREATE TABLE admin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);
