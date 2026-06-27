// ============================================================
// ui/gestures.js — Swipe, pull-to-refresh, scroll collapse
// ============================================================

import * as state from '../state.js';
import { showSnackbar } from './snackbar.js';

export function initScrollCollapse(){
  const main   = document.getElementById('main');
  const topbar = document.querySelector('.topbar');
  if(!main || !topbar) return;
  main.addEventListener('scroll', () => {
    if(main.scrollTop > 60) topbar.classList.add('compact');
    else                     topbar.classList.remove('compact');
  }, { passive: true });
}

export function initPullToRefresh(){
  const main = document.getElementById('main');
  if(!main) return;
  let startY = 0, pulling = false, exceededThreshold = false;

  main.addEventListener('touchstart', e => {
    if(e.target.closest('button,input,select,textarea,a,[onclick],.habit-item,.drag-handle')) return;
    if(main.scrollTop === 0){
      startY = e.touches[0].clientY;
      pulling = true;
      exceededThreshold = false;
    }
  }, { passive: true });

  main.addEventListener('touchmove', e => {
    if(!pulling) return;
    if(e.touches[0].clientY - startY > 80){
      exceededThreshold = true;
      main.style.transition = 'transform .2s';
      main.style.transform  = 'translateY(40px)';
    }
  }, { passive: true });

  main.addEventListener('touchend', () => {
    main.style.transform  = '';
    main.style.transition = '';
    if(pulling && exceededThreshold){
      import('../renders/home.js').then(m => m.renderHome());
      showSnackbar('🔄 Refreshed');
    }
    pulling = false;
    exceededThreshold = false;
  });
}

export function initSwipeNavigation(){
  const main = document.getElementById('main');
  if(!main) return;
  const PAGE_ORDER = ['home','routines','log','analytics','settings'];
  let touchStartX = 0, touchStartY = 0;

  main.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  main.addEventListener('touchend', e => {
    if(!['home','routines','log','analytics'].includes(state.currentPage)) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if(Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx) * 0.7) return;
    const cur = PAGE_ORDER.indexOf(state.currentPage);
    if(dx < 0 && cur < PAGE_ORDER.length - 1){
      import('./nav.js').then(m => m.navigateTo(PAGE_ORDER[cur + 1]));
      flashSwipe(dx);
    } else if(dx > 0 && cur > 0){
      import('./nav.js').then(m => m.navigateTo(PAGE_ORDER[cur - 1]));
      flashSwipe(dx);
    }
  }, { passive: true });
}

function flashSwipe(dx){
  const main = document.getElementById('main');
  if(!main) return;
  main.style.transition = 'transform 0.15s';
  main.style.transform  = `translateX(${dx > 0 ? 30 : -30}px)`;
  setTimeout(() => {
    main.style.transition = 'transform 0.15s';
    main.style.transform  = '';
    setTimeout(() => { main.style.transition = ''; }, 150);
  }, 80);
}
