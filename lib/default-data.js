// Shared fallback content. Mirrors js/config-default.js (kept in sync manually).
// This is only used when nothing has been published yet via the editor.
module.exports = {
  "version": 1,
  "site": {
    "title": "Maya Chen — Product Designer & Frontend Developer",
    "description": "Portfolio of Maya Chen, a product designer and frontend developer crafting calm, usable interfaces.",
    "name": "Maya Chen",
    "role": "Product Designer",
    "logo": "●"
  },
  "hero": {
    "eyebrow": "Available for freelance — Spring 2026",
    "title": "Designing calm, usable products for the web",
    "subtitle":
      "I'm Maya, a product designer and frontend developer in Portland. I help small teams turn rough ideas into polished, accessible interfaces — from first sketch to shipped CSS.",
    "ctaPrimary": "View work",
    "ctaPrimaryUrl": "#projects",
    "ctaSecondary": "Get in touch",
    "ctaSecondaryUrl": "#contact",
    "portrait": ""
  },
  "about": {
    "heading": "About",
    "body": "I've spent the last 7 years working across design and front-end roles — mostly with early-stage startups and design studios. My sweet spot is the overlap: systems thinking from design, pragmatism from engineering.\n\nThese days I focus on design systems, marketing sites, and product UI. I care about loading speed, readability, and interfaces that don't shout. Outside work you'll find me trail running, sketching strangers' dogs, or maintaining a small open-source icon set.",
    "image": "",
    "location": "Portland, OR",
    "availability": "Booking projects for April 2026",
    "stats": [
      { "value": "7+", "label": "years of practice" },
      { "value": "40+", "label": "projects shipped" },
      { "value": "12", "label": "design systems built" }
    ]
  },
  "skills": [
    { "name": "Product design", "level": 92 },
    { "name": "Design systems", "level": 88 },
    { "name": "HTML / CSS", "level": 90 },
    { "name": "JavaScript", "level": 78 },
    { "name": "Prototyping", "level": 85 },
    { "name": "Accessibility", "level": 82 }
  ],
  "projects": [
    {
      "id": "p-harbor",
      "title": "Harbor — analytics without the noise",
      "description":
        "Led design for a lightweight analytics dashboard. Simplified 20+ charts into 6 opinionated views. Trial-to-paid conversion went up 18% after launch.",
      "tags": ["Product design", "Dashboard", "Design system"],
      "image": "",
      "url": "#projects",
      "repo": "",
      "featured": true
    },
    {
      "id": "p-fern",
      "title": "Fern & Field — storefront refresh",
      "description":
        "Redesigned a plant shop's storefront and checkout. Rebuilt in semantic HTML with a 0.9s LCP on mid-range phones. Bounce rate dropped by a third.",
      "tags": ["Web design", "E-commerce", "Performance"],
      "image": "",
      "url": "#projects",
      "repo": "",
      "featured": true
    },
    {
      "id": "p-atlas",
      "title": "Atlas UI — open-source component kit",
      "description":
        "A small, dependency-free component kit with 30+ accessible components and design tokens. 2.4k stars and used by a handful of indie teams.",
      "tags": ["Open source", "CSS", "Accessibility"],
      "image": "",
      "url": "#projects",
      "repo": "",
      "featured": false
    }
  ],
  "experience": [
    {
      "id": "e-1",
      "role": "Senior Product Designer",
      "company": "Northwind Studio",
      "period": "2022 — Now",
      "location": "Portland / Remote",
      "summary": "Own design for two SaaS products. Built the studio's token pipeline and mentor two junior designers."
    },
    {
      "id": "e-2",
      "role": "Design Engineer",
      "company": "Loopwork",
      "period": "2019 — 2022",
      "location": "Remote",
      "summary": "Sat between design and frontend. Shipped marketing site, onboarding flows, and a component library used by 4 teams."
    },
    {
      "id": "e-3",
      "role": "UI Designer",
      "company": "Fieldnotes",
      "period": "2017 — 2019",
      "location": "Seattle",
      "summary": "Designed mobile and web features for a journaling app with 200k readers. Ran usability tests every other week."
    }
  ],
  "education": [
    {
      "id": "ed-1",
      "school": "University of Washington",
      "degree": "B.A. in Interaction Design",
      "period": "2013 — 2017",
      "note": "Focus on human-centered design. Thesis on readability of long-form reading on mobile."
    }
  ],
  "socials": { "github": "", "linkedin": "", "twitter": "", "discord": "", "dribbble": "", "website": "", "email": "hello@example.com" },
  "contact": {
    "heading": "Contact",
    "body": "Have a project in mind, or just want to say hi? I read everything and usually reply within two days.",
    "email": "hello@example.com",
    "buttonLabel": "Say hello"
  },
  "nav": {
    "links": [
      { "label": "About", "href": "#about" },
      { "label": "Work", "href": "#projects" },
      { "label": "Experience", "href": "#experience" },
      { "label": "Contact", "href": "#contact" }
    ]
  },
  "footer": { "text": "© 2026 Maya Chen. Built by hand, no trackers.", "showSocials": true },
  "layout": {
    "order": ["about", "skills", "projects", "experience", "education", "contact"],
    "visibility": { "about": true, "skills": true, "projects": true, "experience": true, "education": true, "contact": true }
  },
  "theme": {
    "appearance": "dark",
    "accent": "#6c7bff",
    "accent2": "#22d3a5",
    "background": "#0b0d12",
    "surface": "#141821",
    "text": "#eef1f6",
    "muted": "#9aa3b2",
    "headingFont": "Fraunces",
    "bodyFont": "Inter",
    "radius": 14,
    "spacing": 12,
    "backgroundEffect": "orbs"
  }
};
