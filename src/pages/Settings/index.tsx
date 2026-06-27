import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { User, Mail, Calendar, Sprout, ShieldCheck, Edit2, X, Check, Globe } from 'lucide-react';
import { formatDate } from '../../utils/date';

export const Settings: React.FC = () => {
  const { profile, loading, updateProfileName } = useAuth();
  const { t, i18n } = useTranslation();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sync state name with loaded profile
  useEffect(() => {
    if (profile) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setEditName(profile.name);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setError(t('cows.notes')); // fallback or basic checks
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await updateProfileName(editName);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError((err as any).message || 'Failed to update profile name.');
    } finally {
      setSubmitting(false);
    }
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="relative mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-brand-600"></div>
        <p className="mt-3 text-sm">{t('common.loading')}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-md mx-auto space-y-4">
        <h3 className="font-display font-bold text-slate-800 text-lg font-black">{t('common.error')}</h3>
        <p className="text-sm text-slate-500">Could not retrieve your breeder profile details.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight text-slate-800">{t('settings.title')}</h2>
        <p className="text-slate-500 text-sm mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 lg:col-span-2">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600 font-bold border border-brand-200">
                <Sprout className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-slate-800 text-base">{t('settings.farmProfile')}</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">{t('settings.farmProfileDesc')}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setError('');
                setIsEditing(!isEditing);
              }}
              className="flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-850 hover:underline border border-slate-200 hover:bg-slate-50 rounded-xl px-3 py-1.5 cursor-pointer"
            >
              {isEditing ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  <span>{t('common.cancel')}</span>
                </>
              ) : (
                <>
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>{t('settings.editName')}</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
              {error}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="farmNameInput">
                  {t('settings.breederName')}
                </label>
                <input
                  id="farmNameInput"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full max-w-md rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                  placeholder="e.g. Oakridge Farms"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-4.5 py-2 text-xs font-bold shadow-sm cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>{submitting ? t('common.loading') : t('settings.saveName')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4.5 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5 border-b border-slate-50">
                <div className="flex items-center gap-2.5">
                  <User className="h-5 w-5 text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('settings.breederName')}</span>
                </div>
                <p className="text-sm font-bold text-slate-850">{profile.name}</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5 border-b border-slate-50">
                <div className="flex items-center gap-2.5">
                  <Mail className="h-5 w-5 text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('settings.email')}</span>
                </div>
                <p className="text-sm font-bold text-slate-850">{profile.email}</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5 border-b border-slate-50">
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('settings.created')}</span>
                </div>
                <p className="text-sm font-bold text-slate-850">
                  {formatDate(profile.createdAt) || t('common.loading')}
                </p>
              </div>

              {/* Language Switcher Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5">
                <div className="flex items-center gap-2.5">
                  <Globe className="h-5 w-5 text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('settings.language')}</span>
                </div>
                <select
                  value={i18n.language}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="ar">العربية (AR)</option>
                  <option value="fr">Français (FR)</option>
                </select>
              </div>

            </div>
          )}

        </div>

        {/* Security Info Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 self-start">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="font-display font-bold text-slate-800 text-sm">{t('settings.authorizedBreeder')}</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            {t('settings.authorizedBreederDesc')}
          </p>
        </div>

      </div>
    </div>
  );
};
