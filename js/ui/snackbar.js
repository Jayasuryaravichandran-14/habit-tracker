// ============================================================
// ui/snackbar.js — Snackbar / toast notifications
// ============================================================

import * as state from '../state.js';

export function showSnackbar(msg, undoFn){
  const sb  = document.getElementById('snackbar');
  const msg_el = document.getElementById('snackbar-msg');
  const btn = document.getElementById('snackbar-undo-btn');
  if(!sb || !msg_el) return;
  msg_el.textContent = msg;
  state.setUndoAction(undoFn || null);
  if(btn){
    btn.style.display = undoFn ? '' : 'none';
    btn.textContent   = 'Undo';
  }
  sb.classList.add('show');
  clearTimeout(state._snackbarTimer);
  state.setSnackbarTimer(setTimeout(() => {
    sb.classList.remove('show');
    state.setUndoAction(null);
  }, 3000));
}

export function showUpdateSnackbar(newWorker){
  const sb  = document.getElementById('snackbar');
  const msg_el = document.getElementById('snackbar-msg');
  const btn = document.getElementById('snackbar-undo-btn');
  if(!sb || !msg_el) return;
  msg_el.textContent = '🔄 App updated!';
  if(btn){
    btn.style.display = '';
    btn.textContent   = 'Reload';
  }
  state.setUndoAction(() => {
    newWorker.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  });
  sb.classList.add('show');
  clearTimeout(state._snackbarTimer);
  // Keep update prompt visible longer
  state.setSnackbarTimer(setTimeout(() => {
    sb.classList.remove('show');
    state.setUndoAction(null);
  }, 10000));
}

export function triggerUndo(){
  if(state._undoAction){
    state._undoAction();
    state.setUndoAction(null);
    const sb = document.getElementById('snackbar');
    if(sb) sb.classList.remove('show');
  }
}
