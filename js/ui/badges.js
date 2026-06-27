// ============================================================
// ui/badges.js — Navigation badge counters
// ============================================================

import { habitLog, LOG_TRACKERS, dailyLog } from '../state.js';
import { todayStr, getTodayHabits, getPageDateStr } from '../helpers.js';

export function updateRoutinesNavBadge(){
  const td = todayStr();
  const allH = getTodayHabits();
  const undone = allH.filter(h => !habitLog[td]?.[h.id]?.done).length;
  const navItem = document.querySelectorAll('.nav-item')[1];
  if(!navItem) return;
  let badge = navItem.querySelector('.nav-badge');
  if(undone > 0){
    if(!badge){
      badge = document.createElement('div');
      badge.className = 'nav-badge';
      navItem.appendChild(badge);
    }
    badge.textContent = undone > 99 ? '99+' : undone;
  } else if(badge){
    badge.remove();
  }
}

export function updateLogCompleteBadge(){
  const td = getPageDateStr('log');
  const dLog = dailyLog[td] || {};
  const total = LOG_TRACKERS.length;
  const filled = LOG_TRACKERS.filter(t =>
    dLog[t.id] != null && dLog[t.id] !== '' && dLog[t.id] !== false
  ).length;
  const navItem = document.querySelectorAll('.nav-item')[2];
  if(!navItem) return;
  let badge = navItem.querySelector('.log-complete-badge');
  if(filled === total && total > 0){
    if(!badge){
      badge = document.createElement('div');
      badge.className = 'log-complete-badge';
      navItem.appendChild(badge);
    }
    badge.textContent = '✓ All';
  } else if(badge){
    badge.remove();
  }
}
