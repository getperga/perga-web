import { useEffect, useRef } from 'react';

import { getConfig } from '@/config';

type GoogleCodeClient = {
  requestCode: () => void;
};

interface GoogleAuthResponse {
  code: string;
  error?: string
}

interface GoogleInitializeOptions {
  callback: (response: GoogleAuthResponse) => void;
}

const GOOGLE_SCRIPT_LOAD_TIMEOUT = 10000;

let codeClient: GoogleCodeClient | null = null;
let currentCallback: ((response: GoogleAuthResponse) => void) | null = null;
let onGoogleLoad: (() => void) | null = null;

if (typeof window !== 'undefined') {
  const scriptEl = document.getElementById('google-gsi-script') as HTMLScriptElement | null;
  scriptEl?.addEventListener('load', () => onGoogleLoad?.());
}

export const initializeGoogleCodeClient = (options: GoogleInitializeOptions) => {
  const { GOOGLE_CLIENT_ID } = getConfig();

  if (!window.google?.accounts?.oauth2 || !GOOGLE_CLIENT_ID) {
    return false;
  }

  currentCallback = options.callback;

  if (codeClient) {
    return true;
  }

  codeClient = window.google.accounts.oauth2.initCodeClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: 'openid email profile',
    ux_mode: 'popup',
    callback: (response: GoogleAuthResponse) => {
      if (currentCallback) {
        currentCallback(response);
      }
    },
  });

  return true;
};

export const requestGoogleCode = () => {
  if (codeClient) {
    codeClient.requestCode();
    return true;
  }
  return false;
};

export const useGoogleAuthInit = (callback: (response: GoogleAuthResponse) => void) => {
  const { GOOGLE_CLIENT_ID } = getConfig();

  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // prevent multiple initializations
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || initializedRef.current) {
      return;
    }

    const init = () => {
      if (initializedRef.current) {
        return true;
      }

      if (!window.google?.accounts?.oauth2) {
        return false;
      }

      initializeGoogleCodeClient({
        callback: (res) => callbackRef.current(res),
      });
      initializedRef.current = true;
      return true;
    };

    if (init()) {
      return;
    }

    // set up global load listener
    onGoogleLoad = () => {
      if (init()) {
        onGoogleLoad = null;
      }
    };

    // safety timeout in case onload never fires
    const timeout = setTimeout(() => {
      if (!initializedRef.current) {
        onGoogleLoad = null;
        callbackRef.current({ code: '', error: 'google_script_load_timeout' });
      }
    }, GOOGLE_SCRIPT_LOAD_TIMEOUT);

    return () => {
      onGoogleLoad = null;
      clearTimeout(timeout);
    };
  }, [GOOGLE_CLIENT_ID]);
};
