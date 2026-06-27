// ============================================================
// ui/skeleton.js — Skeleton loader helper
// ============================================================

export function showSkeleton(containerId, rows = 4){
  const el = document.getElementById(containerId);
  if(!el) return;
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      ${Array(rows).fill(`
        <div style="height:48px;border-radius:10px;
             background:linear-gradient(90deg,var(--surface2),var(--surface3),var(--surface2));
             background-size:200% 100%;
             animation:skel 1.2s infinite"></div>
      `).join('')}
    </div>`;
}

// Ensure keyframes exist in DOM (injected once)
if(!document.getElementById('skel-keyframes')){
  const style = document.createElement('style');
  style.id = 'skel-keyframes';
  style.textContent = `@keyframes skel{0%{background-position:200% 0}100%{background-position:-200% 0}}`;
  document.head.appendChild(style);
}
