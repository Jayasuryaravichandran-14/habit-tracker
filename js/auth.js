// ============================================================
// auth.js — Firebase Authentication
// ============================================================

import * as state from './state.js';
import { fbAuth } from './firebase.js';
import { attachFirestoreListeners, detachFirestoreListeners, migrateToFirestoreIfNeeded, migrateLegacySyncCodeIfNeeded, onFirstFirestoreSnapshotReceived } from './sync.js';
import { bcBroadcast } from './broadcast.js';
import { loadData } from './storage.js';

export function initAuth(){
  fbAuth.onAuthStateChanged(async (user) => {
    state.setCurrentUser(user);
    if(!user){
      detachFirestoreListeners();
      showAuthGate(true);
      return;
    }
    showAuthGate(false);
    await migrateLegacySyncCodeIfNeeded();
    await migrateToFirestoreIfNeeded(user.uid);
    // Show skeleton while waiting for first Firestore snapshot
    state.setAwaitingFirstSnapshot(true);
    state.setFirstSnapshotReceived(false);
    const timer = setTimeout(() => {
      if(state._awaitingFirstSnapshot){
        state.setAwaitingFirstSnapshot(false);
        import('./renders/home.js')    .then(m => m.renderHome());
        import('./renders/routines.js').then(m => { if(state.currentPage==='routines') m.renderRoutines(); });
        import('./renders/settings.js').then(m => m.renderSettings());
        import('./sync.js').then(m => m.updateSyncStatus('error'));
      }
    }, 3000);
    state.setFirstSnapshotFallbackTimer(timer);
    attachFirestoreListeners(user.uid);
    import('./renders/settings.js').then(m => m.renderAccountSection());
  });
}

export function showAuthGate(show){
  const gate = document.getElementById('auth-gate');
  if(gate) gate.style.display = show ? 'flex' : 'none';
}

export function showAuthError(msg){
  const el = document.getElementById('auth-error');
  if(el){ el.textContent = msg; el.style.display = 'block'; }
}
export function clearAuthError(){
  const el = document.getElementById('auth-error');
  if(el){ el.textContent = ''; el.style.display = 'none'; }
}

export function authToggleMode(){
  state.setAuthMode(state.authMode === 'signin' ? 'signup' : 'signin');
  clearAuthError();
  renderAuthGateUI();
}

export async function authEmailSubmit(){
  const email    = document.getElementById('auth-email')?.value?.trim();
  const password = document.getElementById('auth-password')?.value;
  if(!email || !password){ showAuthError('Enter email and password.'); return; }
  clearAuthError();
  try{
    if(state.authMode === 'signin'){
      await fbAuth.signInWithEmailAndPassword(email, password);
    } else {
      await createOrLinkWithEmail(email, password);
    }
  }catch(err){ showAuthError(authFriendlyError(err)); }
}

export async function createOrLinkWithEmail(email, password){
  if(state.currentUser?.isAnonymous){
    const cred = firebase.auth.EmailAuthProvider.credential(email, password);
    await state.currentUser.linkWithCredential(cred);
  } else {
    await fbAuth.createUserWithEmailAndPassword(email, password);
  }
}

export async function authGoogleSignIn(){
  try{
    const provider = new firebase.auth.GoogleAuthProvider();
    if(state.currentUser?.isAnonymous){
      await state.currentUser.linkWithPopup(provider);
    } else {
      await fbAuth.signInWithPopup(provider);
    }
  }catch(err){ showAuthError(authFriendlyError(err)); }
}

export async function authAnonymousSignIn(){
  try{ await fbAuth.signInAnonymously(); }
  catch(err){ showAuthError(authFriendlyError(err)); }
}

export async function authForgotPassword(){
  const email = document.getElementById('auth-email')?.value?.trim();
  if(!email){ showAuthError('Enter your email first.'); return; }
  try{
    await fbAuth.sendPasswordResetEmail(email);
    showAuthError('✅ Reset email sent!');
  }catch(err){ showAuthError(authFriendlyError(err)); }
}

export async function signOutUser(){
  detachFirestoreListeners();
  bcBroadcast('SIGN_OUT');
  await fbAuth.signOut();
}

export function authFriendlyError(err){
  const map = {
    'auth/email-already-in-use':   'That email is already registered.',
    'auth/invalid-email':          'Invalid email address.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/user-not-found':         'No account found with that email.',
    'auth/wrong-password':         'Incorrect password.',
    'auth/too-many-requests':      'Too many attempts. Try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/popup-closed-by-user':   'Sign-in popup was closed.',
    'auth/credential-already-in-use': 'This account is already linked to another user.',
  };
  return map[err.code] || err.message;
}

export function openUpgradeAccountPrompt(){
  state.setAuthMode('signup');
  showAuthGate(true);
}

function renderAuthGateUI(){
  // Toggle between sign-in and sign-up mode in the auth gate
  const isSignIn = state.authMode === 'signin';
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleText = document.getElementById('auth-toggle-text');
  const toggleLink = document.getElementById('auth-toggle-link');
  if(submitBtn) submitBtn.textContent = isSignIn ? 'Sign In' : 'Sign Up';
  if(toggleText) toggleText.textContent = isSignIn ? "Don't have an account?" : 'Already have an account?';
  if(toggleLink) toggleLink.textContent = isSignIn ? 'Sign Up' : 'Sign In';
}


