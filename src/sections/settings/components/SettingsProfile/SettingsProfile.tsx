import React, { useEffect, useState } from 'react';

import type { UserUpdateDTO, UpdatePasswordDTO } from '@api/auth';
import { updateUser, updatePassword } from '@api/auth';
import { REFRESH_EVENT } from '@common/events';
import { useAuth } from '@common/contexts/auth/useAuth';
import { useToast } from '@common/contexts/toast/useToast';
import { useGoogleAuthInit, requestGoogleCode } from '@common/utils/googleAuth';
import { Icon } from '@common/components/Icon/Icon';

// Use sessionStorage to keep google auth verification state for set new password flow
const GOOGLE_VERIFIED_SESSION_STORAGE_KEY = 'settings_profile_google_verified';

export const SettingsProfile: React.FC = () => {
  const { user, fetchUser, googleSignin } = useAuth();
  const { showToast, showError } = useToast();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [hasPasswordChanges, setHasPasswordChanges] = useState(false);
  const [isAuthenticatingGoogle, setIsAuthenticatingGoogle] = useState(false);
  const [isGoogleVerified, setIsGoogleVerified] = useState(
    () => sessionStorage.getItem(GOOGLE_VERIFIED_SESSION_STORAGE_KEY) === 'true'
  );

  useGoogleAuthInit(
    async (response) => {
      if (response.code) {
        try {
          setIsAuthenticatingGoogle(true);
          await googleSignin({ code: response.code });
          sessionStorage.setItem(GOOGLE_VERIFIED_SESSION_STORAGE_KEY, 'true');
          setIsGoogleVerified(true);
          showToast('Google session verified', 'success');
        } catch (error) {
          showError('Google authentication failed');
          console.error(error);
        } finally {
          setIsAuthenticatingGoogle(false);
        }
      } else if (response.error) {
        showError('Google authentication failed');
        console.error(response.error);
      }
    }
  );

  // Initialize form with user data when available
  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);

      if (user.has_password) {
        sessionStorage.removeItem(GOOGLE_VERIFIED_SESSION_STORAGE_KEY);
      }
    }
  }, [user]);

  // Check if any profile fields have changed
  useEffect(() => {
    if (user) {
      const hasFieldChanges = username !== user.username || email !== user.email;

      setHasChanges(hasFieldChanges);
    }
  }, [user, username, email]);

  // Check if password fields have values to enable password update
  useEffect(() => {
    const isCurrentPasswordValid = user?.has_password ? Boolean(currentPassword) : true;
    setHasPasswordChanges(isCurrentPasswordValid && Boolean(newPassword));
  }, [currentPassword, newPassword, user?.has_password]);

  // Refresh listener to refetch user data when on settings page
  useEffect(() => {
    const handler = () => {
      void fetchUser();
    };
    window.addEventListener(REFRESH_EVENT, handler);
    return () => {
      window.removeEventListener(REFRESH_EVENT, handler);
    };
  }, [fetchUser]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsUpdatingSettings(true);

      const settingsData: UserUpdateDTO = {
        username: username !== user?.username ? username : undefined,
        email: email !== user?.email ? email : undefined,
      };

      // Only proceed if there are changes to make
      if (Object.values(settingsData).some((value) => value !== undefined)) {
        await updateUser(settingsData);
        showToast('Settings updated successfully', 'success');
        fetchUser();
      } else {
        showError('No changes to update.');
      }
    } catch (err) {
      showError('Failed to update settings. Please check your information and try again.');
      console.error('Error updating settings:', err);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!user?.has_password && !isGoogleVerified) {
        showError('Please authenticate with Google first.');
        return;
      }
      if (user?.has_password && !currentPassword) {
        showError('Please provide current password.');
        return;
      }
      if (!newPassword) {
        showError('Please provide a new password.');
        return;
      }

      setIsUpdatingPassword(true);
      const payload: UpdatePasswordDTO = {
        current_password: currentPassword || undefined,
        new_password: newPassword,
      };

      await updatePassword(payload);
      showToast('Password updated successfully', 'success');

      sessionStorage.removeItem(GOOGLE_VERIFIED_SESSION_STORAGE_KEY);
      setIsGoogleVerified(false);
      fetchUser();

      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      showError('Failed to update password. Please check your information and try again.');
      console.error('Error updating password:', err);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleGoogleReauth = (e: React.MouseEvent) => {
    e.preventDefault();

    const success = requestGoogleCode();
    if (!success) {
      showError('Google authentication is not initialized');
    }
  };

  return (
    <div className="w-full md:max-w-1/3">
      <form onSubmit={handleProfileUpdate}>
        <fieldset className="border border-gray-400 rounded p-8">
          <legend className="px-2 text-text-main">Edit Profile</legend>

          <div>
            <div className="mb-6">
              <label className="block text-text-main text-sm font-medium mb-1" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                required
                onChange={(event) => setUsername(event.target.value)}
                className="shadow appearance-none border rounded w-full py-1.5 px-2 text-text-main leading-tight
                                focus:outline-none focus:shadow-outline text-sm"
              />
            </div>

            <div className="mb-6">
              <label className="block text-text-main text-sm font-medium mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                required
                onChange={(event) => setEmail(event.target.value)}
                className="shadow appearance-none border rounded w-full py-1.5 px-2 text-text-main leading-tight
                                focus:outline-none focus:shadow-outline text-sm"
              />
            </div>
          </div>

          <div className="flex">
            <button
              type="submit"
              disabled={isUpdatingSettings || !hasChanges}
              className={`${hasChanges ? 'bg-blue-500 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}
                              text-white font-medium py-1.5 px-8 rounded focus:outline-none focus:shadow-outline 
                                text-sm`}
            >
              {isUpdatingSettings ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </fieldset>
      </form>

      <form onSubmit={handlePasswordUpdate}>
        <fieldset className="border border-gray-400 rounded p-8 mt-10">
          <legend className="px-2 text-text-main">
            {user?.has_password ? 'Change Password' : 'Set Password'}
          </legend>

          <div className="space-y-5">
            {!user?.has_password && !isGoogleVerified ? (
              <div className="mb-6">
                <p className="text-sm text-text-muted mb-4">
                  Authenticate with Google to set password.
                </p>
                <button
                  type="button"
                  onClick={handleGoogleReauth}
                  disabled={isAuthenticatingGoogle}
                  className="flex items-center justify-center w-full px-4 py-2 border border-border-main rounded bg-bg-main text-text-main hover:bg-bg-hover transition-colors font-medium text-sm"
                >
                  <Icon name="google" size={20} className="mr-2" />
                  {isAuthenticatingGoogle ? 'Authenticating...' : 'Authenticate with Google'}
                </button>
              </div>
            ) : (
              <>
                {user?.has_password && (
                  <div className="mb-6">
                    <label className="text-text-main text-sm font-medium mb-1" htmlFor="currentPassword">
                      Current Password
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      className="shadow appearance-none border rounded w-full py-1.5 px-2 text-text-main leading-tight
                                    focus:outline-none focus:shadow-outline text-sm"
                    />
                  </div>
                )}

                <div className="mb-6">
                  <label className="text-text-main text-sm font-medium mb-1" htmlFor="newPassword">
                    {user?.has_password ? 'New Password' : 'Password'}
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="shadow appearance-none border rounded w-full py-1.5 px-2 text-text-main leading-tight
                                    focus:outline-none focus:shadow-outline text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingPassword || !hasPasswordChanges}
                  className={`${hasPasswordChanges ? 'bg-blue-500 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}
                                  text-white font-medium py-1.5 px-8 rounded focus:outline-none focus:shadow-outline 
                                    text-sm`}
                >
                  {isUpdatingPassword
                    ? 'Updating...'
                    : user?.has_password
                      ? 'Change password'
                      : 'Set password'}
                </button>
              </>
            )}
          </div>
        </fieldset>
      </form>
    </div>
  );
};
