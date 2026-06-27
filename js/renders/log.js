// ============================================================
// renders/log.js — Daily Log page
// ============================================================

import * as state from '../state.js';
import { escapeHTML, getPageDate, getPageDateStr, dateStr, getGradientColor } from '../helpers.js';
import { saveData } from '../storage.js';
import { updateLogCompleteBadge } from '../ui/badges.js';
import { showSnackbar } from '../ui/snackbar.js';

export function renderLog(){
  const now = getPageDate('log');
  const td  = getPageDateStr('log');

  // Update date sub-label
  const dateSub = document.getElementById('log-date-sub');
  if(dateSub) dateSub.textContent = now.toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long' });

  // Smart defaults — pre-fill from last filled entry if today is empty
  if(state.pageDate.log === 0 && !Object.keys(state.dailyLog[td] || {}).length){
    for(let i = 1; i <= 7; i++){
      const pd = new Date(); pd.setDate(pd.getDate() - i);
      const prev = state.dailyLog[dateStr(pd)];
      if(prev && Object.keys(prev).length > 0){
        state.LOG_TRACKERS.forEach(t => {
          if((t.type === 'number' || t.type === 'stars') && prev[t.id] != null){
            if(!state.dailyLog[td]) state.dailyLog[td] = {};
            state.dailyLog[td][t.id] = prev[t.id];
          }
        });
        break;
      }
    }
  }

  const dLog  = state.dailyLog[td] || {};
  const yd    = new Date(now); yd.setDate(yd.getDate() - 1);
  const yLog  = state.dailyLog[dateStr(yd)] || {};

  // Restore emoji stamp
  const savedStamp = dLog['emoji_stamp'] || '';
  document.querySelectorAll('.emoji-stamp').forEach(el => {
    el.classList.toggle('selected', el.dataset.stamp === savedStamp);
  });

  let html = '';
  state.LOG_TRACKERS.forEach(t => {
    const val = dLog[t.id];
    let inputHTML = '';

    if(t.id === 'sleep'){
      const bed  = dLog.sleep_bed  || '';
      const wake = dLog.sleep_wake || '';
      const hrs  = val != null ? val : '';
      inputHTML = `
        <div class="sleep-picker">
          <div style="flex:1;min-width:110px">
            <div style="font-size:10px;font-weight:700;color:var(--text3);margin-bottom:4px">🌙 BEDTIME</div>
            <input type="time" value="${escapeHTML(bed)}"
                   onchange="import('./js/renders/log.js').then(m=>m.setSleepTime('bed',this.value))">
          </div>
          <div style="flex:1;min-width:110px">
            <div style="font-size:10px;font-weight:700;color:var(--text3);margin-bottom:4px">⏰ WAKE UP</div>
            <input type="time" value="${escapeHTML(wake)}"
                   onchange="import('./js/renders/log.js').then(m=>m.setSleepTime('wake',this.value))">
          </div>
          <div class="sleep-result" id="sleep-result">${hrs ? hrs + 'h' : '—'}</div>
        </div>`;
    } else if(t.type === 'stars'){
      const cur = val || 0;
      const starColor = cur ? getGradientColor(cur, t.max, t.low, t.high, t.invertColor) : 'var(--text3)';
      inputHTML = `
        <div class="log-stars" id="stars-${t.id}">
          ${[1,2,3,4,5].map(i => `
            <span class="log-star${i <= cur ? ' active' : ''}"
                  style="${i <= cur ? 'color:' + starColor : ''}"
                  onclick="import('./js/renders/log.js').then(m=>m.setStars('${escapeHTML(t.id)}',${i}))">
              ${i <= cur ? '★' : '☆'}
            </span>`).join('')}
        </div>`;
    } else if(t.type === 'toggle'){
      const isOn = val === true || val === 1 || val === 'true';
      inputHTML = `
        <div style="display:flex;align-items:center;gap:12px">
          <button class="log-toggle${isOn ? ' on' : ''}" id="tog-${escapeHTML(t.id)}"
                  onclick="import('./js/renders/log.js').then(m=>m.setToggle('${escapeHTML(t.id)}',${!isOn}))">
            ${isOn ? '✓' : '○'}
          </button>
          <span style="font-size:14px;font-weight:600;color:${isOn ? 'var(--green)' : 'var(--text3)'}">
            ${isOn ? 'Done ✓' : 'Not done'}
          </span>
        </div>`;
    } else if(t.id === 'water'){
      const maxGlasses = t.max || 8;
      inputHTML = `<div id="water-bubbles-wrap">${renderWaterBubbles(td, maxGlasses)}</div>`;
    } else if(t.type === 'number'){
      const numVal   = val !== undefined && val !== null ? val : '';
      const numColor = numVal !== '' ? getGradientColor(parseFloat(numVal), t.max, t.low, t.high, t.invertColor) : 'var(--text3)';
      inputHTML = `
        <div style="display:flex;align-items:center;gap:10px">
          <input type="number" class="log-input" id="num-${escapeHTML(t.id)}"
                 value="${escapeHTML(String(numVal))}"
                 min="${t.min}" max="${t.max}" step="${t.step || 1}"
                 placeholder="0" style="width:90px;color:${numColor}"
                 oninput="import('./js/renders/log.js').then(m=>m.setNumber('${escapeHTML(t.id)}',this.value))">
          <span style="font-size:13px;color:var(--text2)">${escapeHTML(t.unit || '')}</span>
        </div>`;
    }

    // Yesterday comparison
    let compareHTML = '';
    const yVal = yLog[t.id];
    if(yVal != null && val != null && t.type !== 'toggle'){
      const diff = parseFloat(val) - parseFloat(yVal);
      const isInv = t.invertColor;
      const cls   = diff === 0 ? 'same' : ((diff > 0 && !isInv) || (diff < 0 && isInv)) ? 'better' : 'worse';
      const arrow = diff === 0 ? '→' : diff > 0 ? '↑' : '↓';
      compareHTML = `<div class="log-compare ${cls}">${arrow} Yesterday: ${yVal}${t.unit ? ' ' + t.unit : ''}</div>`;
    } else if(yVal != null && val == null){
      compareHTML = `<div class="log-compare">Yesterday: ${yVal}${t.unit ? ' ' + t.unit : ''}</div>`;
    }

    // Note textarea
    let noteHTML = '';
    if(t.note){
      const noteVal = dLog['note_' + t.id] || '';
      noteHTML = `
        <textarea class="note-input" id="notetext-${escapeHTML(t.id)}" rows="2"
                  placeholder="${escapeHTML(t.notePlaceholder || 'Add a note...')}"
                  oninput="import('./js/renders/log.js').then(m=>m.setLogNote('${escapeHTML(t.id)}',this.value))"
        >${escapeHTML(noteVal)}</textarea>`;
    }

    html += `
      <div class="log-tracker">
        <div class="log-tracker-header">
          <span class="log-tracker-icon">${escapeHTML(t.icon || '')}</span>
          <span class="log-tracker-title">${escapeHTML(t.label)}</span>
        </div>
        ${inputHTML}${compareHTML}${noteHTML}
      </div>`;
  });

  const container = document.getElementById('log-trackers');
  if(container) container.innerHTML = html || '<p class="empty-msg">No trackers yet. Add some in Settings.</p>';

  updateLogSaveStatus();
  updateLogCompleteBadge();
}

