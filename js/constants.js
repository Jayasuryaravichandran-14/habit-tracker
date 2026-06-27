// ============================================================
// constants.js — Static data: themes, quotes, starter content,
//                legacy backup constants, app version
// ============================================================

export const APP_VERSION = '6.0';

export const PAGE_ORDER = ['home', 'routines', 'log', 'analytics', 'settings'];

export const LOGS_WINDOW_DAYS = 180;

// ---- Themes ----
export const THEMES = [
  {id:'goofy',    label:'Goofy',      bg:'#fdf4ff', surface:'#fff',     surface2:'#f3e8ff', surface3:'#ede9fe', border:'#d8b4fe', text:'#3b0764', text2:'#7c3aed', text3:'#a78bfa', accent:'#7c3aed', accent2:'#f472b6', accent3:'#fb923c', green:'#4ade80'},
  {id:'ocean',    label:'Ocean',      bg:'#f0f9ff', surface:'#fff',     surface2:'#e0f2fe', surface3:'#bae6fd', border:'#7dd3fc', text:'#0c4a6e', text2:'#0284c7', text3:'#38bdf8', accent:'#0284c7', accent2:'#06b6d4', accent3:'#f59e0b', green:'#4ade80'},
  {id:'forest',   label:'Forest',     bg:'#f0fdf4', surface:'#fff',     surface2:'#dcfce7', surface3:'#bbf7d0', border:'#86efac', text:'#14532d', text2:'#16a34a', text3:'#4ade80', accent:'#16a34a', accent2:'#65a30d', accent3:'#f59e0b', green:'#4ade80'},
  {id:'sunset',   label:'Sunset',     bg:'#fff7ed', surface:'#fff',     surface2:'#ffedd5', surface3:'#fed7aa', border:'#fdba74', text:'#7c2d12', text2:'#ea580c', text3:'#fb923c', accent:'#ea580c', accent2:'#e11d48', accent3:'#a855f7', green:'#4ade80'},
  {id:'slate',    label:'Slate',      bg:'#f8fafc', surface:'#fff',     surface2:'#f1f5f9', surface3:'#e2e8f0', border:'#cbd5e1', text:'#0f172a', text2:'#475569', text3:'#94a3b8', accent:'#6366f1', accent2:'#8b5cf6', accent3:'#f59e0b', green:'#4ade80'},
  {id:'dark',     label:'Dark',       bg:'#0f0f13', surface:'#1a1a24', surface2:'#22222f', surface3:'#2a2a3a', border:'#3a3a50', text:'#e2e8f0', text2:'#a0aec0', text3:'#718096', accent:'#a78bfa', accent2:'#f472b6', accent3:'#fb923c', green:'#4ade80'},
  {id:'midnight', label:'Midnight',   bg:'#0d1117', surface:'#161b22', surface2:'#21262d', surface3:'#30363d', border:'#30363d', text:'#e6edf3', text2:'#8b949e', text3:'#6e7681', accent:'#388bfd', accent2:'#79c0ff', accent3:'#d29922', green:'#56d364'},
  {id:'rose',     label:'Rose',       bg:'#fff1f2', surface:'#fff',     surface2:'#ffe4e6', surface3:'#fecdd3', border:'#fda4af', text:'#881337', text2:'#e11d48', text3:'#fb7185', accent:'#e11d48', accent2:'#f43f5e', accent3:'#f97316', green:'#4ade80'},
];

export const ACCENT_COLORS = [
  '#f472b6','#fb923c','#facc15','#4ade80','#34d399','#22d3ee',
  '#60a5fa','#818cf8','#a78bfa','#e879f9','#f43f5e','#84cc16',
];

// ---- Motivational quotes ----
export const MOTIVATIONAL_QUOTES = [
  "Small steps every day lead to big changes.",
  "Discipline is choosing what you want most over what you want now.",
  "You don't have to be extreme, just consistent.",
  "Progress, not perfection.",
  "The secret of getting ahead is getting started.",
  "Habits are the compound interest of self-improvement.",
  "Your future is created by what you do today, not tomorrow.",
  "Success is the sum of small efforts repeated daily.",
  "Every action you take is a vote for the person you want to become.",
  "It's not about having time, it's about making time.",
  "The pain of discipline is less than the pain of regret.",
  "You are one decision away from a completely different life.",
  "Don't wish for it. Work for it.",
  "The only bad workout is the one you didn't do.",
  "Start where you are. Use what you have. Do what you can.",
];

