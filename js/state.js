// ============================================================
// state.js — Single source of truth for all shared app state
// ============================================================
// Every module imports from here. Nothing else holds mutable
// app state at module level — mutations go through the setters
// below so BroadcastChannel and Firestore listeners can trust
// that reading these exports always gives the current value.
//
// Pattern: export the object reference, mutate its properties.
// Primitive state (currentPage, etc.) uses setter functions.
// ============================================================

// ---- Firebase instances (set once at boot by firebase.js) ----
export let fbDB    = null;
export let fbStore = null;
export let fbAuth  = null;
export function setFirebaseInstances(db, store, auth){
  fbDB = db; fbStore = store; fbAuth = auth;
}

// ---- Current authenticated user ----
export let currentUser = null;
export function setCurrentUser(u){ currentUser = u; }

// ---- Core habit data ----
export let ROUTINES     = [];
export let LOG_TRACKERS = [];
export let habitLog     = {};
export let dailyLog     = {};
export let settings     = { name: 'User', goal: '' };
export let skippedHabits = {};
export let workoutTemplate  = {};
export let workoutOverrides = {};

export function replaceState(patch){
  if(patch.habitLog)        habitLog        = patch.habitLog;
  if(patch.dailyLog)        dailyLog        = patch.dailyLog;
  if(patch.settings)        settings        = patch.settings;
  if(patch.skippedHabits)   skippedHabits   = patch.skippedHabits;
  if(patch.workoutTemplate) workoutTemplate = patch.workoutTemplate;
  if(patch.workoutOverrides)workoutOverrides= patch.workoutOverrides;
  if(patch.routines){
    ROUTINES.length = 0;
    patch.routines.forEach(r => ROUTINES.push(r));
  }
  if(patch.logTrackers){
    LOG_TRACKERS.length = 0;
    patch.logTrackers.forEach(t => LOG_TRACKERS.push(t));
  }
}

// ---- UI / page state ----
export let currentPage        = 'home';
export let analyticsTab       = 'day';
export let analyticsDay       = 0;
export let analyticsCharts    = {};
export let noteModalHabitId   = null;
export let activeHabitGroupTab= null;
export let activeLogTab       = 'all';
export let currentTheme       = 'goofy';
export let habitSearchQuery   = '';
export let showCompletedHabits= true;
export let activeTimeFilter   = 'all';
export let datepickerTarget   = null;
export let dragSrcHabitId     = null;
export let dragSrcGroupId     = null;
export let soundOn            = localStorage.getItem('ht3-sound') === '1';
export let dataVersion        = 0;
export let authMode           = 'signin';
export let streakCalMonthOffset = 0;

// Page date offsets (0 = today, -1 = yesterday, etc.)
export const pageDate = { home: 0, routines: 0, log: 0, analytics: 0 };

export function setCurrentPage(p)             { currentPage = p; }
export function setAnalyticsTab(t)            { analyticsTab = t; }
export function setAnalyticsDay(d)            { analyticsDay = d; }
export function setNoteModalHabitId(id)       { noteModalHabitId = id; }
export function setActiveHabitGroupTab(id)    { activeHabitGroupTab = id; }
export function setActiveLogTab(t)            { activeLogTab = t; }
export function setCurrentTheme(t)            { currentTheme = t; }
export function setHabitSearchQuery(q)        { habitSearchQuery = q; }
export function setShowCompletedHabits(v)     { showCompletedHabits = v; }
export function setActiveTimeFilter(f)        { activeTimeFilter = f; }
export function setDatepickerTarget(t)        { datepickerTarget = t; }
export function setDragSrc(habitId, groupId)  { dragSrcHabitId = habitId; dragSrcGroupId = groupId; }
export function setSoundOn(v)                 { soundOn = v; }
export function bumpDataVersion()             { dataVersion++; }
export function setAuthMode(m)                { authMode = m; }
export function setStreakCalMonthOffset(n)    { streakCalMonthOffset = n; }

// ---- Sync / cloud state ----
export let _applyingRemote       = false;
export let _syncPushTimer        = null;
export let _awaitingFirstSnapshot= false;
export let _firstSnapshotFallbackTimer = null;
export let _firstSnapshotReceived= false;
export const _dirtyDates         = new Set();
export let _fullResyncNeeded     = false;
export const LOGS_WINDOW_DAYS    = 180;
export let _fsUnsubscribers      = [];
export let _fsGroupsCache        = {};
export let _fsHabitsCache        = {};

export function setApplyingRemote(v)          { _applyingRemote = v; }
export function setSyncPushTimer(t)           { _syncPushTimer = t; }
export function setAwaitingFirstSnapshot(v)   { _awaitingFirstSnapshot = v; }
export function setFirstSnapshotFallbackTimer(t){ _firstSnapshotFallbackTimer = t; }
export function setFirstSnapshotReceived(v)   { _firstSnapshotReceived = v; }
export function setFullResyncNeeded(v)        { _fullResyncNeeded = v; }
export function markDayDirty(date)            { _dirtyDates.add(date); }

// ---- Habit/log editor state ----
export let editingHabitId      = null;
export let editingHabitGroupId = null;
export let activeRoutineTab    = localStorage.getItem('ht3-active-routine-tab') || null;
export let _holdTimer          = null;
export let _holdEl             = null;
export let _undoAction         = null;
export let _snackbarTimer      = null;
export let _ctxEl              = null; // long-press context menu target

export function setEditingHabit(id, groupId) { editingHabitId = id; editingHabitGroupId = groupId; }
export function setActiveRoutineTab(id)      { activeRoutineTab = id; }
export function setHoldTimer(t)              { _holdTimer = t; }
export function setHoldEl(el)                { _holdEl = el; }
export function setUndoAction(fn)            { _undoAction = fn; }
export function setSnackbarTimer(t)          { _snackbarTimer = t; }
export function setCtxEl(el)                 { _ctxEl = el; }
