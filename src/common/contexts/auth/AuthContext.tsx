import React, { useState, useEffect, ReactNode, useCallback } from 'react';

import type {
  UserDTO,
  UserSignupDTO,
  UserSigninDTO,
  UserUpdateDTO,
  UpdatePasswordDTO,
  GoogleSigninDTO,
} from '@api/auth';
import {
  signin,
  signup,
  googleSignin,
  storeToken,
  removeToken,
  isAuthenticated,
  updateUser,
  getUser,
  updatePassword,
} from '@api/auth';
import { AuthContext } from './AuthContext.types';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleFetchUser = useCallback(async () => {
    const response = await getUser();
    setUser({
      username: response.data.username,
      email: response.data.email,
      week_start_day: response.data.week_start_day,
      merge_weekends: response.data.merge_weekends,
      has_password: response.data.has_password,
      google_id: response.data.google_id,
    });
  }, []);

  // Check if user is authenticated on initial load
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);

      if (isAuthenticated()) {
        try {
          await handleFetchUser();
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          removeToken();
        }
      }

      setIsLoading(false);
    };

    void checkAuth();
  }, [handleFetchUser]);

  const handleSignin = async (credentials: UserSigninDTO) => {
    setIsLoading(true);
    try {
      const response = await signin(credentials);
      storeToken(response.data);

      await handleFetchUser();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignin = async (data: GoogleSigninDTO) => {
    setIsLoading(true);
    try {
      const response = await googleSignin(data);
      storeToken(response.data);

      await handleFetchUser();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (userData: UserSignupDTO) => {
    setIsLoading(true);
    try {
      const response = await signup(userData);
      setUser(response.data);

      // automatically signin new user
      await handleSignin({
        username: userData.username,
        password: userData.password,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    setUser(null);
  };

  const handleUpdateUser = async (userData: UserUpdateDTO) => {
    await updateUser(userData);
    // Fetch updated user data to refresh the local state
    await handleFetchUser();
  };

  const handleUpdatePassword = async (data: UpdatePasswordDTO) => {
    await updatePassword(data);
    // No need to refetch user as password change doesn't alter user profile fields
  };

  const value = {
    isAuthenticated: Boolean(user),
    user,
    signin: handleSignin,
    signup: handleSignup,
    googleSignin: handleGoogleSignin,
    logout: handleLogout,
    fetchUser: handleFetchUser,
    updateUser: handleUpdateUser,
    updatePassword: handleUpdatePassword,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
