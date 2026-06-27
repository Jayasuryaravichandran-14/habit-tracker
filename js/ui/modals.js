// ============================================================
// ui/modals.js — All modal dialogs
// ============================================================

import * as state from '../state.js';
import { escapeHTML, safeDocId } from '../helpers.js';
import { saveData } from '../storage.js';
import { renderRoutines } from '../renders/routines.js';
import { renderSettings } from '../renders/settings.js';
import { showSnackbar } from './snackbar.js';

// ---- Generic modal shell ----
export function showModal(title, bodyHtml){
  let m = document.getElementById('generic-modal');
  if(!m){
    m = document.createElement('div');
    m.id = 'generic-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9990;padding:20px';
    document.body.appendChild(m);
  }
  m.innerHTML = `
    <div style="background:var(--surface);border:3px solid var(--border);border-radius:16px;
                padding:18px;max-width:400px;max-height:80vh;overflow-y:auto;width:100%">
      <h3 style="margin-bottom:12px">${escapeHTML(title)}</h3>
      ${bodyHtml}
      <div style="text-align:right;margin-top:14px">
        <button class="btn btn-ghost btn-sm" onclick="import('./js/ui/modals.js').then(m=>m.closeModal())">Close</button>
      </div>
    </div>`;
  m.style.display = 'flex';
  m.onclick = e => { if(e.target === m) closeModal(); };
}

export function closeModal(){
  const m = document.getElementById('generic-modal');
  if(m) m.style.display = 'none';
}

