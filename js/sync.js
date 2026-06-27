// ============================================================
// sync.js — Firestore push, pull, listeners, migration
// ============================================================

import * as state from './state.js';
import { fbStore, fbDB } from './firebase.js';
import { GENERIC_STARTER_ROUTINES, GENERIC_STARTER_TRACKERS, GENERIC_TRACKER_IDS, LOGS_WINDOW_DAYS } from './constants.js';
import { safeDocId, dateStr, todayStr } from './helpers.js';
import { saveData } from './storage.js';
import { bcBroadcast } from './broadcast.js';

// ---- User ref helper ----
export function firestoreUserRef(){
  if(!state.currentUser || !fbStore) return null;
  return fbStore.collection('users').doc(state.currentUser.uid);
}

export function logsWindowCutoff(){
  const d = new Date();
  d.setDate(d.getDate() - LOGS_WINDOW_DAYS);
  return dateStr(d);
}

// ---- Dirty-date granular writes ----
export function markDayDirty(date){ state._dirtyDates.add(date); }

// ---- Push to cloud ----
export async function pushToCloud(){
  const userRef = firestoreUserRef();
  if(!userRef) return;
  clearTimeout(state._syncPushTimer);
  state.setSyncPushTimer(setTimeout(async ()=>{
    try{
      updateSyncStatus('saving');
      if(state._fullResyncNeeded){
        state.setFullResyncNeeded(false);
        await syncRoutinesToFirestore(userRef);
        await syncTrackersToFirestore(userRef);
        await syncWorkoutToFirestore(userRef);
        state._dirtyDates.clear();
        const ds = todayStr();
        await syncDirtyLogsToFirestore(userRef, new Set([ds]));
      } else {
        if(state._dirtyDates.size) await syncDirtyLogsToFirestore(userRef, new Set(state._dirtyDates));
        state._dirtyDates.clear();
      }
      updateSyncStatus('synced');
    }catch(e){
      console.error('pushToCloud failed:', e);
      updateSyncStatus('error');
    }
  }, 800));
}

async function syncRoutinesToFirestore(userRef){
  const batch = fbStore.batch();
  // Fetch existing to diff
  const [existingGroups, existingHabits] = await Promise.all([
    userRef.collection('routineGroups').get(),
    userRef.collection('habits').get(),
  ]);
  const existingGroupIds = new Set(existingGroups.docs.map(d => d.id));
  const existingHabitIds = new Set(existingHabits.docs.map(d => d.id));
  const newGroupIds = new Set();
  const newHabitIds = new Set();

  state.ROUTINES.forEach((g, gIdx) => {
    const gId = safeDocId(g.id || g.group);
    newGroupIds.add(gId);
    batch.set(userRef.collection('routineGroups').doc(gId), { id: gId, group: g.group, color: g.color || '', order: gIdx });
    (g.habits || []).forEach((h, hIdx) => {
      const hId = safeDocId(h.id || h.name);
      newHabitIds.add(hId);
      batch.set(userRef.collection('habits').doc(hId), { ...h, id: hId, groupId: gId, order: hIdx });
    });
  });
  existingGroupIds.forEach(id => { if(!newGroupIds.has(id)) batch.delete(userRef.collection('routineGroups').doc(id)); });
  existingHabitIds.forEach(id => { if(!newHabitIds.has(id)) batch.delete(userRef.collection('habits').doc(id)); });
  await batch.commit();
}

async function syncTrackersToFirestore(userRef){
  const batch = fbStore.batch();
  const existing = await userRef.collection('logTrackers').get();
  const existingIds = new Set(existing.docs.map(d => d.id));
  const newIds = new Set();
  state.LOG_TRACKERS.forEach((t, i) => {
    const id = safeDocId(t.id);
    newIds.add(id);
    batch.set(userRef.collection('logTrackers').doc(id), { ...t, id, order: i });
  });
  existingIds.forEach(id => { if(!newIds.has(id)) batch.delete(userRef.collection('logTrackers').doc(id)); });
  await batch.commit();
}

