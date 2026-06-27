import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { cowsRepository } from '../../repositories/cowsRepository';
import { inseminationRepository } from '../../repositories/inseminationRepository';
import { calculateCalvingDetails, getLatestActiveCycle } from '../../utils/calving';
import { generateNotifications } from '../../utils/notifications';
import { formatDate } from '../../utils/date';
import { 
  Database, 
  Heart, 
  Calendar, 
  Bell, 
  Plus, 
  Clock, 
  ArrowUpRight
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // 1. Fetch Cows
  const { data: cows = [], isLoading: isLoadingCows } = useQuery({
    queryKey: ['cows', user?.uid],
    queryFn: () => cowsRepository.getAll(user?.uid || ''),
    enabled: !!user?.uid,
  });

  // 2. Fetch Inseminations
  const { data: inseminations = [], isLoading: isLoadingIns } = useQuery({
    queryKey: ['inseminations', user?.uid],
    queryFn: () => inseminationRepository.getAllForUser(user?.uid || ''),
    enabled: !!user?.uid,
  });

  // Calculate stats
  const totalCows = cows.length;
  const uniqueInseminatedCowIds = new Set(inseminations.map(ins => ins.cowId));
  const inseminatedCowsCount = uniqueInseminatedCowIds.size;

  // Group inseminations by cowId
  const inseminationsByCow: Record<string, typeof inseminations> = {};
  inseminations.forEach(rec => {
    if (!inseminationsByCow[rec.cowId]) {
      inseminationsByCow[rec.cowId] = [];
    }
    inseminationsByCow[rec.cowId].push(rec);
  });

  let cowsApproachingCalvingCount = 0;
  Object.values(inseminationsByCow).forEach((records) => {
    const activeCycle = getLatestActiveCycle(records);
    if (activeCycle.length === 0) return;
    
    const sorted = [...activeCycle].sort((a, b) => a.date.seconds - b.date.seconds);
    const latest = sorted[sorted.length - 1];
    
    const details = calculateCalvingDetails(latest);
    if (details && details.daysRemaining >= 0 && details.daysRemaining <= 60) {
      cowsApproachingCalvingCount++;
    }
  });

  // Generate reminders
  const reminders = generateNotifications(inseminations, cows);
  const activeRemindersCount = reminders.length;

  const stats = [
    { 
      name: t('dashboard.totalCows'), 
      value: totalCows, 
      icon: Database, 
      color: 'text-slate-600 bg-slate-100',
      description: t('dashboard.totalCowsDesc')
    },
    { 
      name: t('dashboard.inseminatedCows'), 
      value: inseminatedCowsCount, 
      icon: Heart, 
      color: 'text-brand-600 bg-brand-50',
      description: t('dashboard.inseminatedCowsDesc')
    },
    { 
      name: t('dashboard.approachingCalving'), 
      value: cowsApproachingCalvingCount, 
      icon: Calendar, 
      color: 'text-amber-600 bg-amber-50',
      description: t('dashboard.approachingCalvingDesc')
    },
    { 
      name: t('dashboard.activeReminders'), 
      value: activeRemindersCount, 
      icon: Bell, 
      color: 'text-red-600 bg-red-50',
      description: t('dashboard.activeRemindersDesc')
    },
  ];

  const cowLookup = React.useMemo(() => {
    const map = new Map<string, typeof cows[0]>();
    cows.forEach(cow => map.set(cow.id, cow));
    return map;
  }, [cows]);

  const recentInseminations = inseminations.slice(0, 5);
  const isLoading = isLoadingCows || isLoadingIns;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 text-white rounded-3xl p-6 lg:p-8 shadow-md">
        <div>
          <h2 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">
            {t('dashboard.welcome', { name: profile?.name || 'Breeder' })}
          </h2>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <button
          onClick={() => navigate('/cows')}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white py-3 px-5 text-sm font-bold shadow-md shadow-brand-900/40 transition cursor-pointer self-start sm:self-center"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>{t('cows.addCow')}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400">
          <div className="relative mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-brand-600"></div>
          <p className="mt-3 text-sm">{t('common.loading')}</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div 
                  key={stat.name}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center justify-between group hover:shadow-md transition duration-200"
                >
                  <div className="space-y-1 text-right">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.name}</p>
                    <p className="font-display text-3xl font-black text-slate-800">{stat.value}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{stat.description}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color} transition duration-200`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recent Table */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-display font-bold text-slate-800">{t('dashboard.recentInseminations')}</h3>
                <button
                  onClick={() => navigate('/cows')}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-0.5"
                >
                  <span>{t('dashboard.viewAllCows')}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-x-auto">
                {recentInseminations.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm">
                    <Clock className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p>{t('inseminations.noRecords')}</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-5 py-3">{t('cows.cowNumber')}</th>
                        <th className="px-5 py-3">{t('cows.name')}</th>
                        <th className="px-5 py-3">{t('inseminations.bullName')}</th>
                        <th className="px-5 py-3">{t('inseminations.insDate')}</th>
                        <th className="px-5 py-3">{t('inseminations.cost')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-600">
                      {recentInseminations.map((ins) => {
                        const cowObj = cowLookup.get(ins.cowId);
                        return (
                          <tr key={ins.id} className="hover:bg-slate-50/50">
                            <td className="px-5 py-3.5 font-bold text-slate-900">
                              <button
                                onClick={() => navigate(`/cows/${ins.cowId}`)}
                                className="hover:text-brand-700 text-left hover:underline cursor-pointer"
                              >
                                {cowObj?.number || ins.cowId.substring(0, 8)}
                              </button>
                            </td>
                            <td className="px-5 py-3.5">
                              {cowObj?.name || <span className="text-slate-300 italic">{t('cows.unnamed')}</span>}
                            </td>
                            <td className="px-5 py-3.5 font-bold text-slate-700">{ins.bullName}</td>
                            <td className="px-5 py-3.5">
                              {formatDate(ins.date)}
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 font-semibold">
                              {ins.cost > 0 ? `$${ins.cost.toFixed(2)}` : <span className="text-slate-300">-</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Alerts Sidebar Widget */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col h-[350px]">
              <h3 className="font-display font-bold text-slate-800 border-b border-slate-100 pb-3 mb-3">
                {t('dashboard.calvingAlerts')}
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-3 p-1">
                {reminders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center">
                    <Bell className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold">{t('dashboard.allSystemsNormal')}</p>
                    <p className="mt-0.5 text-slate-400">{t('dashboard.noAlerts')}</p>
                  </div>
                ) : (
                  reminders.map((reminder, index) => (
                    <div 
                      key={index} 
                      onClick={() => navigate(`/cows/${reminder.cowId}`)}
                      className="group flex flex-col gap-1.5 p-3 rounded-xl border border-slate-150 bg-slate-50 hover:bg-white hover:border-brand-500 transition duration-150 cursor-pointer text-right"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                          {t('cows.cowNumber')}: {reminder.cowNumber}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          reminder.daysRemaining <= 7 ? 'bg-red-100 text-red-700' :
                          reminder.daysRemaining <= 15 ? 'bg-orange-100 text-orange-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {reminder.daysRemaining} {t('calving.daysRemaining')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                        {reminder.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};
