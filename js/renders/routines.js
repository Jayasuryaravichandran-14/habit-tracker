// ============================================================
// renders/routines.js — Routines / habit editor page
// ============================================================

import * as state from '../state.js';
import { escapeHTML, getPageDateStr, getWorkoutForDate, isHabitDueOn, dateStr } from '../helpers.js';

export function renderRoutines(){
  const container = document.getElementById('routines-content');
  if(!container) return;

  if(!state.ROUTINES.length){
    container.innerHTML = `
      <div class="empty-state">
        <p>No routine groups yet.</p>
        <button class="btn btn-primary" onclick="import('./js/renders/routines.js').then(m=>m.openAddGroup())">+ Add Group</button>
      </div>`;
    return;
  }

  // Tab bar
  const tabBar = document.getElementById('routines-tabs');
  if(tabBar){
    tabBar.innerHTML = state.ROUTINES.map(g => `
      <button class="tab-btn ${state.activeRoutineTab === g.id ? 'active' : ''}"
              onclick="import('./js/renders/routines.js').then(m=>m.setRoutineTab('${escapeHTML(g.id)}'))">
        ${escapeHTML(g.group)}
      </button>`).join('') +
      `<button class="tab-btn tab-add" onclick="import('./js/renders/routines.js').then(m=>m.openAddGroup())">+</button>`;
  }

  const activeId = state.activeRoutineTab || state.ROUTINES[0]?.id;
  if(activeId) renderRoutineGroup(activeId);
}

export function renderRoutineGroup(groupId){
  const container = document.getElementById('routines-content');
  if(!container) return;
  const group = state.ROUTINES.find(g => g.id === groupId);
  if(!group){ container.innerHTML = ''; return; }

  const ds = getPageDateStr('routines');
  const date = new Date(ds + 'T12:00:00');
  const habits = (group.habits || []).filter(h => !h.archived);
  const wod = getWorkoutForDate(date);
  const exStates = JSON.parse(localStorage.getItem('ht3-exlog') || '{}');
  const dayExStates = exStates[ds] || {};

  container.innerHTML = `
    <div class="routine-group-header" style="border-left: 3px solid ${escapeHTML(group.color||'var(--accent)')}">
      <h3>${escapeHTML(group.group)}</h3>
      <div class="group-actions">
        <button class="btn-icon" onclick="import('./js/renders/routines.js').then(m=>m.openEditGroup('${escapeHTML(group.id)}'))" title="Edit group">✏️</button>
        <button class="btn-icon" onclick="import('./js/habits.js').then(m=>m.deleteGroup('${escapeHTML(group.id)}'))" title="Delete group">🗑️</button>
      </div>
    </div>

    <div class="habit-list">
      ${habits.length
        ? habits.map(h => renderRoutineHabitRow(h, ds, date)).join('')
        : `<p class="empty-msg">No habits in this group.</p>`
      }
    </div>

    <button class="btn btn-outline btn-sm btn-block mt-8"
            onclick="import('./js/renders/routines.js').then(m=>m.openAddHabit('${escapeHTML(group.id)}'))">
      + Add Habit
    </button>

    ${wod ? renderWodSection(wod, ds, dayExStates) : ''}`;
}

function renderRoutineHabitRow(h, ds, date){
  const due  = isHabitDueOn(h, date);
  const done = !!state.habitLog[ds]?.[h.id]?.done;
  return `
    <div class="habit-editor-row ${!due ? 'not-due' : ''} ${done ? 'done' : ''}">
      <span class="habit-icon">${escapeHTML(h.icon || '')}</span>
      <div class="habit-editor-info">
        <span class="habit-name">${escapeHTML(h.name)}</span>
        ${h.sub ? `<span class="habit-sub">${escapeHTML(h.sub)}</span>` : ''}
        <span class="habit-freq">${renderFreqLabel(h.freq)}</span>
      </div>
      <div class="habit-editor-actions">
        <button class="btn-icon" onclick="import('./js/renders/routines.js').then(m=>m.openEditHabit('${escapeHTML(h.id)}','${escapeHTML(h.groupId||'')}'))" title="Edit">✏️</button>
        <button class="btn-icon" onclick="import('./js/habits.js').then(m=>m.archiveHabit('${escapeHTML(h.id)}','${escapeHTML(h.groupId||'')}'))" title="Archive">📦</button>
        <button class="btn-icon" onclick="import('./js/habits.js').then(m=>m.deleteHabit('${escapeHTML(h.id)}','${escapeHTML(h.groupId||'')}'))" title="Delete">🗑️</button>
      </div>
    </div>`;
}

function renderWodSection(wod, ds, dayStates){
  const exDone = (wod.exercises||[]).filter((_,i) => dayStates[`ex_${i}`]).length;
  return `
    <div class="wod-editor-section">
      <h4>🏋️ ${escapeHTML(wod.name)} <span class="wod-focus-label">${escapeHTML(wod.focus||'')}</span></h4>
      <ul class="wod-exercises">
        ${(wod.exercises||[]).map((ex,i) => `
          <li class="wod-ex ${dayStates[`ex_${i}`] ? 'done' : ''}"
              onclick="import('./js/habits.js').then(m=>m.toggleExercise('${escapeHTML(ds)}','ex_${i}'))">
            <span class="wod-check">${dayStates[`ex_${i}`] ? '✅' : '⬜'}</span>
            ${escapeHTML(ex)}
          </li>`).join('')}
      </ul>
      <p class="wod-progress">${exDone}/${(wod.exercises||[]).length} done</p>
      <button class="btn btn-outline btn-sm" onclick="import('./js/renders/routines.js').then(m=>m.openEditWorkout('${escapeHTML(ds)}'))">Edit Today's Workout</button>
    </div>`;
}

function renderFreqLabel(freq){
  if(!freq || freq === 'daily') return 'Daily';
  if(freq === 'weekdays') return 'Weekdays';
  if(freq === 'weekends') return 'Weekends';
  if(Array.isArray(freq)){
    const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return freq.map(d => names[d]).join(', ');
  }
  return String(freq);
}

export function setRoutineTab(groupId){
  state.setActiveRoutineTab(groupId);
  localStorage.setItem('ht3-active-routine-tab', groupId);
  renderRoutineGroup(groupId);
}

export function openAddGroup(){
  import('../ui/modals.js').then(m => m.openGroupModal(null));
}
export function openEditGroup(groupId){
  import('../ui/modals.js').then(m => m.openGroupModal(groupId));
}
export function openAddHabit(groupId){
  import('../ui/modals.js').then(m => m.openHabitModal(null, groupId));
}
export function openEditHabit(habitId, groupId){
  import('../ui/modals.js').then(m => m.openHabitModal(habitId, groupId));
}
export function openEditWorkout(ds){
  import('../ui/modals.js').then(m => m.openWorkoutModal(ds));
}
