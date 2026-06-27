// ============================================================
// helpers.js — Pure utility functions, no side effects
// ============================================================
// Date helpers, escaping, habit logic, streak/score calc,
// color utilities, quotes. Nothing here touches the DOM or
// Firebase — safe to unit-test in isolation.
// ============================================================

import { MOTIVATIONAL_QUOTES } from './constants.js';
import { habitLog, dailyLog, ROUTINES, LOG_TRACKERS, settings, pageDate, skippedHabits, workoutTemplate, workoutOverrides } from './state.js';

// ---- Date ----
export function todayStr(){ return new Date().toISOString().split('T')[0]; }
export function dateStr(d){ return d.toISOString().split('T')[0]; }
export function fmtDate(d, opts){ return d.toLocaleDateString(undefined, opts || {weekday:'short', month:'short', day:'numeric'}); }

export function getPageDate(page){
  const d = new Date();
  d.setDate(d.getDate() + (pageDate[page] || 0));
  return d;
}
export function getPageDateStr(page){ return dateStr(getPageDate(page)); }
export function getDayOfWeek(){ return new Date().getDay(); }

// ---- Sanitisation ----
export function escapeHTML(str){
  if(str == null) return '';
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function safeDocId(id){
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
}

export function isPlainObject(v){ return v !== null && typeof v === 'object' && !Array.isArray(v); }
export function isSafeString(v, maxLen){ return typeof v === 'string' && v.length <= (maxLen || 500); }

// ---- Habit scheduling ----
export function isHabitDueOn(habit, date){
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date;
  const dow = d.getDay(); // 0=Sun
  const f = habit.freq;
  if(!f || f === 'daily') return true;
  if(f === 'weekdays') return dow >= 1 && dow <= 5;
  if(f === 'weekends') return dow === 0 || dow === 6;
  if(Array.isArray(f)) return f.includes(dow);
  return true;
}
export function isHabitDueToday(habit){ return isHabitDueOn(habit, new Date()); }

export function getHabitsForDate(date){
  return ROUTINES.flatMap(g => (g.habits || []).filter(h => !h.archived && isHabitDueOn(h, date)));
}
export function getTodayHabits(){ return getHabitsForDate(new Date()); }

export function getHabitState(habitId, date){
  const ds = typeof date === 'string' ? date : dateStr(date);
  return habitLog[ds]?.[habitId] || null;
}

export function isHabitSkippedFor(habitId, td){
  return !!(skippedHabits[td]?.[habitId]);
}

// ---- Workout ----
export function getWorkoutForDate(date){
  const ds = typeof date === 'string' ? date : dateStr(date);
  if(workoutOverrides[ds]) return workoutOverrides[ds];
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date;
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const day = dayNames[d.getDay()];
  return workoutTemplate[day] || null;
}

// ---- Streaks ----
export function calcStreak(){
  let streak = 0;
  const d = new Date();
  // If today isn't complete yet, start counting from yesterday
  const todayHabits = getHabitsForDate(d);
  const todayDs = todayStr();
  const todayDone = todayHabits.length > 0 && todayHabits.every(h => habitLog[todayDs]?.[h.id]?.done);
  if(!todayDone) d.setDate(d.getDate() - 1);
  for(let i = 0; i < 365; i++){
    const ds = dateStr(d);
    if(!isStreakHit(ds)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function isStreakHit(ds){
  const d = new Date(ds + 'T12:00:00');
  const habits = getHabitsForDate(d);
  if(habits.length === 0) return false;
  return habits.every(h => habitLog[ds]?.[h.id]?.done || isHabitSkippedFor(h.id, ds));
}

export function calcBestStreak(){
  let best = 0, current = 0;
  const d = new Date();
  d.setDate(d.getDate() - 364);
  for(let i = 0; i < 365; i++){
    const ds = dateStr(d);
    if(isStreakHit(ds)){ current++; best = Math.max(best, current); }
    else { current = 0; }
    d.setDate(d.getDate() + 1);
  }
  return best;
}

// ---- Score ----
export function calcScoreForDate(ds){
  const d = new Date(ds + 'T12:00:00');
  const habits = getHabitsForDate(d).filter(h => !isHabitSkippedFor(h.id, ds));
  if(!habits.length) return null;
  const done = habits.filter(h => habitLog[ds]?.[h.id]?.done).length;
  return Math.round((done / habits.length) * 100);
}
export function calcTodayScore(){ return calcScoreForDate(todayStr()); }

export function pct100(done, total){ return total ? Math.round(done / total * 100) : 0; }

// ---- Color helpers ----
export function getGradientColor(val, max, low, high, invert){
  const pct = val / max;
  if(!invert){
    if(pct >= high / max) return '#4ade80';
    if(pct <= low  / max) return '#f87171';
    return '#facc15';
  } else {
    if(pct >= high / max) return '#f87171';
    if(pct <= low  / max) return '#4ade80';
    return '#facc15';
  }
}

// ---- Quotes ----
export function getQuoteOfTheDay(now){
  const d = now || new Date();
  const idx = (d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate()) % MOTIVATIONAL_QUOTES.length;
  return MOTIVATIONAL_QUOTES[idx];
}

// ---- Day data check ----
export function dayHasData(ds){
  if(habitLog[ds] && Object.keys(habitLog[ds]).length) return true;
  if(dailyLog[ds] && Object.values(dailyLog[ds]).some(v => v != null && v !== '')) return true;
  return false;
}

// ---- Personal records ----
export function calcPersonalRecords(){
  const records = {};
  LOG_TRACKERS.forEach(t => {
    if(t.type !== 'number' && t.type !== 'stars') return;
    let best = null, bestDate = null;
    Object.entries(dailyLog).forEach(([ds, entry]) => {
      const v = entry[t.id];
      if(v == null) return;
      if(best === null || v > best){ best = v; bestDate = ds; }
    });
    if(best !== null) records[t.id] = { value: best, date: bestDate, tracker: t };
  });
  return records;
}

// ---- Correlation insights ----
export function calcCorrelationInsights(){
  const results = [];
  const numTrackers = LOG_TRACKERS.filter(t => t.type === 'number' || t.type === 'stars');
  for(let i = 0; i < numTrackers.length; i++){
    for(let j = i + 1; j < numTrackers.length; j++){
      const a = numTrackers[i], b = numTrackers[j];
      const pairs = Object.keys(dailyLog)
        .map(ds => [dailyLog[ds][a.id], dailyLog[ds][b.id]])
        .filter(([x, y]) => x != null && y != null);
      if(pairs.length < 5) continue;
      const n = pairs.length;
      const mx = pairs.reduce((s,[x])=>s+x,0)/n, my = pairs.reduce((s,[,y])=>s+y,0)/n;
      const num = pairs.reduce((s,[x,y])=>s+(x-mx)*(y-my),0);
      const den = Math.sqrt(pairs.reduce((s,[x])=>s+(x-mx)**2,0)*pairs.reduce((s,[,y])=>s+(y-my)**2,0));
      if(den === 0) continue;
      const r = num / den;
      if(Math.abs(r) >= 0.4) results.push({ a: a.label, b: b.label, r: Math.round(r * 100) / 100, n });
    }
  }
  return results.sort((a,b) => Math.abs(b.r) - Math.abs(a.r));
}

export function avg(arr){ if(!arr || !arr.length) return null; return arr.reduce((a,b)=>a+b,0)/arr.length; }

// ---- Weekly report card ----
export function calcWeeklyReportCard(){
  const today = new Date();
  const days = Array.from({length:7}, (_,i) => {
    const d = new Date(today); d.setDate(today.getDate() - (6 - i)); return d;
  });
  return days.map(d => {
    const ds = dateStr(d);
    const habits = getHabitsForDate(d).filter(h => !isHabitSkippedFor(h.id, ds));
    const done = habits.filter(h => habitLog[ds]?.[h.id]?.done).length;
    return { date: ds, day: d.toLocaleDateString(undefined,{weekday:'short'}), done, total: habits.length, pct: pct100(done, habits.length) };
  });
}

// ---- Goal progress ----
export function calcGoalProgress(){
  if(!settings.goal) return null;
  const streak = calcStreak();
  const todayScore = calcTodayScore();
  return { streak, todayScore, goal: settings.goal };
}

// ---- Import validation ----
export function validateImportData(data){
  const errors = [];
  if(!isPlainObject(data)){ errors.push('File is not a valid backup object.'); return errors; }

  if('habitLog'        in data && !isPlainObject(data.habitLog))        errors.push('habitLog is malformed.');
  if('dailyLog'        in data && !isPlainObject(data.dailyLog))        errors.push('dailyLog is malformed.');
  if('settings'        in data && !isPlainObject(data.settings))        errors.push('settings is malformed.');
  if('workoutTemplate' in data && !isPlainObject(data.workoutTemplate)) errors.push('workoutTemplate is malformed.');
  if('workoutOverrides'in data && !isPlainObject(data.workoutOverrides))errors.push('workoutOverrides is malformed.');
  if('skippedHabits'   in data && !isPlainObject(data.skippedHabits))   errors.push('skippedHabits is malformed.');
  if('exerciseLog'     in data && !isPlainObject(data.exerciseLog))      errors.push('exerciseLog is malformed.');

  if('routines' in data){
    if(!Array.isArray(data.routines)){ errors.push('routines must be a list.'); }
    else if(data.routines.length > 50){ errors.push('routines: too many groups (max 50).'); }
    else{
      data.routines.forEach((r,i)=>{
        if(!isPlainObject(r) || !isSafeString(r.id,80) || !isSafeString(r.group,120)){ errors.push(`routines[${i}] is malformed.`); return; }
        if(r.color !== undefined && !isSafeString(r.color,30)) errors.push(`routines[${i}].color is malformed.`);
        if(r.habits && !Array.isArray(r.habits)){ errors.push(`routines[${i}].habits must be a list.`); return; }
        if((r.habits||[]).length > 200){ errors.push(`routines[${i}].habits: too many habits (max 200).`); return; }
        (r.habits||[]).forEach((h,j)=>{
          if(!isPlainObject(h) || !isSafeString(h.id,80) || !isSafeString(h.name,200)){ errors.push(`routines[${i}].habits[${j}] is malformed.`); return; }
          if(h.sub   !== undefined && !isSafeString(h.sub,  300)) errors.push(`routines[${i}].habits[${j}].sub is too long.`);
          if(h.icon  !== undefined && !isSafeString(h.icon,  20)) errors.push(`routines[${i}].habits[${j}].icon is too long.`);
          if(h.color !== undefined && !isSafeString(h.color, 30)) errors.push(`routines[${i}].habits[${j}].color is too long.`);
          if(h.time  !== undefined && !isSafeString(h.time,  20)) errors.push(`routines[${i}].habits[${j}].time is malformed.`);
          if(h.freq  !== undefined && !isSafeString(h.freq,  20)) errors.push(`routines[${i}].habits[${j}].freq is malformed.`);
        });
      });
    }
  }

  if('logTrackers' in data){
    if(!Array.isArray(data.logTrackers)){ errors.push('logTrackers must be a list.'); }
    else if(data.logTrackers.length > 50){ errors.push('logTrackers: too many trackers (max 50).'); }
    else{
      data.logTrackers.forEach((t,i)=>{
        if(!isPlainObject(t) || !isSafeString(t.id,80) || !isSafeString(t.label,120)){ errors.push(`logTrackers[${i}] is malformed.`); return; }
        if(t.icon            !== undefined && !isSafeString(t.icon,          20)) errors.push(`logTrackers[${i}].icon is too long.`);
        if(t.unit            !== undefined && !isSafeString(t.unit,          30)) errors.push(`logTrackers[${i}].unit is too long.`);
        if(t.notePlaceholder !== undefined && !isSafeString(t.notePlaceholder,200)) errors.push(`logTrackers[${i}].notePlaceholder is too long.`);
      });
    }
  }

  if('workoutTemplate' in data && isPlainObject(data.workoutTemplate)){
    Object.entries(data.workoutTemplate).forEach(([day,w])=>{
      if(!isPlainObject(w)) return;
      if(w.name      !== undefined && !isSafeString(w.name,   200)) errors.push(`workoutTemplate.${day}.name is too long.`);
      if(w.focus     !== undefined && !isSafeString(w.focus,  200)) errors.push(`workoutTemplate.${day}.focus is too long.`);
      if(w.exercises !== undefined){
        if(!Array.isArray(w.exercises)){ errors.push(`workoutTemplate.${day}.exercises must be a list.`); return; }
        if(w.exercises.length > 50) errors.push(`workoutTemplate.${day}.exercises: too many (max 50).`);
        w.exercises.forEach((ex,i)=>{ if(!isSafeString(ex,300)) errors.push(`workoutTemplate.${day}.exercises[${i}] is too long.`); });
      }
    });
  }

  return errors;
}
