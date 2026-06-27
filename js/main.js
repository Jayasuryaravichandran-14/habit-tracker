// ============================================================
// main.js — App entry point
// ============================================================
// Boot order:
//   1. Firebase init (firebase.js) — must be first
//   2. Load theme from localStorage for correct first paint
//   3. Load data from localStorage (offline fallback seed)
//   4. Show skeleton in home content areas
//   5. Init auth — onAuthStateChanged triggers Firestore listeners
//      which call onFirstFirestoreSnapshotReceived → renderHome()
//   6. Init UI chrome (nav, pull-to-refresh, a11y, sound toggle)
// ============================================================

import './firebase.js';

import { loadData }        from './storage.js';
import { applyTheme, initAutoTheme } from './ui/theme.js';
import { initAuth }        from './auth.js';
import { initNav }         from './ui/nav.js';
import { initPullToRefresh, initScrollCollapse } from './ui/gestures.js';
import { initBgBubbles }   from './ui/bubbles.js';
import { a11yPatchClickableDivs } from './ui/a11y.js';
import { updateRoutinesNavBadge, updateLogCompleteBadge } from './ui/badges.js';
import { checkBackupReminder } from './ui/backup-reminder.js';
import { showSkeleton }    from './ui/skeleton.js';
import { soundOn }         from './state.js';
import { registerServiceWorker } from './sw-register.js';

// 1. Load data + apply theme for first paint
loadData();
const savedTheme = localStorage.getItem('ht3-theme') || 'goofy';
applyTheme(savedTheme, false);
const savedAccent = localStorage.getItem('ht3-accent');
if(savedAccent) document.documentElement.style.setProperty('--accent2', savedAccent);

// 2. Visual init
initAutoTheme();
initBgBubbles();

// 3. Show skeleton in home content while Firestore loads
showSkeleton('routine-list');
showSkeleton('dash-prog-bars');

// 4. Auth init — triggers Firestore listeners → render on first snapshot
initAuth();

// 5. UI chrome
initNav();
a11yPatchClickableDivs();
initScrollCollapse();
initPullToRefresh();
updateRoutinesNavBadge();
updateLogCompleteBadge();
checkBackupReminder();

const soundBtn = document.getElementById('sound-toggle-btn');
if(soundBtn) soundBtn.textContent = soundOn ? '🔊 Sound On' : '🔇 Sound Off';

// 6. Service worker (PWA offline + update notifications)
registerServiceWorker();
