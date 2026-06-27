// ============================================================
// broadcast.js — BroadcastChannel multi-tab state sync
// ============================================================

import * as state from './state.js';

export const _bc = ('BroadcastChannel' in window) ? new BroadcastChannel('habittrack-v1') : null;

export function bcBroadcast(type, payload){
  if(_bc && !state._applyingRemote){
    try{ _bc.postMessage({ type, payload, ts: Date.now() }); }catch(e){}
  }
}

if(_bc){
  _bc.onmessage = (event) => {
    const { type } = event.data;
    if(state._applyingRemote) return;
    state.setApplyingRemote(true);
    try{
      if(type === 'STATE_UPDATE'){
        try{
          state.replaceState({
            habitLog:        JSON.parse(localStorage.getItem('ht3-habitlog')    || '{}'),
            dailyLog:        JSON.parse(localStorage.getItem('ht3-dailylog')    || '{}'),
            settings:        JSON.parse(localStorage.getItem('ht3-settings')    || '{"name":"User","goal":""}'),
            skippedHabits:   JSON.parse(localStorage.getItem('ht3-skipped')     || '{}'),
            workoutTemplate: JSON.parse(localStorage.getItem('ht3-workout-tpl') || '{}'),
            workoutOverrides:JSON.parse(localStorage.getItem('ht3-workout-ovr') || '{}'),
          });
        }catch(e){ console.warn('[BC] Failed to re-read localStorage:', e); }
        import('./renders/home.js')     .then(m => m.renderHome());
        import('./renders/routines.js') .then(m => { if(state.currentPage==='routines') m.renderRoutines(); });
        import('./renders/log.js')      .then(m => { if(state.currentPage==='log')      m.renderLog(); });
        import('./renders/settings.js') .then(m => m.renderSettings());
      } else if(type === 'EXERCISE_UPDATE'){
        import('./renders/routines.js').then(m => m.renderRoutines());
      } else if(type === 'SIGN_OUT'){
        import('./firebase.js').then(m => m.fbAuth.signOut().catch(()=>{}));
      }
    } finally {
      state.setApplyingRemote(false);
    }
  };
}
