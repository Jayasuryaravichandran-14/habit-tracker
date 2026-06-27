// ============================================================
// renders/home.js — Home page render
// ============================================================

import * as state from '../state.js';
import { escapeHTML, getPageDate, getPageDateStr, getHabitsForDate, calcStreak, calcTodayScore, getQuoteOfTheDay, fmtDate, isHabitSkippedFor, pct100, getWorkoutForDate, dateStr } from '../helpers.js';
import { checkHabit, skipHabit } from '../habits.js';
import { showSkeleton } from '../ui/skeleton.js';

export function renderHome(){
  const ds   = getPageDateStr('home');
  const date = getPageDate('home');
  const habits = getHabitsForDate(date);
  const done   = habits.filter(h => state.habitLog[ds]?.[h.id]?.done).length;
  const score  = pct100(done, habits.length);
  const streak = calcStreak();
  const wod    = getWorkoutForDate(date);

  // ---- Header ----
  const header = document.getElementById('home-header');
  if(header){
    header.innerHTML = `
      <div class="home-date-nav">
        <button class="btn-icon" onclick="import('./js/renders/home.js').then(m=>m.shiftHomeDate(-1))">‹</button>
        <span class="home-date-label">${isToday(ds) ? 'Today' : fmtDate(date)}</span>
        <button class="btn-icon" onclick="import('./js/renders/home.js').then(m=>m.shiftHomeDate(1))" ${state.pageDate.home >= 0 ? 'disabled' : ''}>›</button>
      </div>
      <div class="home-stats">
        <span class="stat-pill">🔥 ${streak}</span>
        <span class="stat-pill">${score}%</span>
      </div>`;
  }

  // ---- Quote ----
  const quoteEl = document.getElementById('home-quote');
  if(quoteEl) quoteEl.textContent = getQuoteOfTheDay(date);

  // ---- Progress bar ----
  const progEl = document.getElementById('dash-prog-bars');
  if(progEl){
    if(!habits.length){
      progEl.innerHTML = `<p class="empty-msg">No habits scheduled for this day.</p>`;
    } else {
      progEl.innerHTML = `
        <div class="progress-bar-wrap">
          <div class="progress-bar" style="width:${score}%"></div>
        </div>
        <p class="progress-label">${done} / ${habits.length} habits complete</p>`;
    }
  }

  // ---- Habit list ----
  const listEl = document.getElementById('routine-list');
  if(listEl){
    if(!habits.length){
      listEl.innerHTML = `<p class="empty-msg">No habits for this day. <a href="#" onclick="import('./js/ui/nav.js').then(m=>m.navigateTo('routines'))">Add some →</a></p>`;
    } else {
      listEl.innerHTML = habits.map(h => renderHabitRow(h, ds)).join('');
    }
  }

  // ---- Workout card ----
  const wodEl = document.getElementById('home-wod');
  if(wodEl){
    if(wod){
      const exStates = JSON.parse(localStorage.getItem('ht3-exlog') || '{}');
      const dayStates = exStates[ds] || {};
      const exDone = (wod.exercises||[]).filter((_,i) => dayStates[`ex_${i}`]).length;
      wodEl.innerHTML = `
        <div class="wod-card">
          <div class="wod-header">
            <span class="wod-title">${escapeHTML(wod.name)}</span>
            <span class="wod-focus">${escapeHTML(wod.focus || '')}</span>
          </div>
          <ul class="wod-exercises">
            ${(wod.exercises||[]).map((ex,i) => `
              <li class="wod-ex ${dayStates[`ex_${i}`] ? 'done' : ''}"
                  onclick="import('./js/habits.js').then(m=>m.toggleExercise('${escapeHTML(ds)}','ex_${i}'))">
                <span class="wod-check">${dayStates[`ex_${i}`] ? '✅' : '⬜'}</span>
                ${escapeHTML(ex)}
              </li>`).join('')}
          </ul>
          <p class="wod-progress">${exDone}/${(wod.exercises||[]).length} exercises done</p>
        </div>`;
    } else {
      wodEl.innerHTML = '';
    }
  }
}

function renderHabitRow(h, ds){
  const done    = !!state.habitLog[ds]?.[h.id]?.done;
  const skipped = isHabitSkippedFor(h.id, ds);
  const note    = state.habitLog[ds]?.[h.id]?.note;
  return `
    <div class="habit-row ${done ? 'done' : ''} ${skipped ? 'skipped' : ''}"
         data-habit-id="${escapeHTML(h.id)}">
      <button class="habit-check" onclick="import('./js/habits.js').then(m=>m.checkHabit('${escapeHTML(h.id)}'))">
        ${done ? '✅' : '⬜'}
      </button>
      <div class="habit-info" onclick="import('./js/habits.js').then(m=>m.checkHabit('${escapeHTML(h.id)}'))">
        <span class="habit-icon">${escapeHTML(h.icon || '')}</span>
        <span class="habit-name">${escapeHTML(h.name)}</span>
        ${h.sub ? `<span class="habit-sub">${escapeHTML(h.sub)}</span>` : ''}
      </div>
      <div class="habit-actions">
        ${note ? `<button class="btn-icon" title="Has note">📝</button>` : ''}
        <button class="btn-icon" onclick="import('./js/habits.js').then(m=>m.skipHabit('${escapeHTML(h.id)}'))"
                title="${skipped ? 'Unskip' : 'Skip'}">${skipped ? '↩️' : '⏭️'}</button>
      </div>
    </div>`;
}

export function shiftHomeDate(delta){
  state.pageDate.home = Math.min(0, state.pageDate.home + delta);
  renderHome();
}

function isToday(ds){ return ds === dateStr(new Date()); }