// ---- Generic starter content for new accounts ----
export const GENERIC_STARTER_ROUTINES = [
  {
    id:'morning_starter', group:'🌅 Morning Routine', color:'var(--accent3)',
    habits:[
      {id:'wake_starter',     name:'Wake up on time', sub:'Start your day right', icon:'⏰', freq:'daily', time:'morning', color:'#fb923c'},
      {id:'water_am_starter', name:'Drink water',     sub:'Rehydrate',            icon:'💧', freq:'daily', time:'morning', color:'#38bdf8'},
      {id:'stretch_starter',  name:'Stretch / move',  sub:'5–10 minutes',         icon:'🧘', freq:'daily', time:'morning', color:'#a78bfa'},
    ]
  },
  {
    id:'sleep_starter', group:'🌙 Sleep & Self-care', color:'#f472b6',
    habits:[
      {id:'bedtime_starter', name:'Sleep on time',          sub:'Consistent bedtime',  icon:'😴', freq:'daily', time:'night', color:'#818cf8'},
      {id:'screens_starter', name:'Screens off before bed', sub:'30 min before sleep', icon:'📵', freq:'daily', time:'night', color:'#f87171'},
    ]
  },
  {
    id:'health_starter', group:'💪 Health Basics', color:'var(--green)',
    habits:[
      {id:'water_goal_starter', name:'Drink enough water', sub:'Track in Daily Log',        icon:'💧', freq:'daily', time:'anytime', color:'#38bdf8'},
      {id:'movement_starter',   name:'Move your body',     sub:'Walk, exercise, or stretch', icon:'🏃', freq:'daily', time:'anytime', color:'#4ade80'},
    ]
  }
];

export const GENERIC_STARTER_TRACKERS = [
  {id:'mood',   icon:'😊', label:'Mood',          type:'stars',  max:5, low:1, high:4, unit:'',       note:false},
  {id:'sleep',  icon:'😴', label:'Sleep hours',   type:'number', min:0, max:12, step:0.5, low:6, high:7, unit:'hrs',     note:false},
  {id:'water',  icon:'💧', label:'Water glasses', type:'number', min:0, max:20, step:1,   low:4, high:7, unit:'glasses', note:false},
  {id:'energy', icon:'⚡', label:'Energy level',  type:'stars',  max:5, low:1, high:4, unit:'',       note:false},
];

export const GENERIC_TRACKER_IDS = GENERIC_STARTER_TRACKERS.map(t => t.id);

// ---- Legacy personal data — used ONLY for migration of the original account ----
// Never used as defaults for new users.
export const LEGACY_PERSONAL_ROUTINES_BACKUP = [
  // (content omitted for brevity — copy from original source if needed for migration)
];

export const WORKOUT_SCHEDULE = [
  {day:'Mon', name:'Upper Body Strength', exercises:['Push-ups 3×15','Dumbbell shoulder press 3×12','Dumbbell rows 3×12','Tricep dips 3×15','Bicep curls 3×12'], focus:'Muscle + fat burn'},
  {day:'Tue', name:'HIIT Cardio', exercises:['Jumping jacks 3×30s','High knees 3×30s','Burpees 3×10','Mountain climbers 3×30s','Jump squats 3×12'], focus:'Fat loss'},
  {day:'Wed', name:'Lower Body', exercises:['Squats 3×20','Lunges 3×15 each','Glute bridges 3×20','Calf raises 3×25','Wall sit 3×30s'], focus:'Legs + glutes'},
  {day:'Thu', name:'Active Recovery', exercises:['30 min brisk walk','Light stretching 15 min','Foam rolling'], focus:'Recovery'},
  {day:'Fri', name:'Full Body Circuit', exercises:['Squat to press 3×12','Renegade rows 3×10','Step-ups 3×15','Plank 3×45s','Jump rope 3×1min'], focus:'Fat burn + strength'},
  {day:'Sat', name:'Cardio + Core', exercises:['30 min jog/walk','Crunches 3×20','Leg raises 3×15','Russian twists 3×20','Plank holds 3×45s'], focus:'Cardio + core'},
  {day:'Sun', name:'Rest / Light Walk', exercises:['20-30 min light walk','5 min meditation','Full body stretch 10 min'], focus:'Rest + recovery'},
];

export const LEGACY_PERSONAL_TRACKERS_BACKUP = [
  {id:'mood',       icon:'😊', label:'Mood',             type:'stars', max:5, low:1, high:4, unit:'', note:false},
  {id:'sleep',      icon:'😴', label:'Sleep hours',      type:'number', min:0, max:12, step:0.5, low:6, high:7, unit:'hrs', note:false},
  {id:'water',      icon:'💧', label:'Water glasses',    type:'number', min:0, max:20, step:1, low:4, high:7, unit:'glasses', note:false},
  {id:'workout',    icon:'🏋️', label:'Workout done',     type:'toggle', note:false},
  {id:'study_hrs',  icon:'📚', label:'Study / LeetCode', type:'number', min:0, max:12, step:0.5, low:1, high:2, unit:'hrs', note:false},
  {id:'stress',     icon:'🌿', label:'Stress level',     type:'stars', max:5, low:4, high:2, unit:'', note:false, invertColor:true},
  {id:'skincare',   icon:'✨', label:'Skincare done',    type:'toggle', note:false},
  {id:'energy',     icon:'⚡', label:'Energy level',     type:'stars', max:5, low:1, high:4, unit:'', note:false},
  {id:'hamster',    icon:'🐹', label:'Hamster checked',  type:'toggle', note:false},
  {id:'fish_fed',   icon:'🐟', label:'Fish fed',         type:'toggle', note:false},
  {id:'clean_eat',  icon:'🥗', label:'Clean eating',     type:'toggle', note:true, notePlaceholder:'What did you eat? Protein, veg, fruits...'},
];
