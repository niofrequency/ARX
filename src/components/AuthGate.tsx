import React from 'react';
import { useAuth } from '../lib/AuthContext';
import AuthPage from './AuthPage';
import { BrandLoader } from './BrandMark';

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <BrandLoader className="w-8 h-8 text-zinc-600" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <>{children}</>;
};

export default AuthGate;
