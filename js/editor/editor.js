/* Editor shell: open/close, topbar, tabs, publish, preview modes, logout. */
window.PortfolioEditor = (() => {
  const TABS = [
    { id: "content", label: "Content" },
    { id: "projects", label: "Projects" },
    { id: "career", label: "Career" },
    { id: "design", label: "Design" },
    { id: "sections", label: "Sections" },
    { id: "site", label: "Site" },
  ];
  let activeTab = "content";
  let built = false;
  let els = {};
  let unsub = null;
  let lastBackend = "";

  function isOpen() {
    return !document.getElementById("editorRoot").hidden;
  }

  async function open() {
    // Gate: verify session server-side before showing anything.
    let session = { authenticated: false };
    try { session = await window.PortfolioAPI.checkSession(); } catch { session = { authenticated: false }; }
    if (!session.authenticated) {
      window.__openLogin?.();
      return;
    }
    const root = document.getElementById("editorRoot");
    root.hidden = false;
    document.body.classList.add("editor-open");
    if (!built) buildShell();
    const data = window.EditorState.get() || window.__getPortfolio() || window.DEFAULT_PORTFOLIO;
    if (!window.EditorState.get()) window.EditorState.init(structuredClone(data));
    subscribe();
    refreshPanel();
    updateChrome();
  }

  function close() {
    document.getElementById("editorRoot").hidden = true;
    document.body.classList.remove("editor-open", "editing-preview", "preview-mobile");
    if (unsub) { unsub(); unsub = null; }
  }

  function subscribe() {
    if (unsub) unsub();
    unsub = window.EditorState.onChange(updateChrome);
  }

  function buildShell() {
    const root = document.getElementById("editorRoot");
    root.innerHTML = "";
    const scrim = document.createElement("div");
    scrim.className = "ed-scrim";
    const panel = document.createElement("div");
    panel.className = "ed-panel";
    panel.id = "edPanel";

    // Topbar
    const top = document.createElement("div");
    top.className = "ed-topbar";
    const I = window.Icons;
    top.innerHTML = `
      <span class="ed-title"><span class="dot" id="edDot"></span><span id="edSaveLabel" class="ed-save-label">Saved</span></span>
      <button class="icon-btn" id="edUndo" title="Undo" aria-label="Undo">${I.undo2}</button>
      <button class="icon-btn" id="edRedo" title="Redo" aria-label="Redo">${I.redo2}</button>
      <button class="ed-ghost-btn with-icon" id="edDevice" title="Toggle mobile preview">${I.smartphone}</button>
      <button class="ed-ghost-btn with-icon" id="edPreview" title="Preview without panel">${I.eye}<span>Preview</span></button>
      <button class="ed-publish" id="edPublish">Publish</button>
      <button class="icon-btn" id="edClose" aria-label="Close editor">${I.x}</button>`;
    const views = document.createElement("div");
    views.className = "ed-viewtoggle";
    views.innerHTML = `<button id="edViewEdit" class="active">${I.pencil}<span>Edit</span></button><button id="edViewPreview">${I.eye}<span>Preview</span></button>`;

    // Tabs
    const tabs = document.createElement("div");
    tabs.className = "ed-tabs";
    tabs.setAttribute("role", "tablist");
    for (const t of TABS) {
      const b = document.createElement("button");
      b.textContent = t.label;
      b.dataset.tab = t.id;
      b.setAttribute("role", "tab");
      b.addEventListener("click", () => { activeTab = t.id; refreshPanel(); });
      tabs.appendChild(b);
    }

    const body = document.createElement("div");
    body.className = "ed-body";
    body.id = "edBody";

    const note = document.createElement("div");
    note.className = "ed-preview-note";
    note.innerHTML = `<p>Previewing the live site. Tap <b>Edit</b> to keep customizing, or <b>Publish</b> to save.</p>`;

    const toast = document.createElement("div");
    toast.className = "ed-toast";
    toast.id = "edToast";

    panel.appendChild(top);
    panel.appendChild(views);
    panel.appendChild(tabs);
    panel.appendChild(body);
    panel.appendChild(note);
    panel.appendChild(toast);
    root.appendChild(scrim);
    root.appendChild(panel);

    els = {
      panel,
      dot: top.querySelector("#edDot"),
      saveLabel: top.querySelector("#edSaveLabel"),
      undo: top.querySelector("#edUndo"),
      redo: top.querySelector("#edRedo"),
      publish: top.querySelector("#edPublish"),
      preview: top.querySelector("#edPreview"),
      device: top.querySelector("#edDevice"),
      close: top.querySelector("#edClose"),
      tabs, body, toast,
      viewEdit: views.querySelector("#edViewEdit"),
      viewPreview: views.querySelector("#edViewPreview"),
    };

    els.undo.addEventListener("click", () => { window.EditorState.undo(); refreshPanel(); });
    els.redo.addEventListener("click", () => { window.EditorState.redo(); refreshPanel(); });
    els.close.addEventListener("click", close);
    els.publish.addEventListener("click", publish);
    els.preview.addEventListener("click", () => panel.classList.toggle("previewing"));
    els.device.addEventListener("click", toggleDevice);
    els.viewEdit.addEventListener("click", () => setMobileView(false));
    els.viewPreview.addEventListener("click", () => setMobileView(true));

    // Footer row: logout + reset live inside body? Put a slim footer.
    const footer = document.createElement("div");
    footer.style.cssText = "padding:10px 14px;border-top:1px solid var(--line);display:flex;gap:8px;";
    footer.innerHTML = `<button class="ed-ghost-btn" id="edLogout">Log out</button>
      <button class="ed-ghost-btn" id="edReset">Reset changes</button>
      <span style="flex:1"></span><span class="ed-save-label">Ctrl+Shift+E to reopen</span>`;
    panel.appendChild(footer);
    footer.querySelector("#edLogout").addEventListener("click", logout);
    footer.querySelector("#edReset").addEventListener("click", () => {
      if (confirm("Discard all unpublished changes?")) { window.EditorState.resetToPublished(); refreshPanel(); toastMsg("Changes reset"); }
    });

    // Keyboard: undo/redo while editor open.
    document.addEventListener("keydown", (e) => {
      if (!isOpen()) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); window.EditorState.undo(); refreshPanel(); }
      if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); window.EditorState.redo(); refreshPanel(); }
    });

    built = true;
  }

  function setMobileView(preview) {
    document.body.classList.toggle("editing-preview", preview);
    els.viewEdit.classList.toggle("active", !preview);
    els.viewPreview.classList.toggle("active", preview);
  }

  function toggleDevice() {
    const on = document.body.classList.toggle("preview-mobile");
    els.device.innerHTML = on ? window.Icons.monitor : window.Icons.smartphone;
    els.device.title = on ? "Switch to desktop preview" : "Switch to mobile preview";
  }

  function refreshPanel() {
    if (!built) return;
    els.tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.tab === activeTab));
    els.body.innerHTML = "";
    els.body.appendChild(window.EditorPanels.build(activeTab));
    updateChrome();
  }

  function updateChrome(state) {
    if (!built) return;
    const st = state || { dirty: window.EditorState.isDirty(), canUndo: window.EditorState.canUndo(), canRedo: window.EditorState.canRedo() };
    els.dot.classList.toggle("dirty", st.dirty);
    els.saveLabel.textContent = st.dirty
      ? "Unsaved changes"
      : lastBackend
        ? `All changes saved · ${lastBackend}`
        : "All changes saved";
    els.undo.disabled = !st.canUndo;
    els.redo.disabled = !st.canRedo;
    els.publish.disabled = false;
    if (els.publish.dataset.busy === "1") els.publish.disabled = true;
  }

  function toastMsg(msg, sticky = false) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(els.toast._t);
    els.toast._t = setTimeout(() => els.toast.classList.remove("show"), sticky ? 6000 : 2200);
  }

  async function publish() {
    els.publish.dataset.busy = "1";
    els.publish.disabled = true;
    els.publish.textContent = "Publishing…";
    els.saveLabel.textContent = "Saving…";
    try {
      const data = window.EditorState.get();
      const res = await window.PortfolioAPI.savePortfolio(data);
      window.EditorState.markSaved(res);
      // Update the canonical copy so reloads match.
      const fresh = structuredClone(window.EditorState.get());
      window.__portfolioData = fresh;
      const backend = res?.storage || "unknown";
      lastBackend = backend;
      if (backend === "netlify-blobs" || backend === "local-file") {
        toastMsg("Published · live now");
        els.saveLabel.textContent = `Published · stored (${backend})`;
      } else {
        // Memory fallback: visible in this tab only, gone on refresh.
        const detail = res?.storageError ? ` (${res.storageError})` : "";
        toastMsg(`WARNING: storage unavailable — changes will vanish on refresh${detail}`, true);
        els.saveLabel.textContent = "NOT persisted (no storage backend)";
      }
    } catch (err) {
      if (err.status === 401) {
        toastMsg("Session expired — please sign in again");
        window.__setAdmin?.(false);
        close();
        window.__openLogin?.();
      } else {
        toastMsg(err.message || "Publish failed");
      }
    } finally {
      els.publish.dataset.busy = "";
      els.publish.disabled = false;
      els.publish.textContent = "Publish";
      updateChrome();
    }
  }

  async function logout() {
    try { await window.PortfolioAPI.logout(); } catch { /* clear UI anyway */ }
    window.__setAdmin?.(false);
    close();
    toastMsgSafe("Signed out");
  }

  function toastMsgSafe(msg) {
    try { toastMsg(msg); } catch { /* shell not built */ }
  }

  return { open, close, isOpen, refreshPanel };
})();
