// ============================================================
// renders/settings.js — Settings page render
// ============================================================

import * as state from '../state.js';
import { escapeHTML } from '../helpers.js';
import { saveData, gatherAllData, applyAllData } from '../storage.js';
import { validateImportData } from '../helpers.js';
import { renderThemePicker, renderAccentPicker } from '../ui/theme.js';
import { showSnackbar } from '../ui/snackbar.js';

export function renderSettings(){
  renderAccountSection();
  renderThemePicker('theme-picker-container');
  renderAccentPicker('accent-picker-container');
  renderProfileForm();
  renderWorkoutSettings();
  renderTrackerSettings();
  renderDataManagement();
}

export function renderAccountSection(){
  const el = document.getElementById('account-section');
  if(!el) return;
  const u = state.currentUser;
  if(!u){ el.innerHTML = ''; return; }
  const isAnon = u.isAnonymous;
  el.innerHTML = `
    <div class="settings-card">
      <h3>Account</h3>
      ${isAnon
        ? `<p class="warn-msg">⚠️ You're using a guest account. Your data may be lost if you clear your browser.</p>
           <button class="btn btn-primary btn-sm" onclick="import('./js/auth.js').then(m=>m.openUpgradeAccountPrompt())">Save My Data →</button>`
        : `<p>✅ Signed in as <strong>${escapeHTML(u.email || u.displayName || 'Google account')}</strong></p>`
      }
      <button class="btn btn-ghost btn-sm btn-block mt-8" onclick="import('./js/auth.js').then(m=>m.signOutUser())">Sign Out</button>
    </div>`;
}

function renderProfileForm(){
  const el = document.getElementById('profile-form');
  if(!el) return;
  el.innerHTML = `
    <div class="settings-card">
      <h3>Profile</h3>
      <label class="form-label">Your name
        <input class="form-input" id="settings-name" value="${escapeHTML(state.settings.name||'')}"
               onchange="import('./js/renders/settings.js').then(m=>m.saveProfile())">
      </label>
      <label class="form-label">Your goal
        <input class="form-input" id="settings-goal" value="${escapeHTML(state.settings.goal||'')}"
               placeholder="e.g. Build better daily habits"
               onchange="import('./js/renders/settings.js').then(m=>m.saveProfile())">
      </label>
    </div>`;
}

export function saveProfile(){
  const name = document.getElementById('settings-name')?.value?.trim();
  const goal = document.getElementById('settings-goal')?.value?.trim();
  if(name !== undefined) state.settings.name = name;
  if(goal !== undefined) state.settings.goal = goal;
  saveData();
}

function renderWorkoutSettings(){
  const el = document.getElementById('workout-settings');
  if(!el) return;
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  el.innerHTML = `
    <div class="settings-card">
      <h3>Workout Template</h3>
      <p class="settings-sub">Set your default workout for each day of the week.</p>
      ${days.map(day => {
        const w = state.workoutTemplate[day];
        return `
          <div class="workout-day-row">
            <span class="workout-day-label">${day}</span>
            <span class="workout-day-name">${escapeHTML(w?.name || 'Rest')}</span>
            <button class="btn-icon" onclick="import('./js/ui/modals.js').then(m=>m.openWorkoutTemplateModal('${day}'))">✏️</button>
          </div>`;
      }).join('')}
    </div>`;
}

function renderTrackerSettings(){
  const el = document.getElementById('tracker-settings');
  if(!el) return;
  el.innerHTML = `
    <div class="settings-card">
      <h3>Daily Log Trackers</h3>
      <div class="tracker-list">
        ${state.LOG_TRACKERS.map((t,i) => `
          <div class="tracker-row">
            <span>${escapeHTML(t.icon||'')} ${escapeHTML(t.label)}</span>
            <div class="tracker-actions">
              <button class="btn-icon" onclick="import('./js/ui/modals.js').then(m=>m.openTrackerModal('${escapeHTML(t.id)}'))">✏️</button>
              <button class="btn-icon" onclick="import('./js/renders/settings.js').then(m=>m.deleteTracker('${escapeHTML(t.id)}'))">🗑️</button>
            </div>
          </div>`).join('')}
      </div>
      <button class="btn btn-outline btn-sm mt-8" onclick="import('./js/ui/modals.js').then(m=>m.openTrackerModal(null))">+ Add Tracker</button>
    </div>`;
}

export function deleteTracker(trackerId){
  const idx = state.LOG_TRACKERS.findIndex(t => t.id === trackerId);
  if(idx < 0) return;
  const removed = state.LOG_TRACKERS.splice(idx, 1)[0];
  state.setFullResyncNeeded(true);
  saveData();
  renderTrackerSettings();
  showSnackbar(`Deleted tracker "${removed.label}"`, () => {
    state.LOG_TRACKERS.splice(idx, 0, removed);
    state.setFullResyncNeeded(true);
    saveData();
    renderTrackerSettings();
  });
}

function renderDataManagement(){
  const el = document.getElementById('data-management');
  if(!el) return;
  el.innerHTML = `
    <div class="settings-card">
      <h3>Data</h3>
      <button class="btn btn-outline btn-sm btn-block" onclick="import('./js/renders/settings.js').then(m=>m.exportData())">⬇️ Export Backup</button>
      <button class="btn btn-outline btn-sm btn-block mt-8" onclick="document.getElementById('import-file').click()">⬆️ Import Backup</button>
      <input type="file" id="import-file" accept=".json" style="display:none"
             onchange="import('./js/renders/settings.js').then(m=>m.importJSON(this))">
      <hr class="divider">
      <button class="btn btn-danger btn-sm btn-block" onclick="import('./js/renders/settings.js').then(m=>m.confirmReset())">⚠️ Reset All Data</button>
    </div>`;
}

export function exportData(){
  const data = gatherAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `habittrack-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const data = JSON.parse(e.target.result);
      const errors = validateImportData(data);
      if(errors.length){ showSnackbar('Import failed: ' + errors[0]); return; }
      applyAllData(data);
      state.setFullResyncNeeded(true);
      saveData();
      import('./home.js').then(m => m.renderHome());
      renderSettings();
      showSnackbar('✅ Data imported successfully!');
    }catch(err){
      showSnackbar('Import failed: Invalid JSON file.');
    }
  };
  reader.readAsText(file);
  input.value = '';
}

export function confirmReset(){
  if(!confirm('This will delete ALL your habits, logs, and settings. Are you sure?')) return;
  if(!confirm('This cannot be undone. Confirm reset?')) return;
  import('../habits.js').then(m => m.resetAll());
}
