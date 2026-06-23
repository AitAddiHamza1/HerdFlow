import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { User, Mail, Lock, Sprout, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError(t('auth.fillAllFields'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordsMismatch'));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await authService.register(email, password, name);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError(t('auth.emailInUse'));
      } else {
        setError(err.message || t('auth.registerError'));
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
            {t('auth.registerTitle')}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {t('auth.registerSubtitle')}
          </p>
        </div>

        {/* Register Card */}
        <div className="glassmorphism rounded-3xl p-8 shadow-xl shadow-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Full Name field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="name">
                  {t('auth.fullNameLabel')}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User className="h-5 w-5" />
                  </span>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe Farm"
                    className="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 transition duration-150"
                  />
                </div>
              </div>

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
                    placeholder="breeder@example.com"
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
                    placeholder="Min. 6 characters"
                    className="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 transition duration-150"
                  />
                </div>
              </div>

              {/* Confirm Password field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="confirmPassword">
                  {t('auth.confirmPasswordLabel')}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                {submitting ? t('auth.registering') : t('auth.signUp')}
                {!submitting && (
                  <span className="absolute inset-y-0 right-4 flex items-center pl-3">
                    <ArrowRight className="h-5 w-5 text-brand-300 group-hover:text-white transition duration-150" />
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Link to Login */}
        <p className="text-center text-sm text-slate-600">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 hover:underline">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
};