// ---- Habit modal ----
export function openHabitModal(habitId, groupId){
  const group = state.ROUTINES.find(g => g.id === groupId);
  if(!group) return;
  const habit = habitId ? group.habits?.find(h => h.id === habitId) : null;
  const title = habit ? 'Edit Habit' : 'Add Habit';

  const freqOptions = [
    { val: 'daily',    label: 'Every day' },
    { val: 'weekdays', label: 'Weekdays only' },
    { val: 'weekends', label: 'Weekends only' },
  ];

  showModal(title, `
    <div style="display:flex;flex-direction:column;gap:10px">
      <label class="form-label">Habit name *
        <input class="form-input" id="habit-name-input" value="${escapeHTML(habit?.name || '')}" placeholder="e.g. Drink water">
      </label>
      <label class="form-label">Description
        <input class="form-input" id="habit-sub-input" value="${escapeHTML(habit?.sub || '')}" placeholder="Optional subtitle">
      </label>
      <div style="display:flex;gap:8px">
        <label class="form-label" style="flex:0 0 80px">Icon
          <input class="form-input" id="habit-icon-input" value="${escapeHTML(habit?.icon || '')}" placeholder="😀" maxlength="4">
        </label>
        <label class="form-label" style="flex:1">Color
          <input type="color" class="form-input" id="habit-color-input" value="${habit?.color || '#7c3aed'}" style="height:38px;padding:2px">
        </label>
      </div>
      <label class="form-label">Frequency
        <select class="form-input" id="habit-freq-input">
          ${freqOptions.map(o => `<option value="${o.val}" ${(habit?.freq || 'daily') === o.val ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </label>
      <label class="form-label">Time of day
        <select class="form-input" id="habit-time-input">
          ${['anytime','morning','afternoon','evening','night'].map(t =>
            `<option value="${t}" ${(habit?.time || 'anytime') === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`
          ).join('')}
        </select>
      </label>
      <button class="btn btn-primary btn-block mt-8"
              onclick="import('./js/ui/modals.js').then(m=>m.saveHabitFromModal('${escapeHTML(habitId || '')}','${escapeHTML(groupId)}'))">
        ${habit ? 'Save Changes' : 'Add Habit'}
      </button>
    </div>`);
}

export function saveHabitFromModal(habitId, groupId){
  const name = document.getElementById('habit-name-input')?.value?.trim();
  if(!name){ showSnackbar('Enter a habit name.'); return; }
  const data = {
    id:    habitId || ('h_' + Date.now()),
    name,
    sub:   document.getElementById('habit-sub-input')?.value?.trim() || '',
    icon:  document.getElementById('habit-icon-input')?.value?.trim() || '',
    color: document.getElementById('habit-color-input')?.value || '',
    freq:  document.getElementById('habit-freq-input')?.value || 'daily',
    time:  document.getElementById('habit-time-input')?.value || 'anytime',
    groupId,
  };
  import('../habits.js').then(m => {
    m.saveHabit(data, groupId);
    closeModal();
  });
}

// ---- Group modal ----
export function openGroupModal(groupId){
  const group = groupId ? state.ROUTINES.find(g => g.id === groupId) : null;
  const title = group ? 'Edit Group' : 'Add Routine Group';
  showModal(title, `
    <div style="display:flex;flex-direction:column;gap:10px">
      <label class="form-label">Group name *
        <input class="form-input" id="group-name-input" value="${escapeHTML(group?.group || '')}" placeholder="e.g. Morning Routine">
      </label>
      <label class="form-label">Color
        <input type="color" class="form-input" id="group-color-input" value="${group?.color || '#7c3aed'}" style="height:38px;padding:2px">
      </label>
      <button class="btn btn-primary btn-block mt-8"
              onclick="import('./js/ui/modals.js').then(m=>m.saveGroupFromModal('${escapeHTML(groupId || '')}'))">
        ${group ? 'Save Changes' : 'Add Group'}
      </button>
    </div>`);
}

export function saveGroupFromModal(groupId){
  const name = document.getElementById('group-name-input')?.value?.trim();
  if(!name){ showSnackbar('Enter a group name.'); return; }
  const data = {
    id:    groupId || ('g_' + Date.now()),
    group: name,
    color: document.getElementById('group-color-input')?.value || 'var(--accent)',
  };
  import('../habits.js').then(m => {
    m.saveGroup(data);
    closeModal();
  });
}

// ---- Tracker modal ----
export function openTrackerModal(trackerId){
  const tracker = trackerId ? state.LOG_TRACKERS.find(t => t.id === trackerId) : null;
  const title = tracker ? 'Edit Tracker' : 'Add Tracker';
  const types = ['stars','number','toggle'];
  showModal(title, `
    <div style="display:flex;flex-direction:column;gap:10px">
      <label class="form-label">Label *
        <input class="form-input" id="tracker-label-input" value="${escapeHTML(tracker?.label || '')}" placeholder="e.g. Energy level">
      </label>
      <div style="display:flex;gap:8px">
        <label class="form-label" style="flex:0 0 80px">Icon
          <input class="form-input" id="tracker-icon-input" value="${escapeHTML(tracker?.icon || '')}" placeholder="⭐" maxlength="4">
        </label>
        <label class="form-label" style="flex:0 0 80px">Unit
          <input class="form-input" id="tracker-unit-input" value="${escapeHTML(tracker?.unit || '')}" placeholder="hrs">
        </label>
      </div>
      <label class="form-label">Type
        <select class="form-input" id="tracker-type-input">
          ${types.map(t => `<option value="${t}" ${(tracker?.type || 'stars') === t ? 'selected' : ''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
        </select>
      </label>
      <div style="display:flex;gap:8px">
        <label class="form-label" style="flex:1">Min / Low
          <input type="number" class="form-input" id="tracker-low-input" value="${tracker?.low ?? 1}" placeholder="1">
        </label>
        <label class="form-label" style="flex:1">Max / High
          <input type="number" class="form-input" id="tracker-max-input" value="${tracker?.max ?? 5}" placeholder="5">
        </label>
      </div>
      <label class="form-label">
        <input type="checkbox" id="tracker-note-input" ${tracker?.note ? 'checked' : ''}> Allow daily note
      </label>
      <button class="btn btn-primary btn-block mt-8"
              onclick="import('./js/ui/modals.js').then(m=>m.saveTrackerFromModal('${escapeHTML(trackerId || '')}'))">
        ${tracker ? 'Save Changes' : 'Add Tracker'}
      </button>
    </div>`);
}

export function saveTrackerFromModal(trackerId){
  const label = document.getElementById('tracker-label-input')?.value?.trim();
  if(!label){ showSnackbar('Enter a tracker label.'); return; }
  const data = {
    id:   trackerId || safeDocId('t_' + label.toLowerCase().replace(/\s+/g,'_') + '_' + Date.now()),
    label,
    icon: document.getElementById('tracker-icon-input')?.value?.trim() || '',
    unit: document.getElementById('tracker-unit-input')?.value?.trim() || '',
    type: document.getElementById('tracker-type-input')?.value || 'stars',
    low:  parseFloat(document.getElementById('tracker-low-input')?.value) || 1,
    max:  parseFloat(document.getElementById('tracker-max-input')?.value) || 5,
    note: document.getElementById('tracker-note-input')?.checked || false,
  };
  const idx = state.LOG_TRACKERS.findIndex(t => t.id === data.id);
  if(idx >= 0) state.LOG_TRACKERS[idx] = { ...state.LOG_TRACKERS[idx], ...data };
  else state.LOG_TRACKERS.push(data);
  state.setFullResyncNeeded(true);
  saveData();
  closeModal();
  renderSettings();
  showSnackbar(trackerId ? 'Tracker updated.' : 'Tracker added.');
}

// ---- Workout modal ----
export function openWorkoutModal(day, mode = 'template'){
  const isOverride = mode === 'override';
  const entry = isOverride
    ? (state.workoutOverrides[day] || null)
    : (state.workoutTemplate[day] || null);
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  showModal(isOverride ? 'Override Today\'s Workout' : 'Edit Workout Template', `
    <div style="display:flex;flex-direction:column;gap:10px">
      ${isOverride
        ? `<label class="form-label">Date
             <input type="date" class="form-input" id="workout-date-input" value="${escapeHTML(day || '')}">
           </label>`
        : `<label class="form-label">Day
             <select class="form-input" id="workout-day-select">
               ${days.map(d => `<option value="${d}" ${day === d ? 'selected' : ''}>${d}</option>`).join('')}
             </select>
           </label>`
      }
      <label class="form-label">Workout name *
        <input class="form-input" id="workout-name-input" value="${escapeHTML(entry?.name || '')}" placeholder="e.g. Upper Body Strength">
      </label>
      <label class="form-label">Focus / goal
        <input class="form-input" id="workout-focus-input" value="${escapeHTML(entry?.focus || '')}" placeholder="e.g. Fat burn + strength">
      </label>
      <label class="form-label">Exercises (one per line)
        <textarea class="form-input" id="workout-exercises-input" rows="5"
                  placeholder="Push-ups 3×15&#10;Dumbbell rows 3×12&#10;...">${escapeHTML((entry?.exercises || []).join('\n'))}</textarea>
      </label>
      <button class="btn btn-primary btn-block"
              onclick="import('./js/ui/modals.js').then(m=>m.saveWorkoutFromModal('${escapeHTML(mode)}'))">
        Save Workout
      </button>
      ${entry ? `<button class="btn btn-danger btn-sm btn-block mt-4"
                         onclick="import('./js/ui/modals.js').then(m=>m.deleteWorkoutFromModal('${escapeHTML(day || '')}','${escapeHTML(mode)}'))">
                   Remove
                 </button>` : ''}
    </div>`);
}

export function saveWorkoutFromModal(mode){
  const name = document.getElementById('workout-name-input')?.value?.trim();
  if(!name){ showSnackbar('Enter a workout name.'); return; }
  const entry = {
    name,
    focus:     document.getElementById('workout-focus-input')?.value?.trim() || '',
    exercises: (document.getElementById('workout-exercises-input')?.value || '')
                 .split('\n').map(s => s.trim()).filter(Boolean),
  };
  if(mode === 'override'){
    const date = document.getElementById('workout-date-input')?.value;
    if(!date){ showSnackbar('Select a date.'); return; }
    state.workoutOverrides[date] = entry;
  } else {
    const day = document.getElementById('workout-day-select')?.value;
    if(!day){ showSnackbar('Select a day.'); return; }
    state.workoutTemplate[day] = entry;
  }
  state.setFullResyncNeeded(true);
  saveData();
  closeModal();
  renderSettings();
  showSnackbar('Workout saved.');
}

export function deleteWorkoutFromModal(key, mode){
  if(!confirm('Remove this workout?')) return;
  if(mode === 'override') delete state.workoutOverrides[key];
  else delete state.workoutTemplate[key];
  state.setFullResyncNeeded(true);
  saveData();
  closeModal();
  renderSettings();
}

// ---- Workout template settings modal ----
export function openWorkoutTemplateModal(day){
  openWorkoutModal(day, 'template');
}
