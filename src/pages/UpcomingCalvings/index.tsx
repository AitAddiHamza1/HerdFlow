import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { cowsRepository } from '../../repositories/cowsRepository';
import { inseminationRepository } from '../../repositories/inseminationRepository';
import { calculateCalvingDetails, getLatestActiveCycle } from '../../utils/calving';
import { formatDate } from '../../utils/date';
import { 
  CheckCircle,
  ChevronRight,
  Clock
} from 'lucide-react';
import type { Cow } from '../../types/cow';
import type { Insemination } from '../../types/insemination';

interface CowCalvingGroupItem {
  cow: Cow;
  latestInsemination: Insemination;
  expectedCalvingDate: Date;
  daysRemaining: number;
}

export const UpcomingCalvings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Fetch cows
  const { data: cows = [], isLoading: isLoadingCows } = useQuery({
    queryKey: ['cows', user?.uid],
    queryFn: () => cowsRepository.getAll(user?.uid || ''),
    enabled: !!user?.uid,
  });

  // Fetch inseminations
  const { data: inseminations = [], isLoading: isLoadingIns } = useQuery({
    queryKey: ['inseminations', user?.uid],
    queryFn: () => inseminationRepository.getAllForUser(user?.uid || ''),
    enabled: !!user?.uid,
  });

  const isLoading = isLoadingCows || isLoadingIns;

  // Group inseminations by cow
  const inseminationsByCow = React.useMemo(() => {
    const groups: Record<string, Insemination[]> = {};
    inseminations.forEach(rec => {
      if (!groups[rec.cowId]) {
        groups[rec.cowId] = [];
      }
      groups[rec.cowId].push(rec);
    });
    return groups;
  }, [inseminations]);

  // Compute calving details for all cows
  const calvingCows = React.useMemo(() => {
    const list: CowCalvingGroupItem[] = [];
    
    cows.forEach(cow => {
      const records = inseminationsByCow[cow.id] || [];
      const activeCycle = getLatestActiveCycle(records);
      if (activeCycle.length === 0) return;

      const latest = activeCycle[activeCycle.length - 1];

      const details = calculateCalvingDetails(latest);
      if (details && details.daysRemaining >= 0 && details.daysRemaining <= 60) {
        list.push({
          cow,
          latestInsemination: latest,
          expectedCalvingDate: details.expectedCalvingDate,
          daysRemaining: details.daysRemaining
        });
      }
    });

    // Sort list by daysRemaining ascending (nearest calving first)
    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [cows, inseminationsByCow]);

  // Split into categories
  const categories = React.useMemo(() => {
    const cat7: CowCalvingGroupItem[] = [];
    const cat15: CowCalvingGroupItem[] = [];
    const cat30: CowCalvingGroupItem[] = [];
    const cat60: CowCalvingGroupItem[] = [];

    calvingCows.forEach(item => {
      if (item.daysRemaining <= 7) {
        cat7.push(item);
      } else if (item.daysRemaining <= 15) {
        cat15.push(item);
      } else if (item.daysRemaining <= 30) {
        cat30.push(item);
      } else {
        cat60.push(item);
      }
    });

    return [
      { id: 'cat7', title: t('calving.critical'), subtitle: t('calving.criticalDesc'), items: cat7, bg: 'bg-red-50/50 border-red-200 text-red-800', badge: 'bg-red-100 text-red-800', count: cat7.length },
      { id: 'cat15', title: t('calving.urgent'), subtitle: t('calving.urgentDesc'), items: cat15, bg: 'bg-orange-50/50 border-orange-200 text-orange-800', badge: 'bg-orange-100 text-orange-800', count: cat15.length },
      { id: 'cat30', title: t('calving.high'), subtitle: t('calving.highDesc'), items: cat30, bg: 'bg-amber-50/50 border-amber-200 text-amber-800', badge: 'bg-amber-100 text-amber-800', count: cat30.length },
      { id: 'cat60', title: t('calving.routine'), subtitle: t('calving.routineDesc'), items: cat60, bg: 'bg-brand-50/40 border-brand-200 text-brand-800', badge: 'bg-brand-100 text-brand-800', count: cat60.length },
    ];
  }, [calvingCows, t]);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight text-slate-800">{t('calving.title')}</h2>
        <p className="text-slate-500 text-sm mt-1">{t('calving.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="relative mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-brand-600"></div>
          <p className="mt-3 text-sm">{t('calving.calculatingDueDates')}</p>
        </div>
      ) : calvingCows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h3 className="font-display font-bold text-slate-800 text-lg">{t('calving.noSchedulesTitle')}</h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            {t('calving.noSchedulesDesc')}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category.id} className="space-y-4">
              {/* Category Header */}
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${category.badge}`}>
                  {category.count}
                </span>
                <div>
                  <h3 className="font-display font-bold text-slate-800 text-base">{category.title}</h3>
                  <p className="text-slate-400 text-xs font-semibold">{category.subtitle}</p>
                </div>
              </div>

              {/* Cow Cards or Empty State for this category */}
              {category.items.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 text-center text-slate-400 text-xs font-medium">
                  {t('calving.noCowsInTier')}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.items.map((item) => (
                    <div 
                      key={item.cow.id}
                      onClick={() => navigate(`/cows/${item.cow.id}`)}
                      className={`
                        border rounded-2xl p-5 shadow-xs transition duration-200 cursor-pointer flex flex-col gap-4 hover:-translate-y-0.5 hover:shadow-md
                        ${category.bg}
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-display font-bold text-slate-900 text-sm">
                            {item.cow.name || t('calving.unnamed')}
                          </h4>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            #{item.cow.number}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-2xl font-black text-slate-800 font-display">
                            {item.daysRemaining}
                          </span>
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {t('calving.daysLeft')}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 font-semibold space-y-1">
                        <div className="flex justify-between">
                          <span>{t('calving.expectedCalvingLabel')}</span>
                          <span className="text-slate-700">
                            {formatDate(item.expectedCalvingDate)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('calving.bullPartnerLabel')}</span>
                          <span className="text-slate-700 font-bold">{item.latestInsemination.bullName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('calving.breedLabel')}</span>
                          <span className="text-slate-700">{item.cow.breed || t('cows.notSpecified')}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 mt-auto">
                        <span className="font-medium text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {t('calving.loggedDateText', { 
                              date: formatDate(item.latestInsemination.date) 
                            })}
                          </span>
                        </span>
                        <span className="font-bold flex items-center gap-0.5 text-brand-600 hover:text-brand-700">
                          <span>{t('calving.detailsButton')}</span>
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
