/* Editor panels — one builder per tab. Rebuilt on undo/redo/tab switch. */
window.EditorPanels = (() => {
  const C = () => window.EditorControls;
  const S = () => window.EditorState;
  const uid = (p) => `${p}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;

  const SECTION_NAMES = { about: "About", skills: "Skills", projects: "Work", experience: "Experience", education: "Education", contact: "Contact" };

  function build(tab) {
    const d = S().get();
    if (!d) return document.createTextNode("");
    switch (tab) {
      case "content": return panelContent(d);
      case "projects": return panelProjects(d);
      case "career": return panelCareer(d);
      case "design": return panelDesign(d);
      case "sections": return panelSections(d);
      case "site": return panelSite(d);
      default: return panelContent(d);
    }
  }

  function refresh() { window.PortfolioEditor?.refreshPanel(); }

  // ---- Content ----
  function panelContent(d) {
    const c = C();
    const root = c.el("div");
    root.appendChild(c.group("Identity", [
      c.text("Display name", d.site.name, (v) => S().update((x) => { x.site.name = v; })),
      c.text("Role line", d.site.role, (v) => S().update((x) => { x.site.role = v; })),
      c.text("Logo mark", d.site.logo, (v) => S().update((x) => { x.site.logo = v.slice(0, 4); }), { placeholder: "● or initials" }),
    ]));
    root.appendChild(c.group("Hero", [
      c.text("Eyebrow", d.hero.eyebrow, (v) => S().update((x) => { x.hero.eyebrow = v; }), { placeholder: "Available for work — 2026" }),
      c.text("Title", d.hero.title, (v) => S().update((x) => { x.hero.title = v; }), { multiline: true }),
      c.text("Subtitle", d.hero.subtitle, (v) => S().update((x) => { x.hero.subtitle = v; }), { multiline: true }),
      rowOf([
        c.text("Primary button", d.hero.ctaPrimary, (v) => S().update((x) => { x.hero.ctaPrimary = v; })),
        c.text("Primary link", d.hero.ctaPrimaryUrl, (v) => S().update((x) => { x.hero.ctaPrimaryUrl = v; })),
      ]),
      rowOf([
        c.text("Secondary button", d.hero.ctaSecondary, (v) => S().update((x) => { x.hero.ctaSecondary = v; })),
        c.text("Secondary link", d.hero.ctaSecondaryUrl, (v) => S().update((x) => { x.hero.ctaSecondaryUrl = v; })),
      ]),
      c.image("Portrait photo", d.hero.portrait, (v) => S().update((x) => { x.hero.portrait = v; })),
    ]));
    root.appendChild(c.group("About", [
      c.text("Heading", d.about.heading, (v) => S().update((x) => { x.about.heading = v; })),
      c.text("Bio", d.about.body, (v) => S().update((x) => { x.about.body = v; }), { multiline: true }),
      rowOf([
        c.text("Location", d.about.location, (v) => S().update((x) => { x.about.location = v; })),
        c.text("Availability", d.about.availability, (v) => S().update((x) => { x.about.availability = v; })),
      ]),
      c.image("About photo", d.about.image, (v) => S().update((x) => { x.about.image = v; })),
      statsEditor(d),
    ]));
    root.appendChild(c.group("Contact", [
      c.text("Heading", d.contact.heading, (v) => S().update((x) => { x.contact.heading = v; })),
      c.text("Message", d.contact.body, (v) => S().update((x) => { x.contact.body = v; }), { multiline: true }),
      rowOf([
        c.text("Email", d.contact.email, (v) => S().update((x) => { x.contact.email = v; })),
        c.text("Button label", d.contact.buttonLabel, (v) => S().update((x) => { x.contact.buttonLabel = v; })),
      ]),
    ]));
    root.appendChild(c.group("Social links", socialEditors(d), "Empty fields are hidden on the public site."));
    return root;
  }

  function socialEditors(d) {
    const c = C();
    return ["github", "linkedin", "twitter", "discord", "dribbble", "website", "email"].map((k) =>
      c.text(k[0].toUpperCase() + k.slice(1), d.socials[k] || "", (v) => S().update((x) => { x.socials[k] = v.trim(); }), { placeholder: k === "email" ? "you@example.com" : "https://…" })
    );
  }

  function statsEditor(d) {
    const c = C();
    const wrap = c.el("div");
    (d.about.stats || []).forEach((st, i) => {
      const card = c.el("div", "ed-card");
      const head = c.el("div", "ed-card-head", `<b>Stat ${i + 1}</b>`);
      const del = miniBtn("Remove", () => { S().update((x) => { x.about.stats.splice(i, 1); }); refresh(); }, true);
      head.appendChild(del);
      card.appendChild(head);
      const row = rowOf([
        c.text("Value", st.value, (v) => S().update((x) => { x.about.stats[i].value = v; })),
        c.text("Label", st.label, (v) => S().update((x) => { x.about.stats[i].label = v; })),
      ]);
      card.appendChild(row);
      wrap.appendChild(card);
    });
    if ((d.about.stats || []).length < 4) {
      const add = c.el("button", "ed-add-btn", "+ Add stat");
      add.type = "button";
      add.addEventListener("click", () => { S().update((x) => { x.about.stats.push({ value: "", label: "" }); }); refresh(); });
      wrap.appendChild(add);
    }
    return wrap;
  }

  // ---- Projects ----
  function panelProjects(d) {
    const c = C();
    const root = c.el("div");
    root.appendChild(c.group("Projects", [hint(`${d.projects.length} of 24 projects. Featured items get a badge.`)]));
    d.projects.forEach((p, i) => {
      const card = c.el("div", "ed-card");
      const head = c.el("div", "ed-card-head");
      const title = c.el("b", "", escapeHtml(p.title || "Untitled project"));
      head.appendChild(title);
      head.appendChild(miniBtn(window.Icons.chevronUp, () => moveArr(d.projects, i, -1, "projects"), false, i === 0));
      head.appendChild(miniBtn(window.Icons.chevronDown, () => moveArr(d.projects, i, 1, "projects"), false, i === d.projects.length - 1));
      head.appendChild(miniBtn("Remove", () => { if (confirm(`Remove “${p.title}”?`)) { S().update((x) => { x.projects.splice(i, 1); }); refresh(); } }, true));
      card.appendChild(head);
      card.appendChild(c.text("Title", p.title, (v) => S().update((x) => { x.projects[i].title = v; })));
      card.appendChild(c.text("Description", p.description, (v) => S().update((x) => { x.projects[i].description = v; }), { multiline: true }));
      card.appendChild(c.text("Tags (comma separated)", (p.tags || []).join(", "), (v) => S().update((x) => { x.projects[i].tags = v.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12); })));
      card.appendChild(c.image("Cover image", p.image, (v) => S().update((x) => { x.projects[i].image = v; })));
      const links = rowOf([
        c.text("Live URL", p.url, (v) => S().update((x) => { x.projects[i].url = v.trim(); })),
        c.text("Repo URL", p.repo, (v) => S().update((x) => { x.projects[i].repo = v.trim(); })),
      ]);
      card.appendChild(links);
      card.appendChild(c.toggle("Featured", "Highlights this project with a badge", !!p.featured, (v) => S().update((x) => { x.projects[i].featured = v; })));
      root.appendChild(card);
    });
    if (d.projects.length < 24) {
      const add = c.el("button", "ed-add-btn", "+ Add project");
      add.type = "button";
      add.addEventListener("click", () => {
        S().update((x) => { x.projects.push({ id: uid("p"), title: "New project", description: "", tags: [], image: "", url: "", repo: "", featured: false }); });
        refresh();
      });
      root.appendChild(add);
    } else {
      root.appendChild(hint("Project limit reached (24). Remove one to add another."));
    }
    return root;
  }

  // ---- Career: skills + experience + education ----
  function panelCareer(d) {
    const c = C();
    const root = c.el("div");
    const skills = c.group("Skills", []);
    d.skills.forEach((sk, i) => {
      const card = c.el("div", "ed-card");
      const head = c.el("div", "ed-card-head");
      head.appendChild(c.el("b", "", escapeHtml(sk.name || "Skill")));
      head.appendChild(miniBtn("Remove", () => { S().update((x) => { x.skills.splice(i, 1); }); refresh(); }, true));
      card.appendChild(head);
      card.appendChild(c.text("Name", sk.name, (v) => S().update((x) => { x.skills[i].name = v; })));
      card.appendChild(c.range("Level", Number(sk.level) || 0, 0, 100, (v) => S().update((x) => { x.skills[i].level = v; }), "%"));
      skills.appendChild(card);
    });
    if (d.skills.length < 40) {
      const add = c.el("button", "ed-add-btn", "+ Add skill");
      add.type = "button";
      add.addEventListener("click", () => { S().update((x) => { x.skills.push({ name: "New skill", level: 70 }); }); refresh(); });
      skills.appendChild(add);
    }
    root.appendChild(skills);

    const exp = c.group("Experience", []);
    d.experience.forEach((e, i) => {
      const card = c.el("div", "ed-card");
      const head = c.el("div", "ed-card-head");
      head.appendChild(c.el("b", "", escapeHtml(e.role || e.company || "Role")));
      head.appendChild(miniBtn(window.Icons.chevronUp, () => moveArr(d.experience, i, -1, "experience"), false, i === 0));
      head.appendChild(miniBtn(window.Icons.chevronDown, () => moveArr(d.experience, i, 1, "experience"), false, i === d.experience.length - 1));
      head.appendChild(miniBtn("Remove", () => { if (confirm("Remove this role?")) { S().update((x) => { x.experience.splice(i, 1); }); refresh(); } }, true));
      card.appendChild(head);
      card.appendChild(rowOf([
        c.text("Role", e.role, (v) => S().update((x) => { x.experience[i].role = v; })),
        c.text("Company", e.company, (v) => S().update((x) => { x.experience[i].company = v; })),
      ]));
      card.appendChild(rowOf([
        c.text("Period", e.period, (v) => S().update((x) => { x.experience[i].period = v; })),
        c.text("Location", e.location, (v) => S().update((x) => { x.experience[i].location = v; })),
      ]));
      card.appendChild(c.text("Summary", e.summary, (v) => S().update((x) => { x.experience[i].summary = v; }), { multiline: true }));
      exp.appendChild(card);
    });
    const addE = c.el("button", "ed-add-btn", "+ Add role");
    addE.type = "button";
    addE.addEventListener("click", () => { S().update((x) => { x.experience.push({ id: uid("e"), role: "", company: "", period: "", location: "", summary: "" }); }); refresh(); });
    exp.appendChild(addE);
    root.appendChild(exp);

    const edu = c.group("Education", []);
    d.education.forEach((e, i) => {
      const card = c.el("div", "ed-card");
      const head = c.el("div", "ed-card-head");
      head.appendChild(c.el("b", "", escapeHtml(e.school || e.degree || "School")));
      head.appendChild(miniBtn("Remove", () => { if (confirm("Remove this entry?")) { S().update((x) => { x.education.splice(i, 1); }); refresh(); } }, true));
      card.appendChild(head);
      card.appendChild(rowOf([
        c.text("School", e.school, (v) => S().update((x) => { x.education[i].school = v; })),
        c.text("Degree", e.degree, (v) => S().update((x) => { x.education[i].degree = v; })),
      ]));
      card.appendChild(c.text("Period", e.period, (v) => S().update((x) => { x.education[i].period = v; })));
      card.appendChild(c.text("Note", e.note, (v) => S().update((x) => { x.education[i].note = v; }), { multiline: true }));
      edu.appendChild(card);
    });
    const addEd = c.el("button", "ed-add-btn", "+ Add education");
    addEd.type = "button";
    addEd.addEventListener("click", () => { S().update((x) => { x.education.push({ id: uid("ed"), school: "", degree: "", period: "", note: "" }); }); refresh(); });
    edu.appendChild(addEd);
    root.appendChild(edu);
    return root;
  }

  // ---- Design ----
  function panelDesign(d) {
    const c = C();
    const root = c.el("div");
    const fonts = window.PortfolioTheme.FONTS.map((f) => ({ value: f, label: f }));
    root.appendChild(c.group("Appearance", [
      c.select("Mode", d.theme.appearance, [{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }], (v) => S().update((x) => { x.theme.appearance = v; })),
      c.select("Background effect", d.theme.backgroundEffect, [
        { value: "orbs", label: "Glow orbs" }, { value: "grid", label: "Grid" }, { value: "grain", label: "Grain" }, { value: "none", label: "None" },
      ], (v) => S().update((x) => { x.theme.backgroundEffect = v; })),
    ]));
    root.appendChild(c.group("Colors", [
      rowOf([c.color("Accent", d.theme.accent, (v) => S().update((x) => { x.theme.accent = v; })), c.color("Accent 2", d.theme.accent2, (v) => S().update((x) => { x.theme.accent2 = v; }))]),
      rowOf([c.color("Background", d.theme.background, (v) => S().update((x) => { x.theme.background = v; })), c.color("Surface", d.theme.surface, (v) => S().update((x) => { x.theme.surface = v; }))]),
      rowOf([c.color("Text", d.theme.text, (v) => S().update((x) => { x.theme.text = v; })), c.color("Muted", d.theme.muted, (v) => S().update((x) => { x.theme.muted = v; }))]),
    ]));
    root.appendChild(c.group("Typography", [
      c.select("Headings", d.theme.headingFont, fonts, (v) => S().update((x) => { x.theme.headingFont = v; })),
      c.select("Body", d.theme.bodyFont, fonts, (v) => S().update((x) => { x.theme.bodyFont = v; })),
    ]));
    root.appendChild(c.group("Shape & space", [
      c.range("Corner radius", d.theme.radius, 0, 28, (v) => S().update((x) => { x.theme.radius = v; }), "px"),
      c.range("Section spacing", d.theme.spacing, 0, 32, (v) => S().update((x) => { x.theme.spacing = v; }), "px"),
    ]));
    return root;
  }

  // ---- Sections ----
  function panelSections(d) {
    const c = C();
    const root = c.el("div");
    const g = c.group("Order & visibility", [], "Drag to reorder, or use the arrows. Hidden sections stay saved.");
    const list = c.el("div");
    list.style.display = "grid";
    list.style.gap = "8px";
    d.layout.order.forEach((id, i) => {
      const item = c.el("div", "ed-order-item");
      item.draggable = true;
      item.dataset.id = id;
      item.innerHTML = `<span class="grip">${window.Icons.gripVertical}</span><span class="name">${SECTION_NAMES[id] || id}</span>`;
      const up = miniBtn(window.Icons.chevronUp, () => moveSection(i, -1), false, i === 0);
      const down = miniBtn(window.Icons.chevronDown, () => moveSection(i, 1), false, i === d.layout.order.length - 1);
      const visLabel = c.el("label", "switch");
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = d.layout.visibility[id] !== false;
      chk.setAttribute("aria-label", `Show ${id} section`);
      chk.addEventListener("change", () => { S().update((x) => { x.layout.visibility[id] = chk.checked; }); });
      visLabel.appendChild(chk);
      visLabel.appendChild(c.el("span", "track"));
      item.appendChild(up);
      item.appendChild(down);
      item.appendChild(visLabel);
      item.addEventListener("dragstart", (e) => { item.classList.add("dragging"); e.dataTransfer.setData("text/plain", id); });
      item.addEventListener("dragend", () => item.classList.remove("dragging"));
      item.addEventListener("dragover", (e) => e.preventDefault());
      item.addEventListener("drop", (e) => {
        e.preventDefault();
        const from = d.layout.order.indexOf(e.dataTransfer.getData("text/plain"));
        const to = d.layout.order.indexOf(id);
        if (from < 0 || to < 0 || from === to) return;
        S().update((x) => { const [m] = x.layout.order.splice(from, 1); x.layout.order.splice(to, 0, m); });
        refresh();
      });
      list.appendChild(item);
    });
    g.appendChild(list);
    root.appendChild(g);
    root.appendChild(c.group("Navigation labels", [
      hint("These labels appear in the top navigation."),
      ...d.nav.links.map((l, i) => rowOf([
        c.text(`Label ${i + 1}`, l.label, (v) => S().update((x) => { x.nav.links[i].label = v; })),
        c.text(`Link ${i + 1}`, l.href, (v) => S().update((x) => { x.nav.links[i].href = v; })),
      ])),
      navButtons(d),
    ]));
    return root;
  }

  function navButtons(d) {
    const c = C();
    const row = c.el("div", "ed-img-row");
    const add = miniBtn("+ Add link", () => { S().update((x) => { x.nav.links.push({ label: "New", href: "#about" }); }); refresh(); });
    const rm = miniBtn("Remove last", () => { S().update((x) => { x.nav.links.pop(); }); refresh(); }, true);
    row.appendChild(add);
    if (d.nav.links.length) row.appendChild(rm);
    return row;
  }

  // ---- Site ----
  function panelSite(d) {
    const c = C();
    const root = c.el("div");
    root.appendChild(c.group("SEO", [
      c.text("Page title", d.site.title, (v) => S().update((x) => { x.site.title = v; })),
      c.text("Meta description", d.site.description, (v) => S().update((x) => { x.site.description = v; }), { multiline: true }),
    ], "Shown in browser tabs and search results."));
    root.appendChild(c.group("Footer", [
      c.text("Footer text", d.footer.text, (v) => S().update((x) => { x.footer.text = v; })),
      c.toggle("Show socials in footer", "", d.footer.showSocials !== false, (v) => S().update((x) => { x.footer.showSocials = v; })),
    ]));
    root.appendChild(c.group("Danger zone", [
      hint("Reset discards all unpublished changes."),
      resetBtn(),
    ]));
    return root;
  }

  // ---- helpers ----
  function rowOf(items) {
    const r = window.EditorControls.el("div", "ed-row");
    items.forEach((i) => r.appendChild(i));
    return r;
  }
  function hint(t) { return window.EditorControls.el("p", "hint", escapeHtml(t)); }
  function miniBtn(label, onClick, danger = false, disabled = false) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ed-mini-btn" + (danger ? " danger" : "");
    b.innerHTML = label;
    b.disabled = !!disabled;
    if (disabled) b.style.opacity = "0.35";
    b.addEventListener("click", onClick);
    return b;
  }
  function moveArr(arr, i, dir, key) {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    S().update((x) => { const [m] = x[key].splice(i, 1); x[key].splice(j, 0, m); });
    refresh();
  }
  function moveSection(i, dir) {
    const j = i + dir;
    S().update((x) => {
      if (j < 0 || j >= x.layout.order.length) return;
      const [m] = x.layout.order.splice(i, 1);
      x.layout.order.splice(j, 0, m);
    });
    refresh();
  }
  function resetBtn() {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ed-mini-btn danger";
    b.textContent = "Reset unpublished changes";
    b.addEventListener("click", () => {
      if (confirm("Discard all unpublished changes?")) { S().resetToPublished(); refresh(); }
    });
    return b;
  }
  function escapeHtml(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  return { build };
})();
