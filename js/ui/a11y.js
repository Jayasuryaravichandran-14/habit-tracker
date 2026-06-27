// ============================================================
// ui/a11y.js — Accessibility patches
// ============================================================
// Makes div[onclick] elements keyboard-operable without
// rewriting them to <button> elements.
// ============================================================

export function a11yPatchClickableDivs(root){
  (root || document).querySelectorAll('div[onclick]').forEach(el => {
    if(!el.hasAttribute('role'))     el.setAttribute('role', 'button');
    if(!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  });
}

// Enter / Space triggers click on any div[onclick]
document.addEventListener('keydown', e => {
  if((e.key === 'Enter' || e.key === ' ') && e.target.matches('div[onclick]')){
    e.preventDefault();
    e.target.click();
  }
});

// Re-scan after any DOM mutations (covers JS-generated markup)
const _a11yObserver = new MutationObserver(() => a11yPatchClickableDivs());
_a11yObserver.observe(document.body, { childList: true, subtree: true });
