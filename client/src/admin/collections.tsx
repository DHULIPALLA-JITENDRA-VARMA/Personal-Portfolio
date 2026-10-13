import { adminAchievements, adminCertifications, adminEducation, adminExperience, adminSkills } from '../api';
import { formatRange } from '../lib/format';
import { ListEditor } from './ListEditor';

export const SkillsPage = () => (
  <ListEditor
    title="Skills"
    singular="skill"
    description="Skills are grouped by category on the public site, in the order shown here."
    api={adminSkills}
    primary={(s) => s.name}
    secondary={(s) => s.category}
    fields={[
      { name: 'category', label: 'Category', required: true, hint: 'Use an existing category name to add to that group.' },
      { name: 'name', label: 'Skill', required: true },
    ]}
  />
);

export const ExperiencePage = () => (
  <ListEditor
    title="Experience"
    singular="role"
    description="Roles and internships."
    api={adminExperience}
    primary={(e) => `${e.role} · ${e.company}`}
    secondary={(e) => formatRange(e.start, e.end)}
    fields={[
      { name: 'role', label: 'Role', required: true },
      { name: 'company', label: 'Company', required: true },
      { name: 'start', label: 'Start', hint: 'Free text, e.g. Jun 2025. Leave empty to hide.' },
      { name: 'end', label: 'End', hint: 'e.g. Aug 2025 or Present.' },
      { name: 'bullets', label: 'Highlights', type: 'lines', hint: 'One per line.' },
    ]}
  />
);

export const EducationPage = () => (
  <ListEditor
    title="Education"
    singular="entry"
    description="Degrees and schooling, newest first."
    api={adminEducation}
    primary={(e) => e.degree}
    secondary={(e) => [e.institution, formatRange(e.start, e.end), e.score].filter(Boolean).join(' · ')}
    fields={[
      { name: 'degree', label: 'Degree', required: true },
      { name: 'institution', label: 'Institution', required: true },
      { name: 'start', label: 'Start' },
      { name: 'end', label: 'End' },
      { name: 'score', label: 'Score', hint: 'e.g. CGPA 7.53 or 67%.' },
    ]}
  />
);

export const CertificationsPage = () => (
  <ListEditor
    title="Certifications"
    singular="certification"
    description="Certificates and courses. Add a URL to link to the credential."
    api={adminCertifications}
    primary={(c) => c.title}
    secondary={(c) => c.issuer}
    fields={[
      { name: 'title', label: 'Title', required: true },
      { name: 'issuer', label: 'Issuer' },
      { name: 'url', label: 'Credential URL', type: 'url' },
    ]}
  />
);

export const AchievementsPage = () => (
  <ListEditor
    title="Achievements"
    singular="achievement"
    description="Hackathons, workshops and other highlights."
    api={adminAchievements}
    primary={(a) => a.title}
    secondary={(a) => a.description}
    fields={[
      { name: 'title', label: 'Title', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
    ]}
  />
);
