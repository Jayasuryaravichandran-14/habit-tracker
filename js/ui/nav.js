// ============================================================
// ui/nav.js — Bottom navigation bar and page switching
// ============================================================

import * as state from '../state.js';
import { updateRoutinesNavBadge, updateLogCompleteBadge } from './badges.js';

const PAGE_ORDER = ['home', 'routines', 'log', 'analytics', 'settings'];

const NAV_ITEMS = [
  { id: 'home',      icon: '🏠', label: 'Home' },
  { id: 'routines',  icon: '✅', label: 'Routines' },
  { id: 'log',       icon: '📝', label: 'Daily Log' },
  { id: 'analytics', icon: '📊', label: 'Analytics' },
  { id: 'settings',  icon: '⚙️',  label: 'Settings' },
];

export function initNav(){
  const nav = document.getElementById('bottom-nav');
  if(!nav) return;
  nav.innerHTML = NAV_ITEMS.map(item => `
    <div class="nav-item ${item.id === 'home' ? 'active' : ''}"
         id="nav-${item.id}"
         role="button" tabindex="0"
         onclick="import('./js/ui/nav.js').then(m=>m.navigateTo('${item.id}'))"
         aria-label="${item.label}" style="position:relative">
      <div class="nav-icon">${item.icon}</div>
      <div class="nav-label">${item.label}</div>
    </div>`).join('');
  updateRoutinesNavBadge();
  updateLogCompleteBadge();
}

export function navigateTo(id){
  const prevIdx = PAGE_ORDER.indexOf(state.currentPage);
  const nextIdx = PAGE_ORDER.indexOf(id);
  if(prevIdx === nextIdx) return;

  // Animate pages
  document.querySelectorAll('.page').forEach(p =>
    p.classList.remove('active', 'slide-l', 'slide-r'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById('page-' + id);
  if(pageEl){
    pageEl.classList.add('active');
    if(prevIdx !== -1 && nextIdx !== -1){
      pageEl.classList.add(nextIdx > prevIdx ? 'slide-l' : 'slide-r');
    }
  }

  const navEl = document.getElementById('nav-' + id);
  if(navEl) navEl.classList.add('active');

  document.getElementById('main')?.scrollTo(0, 0);
  state.setCurrentPage(id);

  // Update date nav labels for pages that have one
  ['home','routines','log'].forEach(p => updateDateNav(p));

  // Render the newly-active page
  switch(id){
    case 'home':
      import('../renders/home.js').then(m => m.renderHome()); break;
    case 'routines':
      import('../renders/routines.js').then(m => m.renderRoutines()); break;
    case 'log':
      import('../renders/log.js').then(m => m.renderLog()); break;
    case 'analytics':
      import('../renders/analytics.js').then(m => m.renderAnalytics()); break;
    case 'settings':
      import('../renders/settings.js').then(m => m.renderSettings()); break;
  }
}

export function updateDateNav(page){
  const offset = state.pageDate[page] || 0;
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const label = document.getElementById(page + '-date-label');
  const fwdBtn = document.getElementById(page + '-nav-fwd');
  if(label) label.textContent = offset === 0
    ? 'Today'
    : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  if(fwdBtn) fwdBtn.disabled = offset >= 0;
}

export function shiftDate(page, delta){
  state.pageDate[page] = Math.min(0, (state.pageDate[page] || 0) + delta);
  updateDateNav(page);
  switch(page){
    case 'home':      import('../renders/home.js').then(m => m.renderHome()); break;
    case 'routines':  import('../renders/routines.js').then(m => m.renderRoutines()); break;
    case 'log':       import('../renders/log.js').then(m => m.renderLog()); break;
  }
}
