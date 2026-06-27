// ============================================================
// ui/backup-reminder.js — Periodic backup nudge
// ============================================================

import { showSnackbar } from './snackbar.js';

export function checkBackupReminder(){
  const last = parseInt(localStorage.getItem('ht3-lastexport') || '0');
  const daysSince = (Date.now() - last) / 86400000;
  if(!last || daysSince >= 7){
    showSnackbar("💾 It's been a while — export a backup?");
  }
}

// Called by settings.js exportData() to update the timestamp
export function markBackupExported(){
  localStorage.setItem('ht3-lastexport', String(Date.now()));
}
