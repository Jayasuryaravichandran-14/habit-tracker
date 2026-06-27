// ============================================================
// sw-register.js — Service worker registration
// ============================================================

import { showUpdateSnackbar } from './ui/snackbar.js';

export function registerServiceWorker(){
  if(!('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try{
      const reg = await navigator.serviceWorker.register('./sw.js');

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if(newWorker.state === 'installed' && navigator.serviceWorker.controller){
            showUpdateSnackbar(newWorker);
          }
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if(!refreshing){ refreshing = true; window.location.reload(); }
      });
    }catch(err){
      console.warn('Service worker registration failed:', err);
    }
  });
}
