/* Form control factories for the editor. Every control calls onChange(newValue). */
window.EditorControls = (() => {
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function field(label, input) {
    const w = el("div", "ed-field");
    const l = document.createElement("label");
    l.textContent = label;
    w.appendChild(l);
    w.appendChild(input);
    return w;
  }

  function text(label, value, onChange, opts = {}) {
    const input = document.createElement(opts.multiline ? "textarea" : "input");
    if (!opts.multiline) input.type = opts.type || "text";
    if (opts.placeholder) input.placeholder = opts.placeholder;
    input.value = value ?? "";
    input.addEventListener("input", () => onChange(input.value));
    return field(label, input);
  }

  function color(label, value, onChange) {
    const w = el("div", "ed-field");
    const l = document.createElement("label");
    l.textContent = label;
    const row = el("div", "ed-color-row");
    const input = document.createElement("input");
    input.type = "color";
    input.value = /^#[0-9a-fA-F]{6}$/.test(value || "") ? value : "#6c7bff";
    const code = document.createElement("code");
    code.textContent = input.value;
    input.addEventListener("input", () => { code.textContent = input.value; onChange(input.value); });
    row.appendChild(input);
    row.appendChild(code);
    w.appendChild(l);
    w.appendChild(row);
    return w;
  }

  function range(label, value, min, max, onChange, unit = "") {
    const w = el("div", "ed-field");
    const l = document.createElement("label");
    l.textContent = label;
    const row = el("div", "ed-range-row");
    const input = document.createElement("input");
    input.type = "range";
    input.min = min; input.max = max; input.value = value;
    const out = document.createElement("output");
    out.textContent = `${value}${unit}`;
    input.addEventListener("input", () => { out.textContent = `${input.value}${unit}`; onChange(Number(input.value)); });
    row.appendChild(input);
    row.appendChild(out);
    w.appendChild(l);
    w.appendChild(row);
    return w;
  }

  function toggle(label, sub, checked, onChange) {
    const w = el("div", "ed-toggle");
    const txt = el("div", "", `<span class="t-label">${label}</span>${sub ? `<span class="t-sub">${sub}</span>` : ""}`);
    const sw = el("label", "switch");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!checked;
    const track = el("span", "track");
    input.addEventListener("change", () => onChange(input.checked));
    sw.appendChild(input);
    sw.appendChild(track);
    w.appendChild(txt);
    w.appendChild(sw);
    return w;
  }

  function select(label, value, options, onChange) {
    const s = document.createElement("select");
    for (const o of options) {
      const opt = document.createElement("option");
      opt.value = o.value ?? o;
      opt.textContent = o.label ?? o;
      if (String(opt.value) === String(value)) opt.selected = true;
      s.appendChild(opt);
    }
    s.addEventListener("change", () => onChange(s.value));
    return field(label, s);
  }

  function group(title, children = [], hint = "") {
    const g = el("div", "ed-group");
    const h = document.createElement("h3");
    h.textContent = title;
    g.appendChild(h);
    if (hint) { const p = el("p", "hint", hint); g.appendChild(p); }
    for (const c of children) g.appendChild(c);
    return g;
  }

  // Image: URL field + file upload (client-side resize → data URL) + preview.
  // Updates its own preview in place so typing never loses focus.
  function image(label, value, onChange) {
    const w = el("div", "ed-field");
    const l = document.createElement("label");
    l.textContent = label;
    w.appendChild(l);
    let preview = null;
    const showPreview = (src) => {
      if (src && !preview) {
        preview = document.createElement("img");
        preview.className = "ed-img-preview";
        preview.alt = "preview";
        w.insertBefore(preview, url);
      }
      if (!src && preview) { preview.remove(); preview = null; return; }
      if (preview && src) preview.src = src;
    };
    if (value) {
      preview = document.createElement("img");
      preview.className = "ed-img-preview";
      preview.src = value;
      preview.alt = "preview";
      w.appendChild(preview);
    }
    const url = document.createElement("input");
    url.type = "url";
    url.placeholder = "https://… or upload a file below";
    url.value = value && !value.startsWith("data:") ? value : "";
    const set = (v) => { showPreview(v); syncClear(v); onChange(v); };
    url.addEventListener("input", () => set(url.value.trim()));
    w.appendChild(url);
    const handleFile = async (f) => {
      if (!f) return;
      if (!f.type.startsWith("image/")) { alert("Please choose an image file (JPG, PNG, WebP…)."); return; }
      try {
        const dataUrl = await fileToDataUrl(f);
        url.value = "";
        set(dataUrl);
      } catch {
        alert("Could not read that image. Try a JPG or PNG under 5MB.");
      }
    };
    const row = el("div", "ed-img-row");
    const file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*";
    file.style.cssText = "font-size:.8rem;color:var(--muted)";
    file.addEventListener("change", () => { handleFile(file.files[0]); file.value = ""; });
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "ed-mini-btn danger";
    clear.textContent = "Remove";
    clear.style.display = value ? "" : "none";
    const syncClear = (v) => { clear.style.display = v ? "" : "none"; };
    clear.addEventListener("click", () => { url.value = ""; set(""); });
    row.appendChild(file);
    row.appendChild(clear);
    w.appendChild(row);
    // Drag & drop an image file anywhere on this field (desktop).
    const dropHint = el("p", "hint", "Tip: paste an image URL, upload a file, or drag & drop an image here.");
    w.appendChild(dropHint);
    ["dragenter", "dragover"].forEach((ev) => w.addEventListener(ev, (e) => { e.preventDefault(); w.classList.add("dragging"); }));
    ["dragleave", "drop"].forEach((ev) => w.addEventListener(ev, (e) => { e.preventDefault(); w.classList.remove("dragging"); }));
    w.addEventListener("drop", (e) => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      handleFile(f);
    });
    return w;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (file.size > 6 * 1024 * 1024) { reject(new Error("too big")); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 1200;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const cw = Math.round(img.width * scale);
          const ch = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = cw; canvas.height = ch;
          canvas.getContext("2d").drawImage(img, 0, 0, cw, ch);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return { el, field, text, color, range, toggle, select, group, image };
})();
