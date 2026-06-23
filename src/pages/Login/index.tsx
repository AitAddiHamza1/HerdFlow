import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { Mail, Lock, Sprout, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t('auth.fillAllFields'));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await authService.login(email, password);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError(t('auth.invalidCredentials'));
      } else {
        setError(err.message || t('auth.loginError'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Branding Header */}
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 overflow-hidden items-center justify-center rounded-2xl bg-white p-1 shadow-md">
            <img src="/logo.png" alt="HerdFlow Logo" className="h-full w-full object-contain" />
          </div>
          <h2 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-slate-900">
            {t('auth.loginWelcome')}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* Login Card */}
        <div className="glassmorphism rounded-3xl p-8 shadow-xl shadow-slate-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-5">
              {/* Email field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="email">
                  {t('auth.emailLabel')}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail className="h-5 w-5" />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 transition duration-150"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="password">
                  {t('auth.passwordLabel')}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 transition duration-150"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="group relative flex w-full justify-center rounded-xl bg-brand-600 py-3.5 px-4 text-sm font-bold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer shadow-md shadow-brand-100 transition duration-150"
              >
                {submitting ? t('auth.signingIn') : t('auth.signInButton')}
                {!submitting && (
                  <span className="absolute inset-y-0 right-4 flex items-center pl-3">
                    <ArrowRight className="h-5 w-5 text-brand-300 group-hover:text-white transition duration-150" />
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Link to Register */}
        <p className="text-center text-sm text-slate-600">
          {t('auth.needAccount')}{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700 hover:underline">
            {t('auth.registerFarmLink')}
          </Link>
        </p>
      </div>
    </div>
  );
};
