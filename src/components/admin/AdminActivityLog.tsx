import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Shield,
  Crown,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  Clock,
  UserCheck,
  Megaphone,
  Settings,
  Layers,
  FileText,
  AlertCircle,
  CheckCircle,
  Eye,
  X,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Calendar,
  User,
  SlidersHorizontal
} from 'lucide-react';
import { AdminActivityLog as ActivityLogEntry, AdminActionCategory, AdminActionType } from '../../types';
import {
  subscribeToAdminActivityLogs,
  deleteAdminActivityLog,
  clearAllAdminActivityLogs,
  exportAdminActivityLogsAsCsv,
  exportAdminActivityLogsAsJson
} from '../../services/activityLogService';

interface AdminActivityLogProps {
  currentAdmin?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export function AdminActivityLog({ currentAdmin }: AdminActivityLogProps) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isSuperadmin = currentAdmin?.role === 'superadmin';

  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeToAdminActivityLogs((loadedLogs) => {
      setLogs(loadedLogs);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleDeleteLog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteAdminActivityLog(id);
      showNotification('Vnos v dnevniku je bil uspešno izbrisan.');
    } catch {
      showNotification('Napaka pri brisanju vnosa.');
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllAdminActivityLogs();
      setIsClearModalOpen(false);
      showNotification('Dnevnik aktivnosti je bil uspešno očiščen.');
    } catch {
      showNotification('Napaka pri čiščenju dnevnika.');
    }
  };

  // Helper formatting for timestamps
  const formatTimeAgo = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'pravkar';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `pred ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `pred ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'včeraj';
    if (diffDays < 7) return `pred ${diffDays} dnevi`;
    return date.toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Human friendly action type label & styling
  const getActionConfig = (actionType: AdminActionType) => {
    switch (actionType) {
      case 'role_change':
        return {
          label: 'Sprememba vloge',
          icon: Shield,
          color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
        };
      case 'registration_confirm':
        return {
          label: 'Potrditev registracije',
          icon: UserCheck,
          color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
        };
      case 'user_status_change':
        return {
          label: 'Status računa (blokada)',
          icon: User,
          color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
        };
      case 'user_create':
        return {
          label: 'Ustvarjen uporabnik',
          icon: UserCheck,
          color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
        };
      case 'user_delete':
        return {
          label: 'Izbris uporabnika',
          icon: Trash2,
          color: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
        };
      case 'banner_create':
        return {
          label: 'Nova pasica',
          icon: Megaphone,
          color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
        };
      case 'banner_update':
        return {
          label: 'Posodobitev pasice',
          icon: Megaphone,
          color: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30'
        };
      case 'banner_delete':
        return {
          label: 'Izbris pasice',
          icon: Trash2,
          color: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
        };
      case 'banner_toggle':
        return {
          label: 'Vklop/izklop pasice',
          icon: Megaphone,
          color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
        };
      case 'category_create':
      case 'category_update':
      case 'category_delete':
        return {
          label: 'Kategorije',
          icon: Layers,
          color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
        };
      case 'settings_update':
        return {
          label: 'Nastavitve portala',
          icon: Settings,
          color: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30'
        };
      case 'post_status_change':
      case 'post_delete':
        return {
          label: 'Objava vsebine',
          icon: FileText,
          color: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30'
        };
      default:
        return {
          label: 'Administrativna akcija',
          icon: History,
          color: 'bg-surface-container text-on-surface-variant border-surface-container'
        };
    }
  };

