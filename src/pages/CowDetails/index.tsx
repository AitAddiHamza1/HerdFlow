import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cowsRepository } from '../../repositories/cowsRepository';
import { inseminationRepository } from '../../repositories/inseminationRepository';
import { 
  calculateCalvingDetails, 
  getLatestActiveCycle, 
  calculateDynamicOrderNumbers 
} from '../../utils/calving';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Heart, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Clock, 
  ChevronRight,
  TrendingUp,
  Activity,
  Shield,
  CreditCard
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

export const CowDetails: React.FC = () => {
  const { id: cowId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Active tab state
  const [activeTab, setActiveTab] = useState<'profile' | 'inseminations' | 'milk' | 'health' | 'vaccinations' | 'expenses'>('profile');

  // Form toggles
  const [isInsFormOpen, setIsInsFormOpen] = useState(false);
  const [editingInsId, setEditingInsId] = useState<string | null>(null);
  const [confirmDeleteInsId, setConfirmDeleteInsId] = useState<string | null>(null);

  // Insemination form states
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [bullName, setBullName] = useState('');
  const [heatType, setHeatType] = useState('Natural');
  const [cost, setCost] = useState('');
  const [insError, setInsError] = useState('');

  // Profile Edit fields (inline on Profile tab)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editNumber, setEditNumber] = useState('');
  const [editName, setEditName] = useState('');
  const [editBreed, setEditBreed] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [profileError, setProfileError] = useState('');

  // Fetch Cow profile
  const { data: cow, isLoading: isLoadingCow, isError: isCowError } = useQuery({
    queryKey: ['cow', cowId],
    queryFn: () => cowsRepository.getById(cowId),
    enabled: !!cowId,
  });

  // Fetch Inseminations for this cow
  const { data: inseminations = [], isLoading: isLoadingIns } = useQuery({
    queryKey: ['inseminations', 'cow', cowId],
    queryFn: () => inseminationRepository.getAllForCow(cowId),
    enabled: !!cowId,
  });

  // Setup profile edit values once loaded
  React.useEffect(() => {
    if (cow) {
      setEditNumber(cow.number);
      setEditName(cow.name || '');
      setEditBreed(cow.breed || '');
      setEditNotes(cow.notes || '');
    }
  }, [cow]);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: (data: { number: string; name?: string; breed?: string; notes?: string }) =>
      cowsRepository.update(user?.uid || '', cowId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cow', cowId] });
      queryClient.invalidateQueries({ queryKey: ['cows', user?.uid] });
      setIsEditingProfile(false);
      setProfileError('');
    },
    onError: (err: any) => {
      setProfileError(err.message || 'Failed to update cow profile.');
    }
  });

  const createInsMutation = useMutation({
    mutationFn: (data: { date: Timestamp; bullName: string; heatType: string; cost: number }) =>
      inseminationRepository.create(user?.uid || '', cowId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inseminations', 'cow', cowId] });
      queryClient.invalidateQueries({ queryKey: ['inseminations', user?.uid] });
      resetInsForm();
    },
    onError: (err: any) => {
      setInsError(err.message || 'Failed to add insemination.');
    }
  });

  const updateInsMutation = useMutation({
    mutationFn: (data: { id: string; date: Timestamp; bullName: string; heatType: string; cost: number }) =>
      inseminationRepository.update(cowId, data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inseminations', 'cow', cowId] });
      queryClient.invalidateQueries({ queryKey: ['inseminations', user?.uid] });
      resetInsForm();
    },
    onError: (err: any) => {
      setInsError(err.message || 'Failed to update insemination.');
    }
  });

  const deleteInsMutation = useMutation({
    mutationFn: (id: string) => inseminationRepository.delete(cowId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inseminations', 'cow', cowId] });
      queryClient.invalidateQueries({ queryKey: ['inseminations', user?.uid] });
      setConfirmDeleteInsId(null);
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to delete insemination.');
    }
  });

  // Reset insemination form
  const resetInsForm = () => {
    setDateStr(new Date().toISOString().split('T')[0]);
    setBullName('');
    setHeatType('Natural');
    setCost('');
    setInsError('');
    setEditingInsId(null);
    setIsInsFormOpen(false);
  };

  const handleEditInsClick = (record: any) => {
    setEditingInsId(record.id);
    const recDate = record.date.toDate();
    setDateStr(recDate.toISOString().split('T')[0]);
    setBullName(record.bullName);
    setHeatType(record.heatType);
    setCost(String(record.cost));
    setIsInsFormOpen(true);
  };

  const handleInsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bullName.trim() || !dateStr) {
      setInsError('Please fill in required fields.');
      return;
    }

    const payload = {
      date: Timestamp.fromDate(new Date(dateStr)),
      bullName,
      heatType,
      cost: Number(cost) || 0
    };

    if (editingInsId) {
      updateInsMutation.mutate({ id: editingInsId, ...payload });
    } else {
      createInsMutation.mutate(payload);
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNumber.trim()) {
      setProfileError('Cow number is required.');
      return;
    }
    updateProfileMutation.mutate({
      number: editNumber,
      name: editName,
      breed: editBreed,
      notes: editNotes
    });
  };

  // Derive Calving Predictions
  const activeCycle = getLatestActiveCycle(inseminations);
  // Sort active cycle by date ascending to get the absolute latest insemination of this cycle
  const sortedActive = [...activeCycle].sort((a, b) => a.date.seconds - b.date.seconds);
  const latestInsemination = sortedActive[sortedActive.length - 1];
  const calvingDetails = calculateCalvingDetails(latestInsemination);

  // Derive Dynamic Order Map
  const orderMap = calculateDynamicOrderNumbers(inseminations);

  if (isLoadingCow) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="relative mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-brand-600"></div>
        <p className="mt-3 text-sm">{t('cows.loadingProfile')}</p>
      </div>
    );
  }

  if (isCowError || !cow) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-md mx-auto space-y-4">
        <h3 className="font-display font-bold text-slate-800 text-lg">{t('cows.notFoundTitle')}</h3>
        <p className="text-sm text-slate-500">{t('cows.notFoundDesc')}</p>
        <button
          onClick={() => navigate('/cows')}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t('cows.backToCows')}</span>
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: t('cows.tabProfile'), icon: Shield, disabled: false },
    { id: 'inseminations', label: t('cows.tabInseminations'), icon: Calendar, disabled: false },
    { id: 'milk', label: t('cows.tabMilk'), icon: TrendingUp, disabled: true },
    { id: 'health', label: t('cows.tabHealth'), icon: Activity, disabled: true },
    { id: 'vaccinations', label: t('cows.tabVaccinations'), icon: Heart, disabled: true },
    { id: 'expenses', label: t('cows.tabExpenses'), icon: CreditCard, disabled: true },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Navigation and Quick Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/cows')}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition cursor-pointer"
          title={t('cows.backToCowsTooltip')}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('cows.profileCard')}</span>
          <h2 className="font-display text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>{cow.name || t('cows.unnamed')}</span>
            <span className="text-slate-400 font-semibold font-sans">#{cow.number}</span>
          </h2>
        </div>
      </div>

      {/* Main Grid: Info Banner / Breeding State and Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Breeding Proximity & Overview Panel */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Calving predict card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-400">{t('cows.reproductiveState')}</span>
              {calvingDetails ? (
                <span className="rounded-full bg-brand-100 px-3 py-0.5 text-xs font-bold text-brand-800">
                  {t('cows.inseminated')}
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-500">
                  {t('cows.open')}
                </span>
              )}
            </div>

            {calvingDetails ? (
              <div className="space-y-3">
                <div className="text-center py-4 bg-brand-50/50 rounded-2xl border border-brand-100">
                  <span className="block text-slate-400 text-xs font-bold uppercase tracking-wider">{t('cows.expectedCalvingIn')}</span>
                  <span className="font-display text-4xl font-black text-brand-800">{calvingDetails.daysRemaining}</span>
                  <span className="block text-brand-700 text-xs font-bold mt-1">{t('cows.daysRemaining')}</span>
                </div>

                <div className="text-xs text-slate-500 space-y-1.5 px-1 font-semibold">
                  <div className="flex justify-between">
                    <span>{t('cows.expectedCalvingDate')}:</span>
                    <span className="text-slate-700">
                      {calvingDetails.expectedCalvingDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('cows.latestInseminationDate')}:</span>
                    <span className="text-slate-700">
                      {latestInsemination.date.toDate().toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('cows.activeCycleInseminations')}:</span>
                    <span className="text-slate-700">{activeCycle.length} {t('cows.procedures')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-2">
                  <Clock className="h-6 w-6" />
                </div>
                <p className="font-medium">{t('cows.noActiveInseminations')}</p>
                <p className="text-xs mt-1 max-w-xs mx-auto">{t('cows.noActiveInseminationsDesc')}</p>
              </div>
            )}
          </div>

          {/* Quick breed info card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="font-display font-bold text-slate-800 text-sm">{t('cows.generalInfo')}</h4>
            <div className="space-y-3 text-xs font-semibold text-slate-500">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span>{t('cows.breedLabel')}:</span>
                <span className="text-slate-800">{cow.breed || t('cows.notSpecified')}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span>{t('cows.createdDate')}:</span>
                <span className="text-slate-800">
                  {cow.createdAt?.toDate 
                    ? cow.createdAt.toDate().toLocaleDateString(undefined, { dateStyle: 'medium' })
                    : t('cows.justNow')
                  }
                </span>
              </div>
              <div>
                <span className="block mb-1">{t('cows.notesLabel')}</span>
                <p className="text-slate-700 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed max-h-32 overflow-y-auto">
                  {cow.notes || t('cows.noNotes')}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Tab Controls and Dynamic Page Outlet */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tab selector bar */}
          <div className="flex overflow-x-auto gap-2 bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200/80 scrollbar-none">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  disabled={tab.disabled}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition duration-150 whitespace-nowrap cursor-pointer
                    ${tab.disabled 
                      ? 'opacity-40 cursor-not-allowed text-slate-400' 
                      : activeTab === tab.id
                        ? 'bg-white text-slate-800 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:bg-white/40 hover:text-slate-800'}
                  `}
                >
                  <TabIcon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Panel Content */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-display text-lg font-bold text-slate-800">{t('cows.registrationDetails')}</h3>
                  <button
                    onClick={() => {
                      if (isEditingProfile) {
                        setProfileError('');
                      }
                      setIsEditingProfile(!isEditingProfile);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-600 transition cursor-pointer"
                  >
                    {isEditingProfile ? t('common.cancel') : (
                      <>
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>{t('cows.editProfile')}</span>
                      </>
                    )}
                  </button>
                </div>

                {isEditingProfile ? (
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    {profileError && (
                      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
                        {profileError}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          {t('cows.cowNumber')}
                        </label>
                        <input
                          type="text"
                          required
                          value={editNumber}
                          onChange={(e) => setEditNumber(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          {t('cows.tagNumber')}
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        {t('cows.breedLabel')}
                      </label>
                      <input
                        type="text"
                        value={editBreed}
                        onChange={(e) => setEditBreed(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        {t('cows.breederNotes')}
                      </label>
                      <textarea
                        value={editNotes}
                        rows={3}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileError('');
                        }}
                        className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4.5 py-2.5 text-sm font-semibold text-slate-700 cursor-pointer"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 text-sm font-bold shadow-md shadow-brand-100 cursor-pointer"
                      >
                        {t('cows.saveChanges')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4 text-sm font-semibold text-slate-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="block text-xs text-slate-400 uppercase tracking-wider mb-1">{t('cows.tagNumber')}</span>
                        <p className="text-slate-800 text-base">{cow.number}</p>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400 uppercase tracking-wider mb-1">{t('cows.name')}</span>
                        <p className="text-slate-800 text-base">{cow.name || t('cows.unnamed')}</p>
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400 uppercase tracking-wider mb-1">{t('cows.breedLabel')}</span>
                      <p className="text-slate-800 text-base">{cow.breed || t('cows.notSpecified')}</p>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-400 uppercase tracking-wider mb-1">{t('cows.breederNotes')}</span>
                      <p className="text-slate-700 font-medium bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-line">
                        {cow.notes || t('cows.noDescriptionNotes')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* INSEMINATION HISTORIES TAB */}
            {activeTab === 'inseminations' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-800">{t('cows.artificialInseminations')}</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">{t('cows.trackProcedures')}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (isInsFormOpen) {
                        resetInsForm();
                      } else {
                        setIsInsFormOpen(true);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 px-3.5 py-2 text-xs font-bold text-white transition cursor-pointer shadow-sm shadow-brand-100"
                  >
                    {isInsFormOpen ? (
                      <span>{t('cows.closeForm')}</span>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        <span>{t('inseminations.logProcedure')}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Add Insemination form card */}
                {isInsFormOpen && (
                  <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200 space-y-4">
                    <h4 className="font-display text-sm font-bold text-slate-700">
                      {editingInsId ? t('cows.editInseminationTitle') : t('cows.recordInseminationTitle')}
                    </h4>
                    
                    <form onSubmit={handleInsSubmit} className="space-y-4">
                      {insError && (
                        <div className="rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100">
                          {insError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                            {t('cows.inseminationDateLabel')}
                          </label>
                          <input
                            type="date"
                            required
                            value={dateStr}
                            onChange={(e) => setDateStr(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                            {t('cows.bullNameLabel')}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Zeus"
                            value={bullName}
                            onChange={(e) => setBullName(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                            {t('cows.heatTypeLabel')}
                          </label>
                          <select
                            value={heatType}
                            onChange={(e) => setHeatType(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                          >
                            <option value="Natural">{t('cows.naturalHeat')}</option>
                            <option value="Induced">{t('cows.inducedHeat')}</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                            {t('cows.costLabel')}
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs font-bold">
                              $
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={cost}
                              onChange={(e) => setCost(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-7 pr-3 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2.5 justify-end">
                        <button
                          type="button"
                          onClick={resetInsForm}
                          className="rounded-xl border border-slate-200 bg-white hover:bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 cursor-pointer"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="submit"
                          disabled={createInsMutation.isPending || updateInsMutation.isPending}
                          className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-xs font-bold shadow-sm cursor-pointer"
                        >
                          {editingInsId ? t('cows.saveChanges') : t('cows.logRecord')}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Inseminations History Table */}
                <div className="overflow-x-auto">
                  {isLoadingIns ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      {t('cows.resolvingHistory')}
                    </div>
                  ) : inseminations.length === 0 ? (
                    <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl">
                      <Calendar className="mx-auto h-8 w-8 text-slate-300" />
                      <h4 className="mt-3 text-xs font-bold text-slate-800">{t('cows.noInseminationsLogged')}</h4>
                      <p className="mt-1 text-[11px] text-slate-400 max-w-xs mx-auto">
                        {t('cows.noInseminationsDesc')}
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                          <th className="py-3 px-2">{t('inseminations.orderHeader')}</th>
                          <th className="py-3 px-2">{t('inseminations.dateHeader')}</th>
                          <th className="py-3 px-2">{t('inseminations.bullNameHeader')}</th>
                          <th className="py-3 px-2">{t('inseminations.heatTypeHeader')}</th>
                          <th className="py-3 px-2">{t('inseminations.costHeader')}</th>
                          <th className="py-3 px-2 text-right">{t('inseminations.actionsHeader')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-700">
                        {inseminations.map((record) => {
                          const orderNum = orderMap[record.id] || 1;
                          const isLatestOfCycle = latestInsemination?.id === record.id;
                          return (
                            <tr key={record.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-2">
                                <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-bold text-[10px] ${
                                  isLatestOfCycle 
                                    ? 'bg-brand-600 text-white shadow-xs' 
                                    : 'bg-slate-100 text-slate-500'
                                  }`}>
                                  {orderNum}
                                </span>
                                {isLatestOfCycle && (
                                  <span className="ml-1.5 text-[9px] font-black uppercase tracking-wider text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-md">
                                    {t('cows.active')}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-slate-900 font-bold">
                                {record.date?.toDate 
                                  ? record.date.toDate().toLocaleDateString(undefined, { dateStyle: 'medium' })
                                  : t('cows.invalidDate')
                                }
                              </td>
                              <td className="py-3 px-2 font-bold text-slate-800">{record.bullName}</td>
                              <td className="py-3 px-2 text-slate-500">
                                {record.heatType === 'Natural' ? t('cows.naturalHeat') : t('cows.inducedHeat')}
                              </td>
                              <td className="py-3 px-2 text-slate-600 font-semibold">
                                {record.cost > 0 ? `$${record.cost.toFixed(2)}` : <span className="text-slate-300">-</span>}
                              </td>
                              <td className="py-3 px-2 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleEditInsClick(record)}
                                    className="p-1 rounded hover:bg-slate-100 hover:text-slate-700 text-slate-400 transition cursor-pointer"
                                    title={t('cows.editProcedure')}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteInsId(record.id)}
                                    className="p-1 rounded hover:bg-red-50 hover:text-red-600 text-slate-400 transition cursor-pointer"
                                    title={t('cows.deleteRecord')}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
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
            )}

          </div>

        </div>

      </div>

      {/* Confirmation Delete Insemination Dialog overlay */}
      {confirmDeleteInsId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <h3 className="font-display text-base font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="h-4.5 w-4.5" />
              <span>{t('cows.deleteRecordTitle')}</span>
            </h3>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('cows.deleteRecordDesc')}
            </p>

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteInsId(null)}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => deleteInsMutation.mutate(confirmDeleteInsId)}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-bold shadow-md shadow-red-100 cursor-pointer"
              >
                {deleteInsMutation.isPending ? t('cows.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
