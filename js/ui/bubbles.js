// ============================================================
// ui/bubbles.js — Animated background bubbles
// ============================================================

export function initBgBubbles(){
  const container = document.getElementById('bg-bubbles');
  if(!container) return;
  container.innerHTML = '';
  const colors = ['var(--accent)','var(--accent2)','var(--accent3)','var(--accent4)','var(--accent5)'];
  for(let i = 0; i < 7; i++){
    const el = document.createElement('div');
    el.className = 'bg-bubble';
    const size = 40 + Math.random() * 80;
    el.style.cssText = `
      width:${size}px;height:${size}px;
      background:${colors[i % colors.length]};
      left:${Math.random() * 90}%;
      animation-duration:${12 + Math.random() * 18}s;
      animation-delay:${Math.random() * 10}s;
      opacity:0;
    `;
    container.appendChild(el);
  }
}
