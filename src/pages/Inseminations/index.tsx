import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cowsRepository } from '../../repositories/cowsRepository';
import { inseminationRepository } from '../../repositories/inseminationRepository';
import { calculateDynamicOrderNumbers } from '../../utils/calving';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  X, 
  Sprout, 
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import type { Insemination } from '../../types/insemination';

export const Inseminations: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // State controls
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{ id: string; cowId: string } | null>(null);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<Insemination | null>(null);

  // Form states
  const [selectedCowId, setSelectedCowId] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [bullName, setBullName] = useState('');
  const [heatType, setHeatType] = useState('Natural');
  const [cost, setCost] = useState('');
  const [formError, setFormError] = useState('');

  // 1. Fetch Breeder's Cows
  const { data: cows = [], isLoading: isLoadingCows } = useQuery({
    queryKey: ['cows', user?.uid],
    queryFn: () => cowsRepository.getAll(user?.uid || ''),
    enabled: !!user?.uid,
  });

  // 2. Fetch Breeder's Inseminations (all cows combined)
  const { data: inseminations = [], isLoading: isLoadingIns } = useQuery({
    queryKey: ['inseminations', user?.uid],
    queryFn: () => inseminationRepository.getAllForUser(user?.uid || ''),
    enabled: !!user?.uid,
  });

  // Query mutations
  const createMutation = useMutation({
    mutationFn: (payload: { cowId: string; date: Timestamp; bullName: string; heatType: string; cost: number }) => 
      inseminationRepository.create(user?.uid || '', payload.cowId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inseminations', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['inseminations', 'cow', variables.cowId] });
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to record insemination.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; cowId: string; date: Timestamp; bullName: string; heatType: string; cost: number }) => 
      inseminationRepository.update(payload.cowId, payload.id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inseminations', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['inseminations', 'cow', variables.cowId] });
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to update insemination.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string; cowId: string }) => 
      inseminationRepository.delete(payload.cowId, payload.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inseminations', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['inseminations', 'cow', variables.cowId] });
      setConfirmDeleteRecord(null);
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to delete record.');
    }
  });

  const resetForm = () => {
    setSelectedCowId('');
    setDateStr(new Date().toISOString().split('T')[0]);
    setBullName('');
    setHeatType('Natural');
    setCost('');
    setFormError('');
    setEditingRecord(null);
    setIsFormOpen(false);
  };

  const handleEditClick = (record: Insemination) => {
    setEditingRecord({ id: record.id, cowId: record.cowId });
    setSelectedCowId(record.cowId);
    setDateStr(record.date.toDate().toISOString().split('T')[0]);
    setBullName(record.bullName);
    setHeatType(record.heatType);
    setCost(String(record.cost));
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCowId || !dateStr || !bullName.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }
    setFormError('');

    const payload = {
      date: Timestamp.fromDate(new Date(dateStr)),
      bullName: bullName.trim(),
      heatType,
      cost: Number(cost) || 0
    };

    if (editingRecord) {
      updateMutation.mutate({
        id: editingRecord.id,
        cowId: editingRecord.cowId,
        ...payload
      });
    } else {
      createMutation.mutate({
        cowId: selectedCowId,
        ...payload
      });
    }
  };

  // Group and calculate dynamic order maps per cow
  const cowInseminationsMap = React.useMemo(() => {
    const groups: Record<string, Insemination[]> = {};
    inseminations.forEach(rec => {
      if (!groups[rec.cowId]) {
        groups[rec.cowId] = [];
      }
      groups[rec.cowId].push(rec);
    });

    const orderMaps: Record<string, Record<string, number>> = {};
    Object.entries(groups).forEach(([cowId, records]) => {
      orderMaps[cowId] = calculateDynamicOrderNumbers(records);
    });

    return orderMaps;
  }, [inseminations]);

  // Lookup map for cows details
  const cowLookup = React.useMemo(() => {
    const map = new Map<string, typeof cows[0]>();
    cows.forEach(c => map.set(c.id, c));
    return map;
  }, [cows]);

  // Filtered inseminations list based on search term
  const filteredInseminations = inseminations.filter(ins => {
    const term = searchTerm.toLowerCase();
    const cowObj = cowLookup.get(ins.cowId);
    return (
      ins.bullName.toLowerCase().includes(term) ||
      ins.heatType.toLowerCase().includes(term) ||
      (cowObj?.number || '').toLowerCase().includes(term) ||
      (cowObj?.name || '').toLowerCase().includes(term)
    );
  });

  const isLoading = isLoadingCows || isLoadingIns;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-800">{t('inseminations.title')}</h2>
          <p className="text-slate-500 text-sm mt-1">{t('inseminations.subtitle')}</p>
        </div>
        
        {cows.length > 0 && (
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
                <span>{t('inseminations.cancelForm')}</span>
              </>
            ) : (
              <>
                <Plus className="h-4.5 w-4.5" />
                <span>{t('inseminations.logInsemination')}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Warning if no cows registered */}
      {cows.length === 0 && !isLoading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <AlertTriangle className="h-5.5 w-5.5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-850">{t('inseminations.noCowsTitle')}</h4>
            <p className="text-xs text-amber-700 leading-relaxed">
              {t('inseminations.noCowsDesc')}
            </p>
            <button
              onClick={() => navigate('/cows')}
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-850 hover:underline cursor-pointer"
            >
              <span>{t('inseminations.goToMyCows')}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Logging form card */}
      {isFormOpen && cows.length > 0 && (
        <div className="glassmorphism rounded-2xl p-6 border border-brand-100 shadow-md">
          <h3 className="font-display text-lg font-bold text-slate-800 mb-4">
            {editingRecord ? t('inseminations.editInseminationTitle') : t('inseminations.recordInseminationTitle')}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
                {formError}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Cow selection dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="cowSelect">
                  {t('inseminations.selectCowLabel')}
                </label>
                <select
                  id="cowSelect"
                  required
                  disabled={!!editingRecord}
                  value={selectedCowId}
                  onChange={(e) => setSelectedCowId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">{t('inseminations.chooseCowOption')}</option>
                  {cows.map(cow => (
                    <option key={cow.id} value={cow.id}>
                      {cow.name ? `${cow.name} (${cow.number})` : cow.number}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="insDate">
                  {t('inseminations.dateLabel')}
                </label>
                <input
                  id="insDate"
                  type="date"
                  required
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>

              {/* Bull name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="insBull">
                  {t('inseminations.bullNameLabel')}
                </label>
                <input
                  id="insBull"
                  type="text"
                  required
                  placeholder="e.g. Blizzard"
                  value={bullName}
                  onChange={(e) => setBullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Heat type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="insHeat">
                  {t('inseminations.heatTypeLabel')}
                </label>
                <select
                  id="insHeat"
                  value={heatType}
                  onChange={(e) => setHeatType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="Natural">{t('inseminations.naturalOption')}</option>
                  <option value="Induced">{t('inseminations.inducedOption')}</option>
                </select>
              </div>

              {/* Cost */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="insCost">
                  {t('inseminations.costLabel')}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 text-sm font-bold">
                    $
                  </span>
                  <input
                    id="insCost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>
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
                {editingRecord ? t('inseminations.updateRecordButton') : t('inseminations.recordInseminationButton')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main logs list */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Search bar */}
        <div className="p-4 border-b border-slate-100 flex items-center">
          <div className="relative w-full max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="h-4.5 w-4.5" />
            </span>
            <input
              type="text"
              placeholder={t('inseminations.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 transition duration-150"
            />
          </div>
          <span className="ml-auto text-xs font-semibold text-slate-400">
            {filteredInseminations.length} {filteredInseminations.length === 1 ? t('inseminations.procedure') : t('inseminations.procedures')}
          </span>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="relative mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-brand-600"></div>
              <p className="mt-3 text-sm">{t('inseminations.loadingLogs')}</p>
            </div>
          ) : filteredInseminations.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                <Calendar className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-800">{t('inseminations.noRecordsTitle')}</h3>
              <p className="mt-1.5 text-xs text-slate-400 max-w-sm mx-auto">
                {searchTerm ? t('inseminations.adjustSearch') : t('inseminations.createFirstRecord')}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">{t('inseminations.cowNumberHeader')}</th>
                  <th className="px-6 py-4">{t('inseminations.cowNameHeader')}</th>
                  <th className="px-6 py-4">{t('inseminations.dateHeader')}</th>
                  <th className="px-6 py-4">{t('inseminations.orderHeader')}</th>
                  <th className="px-6 py-4">{t('inseminations.bullNameHeader')}</th>
                  <th className="px-6 py-4">{t('inseminations.heatTypeHeader')}</th>
                  <th className="px-6 py-4">{t('inseminations.costHeader')}</th>
                  <th className="px-6 py-4 text-right">{t('inseminations.actionsHeader')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredInseminations.map((ins) => {
                  const cowObj = cowLookup.get(ins.cowId);
                  const orderNum = cowInseminationsMap[ins.cowId]?.[ins.id] || 1;
                  return (
                    <tr 
                      key={ins.id} 
                      className="hover:bg-slate-50/50 transition duration-150"
                    >
                      <td className="px-6 py-4.5 font-bold text-slate-900">
                        <button
                          onClick={() => navigate(`/cows/${ins.cowId}`)}
                          className="hover:text-brand-700 text-left hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {cowObj?.number || ins.cowId.substring(0, 8)}
                        </button>
                      </td>
                      <td className="px-6 py-4.5 font-semibold text-slate-850">
                        {cowObj?.name || <span className="text-slate-350 italic font-normal">{t('cows.unnamed')}</span>}
                      </td>
                      <td className="px-6 py-4.5 font-bold text-slate-800">
                        {ins.date?.toDate
                          ? ins.date.toDate().toLocaleDateString(undefined, { dateStyle: 'medium' })
                          : t('cows.justNow')
                        }
                      </td>
                      <td className="px-6 py-4.5 font-bold">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs">
                          {orderNum}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 font-bold text-slate-750">
                        {ins.bullName}
                      </td>
                      <td className="px-6 py-4.5 text-slate-500 font-medium">
                        {ins.heatType === 'Natural' ? t('cows.naturalHeat') : t('cows.inducedHeat')}
                      </td>
                      <td className="px-6 py-4.5 text-slate-600 font-semibold">
                        {ins.cost > 0 ? `$${ins.cost.toFixed(2)}` : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-6 py-4.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(ins)}
                            className="p-2 rounded-lg hover:bg-slate-100 hover:text-slate-700 text-slate-400 transition cursor-pointer"
                            title={t('inseminations.editTooltip')}
                          >
                            <Edit3 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteRecord(ins)}
                            className="p-2 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition cursor-pointer"
                            title={t('inseminations.deleteTooltip')}
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <h3 className="font-display text-base font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="h-4.5 w-4.5" />
              <span>{t('inseminations.deleteConfirmTitle')}</span>
            </h3>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('inseminations.deleteConfirmDesc')}
            </p>

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteRecord(null)}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate({ id: confirmDeleteRecord.id, cowId: confirmDeleteRecord.cowId })}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-bold shadow-md shadow-red-100 cursor-pointer"
              >
                {deleteMutation.isPending ? t('inseminations.deletingButton') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