async function syncWorkoutToFirestore(userRef){
  const batch = fbStore.batch();
  Object.entries(state.workoutTemplate).forEach(([day, wod]) => {
    batch.set(userRef.collection('workoutTemplate').doc(day), wod);
  });
  Object.entries(state.workoutOverrides).forEach(([date, wod]) => {
    batch.set(userRef.collection('workoutOverrides').doc(safeDocId(date)), wod);
  });
  await batch.commit();
}

async function syncDirtyLogsToFirestore(userRef, dirtyDates){
  const batch = fbStore.batch();
  dirtyDates.forEach(ds => {
    const hLog = state.habitLog[ds] || {};
    const dLog = state.dailyLog[ds] || {};
    if(Object.keys(hLog).length || Object.keys(dLog).length){
      batch.set(userRef.collection('habitLogs').doc(safeDocId(ds)), hLog);
      batch.set(userRef.collection('dailyLogs').doc(safeDocId(ds)), dLog);
    }
  });
  await batch.commit();
}

// ---- Exercise log Firestore sync ----
export function syncExerciseLogDateToFirestore(date, entries){
  const userRef = firestoreUserRef();
  if(!userRef || state._applyingRemote) return;
  const docRef = userRef.collection('workoutLogs').doc(safeDocId(date));
  if(entries && Object.keys(entries).length > 0){
    docRef.set({ entries }, { merge: false }).catch(err => console.error('workoutLogs write failed:', err));
  } else {
    docRef.delete().catch(err => console.error('workoutLogs delete failed:', err));
  }
}

// ---- Firestore real-time listeners ----
export function detachFirestoreListeners(){
  state._fsUnsubscribers.forEach(u => u());
  state._fsUnsubscribers.length = 0;
  // Reset first-snapshot latch so next sign-in works correctly
  state.setFirstSnapshotReceived(false);
  state.setAwaitingFirstSnapshot(false);
  clearTimeout(state._firstSnapshotFallbackTimer);
}

export function rebuildRoutinesFromCache(){
  const groupsById = state._fsGroupsCache;
  const habitsById = state._fsHabitsCache;
  const groups = Object.values(groupsById).sort((a,b) => (a.order||0) - (b.order||0));
  const rebuilt = groups.map(g => ({
    ...g,
    habits: Object.values(habitsById)
      .filter(h => h.groupId === g.id)
      .sort((a,b) => (a.order||0) - (b.order||0))
  }));
  state.ROUTINES.length = 0;
  rebuilt.forEach(r => state.ROUTINES.push(r));
}

