/* Render — turns portfolio data into DOM. No secrets, no editing logic here. */
window.PortfolioRender = (() => {
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const SOCIAL_LABELS = { github: "GitHub", linkedin: "LinkedIn", twitter: "Twitter", discord: "Discord", dribbble: "Dribbble", website: "Website", email: "Email" };

  function socialHref(key, value) {
    if (!value) return "";
    if (key === "email") return value.includes("@") && !value.startsWith("mailto:") ? `mailto:${value}` : value;
    return value;
  }

  function socialsHTML(socials = {}) {
    return Object.entries(SOCIAL_LABELS)
      .filter(([k]) => socials[k] && String(socials[k]).trim())
      .map(([k, label]) => `<a href="${esc(socialHref(k, socials[k]))}" ${/^https?:/.test(socials[k]) ? 'target="_blank" rel="noopener"' : ""}>${esc(label)}</a>`)
      .join("");
  }

  function initials(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  }

  function render(data) {
    if (!data || typeof data !== "object") return;
    window.PortfolioTheme.applyTheme(data.theme || {});

    // SEO
    document.title = data.site?.title || "Portfolio";
    const meta = document.querySelector('meta[name="description"]');
    if (meta && data.site?.description) meta.setAttribute("content", data.site.description);

    // Nav
    document.getElementById("brandName").textContent = data.site?.name || "Portfolio";
    document.getElementById("brandDot").textContent = data.site?.logo || "●";
    const links = (data.nav?.links || []).filter((l) => l.label);
    document.getElementById("navLinks").innerHTML = links.map((l) => `<a href="${esc(l.href || "#")}">${esc(l.label)}</a>`).join("");
    const mm = document.getElementById("mobileMenu");
    mm.innerHTML = links.map((l) => `<a href="${esc(l.href || "#")}">${esc(l.label)}</a>`).join("");
    mm.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => { mm.hidden = true; }));

    const ctaBtn = document.getElementById("navCta");
    ctaBtn.textContent = data.contact?.buttonLabel || "Get in touch";
    ctaBtn.onclick = () => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });

    // Hero
    setText("heroEyebrow", data.hero?.eyebrow);
    toggle("heroEyebrow", data.hero?.eyebrow);
    setText("heroTitle", data.hero?.title);
    setText("heroSubtitle", data.hero?.subtitle);
    setCta("heroCtaPrimary", data.hero?.ctaPrimary, data.hero?.ctaPrimaryUrl);
    setCta("heroCtaSecondary", data.hero?.ctaSecondary, data.hero?.ctaSecondaryUrl);
    document.getElementById("heroSocials").innerHTML = socialsHTML(data.socials);

    const portrait = data.hero?.portrait || data.about?.image || "";
    const pimg = document.getElementById("portraitImg");
    const pfb = document.getElementById("portraitFallback");
    if (portrait) {
      pimg.src = portrait;
      pimg.hidden = false;
      pfb.style.display = "none";
    } else {
      pimg.removeAttribute("src");
      pimg.hidden = true;
      pfb.style.display = "";
      pfb.textContent = initials(data.site?.name);
    }

    // Sections in configured order
    const root = document.getElementById("sectionsRoot");
    root.innerHTML = "";
    const order = data.layout?.order?.length ? data.layout.order : ["about", "skills", "projects", "experience", "education", "contact"];
    const vis = data.layout?.visibility || {};
    const builders = { about: buildAbout, skills: buildSkills, projects: buildProjects, experience: buildExperience, education: buildEducation, contact: buildContact };
    let idx = 1;
    for (const id of order) {
      if (vis[id] === false || !builders[id]) continue;
      root.appendChild(builders[id](data, String(idx).padStart(2, "0")));
      idx++;
    }

    // Footer
    document.getElementById("footerText").textContent = data.footer?.text || "";
    const fs = document.getElementById("footerSocials");
    fs.innerHTML = data.footer?.showSocials !== false ? socialsHTML(data.socials) : "";
    fs.style.display = fs.innerHTML ? "" : "none";
  }

  function setText(id, v) { document.getElementById(id).textContent = v || ""; }
  function toggle(id, v) { document.getElementById(id).style.display = v ? "" : "none"; }
  function setCta(id, label, href) {
    const el = document.getElementById(id);
    el.textContent = label || "";
    el.href = href || "#";
    el.style.display = label ? "" : "none";
  }

  function sectionShell(id, index, heading) {
    const s = document.createElement("section");
    s.className = "section";
    s.id = id;
    s.innerHTML = `<div class="section-head"><span class="index">${esc(index)}</span><h2>${esc(heading || id)}</h2></div><div class="section-body"></div>`;
    return [s, s.querySelector(".section-body")];
  }

  function buildAbout(d, index) {
    const [s, body] = sectionShell("about", index, d.about?.heading || "About");
    const img = d.about?.image ? `<div class="about-photo"><img src="${esc(d.about.image)}" alt="About photo" loading="lazy" /></div>` : "";
    const stats = (d.about?.stats || []).filter((x) => x.value || x.label).map((x) => `<div class="stat"><b>${esc(x.value)}</b><span>${esc(x.label)}</span></div>`).join("");
    body.innerHTML = `
      <div class="about-grid">
        ${img}
        <div>
          <p class="about-body">${esc(d.about?.body || "")}</p>
          <div class="about-meta">
            ${d.about?.location ? `<span class="pill">${window.Icons.mapPin}${esc(d.about.location)}</span>` : ""}
            ${d.about?.availability ? `<span class="pill"><span class="live-dot"></span>${esc(d.about.availability)}</span>` : ""}
          </div>
          ${stats ? `<div class="stats-row">${stats}</div>` : ""}
        </div>
      </div>`;
    return s;
  }

  function buildSkills(d, index) {
    const [s, body] = sectionShell("skills", index, "Skills");
    const items = (d.skills || []).map((sk) => `
      <div class="skill"><div class="skill-top"><span>${esc(sk.name)}</span><span>${Number(sk.level) || 0}%</span></div>
      <div class="bar"><i style="width:${Math.max(0, Math.min(100, Number(sk.level) || 0))}%"></i></div></div>`).join("");
    body.innerHTML = items ? `<div class="skills-grid">${items}</div>` : `<p class="muted">No skills listed yet.</p>`;
    return s;
  }

  function buildProjects(d, index) {
    const [s, body] = sectionShell("projects", index, "Work");
    s.id = "projects";
    const cards = (d.projects || []).map((p) => {
      const media = p.image ? `<div class="project-media"><img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy" /></div>`
        : `<div class="project-media" aria-hidden="true"><span>${esc((p.title || "?").trim().charAt(0).toUpperCase())}</span></div>`;
      const tags = (p.tags || []).map((t) => `<span>${esc(t)}</span>`).join("");
      return `<article class="project">${media}<div class="project-body">
        ${p.featured ? `<span class="featured-badge">Featured</span>` : ""}
        <h3>${esc(p.title)}</h3><p>${esc(p.description)}</p>
        ${tags ? `<div class="tags">${tags}</div>` : ""}
        <div class="project-links">${p.url ? `<a href="${esc(p.url)}" ${/^https?:/.test(p.url) ? 'target="_blank" rel="noopener"' : ""}>Live site →</a>` : ""}${p.repo ? `<a href="${esc(p.repo)}" target="_blank" rel="noopener">Code →</a>` : ""}</div>
      </div></article>`;
    }).join("");
    body.innerHTML = cards ? `<div class="projects-grid">${cards}</div>` : `<p class="muted">No projects yet — check back soon.</p>`;
    return s;
  }

  function buildExperience(d, index) {
    const [s, body] = sectionShell("experience", index, "Experience");
    const items = (d.experience || []).map((e) => `
      <div class="timeline-item"><div class="row"><h3>${esc(e.role)} <span class="company">· ${esc(e.company)}</span></h3><span class="period">${esc(e.period)}</span></div>
      ${e.location ? `<span class="period">${esc(e.location)}</span>` : ""}<p>${esc(e.summary)}</p></div>`).join("");
    body.innerHTML = items ? `<div class="timeline">${items}</div>` : `<p class="muted">Nothing here yet.</p>`;
    return s;
  }

  function buildEducation(d, index) {
    const [s, body] = sectionShell("education", index, "Education");
    const items = (d.education || []).map((e) => `
      <div class="timeline-item"><div class="row"><h3>${esc(e.degree)} <span class="company">· ${esc(e.school)}</span></h3><span class="period">${esc(e.period)}</span></div>
      ${e.note ? `<p>${esc(e.note)}</p>` : ""}</div>`).join("");
    body.innerHTML = items ? `<div class="timeline">${items}</div>` : `<p class="muted">Nothing here yet.</p>`;
    return s;
  }

  function buildContact(d, index) {
    const sec = document.createElement("section");
    sec.className = "section";
    sec.id = "contact";
    const email = d.contact?.email || d.socials?.email || "";
    sec.innerHTML = `<div class="contact-card"><span class="index" style="color:var(--accent);font-weight:700;font-size:.85rem;letter-spacing:.08em">${esc(index)}</span>
      <h2>${esc(d.contact?.heading || "Contact")}</h2><p>${esc(d.contact?.body || "")}</p>
      ${email ? `<a class="btn btn-primary" href="mailto:${esc(email)}">${esc(d.contact?.buttonLabel || "Say hello")}</a><span class="muted tiny">${esc(email)}</span>` : ""}</div>`;
    return sec;
  }

  return { render };
})();
