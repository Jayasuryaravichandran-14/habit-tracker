// ============================================================
// renders/analytics.js — Analytics page
// ============================================================

import * as state from '../state.js';
import {
  escapeHTML, dateStr, getPageDateStr, getHabitsForDate,
  isHabitDueOn, calcStreak, calcBestStreak, calcScoreForDate,
  calcWeeklyReportCard, calcCorrelationInsights, getGradientColor,
  pct100, avg
} from '../helpers.js';

let _lastKey = null;
let _charts  = {};

// Offset state
let _dayOffset    = 0;
let _weekOffset   = 0;
let _monthOffset  = 0;
let _yearOffset   = 0;

export function renderAnalytics(){
  const tab     = state.analyticsTab || 'day';
  const content = document.getElementById('analytics-content');
  if(!content) return;

  // Dedupe renders — skip if nothing changed
  const key = `${tab}|${_dayOffset}|${_weekOffset}|${_monthOffset}|${_yearOffset}|${state.dataVersion}`;
  if(key === _lastKey && content.childElementCount > 0) return;
  _lastKey = key;

  // Destroy old charts
  Object.values(_charts).forEach(c => { try{ c.destroy(); }catch(e){} });
  _charts = {};

  // Tab pills header
  const tabs = ['day','week','month','year','insights'];
  content.innerHTML = `
    <div class="tab-pills" style="margin-bottom:12px">
      ${tabs.map(t => `
        <button class="tab-pill ${tab === t ? 'active' : ''}"
                onclick="import('./js/renders/analytics.js').then(m=>m.setAnalyticsTab('${t}'))">
          ${t.charAt(0).toUpperCase() + t.slice(1)}
        </button>`).join('')}
    </div>
    <div id="analytics-body"></div>`;

  const body = document.getElementById('analytics-body');
  switch(tab){
    case 'day':      renderDay(body);      break;
    case 'week':     renderWeek(body);     break;
    case 'month':    renderMonth(body);    break;
    case 'year':     renderYear(body);     break;
    case 'insights': renderInsights(body); break;
  }
}

export function setAnalyticsTab(tab){
  state.setAnalyticsTab(tab);
  _lastKey = null;
  renderAnalytics();
}

