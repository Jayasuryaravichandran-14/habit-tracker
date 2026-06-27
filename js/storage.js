// ============================================================
// storage.js — localStorage read/write, saveData/loadData
// ============================================================

import * as state from './state.js';
import { bcBroadcast } from './broadcast.js';
import { pushToCloud } from './sync.js';

export function loadData(){
  try{
    state.replaceState({
      habitLog:        JSON.parse(localStorage.getItem('ht3-habitlog')       || '{}'),
      dailyLog:        JSON.parse(localStorage.getItem('ht3-dailylog')       || '{}'),
      settings:        JSON.parse(localStorage.getItem('ht3-settings')       || '{"name":"User","goal":""}'),
      skippedHabits:   JSON.parse(localStorage.getItem('ht3-skipped')        || '{}'),
      workoutTemplate: JSON.parse(localStorage.getItem('ht3-workout-tpl')    || '{}'),
      workoutOverrides:JSON.parse(localStorage.getItem('ht3-workout-ovr')    || '{}'),
    });
  }catch(e){
    state.replaceState({ habitLog:{}, dailyLog:{}, settings:{name:'User',goal:''}, skippedHabits:{}, workoutTemplate:{}, workoutOverrides:{} });
  }
  // Theme + accent applied immediately for correct first-paint colours
  try{
    const theme = localStorage.getItem('ht3-theme') || 'goofy';
    state.setCurrentTheme(theme);
    // applyTheme called by theme.js after import
  }catch(e){}
}

export function saveData(){
  try{
    localStorage.setItem('ht3-habitlog',    JSON.stringify(state.habitLog));
    localStorage.setItem('ht3-dailylog',    JSON.stringify(state.dailyLog));
    localStorage.setItem('ht3-settings',    JSON.stringify(state.settings));
    localStorage.setItem('ht3-workout-tpl', JSON.stringify(state.workoutTemplate));
    localStorage.setItem('ht3-workout-ovr', JSON.stringify(state.workoutOverrides));
    localStorage.setItem('ht3-skipped',     JSON.stringify(state.skippedHabits));
    state.bumpDataVersion();
    bcBroadcast('STATE_UPDATE');
    pushToCloud();
  }catch(e){
    import('./ui/snackbar.js').then(m => m.showSnackbar("⚠️ Couldn't save — storage may be full"));
  }
}

export function gatherAllData(){
  return {
    habitLog:        state.habitLog,
    dailyLog:        state.dailyLog,
    settings:        state.settings,
    workoutTemplate: state.workoutTemplate,
    workoutOverrides:state.workoutOverrides,
    skippedHabits:   state.skippedHabits,
    routines:        state.ROUTINES,
    logTrackers:     state.LOG_TRACKERS,
    exerciseLog:     JSON.parse(localStorage.getItem('ht3-exlog') || 'null'),
  };
}

export function applyAllData(data){
  state.replaceState({
    habitLog:        data.habitLog        || {},
    dailyLog:        data.dailyLog        || {},
    settings:        data.settings        || { name:'User', goal:'' },
    skippedHabits:   data.skippedHabits   || {},
    workoutTemplate: data.workoutTemplate || {},
    workoutOverrides:data.workoutOverrides|| {},
    routines:        data.routines        || [],
    logTrackers:     data.logTrackers     || [],
  });
  if(data.exerciseLog) localStorage.setItem('ht3-exlog', JSON.stringify(data.exerciseLog));
}
