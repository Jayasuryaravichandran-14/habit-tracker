// ============================================================
// ui/backup-reminder.js — Periodic backup nudge
// ============================================================

import { showSnackbar } from './snackbar.js';

export function checkBackupReminder(){
  const last = parseInt(localStorage.getItem('ht3-lastexport') || '0');
  const daysSince = (Date.now() - last) / 86400000;
  // Only show if user has actual habit data, and delay 5s so it
  // doesn't appear immediately on load and block the UI.
  const hasData = !!localStorage.getItem('ht3-habitlog');
  if(hasData && (!last || daysSince >= 7)){
    setTimeout(() => {
      showSnackbar("💾 Export a backup?");
    }, 5000);
  }
}

export function markBackupExported(){
  localStorage.setItem('ht3-lastexport', String(Date.now()));
}

