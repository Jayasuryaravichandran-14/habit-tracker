// ============================================================
// firebase.js — Firebase app initialization
// ============================================================
// Single place where the Firebase app is initialized and
// instances are exported. All other modules import from here
// rather than accessing the global firebase object directly.
// ============================================================

const firebaseConfig = {
  apiKey:            "AIzaSyDEHG-Om2gSXpN5fDsEqZWaedjqe-_81D4",
  authDomain:        "habit-tracker-ca1af.firebaseapp.com",
  databaseURL:       "https://habit-tracker-ca1af-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "habit-tracker-ca1af",
  storageBucket:     "habit-tracker-ca1af.firebasestorage.app",
  messagingSenderId: "1001290777109",
  appId:             "1:1001290777109:web:4a557be3bcc3690cfb841c",
};

// Initialize Firebase app (guard against double-init in dev hot-reload)
if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);

export const fbApp   = firebase.app();
export const fbDB    = firebase.database();
export const fbStore = firebase.firestore();
export const fbAuth  = firebase.auth();

// Enable Firestore offline persistence with multi-tab support
fbStore.enablePersistence({ synchronizeTabs: true })
  .catch(err => {
    if(err.code === 'failed-precondition'){
      console.warn('Firestore persistence unavailable — multiple tabs open');
    } else if(err.code === 'unimplemented'){
      console.warn('Firestore persistence not supported in this browser');
    }
  });

// Share instances with state module
import { setFirebaseInstances } from './state.js';
setFirebaseInstances(fbDB, fbStore, fbAuth);