export function attachFirestoreListeners(uid){
  const userRef = fbStore.collection('users').doc(uid);
  const cutoff = logsWindowCutoff();

  state._fsUnsubscribers.push(userRef.collection('routineGroups').onSnapshot(snap => {
    snap.docChanges().forEach(ch => {
      if(ch.type === 'removed') delete state._fsGroupsCache[ch.doc.id];
      else state._fsGroupsCache[ch.doc.id] = ch.doc.data();
    });
    rebuildRoutinesFromCache();
    updateSyncStatus('synced');
    onFirstFirestoreSnapshotReceived();
  }, err => { console.error('routineGroups listener:', err); updateSyncStatus('error'); }));

  state._fsUnsubscribers.push(userRef.collection('habits').onSnapshot(snap => {
    snap.docChanges().forEach(ch => {
      if(ch.type === 'removed') delete state._fsHabitsCache[ch.doc.id];
      else state._fsHabitsCache[ch.doc.id] = { ...ch.doc.data(), _id: ch.doc.data().id || ch.doc.id };
    });
    rebuildRoutinesFromCache();
    updateSyncStatus('synced');
  }, err => { console.error('habits listener:', err); updateSyncStatus('error'); }));

  state._fsUnsubscribers.push(userRef.collection('logTrackers').onSnapshot(snap => {
    state.LOG_TRACKERS.length = 0;
    snap.docs.sort((a,b) => (a.data().order||0)-(b.data().order||0))
             .forEach(d => state.LOG_TRACKERS.push(d.data()));
    updateSyncStatus('synced');
  }, err => { console.error('logTrackers listener:', err); updateSyncStatus('error'); }));

  state._fsUnsubscribers.push(userRef.collection('habitLogs')
    .where(firebase.firestore.FieldPath.documentId(), '>=', cutoff)
    .onSnapshot(snap => {
      state.setApplyingRemote(true);
      snap.docChanges().forEach(ch => {
        if(ch.type === 'removed') delete state.habitLog[ch.doc.id];
        else state.habitLog[ch.doc.id] = ch.doc.data();
      });
      state.setApplyingRemote(false);
      updateSyncStatus('synced');
      import('./renders/home.js').then(m => m.renderHome());
    }, err => { console.error('habitLogs listener:', err); updateSyncStatus('error'); }));

  state._fsUnsubscribers.push(userRef.collection('dailyLogs')
    .where(firebase.firestore.FieldPath.documentId(), '>=', cutoff)
    .onSnapshot(snap => {
      state.setApplyingRemote(true);
      snap.docChanges().forEach(ch => {
        if(ch.type === 'removed') delete state.dailyLog[ch.doc.id];
        else state.dailyLog[ch.doc.id] = ch.doc.data();
      });
      state.setApplyingRemote(false);
      updateSyncStatus('synced');
    }, err => { console.error('dailyLogs listener:', err); updateSyncStatus('error'); }));

  state._fsUnsubscribers.push(userRef.collection('workoutTemplate').onSnapshot(snap => {
    state.setApplyingRemote(true);
    snap.docChanges().forEach(ch => {
      if(ch.type === 'removed') delete state.workoutTemplate[ch.doc.id];
      else state.workoutTemplate[ch.doc.id] = ch.doc.data();
    });
    state.setApplyingRemote(false);
    updateSyncStatus('synced');
  }, err => { console.error('workoutTemplate listener:', err); updateSyncStatus('error'); }));

  state._fsUnsubscribers.push(userRef.collection('workoutOverrides')
    .where(firebase.firestore.FieldPath.documentId(), '>=', cutoff)
    .onSnapshot(snap => {
      state.setApplyingRemote(true);
      snap.docChanges().forEach(ch => {
        if(ch.type === 'removed') delete state.workoutOverrides[ch.doc.id];
        else state.workoutOverrides[ch.doc.id] = ch.doc.data();
      });
      state.setApplyingRemote(false);
      updateSyncStatus('synced');
    }, err => { console.error('workoutOverrides listener:', err); updateSyncStatus('error'); }));

  state._fsUnsubscribers.push(userRef.onSnapshot(snap => {
    const data = snap.data();
    if(!data) return;
    state.setApplyingRemote(true);
    state.settings.name = data.name || state.settings.name;
    state.settings.goal = data.goal || state.settings.goal;
    saveData();
    import('./renders/settings.js').then(m => m.renderSettings());
    state.setApplyingRemote(false);
  }, err => { console.error('profile listener:', err); updateSyncStatus('error'); }));

  // Exercise log — per-day docs under workoutLogs/{date}
  state._fsUnsubscribers.push(userRef.collection('workoutLogs')
    .where(firebase.firestore.FieldPath.documentId(), '>=', cutoff)
    .onSnapshot(snap => {
      state.setApplyingRemote(true);
      const exStates = JSON.parse(localStorage.getItem('ht3-exlog') || '{}');
      snap.docChanges().forEach(ch => {
        if(ch.type === 'removed') delete exStates[ch.doc.id];
        else exStates[ch.doc.id] = ch.doc.data().entries || {};
      });
      localStorage.setItem('ht3-exlog', JSON.stringify(exStates));
      state.setApplyingRemote(false);
      updateSyncStatus('synced');
      import('./renders/routines.js').then(m => m.renderRoutines());
    }, err => { console.error('workoutLogs listener:', err); updateSyncStatus('error'); }));
}

// ---- First-snapshot cutover ----
export function onFirstFirestoreSnapshotReceived(){
  if(state._firstSnapshotReceived) return;
  state.setFirstSnapshotReceived(true);
  if(state._awaitingFirstSnapshot){
    state.setAwaitingFirstSnapshot(false);
    clearTimeout(state._firstSnapshotFallbackTimer);
    Promise.all([
      import('./renders/home.js'),
      import('./renders/routines.js'),
      import('./renders/settings.js'),
    ]).then(([home, routines, settings]) => {
      home.renderHome();
      if(state.currentPage === 'routines') routines.renderRoutines();
      settings.renderSettings();
    });
  }
}

