import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          {/* Custom natural green spinner */}
          <div className="relative mx-auto h-16 w-16 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600"></div>
          <p className="mt-4 font-display text-lg font-medium text-slate-600">Loading breeder panel...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