// ---- Water bubbles ----
function renderWaterBubbles(td, max){
  const cur = state.dailyLog[td]?.water || 0;
  return Array.from({ length: max }, (_, i) => `
    <span class="water-bubble ${i < cur ? 'filled' : ''}"
          onclick="import('./js/renders/log.js').then(m=>m.setWaterGlass(${i + 1}))">
      ${i < cur ? '💧' : '○'}
    </span>`).join('');
}

export function setWaterGlass(n){
  const td = getPageDateStr('log');
  if(!state.dailyLog[td]) state.dailyLog[td] = {};
  const cur = state.dailyLog[td].water || 0;
  state.dailyLog[td].water = cur === n ? n - 1 : n;
  const t = state.LOG_TRACKERS.find(x => x.id === 'water');
  const wrap = document.getElementById('water-bubbles-wrap');
  if(wrap) wrap.innerHTML = renderWaterBubbles(td, t?.max || 8);
  import('../storage.js').then(m => { m.saveData(); });
  updateLogSaveStatus();
  updateLogCompleteBadge();
}

// ---- Setters ----
export function setStars(id, val){
  const td = getPageDateStr('log');
  if(!state.dailyLog[td]) state.dailyLog[td] = {};
  const cur = state.dailyLog[td][id];
  state.dailyLog[td][id] = cur === val ? 0 : val;
  import('../helpers.js').then(({ markDayDirty }) => markDayDirty(td));
  const t = state.LOG_TRACKERS.find(x => x.id === id);
  const newVal = state.dailyLog[td][id];
  const c = newVal ? getGradientColor(newVal, t.max, t.low, t.high, t.invertColor) : 'var(--text3)';
  const container = document.getElementById('stars-' + id);
  if(container) container.innerHTML = [1,2,3,4,5].map(i => `
    <span class="log-star${i <= newVal ? ' active' : ''}"
          style="${i <= newVal ? 'color:' + c : ''}"
          onclick="import('./js/renders/log.js').then(m=>m.setStars('${escapeHTML(id)}',${i}))">
      ${i <= newVal ? '★' : '☆'}
    </span>`).join('');
  saveData(); updateLogSaveStatus(); updateLogCompleteBadge();
}

