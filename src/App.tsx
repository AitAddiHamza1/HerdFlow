import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Cows } from './pages/Cows';
import { CowDetails } from './pages/CowDetails';
import { UpcomingCalvings } from './pages/UpcomingCalvings';
import { Inseminations } from './pages/Inseminations';
import { Settings } from './pages/Settings';

// Initialize React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Authentication routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected breeder routes */}
            <Route element={<ProtectedRoute />}>
              <Route
                path="/"
                element={
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                }
              />
              <Route
                path="/cows"
                element={
                  <DashboardLayout>
                    <Cows />
                  </DashboardLayout>
                }
              />
              <Route
                path="/cows/:id"
                element={
                  <DashboardLayout>
                    <CowDetails />
                  </DashboardLayout>
                }
              />
              <Route
                path="/upcoming-calvings"
                element={
                  <DashboardLayout>
                    <UpcomingCalvings />
                  </DashboardLayout>
                }
              />
              <Route
                path="/inseminations"
                element={
                  <DashboardLayout>
                    <Inseminations />
                  </DashboardLayout>
                }
              />
              <Route
                path="/settings"
                element={
                  <DashboardLayout>
                    <Settings />
                  </DashboardLayout>
                }
              />
            </Route>

            {/* Catch-all redirecting to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