// ---- Sync status indicator ----
export function updateSyncStatus(status){
  const el = document.getElementById('sync-status');
  if(!el) return;
  const map = { saving:'⏳ Saving…', synced:'✅ Synced', error:'⚠️ Sync error', offline:'📶 Offline' };
  el.textContent = map[status] || '';
  el.className = `sync-status sync-${status}`;
}

// ---- Legacy RTDB migration ----
export async function migrateLegacySyncCodeIfNeeded(){
  // No-op if user already has Firestore data or never used the old sync-code path
}

// ---- Firestore migration (localStorage → Firestore on first sign-in) ----
export async function migrateToFirestoreIfNeeded(uid){
  const userRef = fbStore.collection('users').doc(uid);
  const snap = await fbStore.collection('users').doc(uid).get();
  if(snap.exists && snap.data()?._migrated) return; // already done

  // Check RTDB for legacy data
  const rtdbSnap = await fbDB.ref('habittrack-users/' + uid).once('value');
  const rtdbData = rtdbSnap.val();
  if(rtdbData){
    // Migrate from RTDB
    const { applyAllData } = await import('./storage.js');
    applyAllData(rtdbData);
  } else {
    // Brand new account — seed with generic starter content
    const { GENERIC_STARTER_ROUTINES: GR, GENERIC_STARTER_TRACKERS: GT } = await import('./constants.js');
    state.ROUTINES.length = 0;
    GR.forEach(r => state.ROUTINES.push(r));
    state.LOG_TRACKERS.length = 0;
    GT.forEach(t => state.LOG_TRACKERS.push(t));
  }

  const ops = [];
  migrateRoutinesIntoOps(ops, userRef, state.ROUTINES);
  migrateTrackersIntoOps(ops, userRef, state.LOG_TRACKERS);
  migrateLogsIntoOps(ops, userRef, state.habitLog, state.dailyLog);
  migrateWorkoutIntoOps(ops, userRef, state.workoutTemplate, state.workoutOverrides);
  await commitInChunks(ops);
  await userRef.set({ _migrated: true, _migratedAt: Date.now() }, { merge: true });
}

function migrateRoutinesIntoOps(ops, userRef, routines){
  routines.forEach((g, gIdx) => {
    const gId = safeDocId(g.id || g.group);
    ops.push({ ref: userRef.collection('routineGroups').doc(gId), data: { id:gId, group:g.group, color:g.color||'', order:gIdx } });
    (g.habits||[]).forEach((h,hIdx) => {
      const hId = safeDocId(h.id || h.name);
      ops.push({ ref: userRef.collection('habits').doc(hId), data: { ...h, id:hId, groupId:gId, order:hIdx } });
    });
  });
}
function migrateTrackersIntoOps(ops, userRef, trackers){
  trackers.forEach((t,i) => {
    ops.push({ ref: userRef.collection('logTrackers').doc(safeDocId(t.id)), data: { ...t, order:i } });
  });
}
function migrateLogsIntoOps(ops, userRef, habitLogData, dailyLogData){
  const cutoff = logsWindowCutoff();
  Object.entries(habitLogData).filter(([ds])=>ds>=cutoff).forEach(([ds,v]) => {
    ops.push({ ref: userRef.collection('habitLogs').doc(safeDocId(ds)), data: v });
  });
  Object.entries(dailyLogData).filter(([ds])=>ds>=cutoff).forEach(([ds,v]) => {
    ops.push({ ref: userRef.collection('dailyLogs').doc(safeDocId(ds)), data: v });
  });
}
function migrateWorkoutIntoOps(ops, userRef, template, overrides){
  Object.entries(template).forEach(([day,w]) => {
    ops.push({ ref: userRef.collection('workoutTemplate').doc(day), data: w });
  });
  Object.entries(overrides).forEach(([date,w]) => {
    ops.push({ ref: userRef.collection('workoutOverrides').doc(safeDocId(date)), data: w });
  });
}
async function commitInChunks(ops){
  const CHUNK = 500;
  for(let i = 0; i < ops.length; i += CHUNK){
    const batch = fbStore.batch();
    ops.slice(i, i+CHUNK).forEach(op => batch.set(op.ref, op.data));
    await batch.commit();
  }
}
