function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
  );
}

function trapTabKey(e, container) {
  const focusable = getFocusableElements(container);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
