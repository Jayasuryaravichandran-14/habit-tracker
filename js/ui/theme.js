// ============================================================
// ui/theme.js — Theme application, accent color, auto dark mode
// ============================================================

import { THEMES, ACCENT_COLORS } from '../constants.js';
import * as state from '../state.js';

export function applyTheme(themeId, save = true){
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const root  = document.documentElement;
  root.style.setProperty('--bg',       theme.bg);
  root.style.setProperty('--surface',  theme.surface);
  root.style.setProperty('--surface2', theme.surface2);
  root.style.setProperty('--surface3', theme.surface3);
  root.style.setProperty('--border',   theme.border);
  root.style.setProperty('--text',     theme.text);
  root.style.setProperty('--text2',    theme.text2);
  root.style.setProperty('--text3',    theme.text3);
  root.style.setProperty('--accent',   theme.accent);
  root.style.setProperty('--accent2',  theme.accent2);
  root.style.setProperty('--accent3',  theme.accent3);
  root.style.setProperty('--green',    theme.green);
  state.setCurrentTheme(themeId);
  if(save) localStorage.setItem('ht3-theme', themeId);
}

export function setAccentColor(color){
  document.documentElement.style.setProperty('--accent2', color);
  localStorage.setItem('ht3-accent', color);
}

let _autoThemeMediaQuery = null;
export function initAutoTheme(){
  if(_autoThemeMediaQuery) return;
  _autoThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const auto = localStorage.getItem('ht3-auto-theme') !== '0';
  if(auto){
    applySystemTheme(_autoThemeMediaQuery.matches);
    _autoThemeMediaQuery.addEventListener('change', e => {
      if(localStorage.getItem('ht3-auto-theme') !== '0') applySystemTheme(e.matches);
    });
  }
}

function applySystemTheme(dark){
  const saved = localStorage.getItem('ht3-theme');
  if(dark && saved !== 'dark' && saved !== 'midnight') applyTheme('dark', false);
  else if(!dark && (saved === 'dark' || saved === 'midnight')) applyTheme('goofy', false);
}

export function renderThemePicker(containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  el.innerHTML = THEMES.map(t => `
    <button class="theme-swatch ${state.currentTheme === t.id ? 'active' : ''}"
            style="background:${t.bg};border:2px solid ${t.border};color:${t.text}"
            onclick="import('./js/ui/theme.js').then(m=>m.applyTheme('${t.id}'))"
            title="${t.label}">${t.label}</button>
  `).join('');
}

export function renderAccentPicker(containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  const current = getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim();
  el.innerHTML = ACCENT_COLORS.map(c => `
    <button class="accent-swatch ${current === c ? 'active' : ''}"
            style="background:${c}"
            onclick="import('./js/ui/theme.js').then(m=>m.setAccentColor('${c}'))"
            title="${c}"></button>
  `).join('');
}
