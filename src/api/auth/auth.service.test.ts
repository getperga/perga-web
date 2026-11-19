import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageKeys } from '@common/utils/storage_keys';

vi.mock('@/config', () => {
  return {
    getConfig: () => {
      return { API_BASE_URL: 'https://app.example.test/api/v1' };
    },
  };
});

const adapter = vi.fn<AxiosAdapter>();
const assignLocation = vi.fn();
const originalAdapter = axios.defaults.adapter;

const unauthorized = (config: InternalAxiosRequestConfig, status = 401) => {
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config,
    data: {},
  });
};

const response = (config: InternalAxiosRequestConfig, data: unknown) => {
  return { status: 200, statusText: 'OK', headers: {}, config, data };
};

describe('browser session refresh', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    adapter.mockReset();
    assignLocation.mockReset();
    axios.interceptors.request.clear();
    axios.interceptors.response.clear();
    axios.defaults.adapter = adapter;
    vi.stubGlobal('window', {
      localStorage: window.localStorage,
      addEventListener: vi.fn(),
      location: { origin: 'https://app.example.test', assign: assignLocation },
    });
    vi.stubGlobal('navigator', {});
  });

  afterEach(() => {
    axios.interceptors.request.clear();
    axios.interceptors.response.clear();
    axios.defaults.adapter = originalAdapter;
    vi.unstubAllGlobals();
  });

  it('clears an expired session and redirects to sign-in when refresh returns 401', async () => {
    adapter.mockImplementation(async (config) => {
      if (config.url === 'access_token_json/') {
        return response(config, { access_token: 'expired-access' });
      }
      throw unauthorized(config);
    });
    const { getUser, setupAxiosInterceptors, signin } = await import('./auth.service');
    setupAxiosInterceptors();
    await signin({ username: 'user', password: 'password' });

    await expect(getUser()).rejects.toMatchObject({ response: { status: 401 } });

    expect(localStorage.getItem(StorageKeys.BrowserSession)).toBeNull();
    expect(assignLocation).toHaveBeenCalledExactlyOnceWith('/signin/');
    await getUser().catch(() => {});
    expect(adapter.mock.lastCall?.[0].headers.get('Authorization')).toBeUndefined();
  });

  it('keeps the newer session when an older refresh request returns 401', async () => {
    let rejectRefresh!: (error: AxiosError) => void;
    let refreshConfig!: InternalAxiosRequestConfig;
    let loginCount = 0;
    adapter.mockImplementation(async (config) => {
      if (config.url === 'access_token_json/') {
        loginCount += 1;
        return response(config, { access_token: `access-${loginCount}` });
      }
      if (config.url === 'refresh_token/') {
        refreshConfig = config;
        return new Promise((_resolve, reject) => {
          rejectRefresh = reject;
        });
      }
      if (config.headers.get('Authorization') === 'Bearer access-2') {
        return response(config, {});
      }
      throw unauthorized(config);
    });
    const { getUser, setupAxiosInterceptors, signin } = await import('./auth.service');
    setupAxiosInterceptors();
    await signin({ username: 'user', password: 'password' });
    const oldSession = localStorage.getItem(StorageKeys.BrowserSession);
    const failedRequest = getUser().catch((error: unknown) => {
      return error;
    });
    await vi.waitFor(() => {
      expect(rejectRefresh).toBeDefined();
    });

    await signin({ username: 'user', password: 'password' });
    const newSession = localStorage.getItem(StorageKeys.BrowserSession);
    expect(newSession).not.toBe(oldSession);
    rejectRefresh(unauthorized(refreshConfig));
    expect(await failedRequest).toMatchObject({ response: { status: 401 } });

    expect(localStorage.getItem(StorageKeys.BrowserSession)).toBe(newSession);
    expect(assignLocation).not.toHaveBeenCalled();
    await expect(getUser()).resolves.toMatchObject({ status: 200 });
    expect(adapter.mock.lastCall?.[0].headers.get('Authorization')).toBe('Bearer access-2');
  });

  it('keeps the session when refresh fails with a server error', async () => {
    adapter.mockImplementation(async (config) => {
      if (config.url === 'access_token_json/') {
        return response(config, { access_token: 'expired-access' });
      }
      throw unauthorized(config, config.url === 'refresh_token/' ? 503 : 401);
    });
    const { getUser, setupAxiosInterceptors, signin } = await import('./auth.service');
    setupAxiosInterceptors();
    await signin({ username: 'user', password: 'password' });
    const session = localStorage.getItem(StorageKeys.BrowserSession);

    await expect(getUser()).rejects.toMatchObject({ response: { status: 503 } });

    expect(localStorage.getItem(StorageKeys.BrowserSession)).toBe(session);
    expect(assignLocation).not.toHaveBeenCalled();
  });

  it('retries the API request with the refreshed access token', async () => {
    adapter.mockImplementation(async (config) => {
      if (config.url === 'access_token_json/') {
        return response(config, { access_token: 'expired-access' });
      }
      if (config.url === 'refresh_token/') {
        return response(config, { access_token: 'refreshed-access' });
      }
      if (config.headers.get('Authorization') === 'Bearer refreshed-access') {
        return response(config, {});
      }
      throw unauthorized(config);
    });
    const { getUser, setupAxiosInterceptors, signin } = await import('./auth.service');
    setupAxiosInterceptors();
    await signin({ username: 'user', password: 'password' });

    await expect(getUser()).resolves.toMatchObject({ status: 200 });

    expect(localStorage.getItem(StorageKeys.BrowserSession)).not.toBeNull();
    expect(assignLocation).not.toHaveBeenCalled();
    expect(adapter.mock.lastCall?.[0].headers.get('Authorization')).toBe('Bearer refreshed-access');
  });
});
