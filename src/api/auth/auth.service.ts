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
  RefreshTokenDTO,
  GoogleSigninDTO,
} from './auth.dto';

const { API_BASE_URL } = getConfig();
const AUTH_API_URL = `${API_BASE_URL}/auth`;

// API methods
export const signup = (userData: UserSignupDTO) =>
  axios.post<UserDTO>(`${AUTH_API_URL}/signup/`, userData);

export const signin = (userData: UserSigninDTO) =>
  axios.post<TokenDTO>(`${AUTH_API_URL}/access_token_json/`, userData);

export const googleSignin = (data: GoogleSigninDTO) =>
  axios.post<TokenDTO>(`${AUTH_API_URL}/google/`, data);

const refreshToken = (refreshTokenData: RefreshTokenDTO) =>
  axios.post<TokenDTO>(`${AUTH_API_URL}/refresh_token/`, refreshTokenData);

export const getUser = () => axios.get<UserDTO>(`${AUTH_API_URL}/user/`);

export const updateUser = (userData: UserUpdateDTO) =>
  axios.put<UserDTO>(`${AUTH_API_URL}/user/`, userData);

export const updatePassword = (data: UpdatePasswordDTO) =>
  axios.put<void>(`${AUTH_API_URL}/user/password/`, data);

// Token methods
export const storeToken = (token: TokenDTO) => {
  Storage.set(StorageKeys.AuthToken, token.access_token);
  Storage.set(StorageKeys.TokenType, token.token_type);
  if (token.refresh_token) {
    Storage.set(StorageKeys.RefreshToken, token.refresh_token);
  }
};

const getToken = (): TokenDTO | null => {
  const access_token = Storage.get(StorageKeys.AuthToken, null);
  const token_type = Storage.get(StorageKeys.TokenType, null);
  const refresh_token = Storage.get(StorageKeys.RefreshToken, null);

  if (access_token && token_type) {
    return { access_token, token_type, refresh_token: refresh_token || undefined };
  }

  return null;
};

export const removeToken = () => {
  Storage.remove(StorageKeys.AuthToken);
  Storage.remove(StorageKeys.TokenType);
  Storage.remove(StorageKeys.RefreshToken);
};

export const isAuthenticated = (): boolean => {
  return Boolean(getToken());
};

// Configure axios to include the token in all requests
export const setupAxiosInterceptors = () => {
  axios.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token.access_token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  // Add response interceptor to handle 401 errors
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // If the error is a 401 Unauthorized and we haven't tried to refresh the token yet
      // Also, avoid attempting refresh for the refresh endpoint itself to prevent infinite loop
      if (
        error.response?.status === 401 &&
        !originalRequest?._retry &&
        !originalRequest?.url?.includes('/auth/refresh_token/')
      ) {
        originalRequest._retry = true;

        const token = getToken();
        if (token && token.refresh_token) {
          try {
            const response = await refreshToken({ refresh_token: token.refresh_token });
            storeToken(response.data);

            // Update the Authorization header and retry the original request
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${response.data.access_token}`,
            };
            return axios(originalRequest);
          } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
            // If refresh token is invalid, log the user out
            removeToken();
            // Redirect to signin page only if we're not already there
            if (!window.location.pathname.includes('/signin/')) {
              window.location.href = '/signin/';
            }
            return Promise.reject(refreshError);
          }
        } else {
          console.error('No refresh token available for request:', originalRequest.url);
          // If no refresh token is available, log the user out
          removeToken();
          // Redirect to signin page only if we're not already there
          if (!window.location.pathname.includes('/signin/')) {
            window.location.href = '/signin/';
          }
        }
      }
      return Promise.reject(error);
    },
  );
};