// ---- Shared nav header ----
function navHeader(title, sub, prevFn, nextFn, disableFwd){
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <button class="date-nav-btn" onclick="${prevFn}">‹</button>
      <div style="text-align:center">
        <div style="font-size:13px;font-weight:700">${title}</div>
        <div style="font-size:10px;color:var(--text3)">${sub}</div>
      </div>
      <button class="date-nav-btn" onclick="${nextFn}" ${disableFwd ? 'disabled' : ''}>›</button>
    </div>`;
}

// ---- DAY VIEW ----
function renderDay(el){
  const d  = new Date(); d.setDate(d.getDate() + _dayOffset);
  const ds = dateStr(d);
  const isToday = _dayOffset === 0;
  const hLog = state.habitLog[ds] || {};
  const dLog = state.dailyLog[ds] || {};
  const allH = getHabitsForDate(d);
  const doneH = allH.filter(h => hLog[h.id]?.done);
  const missH = allH.filter(h => !hLog[h.id]?.done);
  const pct   = pct100(doneH.length, allH.length);
  const score = calcScoreForDate(ds) ?? 0;

  const catRows = state.ROUTINES.map(g => {
    const gh = (g.habits || []).filter(h => isHabitDueOn(h, d));
    const gd = gh.filter(h => hLog[h.id]?.done).length;
    return { group: g.group, color: g.color, done: gd, total: gh.length };
  }).filter(r => r.total > 0);

  const logRows = state.LOG_TRACKERS.map(t => {
    const val = dLog[t.id];
    if(val === undefined || val === null || val === '') return null;
    let display = '', color = 'var(--text2)';
    if(t.type === 'toggle'){
      display = val ? '✓ Done' : '✗ Not done';
      color   = val ? 'var(--green)' : 'var(--red)';
    } else if(t.type === 'stars'){
      display = '★'.repeat(val || 0) + ' (' + val + '/' + t.max + ')';
      color   = val ? getGradientColor(val, t.max, t.low, t.high, t.invertColor) : 'var(--text3)';
    } else {
      display = (val || 0) + (t.unit ? ' ' + t.unit : '');
      color   = getGradientColor(val, t.max, t.low, t.high, t.invertColor);
    }
    return { icon: t.icon, label: t.label, display, color };
  }).filter(Boolean);

  el.innerHTML = `
    ${navHeader(
      isToday ? 'Today' : d.toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'short' }),
      d.toLocaleDateString(undefined, { day:'numeric', month:'long', year:'numeric' }),
      "import('./js/renders/analytics.js').then(m=>m.shiftDay(-1))",
      "import('./js/renders/analytics.js').then(m=>m.shiftDay(1))",
      _dayOffset >= 0
    )}
    <div class="stats-row">
      <div class="stat-mini"><div class="num" style="color:var(--accent)">${score}</div><div class="lbl">Score</div></div>
      <div class="stat-mini"><div class="num" style="color:${pct>=80?'var(--green)':pct>=50?'var(--yellow)':'var(--red)'}">${pct}%</div><div class="lbl">Done</div></div>
      <div class="stat-mini"><div class="num">${calcStreak()}🔥</div><div class="lbl">Streak</div></div>
    </div>
    <div class="card">
      <div class="card-title">📂 By Routine</div>
      ${catRows.length ? catRows.map(r => {
        const p = pct100(r.done, r.total);
        return `<div class="prog-bar-wrap">
          <div class="prog-bar-row"><span style="font-size:12px">${escapeHTML(r.group)}</span><span style="font-size:11px">${r.done}/${r.total}</span></div>
          <div class="prog-bar tall"><div class="prog-fill" style="width:${p}%;background:${r.color||'var(--accent)'}"><span class="prog-fill-label">${p}%</span></div></div>
        </div>`;
      }).join('') : '<div class="chart-empty">No habits due.</div>'}
    </div>
    <div class="card">
      <div class="card-title">✅ Completed (${doneH.length}/${allH.length})</div>
      ${doneH.length ? `<div class="habit-chip-grid">${doneH.map(h => `<div class="habit-chip done">✓ ${escapeHTML(h.icon||'')} ${escapeHTML(h.name)}</div>`).join('')}</div>` : '<p style="font-size:12px;color:var(--text2)">None yet.</p>'}
      ${missH.length ? `<div style="margin-top:8px"><div class="habit-chip-grid">${missH.map(h => `<div class="habit-chip missed">✗ ${escapeHTML(h.icon||'')} ${escapeHTML(h.name)}</div>`).join('')}</div></div>` : ''}
    </div>
    ${logRows.length ? `<div class="card">
      <div class="card-title">📝 Daily Log</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${logRows.map(r => `
          <div style="background:var(--surface3);border-radius:var(--r3);padding:10px;display:flex;align-items:center;gap:8px">
            <span style="font-size:18px">${escapeHTML(r.icon||'')}</span>
            <div>
              <div style="font-size:10px;color:var(--text3)">${escapeHTML(r.label)}</div>
              <div style="font-size:13px;font-weight:700;color:${r.color}">${escapeHTML(r.display)}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}`;
}

export function shiftDay(d){ _dayOffset = Math.min(0, _dayOffset + d); _lastKey = null; renderAnalytics(); }

// ---- WEEK VIEW ----
function renderWeek(el){
  const today = new Date();
  const base  = new Date(today); base.setDate(base.getDate() + _weekOffset * 7);
  const labels = [], scores = [], moods = [], sleeps = [];
  for(let i = 6; i >= 0; i--){
    const d  = new Date(base); d.setDate(d.getDate() - i);
    const ds = dateStr(d);
    labels.push(d.toLocaleDateString(undefined, { weekday:'short' }));
    scores.push(calcScoreForDate(ds) ?? 0);
    moods.push(state.dailyLog[ds]?.mood || null);
    sleeps.push(state.dailyLog[ds]?.sleep || null);
  }
  const weekCard = calcWeeklyReportCard();
  const weekAvg  = Math.round(scores.reduce((a,b)=>a+b,0) / scores.length);

  el.innerHTML = `
    ${navHeader(
      _weekOffset === 0 ? 'This Week' : `Week of ${base.toLocaleDateString(undefined,{month:'short',day:'numeric'})}`,
      `Avg score: ${weekAvg}%`,
      "import('./js/renders/analytics.js').then(m=>m.shiftWeek(-1))",
      "import('./js/renders/analytics.js').then(m=>m.shiftWeek(1))",
      _weekOffset >= 0
    )}
    <div class="stats-row">
      <div class="stat-mini"><div class="num" style="color:var(--accent)">${weekAvg}%</div><div class="lbl">Avg Score</div></div>
      <div class="stat-mini"><div class="num">${calcStreak()}🔥</div><div class="lbl">Streak</div></div>
      <div class="stat-mini"><div class="num">${calcBestStreak()}</div><div class="lbl">Best Streak</div></div>
    </div>
    <div class="card">
      <div class="card-title">📊 Daily Scores</div>
      <div class="chart-wrap"><canvas id="week-score-chart"></canvas></div>
    </div>
    <div class="card">
      <div class="card-title">📅 This Week</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center">
        ${weekCard.map(d => `
          <div>
            <div style="font-size:10px;color:var(--text3)">${d.day}</div>
            <div style="font-size:11px;font-weight:700;color:${d.pct>=80?'var(--green)':d.pct>=50?'var(--yellow)':'var(--red)'}">${d.pct}%</div>
            <div style="font-size:9px;color:var(--text3)">${d.done}/${d.total}</div>
          </div>`).join('')}
      </div>
    </div>`;

  // Chart.js
  tryRenderChart('week-score-chart', {
    type: 'bar',
    data: { labels, datasets:[{ data: scores, backgroundColor: scores.map(s => s>=80?'#4ade80':s>=50?'#facc15':'#f87171'), borderRadius:6 }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{min:0,max:100} } }
  });
}

export function shiftWeek(d){ _weekOffset = Math.min(0, _weekOffset + d); _lastKey = null; renderAnalytics(); }

// ---- MONTH VIEW ----
function renderMonth(el){
  const today = new Date();
  const base  = new Date(today.getFullYear(), today.getMonth() + _monthOffset, 1);
  const year  = base.getFullYear(), month = base.getMonth();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const labels = [], scores = [];
  for(let day = 1; day <= daysInMonth; day++){
    const d  = new Date(year, month, day);
    const ds = dateStr(d);
    labels.push(String(day));
    scores.push(calcScoreForDate(ds) ?? 0);
  }
  const monthAvg = Math.round(scores.reduce((a,b)=>a+b,0) / scores.length);

  el.innerHTML = `
    ${navHeader(
      base.toLocaleDateString(undefined, { month:'long', year:'numeric' }),
      `Avg score: ${monthAvg}%`,
      "import('./js/renders/analytics.js').then(m=>m.shiftMonth(-1))",
      "import('./js/renders/analytics.js').then(m=>m.shiftMonth(1))",
      _monthOffset >= 0
    )}
    <div class="stats-row">
      <div class="stat-mini"><div class="num" style="color:var(--accent)">${monthAvg}%</div><div class="lbl">Avg Score</div></div>
      <div class="stat-mini"><div class="num">${scores.filter(s=>s>=80).length}</div><div class="lbl">Great Days</div></div>
      <div class="stat-mini"><div class="num">${scores.filter(s=>s===0).length}</div><div class="lbl">Missed</div></div>
    </div>
    <div class="card">
      <div class="card-title">📈 Daily Scores — ${base.toLocaleDateString(undefined,{month:'long'})}</div>
      <div class="chart-wrap"><canvas id="month-score-chart"></canvas></div>
    </div>`;

  tryRenderChart('month-score-chart', {
    type: 'line',
    data: { labels, datasets:[{
      data: scores,
      borderColor: 'var(--accent)',
      backgroundColor: 'rgba(34,197,94,0.1)',
      fill: true, tension: 0.3, pointRadius: 2
    }]},
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{min:0,max:100} } }
  });
}

export function shiftMonth(d){ _monthOffset = Math.min(0, _monthOffset + d); _lastKey = null; renderAnalytics(); }

// ---- YEAR VIEW ----
function renderYear(el){
  const today = new Date();
  const year  = today.getFullYear() + _yearOffset;
  const months = Array.from({length:12},(_,i)=>new Date(year,i,1));
  const labels = months.map(m => m.toLocaleDateString(undefined,{month:'short'}));
  const scores = months.map(m => {
    const days = new Date(year,m.getMonth()+1,0).getDate();
    const monthScores = Array.from({length:days},(_,i)=>calcScoreForDate(dateStr(new Date(year,m.getMonth(),i+1)))||0);
    return Math.round(monthScores.reduce((a,b)=>a+b,0)/monthScores.length);
  });
  const yearAvg = Math.round(scores.reduce((a,b)=>a+b,0)/12);

  el.innerHTML = `
    ${navHeader(
      String(year), `Annual avg: ${yearAvg}%`,
      "import('./js/renders/analytics.js').then(m=>m.shiftYear(-1))",
      "import('./js/renders/analytics.js').then(m=>m.shiftYear(1))",
      _yearOffset >= 0
    )}
    <div class="card">
      <div class="card-title">📊 Monthly Averages — ${year}</div>
      <div class="chart-wrap"><canvas id="year-chart"></canvas></div>
    </div>`;

  tryRenderChart('year-chart', {
    type: 'bar',
    data: { labels, datasets:[{ data:scores, backgroundColor:'var(--accent2)', borderRadius:6 }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{min:0,max:100}} }
  });
}

export function shiftYear(d){ _yearOffset = Math.min(0, _yearOffset + d); _lastKey = null; renderAnalytics(); }

// ---- INSIGHTS VIEW ----
function renderInsights(el){
  const correlations = calcCorrelationInsights();
  const streak       = calcStreak();
  const bestStreak   = calcBestStreak();
  const allDates     = Object.keys(state.habitLog).sort();
  const totalDays    = allDates.length;

  el.innerHTML = `
    <div class="card">
      <div class="card-title">🔥 Streak Stats</div>
      <div class="stats-row">
        <div class="stat-mini"><div class="num" style="color:var(--accent)">${streak}</div><div class="lbl">Current</div></div>
        <div class="stat-mini"><div class="num" style="color:var(--accent2)">${bestStreak}</div><div class="lbl">Best Ever</div></div>
        <div class="stat-mini"><div class="num">${totalDays}</div><div class="lbl">Days Tracked</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">🔗 Correlations</div>
      ${correlations.length ? correlations.slice(0,6).map(c => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--surface2)">
          <span style="font-size:12px">${escapeHTML(c.a)} ↔ ${escapeHTML(c.b)}</span>
          <span style="font-size:13px;font-weight:700;color:${c.r>0?'var(--green)':'var(--red)'}">${c.r>0?'+':''}${c.r} (n=${c.n})</span>
        </div>`).join('')
      : '<p style="font-size:12px;color:var(--text2)">Track more days to see correlations between your habits and metrics.</p>'}
    </div>`;
}

// ---- Chart.js helper ----
function tryRenderChart(canvasId, config){
  if(typeof Chart === 'undefined') return;
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  try{
    _charts[canvasId] = new Chart(canvas.getContext('2d'), config);
  }catch(e){ console.warn('Chart render failed:', e); }
}
