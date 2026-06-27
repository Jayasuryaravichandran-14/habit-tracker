// ============================================================
// habits.js — Habit CRUD, check/uncheck, skip, reorder
// ============================================================

import * as state from './state.js';
import { saveData } from './storage.js';
import { pushToCloud, syncExerciseLogDateToFirestore } from './sync.js';
import { bcBroadcast } from './broadcast.js';
import { todayStr, getPageDateStr, isHabitDueOn, safeDocId } from './helpers.js';
import { renderHome } from './renders/home.js';
import { renderRoutines, renderRoutineGroup } from './renders/routines.js';
import { showSnackbar } from './ui/snackbar.js';

// ---- Check / uncheck ----
export function checkHabit(habitId, date){
  const ds = date || getPageDateStr('home');
  if(!state.habitLog[ds]) state.habitLog[ds] = {};
  const current = state.habitLog[ds][habitId];
  if(current?.done){
    delete state.habitLog[ds][habitId];
  } else {
    state.habitLog[ds][habitId] = { done: true, ts: Date.now() };
  }
  state.markDayDirty(ds);
  saveData();
  renderHome();
  if(state.currentPage === 'routines') renderRoutines();
}

export function toggleHabit(habitId){ checkHabit(habitId); }

// ---- Skip ----
export function skipHabit(habitId, date){
  const ds = date || getPageDateStr('home');
  if(!state.skippedHabits[ds]) state.skippedHabits[ds] = {};
  if(state.skippedHabits[ds][habitId]){
    delete state.skippedHabits[ds][habitId];
  } else {
    state.skippedHabits[ds][habitId] = true;
    // Remove done state if habit was checked
    if(state.habitLog[ds]?.[habitId]) delete state.habitLog[ds][habitId];
  }
  state.markDayDirty(ds);
  saveData();
  renderHome();
}

// ---- Exercise toggle ----
export function toggleExercise(date, key){
  const exStates = JSON.parse(localStorage.getItem('ht3-exlog') || '{}');
  if(!exStates[date]) exStates[date] = {};
  exStates[date][key] = !exStates[date][key];
  localStorage.setItem('ht3-exlog', JSON.stringify(exStates));
  renderRoutineGroup(state.activeRoutineTab);
  syncExerciseLogDateToFirestore(date, exStates[date]);
  bcBroadcast('EXERCISE_UPDATE');
}

// ---- Add / edit habit ----
export function saveHabit(habitData, groupId){
  const group = state.ROUTINES.find(g => g.id === groupId);
  if(!group) return;
  if(habitData.id){
    const idx = group.habits.findIndex(h => h.id === habitData.id);
    if(idx >= 0) group.habits[idx] = { ...group.habits[idx], ...habitData };
    else group.habits.push(habitData);
  } else {
    habitData.id = 'h_' + Date.now();
    group.habits.push(habitData);
  }
  state.setFullResyncNeeded(true);
  saveData();
  renderRoutines();
}

export function deleteHabit(habitId, groupId){
  const group = state.ROUTINES.find(g => g.id === groupId);
  if(!group) return;
  const removed = group.habits.find(h => h.id === habitId);
  group.habits = group.habits.filter(h => h.id !== habitId);
  state.setFullResyncNeeded(true);
  saveData();
  renderRoutines();
  if(removed) showSnackbar(`Deleted "${removed.name}"`, () => {
    group.habits.push(removed);
    state.setFullResyncNeeded(true);
    saveData();
    renderRoutines();
  });
}

export function archiveHabit(habitId, groupId){
  const group = state.ROUTINES.find(g => g.id === groupId);
  if(!group) return;
  const h = group.habits.find(h => h.id === habitId);
  if(!h) return;
  h.archived = !h.archived;
  state.setFullResyncNeeded(true);
  saveData();
  renderRoutines();
}

// ---- Add / edit group ----
export function saveGroup(groupData){
  if(groupData.id){
    const idx = state.ROUTINES.findIndex(g => g.id === groupData.id);
    if(idx >= 0) state.ROUTINES[idx] = { ...state.ROUTINES[idx], ...groupData };
  } else {
    groupData.id = 'g_' + Date.now();
    groupData.habits = [];
    state.ROUTINES.push(groupData);
  }
  state.setFullResyncNeeded(true);
  saveData();
  renderRoutines();
}

export function deleteGroup(groupId){
  const idx = state.ROUTINES.findIndex(g => g.id === groupId);
  if(idx < 0) return;
  const removed = state.ROUTINES.splice(idx, 1)[0];
  state.setFullResyncNeeded(true);
  saveData();
  renderRoutines();
  showSnackbar(`Deleted group "${removed.group}"`, () => {
    state.ROUTINES.splice(idx, 0, removed);
    state.setFullResyncNeeded(true);
    saveData();
    renderRoutines();
  });
}

// ---- Reorder ----
export function reorderHabits(groupId, fromIdx, toIdx){
  const group = state.ROUTINES.find(g => g.id === groupId);
  if(!group) return;
  const [moved] = group.habits.splice(fromIdx, 1);
  group.habits.splice(toIdx, 0, moved);
  state.setFullResyncNeeded(true);
  saveData();
}

export function reorderGroups(fromIdx, toIdx){
  const [moved] = state.ROUTINES.splice(fromIdx, 1);
  state.ROUTINES.splice(toIdx, 0, moved);
  state.setFullResyncNeeded(true);
  saveData();
}

// ---- Reset all ----
export async function resetAll(){
  state.replaceState({
    habitLog:{}, dailyLog:{}, settings:{name:'User',goal:''},
    skippedHabits:{}, workoutTemplate:{}, workoutOverrides:{},
    routines:[], logTrackers:[],
  });
  localStorage.removeItem('ht3-exlog');

  // Clear workoutLogs in Firestore
  const { firestoreUserRef } = await import('./sync.js');
  const userRef = firestoreUserRef();
  if(userRef){
    userRef.collection('workoutLogs').get().then(snap => {
      const batch = userRef.firestore.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      if(snap.docs.length) batch.commit().catch(err => console.error('workoutLogs clear failed:', err));
    }).catch(err => console.error('workoutLogs read for clear failed:', err));
  }

  state.setActiveHabitGroupTab(null);
  state.setActiveRoutineTab(null);
  state.setFullResyncNeeded(true);
  saveData();
  renderHome();
  import('./renders/settings.js').then(m => m.renderSettings());
}
