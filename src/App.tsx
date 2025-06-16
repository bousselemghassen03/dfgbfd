import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from 'src/contexts/AuthContext';
import ProtectedRoute from 'src/components/auth/ProtectedRoute';
import { GameweekProvider } from 'src/contexts/GameweekContext';
import { LanguageProvider, useLanguage } from 'src/contexts/LanguageContext';

// Layout Components
import Sidebar from 'src/components/Sidebar';
import Header from 'src/components/Header';

// Page Components
import Dashboard from 'src/components/Dashboard';
import TeamsManager from 'src/components/teams/TeamsManager';
import PlayersManager from 'src/components/players/PlayersManager';
import UsersManager from 'src/components/users/UsersManager';
import LeaguesManager from 'src/components/leagues/LeaguesManager';
import UserLeaguesManager from 'src/components/leagues/UserLeaguesManager';
import MatchesManager from 'src/components/matches/MatchesManager';
import SimulationManager from 'src/components/simulation/SimulationManager';
import MyTeam from 'src/components/fantasy/MyTeam';
import LoginForm from 'src/components/auth/LoginForm';
import SignupForm from 'src/components/auth/SignupForm';
import WorkInProgress from 'src/components/WorkInProgress';
import MyTeamPoints from 'src/components/fantasy/MyTeamPoints';

// Layout component that includes sidebar and header
function Layout({ children, isAdmin = true }: { children: React.ReactNode, isAdmin?: boolean }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage(); // Use the translation hook in Layout

  // Hide sidebar and header on auth pages
  if (['/login', '/signup'].includes(location.pathname)) {
    return <>{children}</>;
  }

  // If not admin, show work in progress page for admin routes
  // Note: For a fully translated experience, WorkInProgress component itself would need translation.
  if (!isAdmin && ['/teams', '/players', '/users', '/matches', '/simulation'].includes(location.pathname)) {
    return <WorkInProgress />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isAdmin={isAdmin} />
      <div className="md:ml-0">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} user={user} />
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// Main App Component with Router
function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      {/* AuthProvider wraps everything that needs user context */}
      <AuthProvider>
        {/* LanguageProvider wraps everything that needs translation context */}
        <LanguageProvider>
          {/* GameweekProvider wraps components dependent on gameweek state */}
          <GameweekProvider>
            <AppRoutes />
          </GameweekProvider>
        </LanguageProvider>
      </AuthProvider>
    </Router>
  );
}

// Check if user is admin
function isAdminUser(user: any) {
  return user?.email === 'bousselemghassen03@gmail.com';
}

// Routes component that handles all the routing
function AppRoutes() {
  const { user, loading } = useAuth();
  const { t } = useLanguage(); // Use the translation hook here for loading message

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="ml-3 text-lg text-indigo-700">{t('Loading...')}</p> {/* Translated loading message */}
      </div>
    );
  }

  // Determine if user is admin
  const isAdmin = user ? isAdminUser(user) : false;

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!user ? <LoginForm /> : <Navigate to="/" />} />
        <Route path="/signup" element={!user ? <SignupForm /> : <Navigate to="/" />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                {isAdmin ? <Dashboard /> : <MyTeam />}
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-team"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                <MyTeam />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teams"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                {isAdmin ? <TeamsManager /> : <WorkInProgress />}
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/players"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                {isAdmin ? <PlayersManager /> : <WorkInProgress />}
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                {isAdmin ? <UsersManager /> : <WorkInProgress />}
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/leagues"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                {isAdmin ? <LeaguesManager /> : <UserLeaguesManager />}
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/matches"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                {isAdmin ? <MatchesManager /> : <WorkInProgress />}
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/simulation"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                {isAdmin ? <SimulationManager /> : <WorkInProgress />}
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* User-specific routes */}
        <Route
          path="/my-leagues"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                <UserLeaguesManager />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/fixtures"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                <WorkInProgress />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-team-points"
          element={
            <ProtectedRoute>
              <Layout isAdmin={isAdmin}>
                <MyTeamPoints />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