  const getCategoryConfig = (category: AdminActionCategory) => {
    switch (category) {
      case 'users':
        return { label: 'Uporabniki & Vloge', color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' };
      case 'banners':
        return { label: 'Promocijske pasice', color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10' };
      case 'settings':
        return { label: 'Nastavitve sistema', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' };
      case 'categories':
        return { label: 'Kategorije & Teme', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' };
      case 'posts':
        return { label: 'Objave & Vsebina', color: 'text-teal-600 dark:text-teal-400 bg-teal-500/10' };
      default:
        return { label: category, color: 'text-on-surface-variant bg-surface-container' };
    }
  };

  // Filtered & sorted logs
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(l => l.category === selectedCategory);
    }

    // Action type filter
    if (selectedActionType !== 'all') {
      result = result.filter(l => l.actionType === selectedActionType);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(l =>
        (l.adminName || '').toLowerCase().includes(q) ||
        (l.adminEmail || '').toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q) ||
        (l.targetTitle || '').toLowerCase().includes(q) ||
        (l.targetId || '').toLowerCase().includes(q) ||
        (l.actionType || '').toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [logs, selectedCategory, selectedActionType, searchQuery, sortOrder]);

  // Metric counts
  const stats = useMemo(() => {
    const total = logs.length;
    const roleChanges = logs.filter(l => l.actionType === 'role_change').length;
    const bannerActions = logs.filter(l => l.category === 'banners').length;
    const confirms = logs.filter(l => l.actionType === 'registration_confirm').length;
    return { total, roleChanges, bannerActions, confirms };
  }, [logs]);

  return (
    <div className="flex flex-col gap-6">
      {/* Toast feedback */}
      {statusMessage && (
        <div className="p-3 rounded-xl bg-primary text-on-primary text-xs font-semibold flex items-center justify-between shadow-md animate-in fade-in">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="opacity-80 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-headline-md text-lg font-bold text-on-surface">
                Dnevnik aktivnosti administratorjev
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                Firestore Live
              </span>
            </div>
            <p className="text-xs text-outline mt-1 max-w-2xl">
              Podroben revizijski pregled vseh ključnih dejanj, ki so jih izvedli skrbniki: spremembe vlog uporabnikov, ustvarjanje in posodobitve promocijskih pasic, potrditve registracij ter spremembe sistemskih nastavitev.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => exportAdminActivityLogsAsCsv(filteredLogs)}
            disabled={filteredLogs.length === 0}
            className="px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1.5 transition-colors border border-surface-container shadow-2xs disabled:opacity-40 cursor-pointer"
            title="Izvozi trenutne podatke v CSV tabelo"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Izvozi CSV</span>
          </button>

          <button
            type="button"
            onClick={() => exportAdminActivityLogsAsJson(filteredLogs)}
            disabled={filteredLogs.length === 0}
            className="px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1.5 transition-colors border border-surface-container shadow-2xs disabled:opacity-40 cursor-pointer"
            title="Izvozi podatke v JSON obliki"
          >
            <Download className="w-4 h-4 text-primary" />
            <span>JSON</span>
          </button>

          {isSuperadmin && (
            <button
              type="button"
              onClick={() => setIsClearModalOpen(true)}
              disabled={logs.length === 0}
              className="px-3 py-2 rounded-xl bg-error/10 hover:bg-error/20 text-error text-xs font-semibold flex items-center gap-1.5 transition-colors border border-error/20 shadow-2xs disabled:opacity-40 cursor-pointer"
              title="Počisti celoten dnevnik aktivnosti (le Superadmin)"
            >
              <Trash2 className="w-4 h-4" />
              <span>Počisti dnevnik</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-outline">Skupaj vnosov</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-on-surface">{stats.total}</span>
            <span className="text-[11px] text-outline">dejanj</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-outline flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            Spremembe vlog
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-blue-600">{stats.roleChanges}</span>
            <span className="text-[11px] text-outline">posodobitev</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-outline flex items-center gap-1">
            <Megaphone className="w-3.5 h-3.5 text-purple-600" />
            Promocijske pasice
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-purple-600">{stats.bannerActions}</span>
            <span className="text-[11px] text-outline">upravljanj</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-outline flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            Potrjene registracije
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-emerald-600">{stats.confirms}</span>
            <span className="text-[11px] text-outline">ročnih potrditev</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-low/70 border border-surface-container rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Išči po administratorju, e-pošti, vsebini akcije ali ciljnem elementu..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface-container-lowest border border-surface-container hover:border-primary/40 focus:border-primary focus:outline-none text-xs text-on-surface placeholder:text-outline transition-colors shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                title="Počisti iskanje"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="relative">
              <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-8 pr-7 py-2 rounded-xl bg-surface-container-lowest border border-surface-container hover:border-primary/40 focus:border-primary focus:outline-none text-xs font-semibold text-on-surface cursor-pointer shadow-2xs transition-colors"
              >
                <option value="all">Vse kategorije</option>
                <option value="users">👤 Uporabniki in vloge</option>
                <option value="banners">📢 Promocijske pasice</option>
                <option value="categories">🏷️ Kategorije & Teme</option>
                <option value="settings">⚙️ Nastavitve sistema</option>
                <option value="posts">📝 Objave & Vsebina</option>
              </select>
            </div>

            {/* Action Type Filter */}
            <div className="relative">
              <SlidersHorizontal className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
              <select
                value={selectedActionType}
                onChange={(e) => setSelectedActionType(e.target.value)}
                className="pl-8 pr-7 py-2 rounded-xl bg-surface-container-lowest border border-surface-container hover:border-primary/40 focus:border-primary focus:outline-none text-xs font-semibold text-on-surface cursor-pointer shadow-2xs transition-colors"
              >
                <option value="all">Vsi tipi akcij</option>
                <option value="role_change">🛡️ Sprememba vloge</option>
                <option value="registration_confirm">✅ Potrditev registracije</option>
                <option value="banner_create">✨ Ustvarjanje pasice</option>
                <option value="banner_update">✏️ Posodobitev pasice</option>
                <option value="banner_toggle">🔄 Vklop/izklop pasice</option>
                <option value="banner_delete">🗑️ Izbris pasice</option>
                <option value="user_status_change">🚫 Blokada uporabnika</option>
                <option value="user_create">➕ Dodan uporabnik</option>
                <option value="user_delete">❌ Izbris uporabnika</option>
                <option value="settings_update">⚙️ Nastavitve portala</option>
              </select>
            </div>

            {/* Sort Order */}
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-2 rounded-xl bg-surface-container-lowest hover:bg-surface-container border border-surface-container text-xs font-semibold text-on-surface flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              title={sortOrder === 'desc' ? 'Razvrščeno od najnovejših' : 'Razvrščeno od najstarejših'}
            >
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>{sortOrder === 'desc' ? 'Najnovejše' : 'Najstarejše'}</span>
            </button>

            {(searchQuery || selectedCategory !== 'all' || selectedActionType !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedActionType('all');
                }}
                className="px-2.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-outline hover:text-on-surface transition-colors cursor-pointer"
                title="Ponastavi filtre"
              >
                Ponastavi
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-outline pt-1 border-t border-surface-container/60">
          <span>Prikazanih <strong>{filteredLogs.length}</strong> od skupno <strong>{logs.length}</strong> dejanj</span>
          {isSuperadmin && (
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
              <Crown className="w-3 h-3" /> Prijavljeni ste kot Superadmin z vsemi pooblastili
            </span>
          )}
        </div>
      </div>

      {/* Main Activity Timeline / Table */}
      <div className="overflow-hidden rounded-2xl border border-surface-container bg-surface-container-lowest shadow-2xs">
        {isLoading ? (
          <div className="p-12 text-center text-outline flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs font-semibold">Nalaganje dnevnika aktivnosti iz Firestore...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-outline flex flex-col items-center justify-center gap-2">
            <History className="w-10 h-10 text-outline/40" />
            <p className="font-semibold text-sm text-on-surface">Ni najdenih aktivnosti</p>
            <p className="text-xs text-outline max-w-sm">
              {searchQuery || selectedCategory !== 'all' || selectedActionType !== 'all'
                ? 'Za izbrane filtre in iskalni niz ni ujemajočih zapisov v dnevniku.'
                : 'V sistemu še ni zabeleženih administrativnih dejanj.'}
            </p>
            {(searchQuery || selectedCategory !== 'all' || selectedActionType !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedActionType('all');
                }}
                className="mt-3 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-primary transition-colors cursor-pointer"
              >
                Počisti iskanje in filtre
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-surface-container">
            {filteredLogs.map((log) => {
              const actionCfg = getActionConfig(log.actionType);
              const catCfg = getCategoryConfig(log.category);
              const ActionIcon = actionCfg.icon;
              const isExpanded = expandedLogId === log.id;
              const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

              return (
                <div
                  key={log.id}
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className={`p-4 transition-colors cursor-pointer ${
                    isExpanded ? 'bg-surface-container-low/60' : 'hover:bg-surface-container-lowest/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Left: Category Icon + Description */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 border ${actionCfg.color}`}>
                        <ActionIcon className="w-4 h-4" />
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {/* Action Type Badge */}
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${actionCfg.color}`}>
                            {actionCfg.label}
                          </span>

                          {/* Category Badge */}
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${catCfg.color}`}>
                            {catCfg.label}
                          </span>

                          {/* Target element if any */}
                          {log.targetTitle && (
                            <span className="text-[11px] font-bold text-on-surface truncate max-w-xs bg-surface-container-low px-1.5 py-0.5 rounded border border-surface-container/60" title={log.targetTitle}>
                              Cilj: »{log.targetTitle}«
                            </span>
                          )}
                        </div>

                        {/* Full readable action description */}
                        <p className="text-xs font-medium text-on-surface leading-relaxed">
                          {log.details}
                        </p>

                        {/* Admin details */}
                        <div className="flex items-center gap-2 text-[11px] text-outline mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-on-surface font-semibold">
                            {log.adminRole === 'superadmin' ? (
                              <Crown className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            ) : (
                              <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            )}
                            {log.adminName}
                          </span>
                          {log.adminEmail && (
                            <span className="opacity-75">({log.adminEmail})</span>
                          )}
                          <span className="opacity-40">•</span>
                          <span className="capitalize text-[10px] px-1.5 py-0.2 rounded bg-surface-container text-on-surface-variant font-medium">
                            {log.adminRole}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Timestamp & Controls */}
                    <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-start gap-1 shrink-0 pt-1 sm:pt-0">
                      <div className="flex items-center gap-1 text-xs text-outline" title={new Date(log.createdAt).toLocaleString('sl-SI')}>
                        <Clock className="w-3 h-3" />
                        <span className="font-medium text-on-surface">{formatTimeAgo(log.createdAt)}</span>
                      </div>
                      <span className="text-[10px] text-outline opacity-75">
                        {new Date(log.createdAt).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>

                      <div className="flex items-center gap-1 mt-1">
                        {hasMetadata && (
                          <span className="text-[10px] text-primary flex items-center gap-0.5 font-semibold hover:underline">
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {isExpanded ? 'Skrij podrobnosti' : 'Podrobnosti'}
                          </span>
                        )}

                        {isSuperadmin && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteLog(log.id, e)}
                            className="p-1 rounded-md text-outline hover:text-error hover:bg-error/10 transition-colors ml-1 cursor-pointer"
                            title="Izbriši ta vnos iz dnevnika"
                            aria-label="Izbriši ta vnos iz dnevnika"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Metadata Viewer */}
                  {isExpanded && hasMetadata && (
                    <div className="mt-3 pt-3 border-t border-surface-container/60 text-xs animate-in fade-in duration-200">
                      <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container">
                        <span className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-2">
                          Spremljani parametri in metapodatki
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {Object.entries(log.metadata || {}).map(([key, value]) => (
                            <div key={key} className="p-2 rounded-lg bg-surface-container-low/60 border border-surface-container/40">
                              <span className="text-[10px] font-bold text-outline block capitalize mb-0.5">
                                {key}
                              </span>
                              <span className="font-mono text-[11px] text-on-surface break-all">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Clearing Logs (Superadmin Only) */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-surface-container rounded-2xl max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-error">
              <div className="p-2.5 rounded-full bg-error/10">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-on-surface">
                Izbris celotnega dnevnika aktivnosti?
              </h3>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Ali ste prepričani, da želite trajno izbrisati vseh <strong>{logs.length}</strong> zabeleženih administratorskih dejanj iz baze Firestore? To dejanje je nepovratno.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                Prekliči
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-error hover:bg-error-container text-on-error transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Trajno izbriši dnevnik</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
