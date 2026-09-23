// Server-side validation + sanitization for portfolio payloads.
// Never trust the client: whitelist fields, cap lengths, validate URLs.

const MAX_RAW_BYTES = 1_500_000;
const MAX_STR = {
  tiny: 120,
  short: 300,
  medium: 2000,
  long: 8000,
};
const MAX_ITEMS = { skills: 40, projects: 24, experience: 20, education: 12 };

function clampStr(v, max, fallback = "") {
  if (typeof v !== "string") return fallback;
  return v.slice(0, max);
}

function isSafeUrl(v) {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (!s) return false;
  if (s.startsWith("#") || s.startsWith("/")) return true;
  if (/^(mailto:|tel:)/i.test(s)) return s.length < 300;
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(s)) return s.length < 700_000;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function safeUrlOr(v, fallback = "") {
  if (typeof v !== "string") return fallback;
  const s = v.trim().slice(0, 2000);
  if (!s) return "";
  return isSafeUrl(s) ? s : fallback;
}

function cleanSkill(s) {
  if (typeof s === "string") return { name: clampStr(s, MAX_STR.tiny), level: 70 };
  if (!s || typeof s !== "object") return null;
  const name = clampStr(s.name ?? "", MAX_STR.tiny);
  if (!name.trim()) return null;
  let level = Number(s.level);
  if (!Number.isFinite(level)) level = 70;
  level = Math.max(0, Math.min(100, Math.round(level)));
  return { name, level };
}

function cleanProject(p) {
  if (!p || typeof p !== "object") return null;
  const title = clampStr(p.title ?? "", MAX_STR.tiny);
  if (!title.trim()) return null;
  return {
    id: clampStr(p.id ?? "", 60) || `p-${Date.now().toString(36)}`,
    title,
    description: clampStr(p.description ?? "", MAX_STR.medium),
    tags: Array.isArray(p.tags)
      ? p.tags.filter((t) => typeof t === "string").map((t) => t.slice(0, 40)).slice(0, 12)
      : [],
    image: safeUrlOr(p.image ?? "", ""),
    url: safeUrlOr(p.url ?? "", ""),
    repo: safeUrlOr(p.repo ?? "", ""),
    featured: p.featured === true,
  };
}

function cleanExperience(e) {
  if (!e || typeof e !== "object") return null;
  const role = clampStr(e.role ?? "", MAX_STR.tiny);
  const company = clampStr(e.company ?? "", MAX_STR.tiny);
  if (!role.trim() && !company.trim()) return null;
  return {
    id: clampStr(e.id ?? "", 60) || `e-${Date.now().toString(36)}`,
    role,
    company: company,
    period: clampStr(e.period ?? "", 80),
    location: clampStr(e.location ?? "", 120),
    summary: clampStr(e.summary ?? "", MAX_STR.medium),
  };
}

function cleanEducation(e) {
  if (!e || typeof e !== "object") return null;
  const school = clampStr(e.school ?? "", MAX_STR.tiny);
  const degree = clampStr(e.degree ?? "", MAX_STR.tiny);
  if (!school.trim() && !degree.trim()) return null;
  return {
    id: clampStr(e.id ?? "", 60) || `ed-${Date.now().toString(36)}`,
    school,
    degree,
    period: clampStr(e.period ?? "", 80),
    note: clampStr(e.note ?? "", MAX_STR.medium),
  };
}

const SECTION_IDS = ["about", "skills", "projects", "experience", "education", "contact"];