export function setToggle(id, val){
  const td = getPageDateStr('log');
  if(!state.dailyLog[td]) state.dailyLog[td] = {};
  state.dailyLog[td][id] = val;
  import('../helpers.js').then(({ markDayDirty }) => markDayDirty(td));
  const btn = document.getElementById('tog-' + id);
  if(btn){
    btn.className = 'log-toggle' + (val ? ' on' : '');
    btn.textContent = val ? '✓' : '○';
    btn.onclick = () => setToggle(id, !val);
    if(btn.nextElementSibling){
      btn.nextElementSibling.textContent = val ? 'Done ✓' : 'Not done';
      btn.nextElementSibling.style.color = val ? 'var(--green)' : 'var(--text3)';
    }
  }
  saveData(); updateLogSaveStatus(); updateLogCompleteBadge();
}

export function setNumber(id, val){
  const td = getPageDateStr('log');
  if(!state.dailyLog[td]) state.dailyLog[td] = {};
  const num = val === '' ? null : parseFloat(val);
  state.dailyLog[td][id] = num;
  import('../helpers.js').then(({ markDayDirty }) => markDayDirty(td));
  if(num !== null){
    const t = state.LOG_TRACKERS.find(x => x.id === id);
    if(t){
      const c = getGradientColor(num, t.max, t.low, t.high, t.invertColor);
      const inp = document.getElementById('num-' + id);
      if(inp) inp.style.color = c;
    }
  }
  saveData(); updateLogSaveStatus(); updateLogCompleteBadge();
}

export function setLogNote(id, val){
  const td = getPageDateStr('log');
  if(!state.dailyLog[td]) state.dailyLog[td] = {};
  state.dailyLog[td]['note_' + id] = val;
  import('../helpers.js').then(({ markDayDirty }) => markDayDirty(td));
  saveData(); updateLogSaveStatus(); updateLogCompleteBadge();
}

export function setSleepTime(field, val){
  const td = getPageDateStr('log');
  if(!state.dailyLog[td]) state.dailyLog[td] = {};
  if(field === 'bed')  state.dailyLog[td].sleep_bed  = val;
  if(field === 'wake') state.dailyLog[td].sleep_wake = val;
  import('../helpers.js').then(({ markDayDirty }) => markDayDirty(td));
  const bed  = state.dailyLog[td].sleep_bed;
  const wake = state.dailyLog[td].sleep_wake;
  if(bed && wake){
    const [bh, bm] = bed.split(':').map(Number);
    let [wh, wm]   = wake.split(':').map(Number);
    let diff = (wh * 60 + wm) - (bh * 60 + bm);
    if(diff < 0) diff += 1440;
    const hrs = Math.round(diff / 60 * 10) / 10;
    state.dailyLog[td].sleep = hrs;
    const el = document.getElementById('sleep-result');
    if(el) el.textContent = hrs + 'h';
  }
  saveData(); updateLogSaveStatus(); updateLogCompleteBadge();
}

export function setEmojiStamp(stamp, el){
  const td = getPageDateStr('log');
  if(!state.dailyLog[td]) state.dailyLog[td] = {};
  const prev = state.dailyLog[td]['emoji_stamp'];
  state.dailyLog[td]['emoji_stamp'] = prev === stamp ? '' : stamp;
  import('../helpers.js').then(({ markDayDirty }) => markDayDirty(td));
  document.querySelectorAll('.emoji-stamp').forEach(e => e.classList.remove('selected'));
  if(state.dailyLog[td]['emoji_stamp']) el.classList.add('selected');
  saveData();
}

function updateLogSaveStatus(){
  const el = document.getElementById('log-save-status');
  if(!el) return;
  const isToday = state.pageDate.log === 0;
  el.textContent = isToday ? '✓ Auto-saved' : '📅 Viewing past entry';
  el.style.color  = isToday ? 'var(--green)' : 'var(--text3)';
}
