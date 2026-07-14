import { AxiosError } from 'axios';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { getConfig } from '@/config';
import { Icon } from '@common/components/Icon/Icon';
import { useAuth } from '@common/contexts/auth/useAuth';
import { useGoogleAuthInit, requestGoogleCode } from '@common/utils/googleAuth';

interface ErrorResponse {
  detail?: string;
  [key: string]: unknown;
}

export const Signup: React.FC = () => {
  const { GOOGLE_CLIENT_ID } = getConfig();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signup, googleSignin } = useAuth();
  const navigate = useNavigate();

  useGoogleAuthInit(async (response) => {
    if (response.error) {
      setError('Google Sign-in failed');
      console.error(response.error);
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await googleSignin({ code: response.code });
      navigate('/planner/');
    } catch (err) {
      setError('Google Sign-in failed');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await signup({ username, email, password });
      navigate('/planner/');
    } catch (err) {
      const axiosError = err as AxiosError<ErrorResponse>;
      if (axiosError.response && axiosError.response.data) {
        setError(axiosError.response.data.detail || 'Signup failed');
      } else {
        setError('Signup failed. Please try again.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-main py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text-main">
            Create a new account
          </h2>
          <p className="mt-2 text-center text-sm text-text-muted">
            Or{' '}
            <Link to="/signin/" className="font-medium text-blue-600 hover:text-blue-500">
              sign in to your existing account
            </Link>
          </p>
        </div>

        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-600 px-4 py-3 rounded relative"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="mt-8 space-y-6">
          {GOOGLE_CLIENT_ID && (
            <button
              onClick={() => requestGoogleCode()}
              disabled={isLoading}
              className="flex items-center justify-center w-full px-4 py-2 border border-border-main rounded bg-bg-main text-text-main hover:bg-bg-hover transition-colors font-medium text-sm"
            >
              <Icon name="google" size={20} className="mr-2" />
              Continue with Google
            </button>
          )}

          {GOOGLE_CLIENT_ID && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-main"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-bg-main text-text-muted">or use email</span>
              </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-text-main mb-1">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="appearance-none rounded relative block w-full px-3 py-2 border border-border-main
                             placeholder-gray-500 text-text-main focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-main mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none rounded relative block w-full px-3 py-2 border border-border-main
                             placeholder-gray-500 text-text-main focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-main mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded relative block w-full px-3 py-2 border border-border-main
                             placeholder-gray-500 text-text-main focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-text-main mb-1"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="appearance-none rounded relative block w-full px-3 py-2 border border-border-main
                             placeholder-gray-500 text-text-main focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm 
                              font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none 
                              focus:ring-2 focus:ring-offset-2  ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
