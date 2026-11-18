import axios from 'axios';

import { getConfig } from '@/config';
import Storage from '@common/utils/storage';
import { StorageKeys } from '@common/utils/storage_keys';

import type {
  UserDTO,
  UserUpdateDTO,
  UserSignupDTO,
  UserSigninDTO,
  TokenDTO,
  UpdatePasswordDTO,
  GoogleSigninDTO,
} from './auth.dto';

const { API_BASE_URL } = getConfig();
const AUTH_API_URL = `${API_BASE_URL}/auth`;
const AUTH_LOCK = 'perga-browser-session';

const browserAuth = axios.create({
  baseURL: AUTH_API_URL,
  withCredentials: true,
  headers: { 'X-Perga-Session': 'browser' },
  timeout: 10000,
});
let accessToken: string | null = null;
let refreshInProgress: Promise<boolean> | null = null;

function clearLegacyTokens(): void {
  Storage.remove(StorageKeys.AuthToken);
  Storage.remove(StorageKeys.TokenType);
  Storage.remove(StorageKeys.RefreshToken);
}

function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
  return navigator.locks ? navigator.locks.request(AUTH_LOCK, action) : action();
}

async function startSession(path: string, data: UserSigninDTO | GoogleSigninDTO): Promise<void> {
  await withSessionLock(async () => {
    const response = await browserAuth.post<TokenDTO>(path, data);
    clearLegacyTokens();
    accessToken = response.data.access_token;
    Storage.set(StorageKeys.BrowserSession, crypto.randomUUID());
  });
}

export const signup = (userData: UserSignupDTO) => {
  return axios.post<UserDTO>(`${AUTH_API_URL}/signup/`, userData);
};

export const signin = (userData: UserSigninDTO) => {
  return startSession('access_token_json/', userData);
};

export const googleSignin = (data: GoogleSigninDTO) => {
  return startSession('google/', data);
};

export const getUser = () => {
  return axios.get<UserDTO>(`${AUTH_API_URL}/user/`);
};

export const updateUser = (userData: UserUpdateDTO) => {
  return axios.put<UserDTO>(`${AUTH_API_URL}/user/`, userData);
};

export const updatePassword = (data: UpdatePasswordDTO) => {
  return axios.put<void>(`${AUTH_API_URL}/user/password/`, data);
};

function refreshBrowserSession(): Promise<boolean> {
  if (refreshInProgress) {
    return refreshInProgress;
  }

  const browserSessionState = Storage.get(StorageKeys.BrowserSession);
  if (!browserSessionState) {
    return Promise.resolve(false);
  }

  refreshInProgress = withSessionLock(async () => {
    if (Storage.get(StorageKeys.BrowserSession) !== browserSessionState) {
      return false;
    }

    const response = await browserAuth.post<TokenDTO>('refresh_token/');
    if (Storage.get(StorageKeys.BrowserSession) !== browserSessionState) {
      return false;
    }

    accessToken = response.data.access_token;
    return true;
  }).finally(() => {
    refreshInProgress = null;
  });

  return refreshInProgress;
}

export async function restoreBrowserSession(): Promise<boolean> {
  clearLegacyTokens();

  try {
    return await refreshBrowserSession();
  } catch {
    accessToken = null;
    return false;
  }
}

export async function endBrowserSession(): Promise<void> {
  accessToken = null;
  clearLegacyTokens();
  Storage.remove(StorageKeys.BrowserSession);

  try {
    await withSessionLock(async () => {
      if (!Storage.get(StorageKeys.BrowserSession)) {
        await browserAuth.post('logout/');
      }
    });
  } catch {
    // the browser stays signed out even when it cannot reach the API
  }
}

function isPergaRequest(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const api = new URL(API_BASE_URL, window.location.origin);
  const request = new URL(value, window.location.origin);
  return api.origin === request.origin && request.pathname.startsWith(`${api.pathname}/`);
}

export function setupAxiosInterceptors(): void {
  window.addEventListener('storage', (event) => {
    if (event.key !== StorageKeys.BrowserSession) {
      return;
    }

    accessToken = null;
    window.location.reload();
  });

  axios.interceptors.request.use((config) => {
    if (accessToken && isPergaRequest(config.url)) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      Object.assign(config, { pergaSession: Storage.get(StorageKeys.BrowserSession) });
    }
    return config;
  });

  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const request = error.config;
      const sessionState = request?.pergaSession;

      if (
        error.response?.status !== 401 ||
        !sessionState ||
        sessionState !== Storage.get(StorageKeys.BrowserSession) ||
        request.pergaRetried ||
        !isPergaRequest(request.url)
      ) {
        throw error;
      }

      request.pergaRetried = true;
      try {
        if (await refreshBrowserSession()) {
          return axios(request);
        }
      } catch (refreshError) {
        if (!axios.isAxiosError(refreshError) || refreshError.response?.status !== 401) {
          throw refreshError;
        }

        if (Storage.get(StorageKeys.BrowserSession) !== sessionState) {
          accessToken = null;
          Storage.remove(StorageKeys.BrowserSession);
          window.location.assign('/signin/');
        }
      }

      throw error;
    },
  );
}