function sanitizePortfolio(input) {
  if (!input || typeof input !== "object") throw new Error("Invalid payload");
  const raw = JSON.stringify(input);
  if (raw.length > MAX_RAW_BYTES) throw new Error("Payload too large");

  const site = input.site && typeof input.site === "object" ? input.site : {};
  const hero = input.hero && typeof input.hero === "object" ? input.hero : {};
  const about = input.about && typeof input.about === "object" ? input.about : {};
  const contact = input.contact && typeof input.contact === "object" ? input.contact : {};
  const theme = input.theme && typeof input.theme === "object" ? input.theme : {};
  const socials = input.socials && typeof input.socials === "object" ? input.socials : {};
  const layout = input.layout && typeof input.layout === "object" ? input.layout : {};
  const footer = input.footer && typeof input.footer === "object" ? input.footer : {};
  const nav = input.nav && typeof input.nav === "object" ? input.nav : {};

  const order = Array.isArray(layout.order)
    ? layout.order.filter((id) => SECTION_IDS.includes(id))
    : [...SECTION_IDS];
  // Ensure every section id is present exactly once.
  for (const id of SECTION_IDS) if (!order.includes(id)) order.push(id);

  const visibility = {};
  const visIn = layout.visibility && typeof layout.visibility === "object" ? layout.visibility : {};
  for (const id of SECTION_IDS) visibility[id] = visIn[id] !== false;

  const allowedFonts = ["Inter", "Fraunces", "Space Grotesk", "IBM Plex Sans", "Georgia", "System"];
  const pickFont = (v, fb) => (allowedFonts.includes(v) ? v : fb);

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    site: {
      title: clampStr(site.title ?? "", MAX_STR.short, "Portfolio"),
      description: clampStr(site.description ?? "", MAX_STR.medium),
      name: clampStr(site.name ?? "", MAX_STR.tiny),
      role: clampStr(site.role ?? "", MAX_STR.tiny),
      logo: clampStr(site.logo ?? "", 20, "●"),
    },
    hero: {
      eyebrow: clampStr(hero.eyebrow ?? "", MAX_STR.tiny),
      title: clampStr(hero.title ?? "", MAX_STR.short),
      subtitle: clampStr(hero.subtitle ?? "", MAX_STR.medium),
      ctaPrimary: clampStr(hero.ctaPrimary ?? "", 60),
      ctaPrimaryUrl: safeUrlOr(hero.ctaPrimaryUrl ?? "", "#projects"),
      ctaSecondary: clampStr(hero.ctaSecondary ?? "", 60),
      ctaSecondaryUrl: safeUrlOr(hero.ctaSecondaryUrl ?? "", "#contact"),
      portrait: safeUrlOr(hero.portrait ?? "", ""),
    },
    about: {
      heading: clampStr(about.heading ?? "", MAX_STR.tiny, "About"),
      body: clampStr(about.body ?? "", MAX_STR.long),
      image: safeUrlOr(about.image ?? "", ""),
      location: clampStr(about.location ?? "", MAX_STR.tiny),
      availability: clampStr(about.availability ?? "", MAX_STR.tiny),
      stats: Array.isArray(about.stats)
        ? about.stats.slice(0, 4).map((s) => ({
            value: clampStr(String(s?.value ?? ""), 30),
            label: clampStr(String(s?.label ?? ""), 60),
          }))
        : [],
    },
    skills: Array.isArray(input.skills)
      ? input.skills.map(cleanSkill).filter(Boolean).slice(0, MAX_ITEMS.skills)
      : [],
    projects: Array.isArray(input.projects)
      ? input.projects.map(cleanProject).filter(Boolean).slice(0, MAX_ITEMS.projects)
      : [],
    experience: Array.isArray(input.experience)
      ? input.experience.map(cleanExperience).filter(Boolean).slice(0, MAX_ITEMS.experience)
      : [],
    education: Array.isArray(input.education)
      ? input.education.map(cleanEducation).filter(Boolean).slice(0, MAX_ITEMS.education)
      : [],
    socials: {
      github: safeUrlOr(socials.github ?? "", ""),
      linkedin: safeUrlOr(socials.linkedin ?? "", ""),
      twitter: safeUrlOr(socials.twitter ?? "", ""),
      discord: safeUrlOr(socials.discord ?? "", ""),
      dribbble: safeUrlOr(socials.dribbble ?? "", ""),
      website: safeUrlOr(socials.website ?? "", ""),
      email: typeof socials.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(socials.email.trim())
        ? socials.email.trim().slice(0, 160)
        : "",
    },
    contact: {
      heading: clampStr(contact.heading ?? "", MAX_STR.tiny, "Contact"),
      body: clampStr(contact.body ?? "", MAX_STR.medium),
      email: typeof contact.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())
        ? contact.email.trim().slice(0, 160)
        : "",
      buttonLabel: clampStr(contact.buttonLabel ?? "", 60, "Say hello"),
    },
    nav: {
      links: Array.isArray(nav.links)
        ? nav.links.slice(0, 8).map((l) => ({
            label: clampStr(l?.label ?? "", 40),
            href: safeUrlOr(l?.href ?? "", "#"),
          })).filter((l) => l.label.trim())
        : [],
    },
    footer: {
      text: clampStr(footer.text ?? "", MAX_STR.short),
      showSocials: footer.showSocials !== false,
    },
    layout: { order, visibility },
    theme: {
      appearance: theme.appearance === "light" || theme.appearance === "dark" ? theme.appearance : "dark",
      accent: /^#[0-9a-fA-F]{6}$/.test(theme.accent ?? "") ? theme.accent : "#6c7bff",
      accent2: /^#[0-9a-fA-F]{6}$/.test(theme.accent2 ?? "") ? theme.accent2 : "#22d3a5",
      background: /^#[0-9a-fA-F]{6}$/.test(theme.background ?? "") ? theme.background : "#0b0d12",
      surface: /^#[0-9a-fA-F]{6}$/.test(theme.surface ?? "") ? theme.surface : "#141821",
      text: /^#[0-9a-fA-F]{6}$/.test(theme.text ?? "") ? theme.text : "#eef1f6",
      muted: /^#[0-9a-fA-F]{6}$/.test(theme.muted ?? "") ? theme.muted : "#9aa3b2",
      headingFont: pickFont(theme.headingFont, "Fraunces"),
      bodyFont: pickFont(theme.bodyFont, "Inter"),
      radius: Number.isFinite(Number(theme.radius)) ? Math.max(0, Math.min(28, Number(theme.radius))) : 14,
      spacing: Number.isFinite(Number(theme.spacing)) ? Math.max(0, Math.min(32, Number(theme.spacing))) : 12,
      backgroundEffect: ["none", "orbs", "grid", "grain"].includes(theme.backgroundEffect)
        ? theme.backgroundEffect
        : "orbs",
    },
  };
}

module.exports = { sanitizePortfolio, MAX_RAW_BYTES };
