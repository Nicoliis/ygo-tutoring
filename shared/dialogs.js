/*
 * In-page replacements for window.alert / confirm / prompt. Promise-based, self-contained
 * (own markup + styles, no #modalRoot needed). Escape or a backdrop click cancels.
 *   confirmDialog(message, { title, confirmLabel, cancelLabel }) -> Promise<boolean>
 *   alertDialog(message, { title, okLabel })                     -> Promise<void>
 *   promptDialog(message, defaultValue, { title, confirmLabel }) -> Promise<string|null>
 */
(function installDialogs() {
  const STYLE_ID = "appDialogStyles";

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .app-dialog-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
      .app-dialog { background: var(--panel); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; max-width: 420px; width: 100%; max-height: 85vh; overflow-y: auto; }
      .app-dialog h2 { margin: 0 0 10px; font-size: 1rem; }
      .app-dialog-body { font-size: .88rem; color: var(--text-dim); margin-bottom: 14px; white-space: pre-line; }
      .app-dialog-input { width: 100%; box-sizing: border-box; margin-top: 10px; }
      .app-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }`;
    document.head.appendChild(style);
  }

  function focusables(container) {
    return Array.from(container.querySelectorAll("button, input"));
  }

  /* kind: "alert" | "confirm" | "prompt". Resolves with the result of the chosen action. */
  function openDialog({ title, message, kind, confirmLabel, cancelLabel, defaultValue }) {
    ensureStyles();
    return new Promise((resolve) => {
      const previouslyFocused = document.activeElement;
      const backdrop = document.createElement("div");
      backdrop.className = "app-dialog-backdrop";
      const dialog = document.createElement("div");
      dialog.className = "app-dialog";
      dialog.setAttribute("role", kind === "alert" ? "alertdialog" : "dialog");
      dialog.setAttribute("aria-modal", "true");

      const heading = document.createElement("h2");
      heading.textContent = title;
      const body = document.createElement("div");
      body.className = "app-dialog-body";
      body.textContent = message;
      const actions = document.createElement("div");
      actions.className = "app-dialog-actions";

      let input = null;
      if (kind === "prompt") {
        input = document.createElement("input");
        input.type = "text";
        input.className = "search-input app-dialog-input";
        input.value = defaultValue || "";
        input.setAttribute("aria-label", message);
        body.appendChild(input);
      }

      function finish(value) {
        document.removeEventListener("keydown", onKeydown, true);
        backdrop.remove();
        if (previouslyFocused && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
        resolve(value);
      }
      const cancelValue = kind === "confirm" ? false : null;
      const okValue = () => (kind === "confirm" ? true : kind === "prompt" ? input.value : undefined);

      function addButton(label, primary, onClick) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn " + (primary ? "btn-primary" : "btn-secondary");
        btn.textContent = label;
        btn.addEventListener("click", onClick);
        actions.appendChild(btn);
      }
      if (kind !== "alert") addButton(cancelLabel, false, () => finish(cancelValue));
      addButton(confirmLabel, true, () => finish(okValue()));

      function onKeydown(e) {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          finish(kind === "alert" ? undefined : cancelValue);
        } else if (e.key === "Enter" && input && document.activeElement === input) {
          e.preventDefault();
          finish(input.value);
        } else if (e.key === "Tab") {
          const items = focusables(dialog);
          const first = items[0];
          const last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
      backdrop.addEventListener("mousedown", (e) => {
        if (e.target === backdrop) finish(kind === "alert" ? undefined : cancelValue);
      });
      document.addEventListener("keydown", onKeydown, true);

      dialog.append(heading, body, actions);
      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);
      if (input) {
        input.focus();
        input.select();
      } else {
        actions.lastElementChild.focus();
      }
    });
  }

  window.confirmDialog = (message, opts = {}) =>
    openDialog({ kind: "confirm", message, title: opts.title || "Please confirm", confirmLabel: opts.confirmLabel || "Confirm", cancelLabel: opts.cancelLabel || "Cancel" });
  window.alertDialog = (message, opts = {}) =>
    openDialog({ kind: "alert", message, title: opts.title || "Notice", confirmLabel: opts.okLabel || "OK" });
  window.promptDialog = (message, defaultValue, opts = {}) =>
    openDialog({ kind: "prompt", message, defaultValue, title: opts.title || "Enter a value", confirmLabel: opts.confirmLabel || "Save", cancelLabel: opts.cancelLabel || "Cancel" });
})();
