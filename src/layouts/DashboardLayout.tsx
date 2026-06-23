import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Database, 
  Calendar, 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  Sprout, 
  User,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { inseminationRepository } from '../repositories/inseminationRepository';
import { cowsRepository } from '../repositories/cowsRepository';
import { generateNotifications } from '../utils/notifications';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const isRtl = i18n.language === 'ar';

  // Fetch all cows owned by the breeder
  const { data: cows = [] } = useQuery({
    queryKey: ['cows', user?.uid],
    queryFn: () => cowsRepository.getAll(user?.uid || ''),
    enabled: !!user?.uid,
  });

  // Fetch all user inseminations dynamically to calculate dynamic notifications
  const { data: inseminations = [] } = useQuery({
    queryKey: ['inseminations', user?.uid],
    queryFn: () => inseminationRepository.getAllForUser(user?.uid || ''),
    enabled: !!user?.uid,
  });

  // Generate dynamic reminders
  const reminders = generateNotifications(inseminations, cows);
  const unreadRemindersCount = reminders.length;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navItems = [
    { name: t('nav.dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('nav.myCows'), path: '/cows', icon: Database },
    { name: t('nav.inseminations'), path: '/inseminations', icon: Sprout },
    { name: t('nav.upcomingCalvings'), path: '/upcoming-calvings', icon: Calendar },
    { name: t('nav.settings'), path: '/settings', icon: User },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside className={`
        fixed inset-y-0 z-50 flex w-72 flex-col bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
        ${isRtl ? 'right-0' : 'left-0'}
        ${sidebarOpen 
          ? 'translate-x-0' 
          : isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand/Header */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 overflow-hidden items-center justify-center rounded-xl bg-white p-0.5 shadow-sm">
              <img src="/logo.png" alt="HerdFlow Logo" className="h-full w-full object-contain" />
            </div>
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h1 className="font-display text-lg font-bold tracking-tight">HerdFlow</h1>
              <p className="text-xs text-brand-400 font-medium">{t('nav.dashboard')}</p>
            </div>
          </div>
          <button 
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition duration-150
                  ${isActive 
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-900/30' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}
                `}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.name}</span>
                {isActive && (
                  isRtl ? <ChevronLeft className="mr-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Summary */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 px-2 py-3 rounded-xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-800 text-brand-200">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 text-right">
              <p className="text-sm font-bold text-slate-200 truncate">{profile?.name || 'Breeder'}</p>
              <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-slate-800 hover:text-red-400 text-slate-400 transition cursor-pointer"
              title={t('common.logout')}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex h-20 items-center justify-between px-6 bg-white border-b border-slate-200 shrink-0">
          <button 
            className="p-2 rounded-lg hover:bg-slate-100 lg:hidden text-slate-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="ms-auto flex items-center gap-4">
            {/* Dynamic Notifications Button */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-full hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              >
                <Bell className="h-5.5 w-5.5" />
                {unreadRemindersCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                    {unreadRemindersCount}
                  </span>
                )}
              </button>

              {/* Notification Overlay Popover */}
              {showNotifications && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className={`absolute ${isRtl ? 'left-0' : 'right-0'} mt-3 w-80 sm:w-96 max-h-[480px] z-50 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl flex flex-col`}>
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <h3 className="font-display font-bold text-slate-800">{t('dashboard.calvingAlerts')}</h3>
                      <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
                        {unreadRemindersCount} {t('dashboard.activeReminders')}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
                      {reminders.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm">
                          {t('dashboard.noAlerts')}
                        </div>
                      ) : (
                        reminders.map((reminder, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => {
                              setShowNotifications(false);
                              navigate(`/cows/${reminder.cowId}`);
                            }}
                            className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition flex flex-col gap-1 text-right"
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-bold text-brand-700"># {reminder.cowNumber}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                reminder.daysRemaining <= 7 ? 'bg-red-100 text-red-700' :
                                reminder.daysRemaining <= 15 ? 'bg-orange-100 text-orange-700' :
                                'bg-brand-100 text-brand-700'
                              }`}>
                                {reminder.daysRemaining} {t('calving.daysRemaining')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 font-medium">{reminder.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="h-8 w-px bg-slate-200" />

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-bold text-slate-800">{profile?.name || 'Breeder'}</p>
                <p className="text-xs text-slate-400 font-semibold">{t('settings.farmProfile')}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                {(profile?.name || 'B').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
