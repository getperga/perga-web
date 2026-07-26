import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { getConfig } from '@/config';
import { setupAxiosInterceptors } from '@api/auth';
import { ProtectedRoute, Signin, Signup } from '@auth/index';
import { AuthProvider } from '@common/contexts/auth';
import Notes from '@notes/Notes';
import Planner from '@planner/Planner';
import { Layout } from '@sections/Layout';
import { Settings, SettingsGeneral, SettingsPlanner, SettingsNotes } from '@settings/index';

// Setup axios interceptors for token inclusion before mounting the App
setupAxiosInterceptors();

function App() {
  const { IS_SIGNUP_DISABLED } = getConfig();

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth routes */}
          <Route path="/signin/" element={<Signin />} />
          {!IS_SIGNUP_DISABLED && <Route path="/signup/" element={<Signup />} />}
          {IS_SIGNUP_DISABLED && (
            <Route path="/signup/" element={<Navigate to="/signin/" replace />} />
          )}

          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/planner/" replace />} />
              <Route path="planner" element={<Planner />} />
              <Route path="notes" element={<Notes />} />
              <Route path="settings" element={<Settings />}>
                <Route index element={<Navigate to="/settings/general/" replace />} />
                <Route path="general" element={<SettingsGeneral />} />
                <Route path="planner" element={<SettingsPlanner />} />
                <Route path="notes" element={<SettingsNotes />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
