import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { cowsRepository } from '../../repositories/cowsRepository';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '../../utils/date';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  FileText, 
  X, 
  AlertTriangle
} from 'lucide-react';
import type { Cow } from '../../types/cow';

export const Cows: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // State controls
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCowId, setEditingCowId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form states
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Fetch Cows list
  const { data: cows = [], isLoading } = useQuery({
    queryKey: ['cows', user?.uid],
    queryFn: () => cowsRepository.getAll(user?.uid || ''),
    enabled: !!user?.uid,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: { number: string; name?: string; breed?: string; notes?: string }) => 
      cowsRepository.create(user?.uid || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cows', user?.uid] });
      resetForm();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      setFormError(err.message || 'Failed to add cow.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; number: string; name?: string; breed?: string; notes?: string }) => 
      cowsRepository.update(user?.uid || '', data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cows', user?.uid] });
      resetForm();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      setFormError(err.message || 'Failed to edit cow.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (cowId: string) => cowsRepository.delete(cowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cows', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['inseminations', user?.uid] });
      setConfirmDeleteId(null);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      alert(err.message || 'Failed to delete cow.');
    }
  });

  const resetForm = () => {
    setNumber('');
    setName('');
    setBreed('');
    setNotes('');
    setFormError('');
    setEditingCowId(null);
    setIsFormOpen(false);
  };

  const handleEditClick = (cow: Cow) => {
    setEditingCowId(cow.id);
    setNumber(cow.number);
    setName(cow.name || '');
    setBreed(cow.breed || '');
    setNotes(cow.notes || '');
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim()) {
      setFormError('Cow number is required.');
      return;
    }
    setFormError('');

    const payload = { number, name, breed, notes };

    if (editingCowId) {
      updateMutation.mutate({ id: editingCowId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filteredCows = cows.filter(cow => {
    const term = searchTerm.toLowerCase();
    return (
      cow.number.toLowerCase().includes(term) ||
      (cow.name || '').toLowerCase().includes(term) ||
      (cow.breed || '').toLowerCase().includes(term) ||
      (cow.notes || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-800">{t('cows.title')}</h2>
          <p className="text-slate-500 text-sm mt-1">{t('cows.subtitle')}</p>
        </div>
        <button
          onClick={() => {
            if (isFormOpen) {
              resetForm();
            } else {
              setIsFormOpen(true);
            }
          }}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4.5 py-3 text-sm font-bold text-white hover:bg-brand-700 transition cursor-pointer shadow-md shadow-brand-100 self-start"
        >
          {isFormOpen ? (
            <>
              <X className="h-4.5 w-4.5" />
              <span>{t('common.cancel')}</span>
            </>
          ) : (
            <>
              <Plus className="h-4.5 w-4.5" />
              <span>{t('cows.addCow')}</span>
            </>
          )}
        </button>
      </div>

      {/* Add / Edit Form Card */}
      {isFormOpen && (
        <div className="glassmorphism rounded-2xl p-6 border border-brand-100 shadow-md">
          <h3 className="font-display text-lg font-bold text-slate-800 mb-4">
            {editingCowId ? t('cows.editCow') : t('cows.addCow')}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
                {formError}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="cowNum">
                  {t('cows.cowNumber')} *
                </label>
                <input
                  id="cowNum"
                  type="text"
                  required
                  placeholder="e.g. MAR06BG0006364"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="cowName">
                  {t('cows.name')}
                </label>
                <input
                  id="cowName"
                  type="text"
                  placeholder="e.g. Bella"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="cowBreed">
                  {t('cows.breed')}
                </label>
                <input
                  id="cowBreed"
                  type="text"
                  placeholder="e.g. Holstein"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="cowNotes">
                {t('cows.notes')}
              </label>
              <textarea
                id="cowNotes"
                placeholder="..."
                value={notes}
                rows={2}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 text-sm font-bold shadow-md shadow-brand-100 cursor-pointer"
              >
                {editingCowId ? t('common.save') : t('cows.registerCow')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main content area */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Search bar */}
        <div className="p-4 border-b border-slate-100 flex items-center">
          <div className="relative w-full max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="h-4.5 w-4.5" />
            </span>
            <input
              type="text"
              placeholder={t('common.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none transition duration-150"
            />
          </div>
          <span className="ml-auto text-xs font-semibold text-slate-400">
            {filteredCows.length}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="relative mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-brand-600"></div>
              <p className="mt-3 text-sm">{t('common.loading')}</p>
            </div>
          ) : filteredCows.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                <FileText className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-800">{t('cows.noCows')}</h3>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">{t('cows.cowNumber')}</th>
                  <th className="px-6 py-4">{t('cows.name')}</th>
                  <th className="px-6 py-4">{t('cows.breed')}</th>
                  <th className="px-6 py-4">{t('cows.dateAdded')}</th>
                  <th className="px-6 py-4 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredCows.map((cow) => (
                  <tr 
                    key={cow.id} 
                    className="hover:bg-slate-50/50 group transition duration-150"
                  >
                    <td className="px-6 py-4.5 font-bold text-slate-900">
                      <button
                        onClick={() => navigate(`/cows/${cow.id}`)}
                        className="hover:text-brand-700 text-left hover:underline cursor-pointer flex items-center gap-1.5"
                      >
                        {cow.number}
                      </button>
                    </td>
                    <td className="px-6 py-4.5 font-semibold text-slate-800">
                      {cow.name || <span className="text-slate-300 font-normal italic">{t('cows.unnamed')}</span>}
                    </td>
                    <td className="px-6 py-4.5 text-slate-500 font-medium">
                      {cow.breed || <span className="text-slate-300 italic">{t('cows.notSet')}</span>}
                    </td>
                    <td className="px-6 py-4.5 text-slate-400 text-xs">
                      {formatDate(cow.createdAt) || 'Just now'}
                    </td>
                    <td className="px-6 py-4.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/cows/${cow.id}`)}
                          className="p-2 rounded-lg hover:bg-brand-50 hover:text-brand-700 text-slate-400 transition cursor-pointer"
                          title="View"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleEditClick(cow)}
                          className="p-2 rounded-lg hover:bg-slate-100 hover:text-slate-700 text-slate-400 transition cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(cow.id)}
                          className="p-2 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Confirmation Delete Dialog overlay */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold">{t('cows.deleteConfirmTitle')}</h3>
            </div>
            
            <p className="text-sm text-slate-500 leading-relaxed">
              {t('cows.deleteConfirmDesc')}
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4.5 py-2 text-sm font-semibold text-slate-700 cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(confirmDeleteId)}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-4.5 py-2 text-sm font-bold shadow-md shadow-red-100 cursor-pointer"
              >
                {deleteMutation.isPending ? t('common.loading') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
