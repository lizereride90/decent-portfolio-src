/* Editor draft state: undo/redo stacks, dirty tracking, live re-render. */
window.EditorState = (() => {
  const MAX_HISTORY = 60;
  let draft = null;
  let published = null;
  let undoStack = [];
  let redoStack = [];
  let dirty = false;
  let listeners = new Set();
  let saveTimer = null;

  const clone = (o) => structuredClone(o);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  function init(data) {
    published = clone(data);
    draft = clone(data);
    undoStack = [];
    redoStack = [];
    dirty = false;
    emit();
  }

  function get() { return draft; }

  // Mutate the draft, push history, re-render live.
  function update(mutator, opts = {}) {
    if (!draft) return;
    const before = clone(draft);
    mutator(draft);
    if (same(before, draft)) return;
    if (!opts.skipHistory) {
      undoStack.push(before);
      if (undoStack.length > MAX_HISTORY) undoStack.shift();
      redoStack = [];
    }
    dirty = !same(draft, published);
    applyLive();
    emit();
  }

  // Replace whole draft (undo/redo/reset).
  function replace(next, pushHistory = true) {
    if (!draft) return;
    if (same(draft, next)) return;
    if (pushHistory) {
      undoStack.push(clone(draft));
      if (undoStack.length > MAX_HISTORY) undoStack.shift();
      redoStack = [];
    }
    draft = clone(next);
    dirty = !same(draft, published);
    applyLive();
    emit();
  }

  function undo() {
    if (!undoStack.length) return false;
    redoStack.push(clone(draft));
    draft = undoStack.pop();
    dirty = !same(draft, published);
    applyLive();
    emit();
    return true;
  }

  function redo() {
    if (!redoStack.length) return false;
    undoStack.push(clone(draft));
    draft = redoStack.pop();
    dirty = !same(draft, published);
    applyLive();
    emit();
    return true;
  }

  function canUndo() { return undoStack.length > 0; }
  function canRedo() { return redoStack.length > 0; }
  function isDirty() { return dirty; }

  function applyLive() {
    // Instant preview without reload.
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { window.PortfolioRender.render(draft); } catch { /* keep editor alive */ }
    }, 60);
  }

  function markSaved(serverData) {
    published = clone(draft);
    if (serverData && serverData.updatedAt) draft.updatedAt = serverData.updatedAt;
    published = clone(draft);
    dirty = false;
    emit();
  }

  function resetToPublished() {
    replace(clone(published));
  }

  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function emit() {
    const s = { dirty, canUndo: canUndo(), canRedo: canRedo() };
    listeners.forEach((fn) => { try { fn(s); } catch {} });
  }

  return { init, get, update, replace, undo, redo, canUndo, canRedo, isDirty, markSaved, resetToPublished, onChange };
})();
