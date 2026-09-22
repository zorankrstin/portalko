import React, { useState, useEffect } from 'react';
import { 
  Flag, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  AlertTriangle, 
  ExternalLink, 
  Filter, 
  Search, 
  User, 
  Calendar, 
  ShieldAlert, 
  Eye, 
  MessageSquare, 
  FileText, 
  RefreshCw,
  Loader2
} from 'lucide-react';
import { 
  ReportItem, 
  ReportStatus, 
  ReportTargetType 
} from '../../types';
import { 
  subscribeToReports, 
  updateReportStatus, 
  deleteReportFromFirestore, 
  deleteReportedContent 
} from '../../services/reportService';
import { formatFullSlovenianDateTime } from '../../utils/dateUtils';

interface ReportsManagerProps {
  onNavigatePost?: (type: string, id: string) => void;
}

const TYPE_CONFIG: Record<ReportTargetType, { label: string; color: string }> = {
  ad: { label: 'Mali oglas', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  post: { label: 'Objava / Blog', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  event: { label: 'Dogodek', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300' },
  deal: { label: 'Ugodnost', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  comment: { label: 'Komentar', color: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  news: { label: 'Novica', color: 'bg-slate-500/10 text-slate-700 dark:text-slate-300' },
};

export function ReportsManager({ onNavigatePost }: ReportsManagerProps) {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ReportTargetType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminNoteInput, setAdminNoteInput] = useState<Record<string, string>>({});
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToReports((data) => {
      setReports(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const filteredReports = reports.filter((report) => {
    if (statusFilter !== 'all' && report.status !== statusFilter) {
      return false;
    }
    if (typeFilter !== 'all' && report.targetType !== typeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = report.targetTitle?.toLowerCase().includes(q);
      const matchReason = report.reasonLabel?.toLowerCase().includes(q);
      const matchDetails = report.details?.toLowerCase().includes(q);
      const matchReporter = report.reporterEmail?.toLowerCase().includes(q) || report.reporterName?.toLowerCase().includes(q);
      const matchAuthor = report.targetAuthor?.toLowerCase().includes(q);
      if (!matchTitle && !matchReason && !matchDetails && !matchReporter && !matchAuthor) {
        return false;
      }
    }
    return true;
  });

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const dismissedCount = reports.filter(r => r.status === 'dismissed').length;

  const handleUpdateStatus = async (reportId: string, status: ReportStatus) => {
    setActionInProgress(reportId);
    try {
      const note = adminNoteInput[reportId];
      await updateReportStatus(reportId, status, note);
      showNotification('success', `Status prijave posodobljen na: ${status === 'resolved' ? 'Rešeno' : 'Zavrnjeno'}`);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Posodobitev ni uspela');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteContent = async (report: ReportItem) => {
    const confirm = window.confirm(`Ali ste prepričani, da želite trajno izbrisati vsebino "${report.targetTitle}" iz baze podatkov?`);
    if (!confirm) return;

    setActionInProgress(report.id);
    try {
      await deleteReportedContent(report.targetId, report.targetType);
      const note = adminNoteInput[report.id] || 'Vsebina izbrisana s strani skrbnika na podlagi utemeljene prijave.';
      await updateReportStatus(report.id, 'resolved', note, 'deleted_target');
      showNotification('success', 'Vsebina je bila uspešno odstranjena iz sistema in prijava označena kot rešena.');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Brisanje vsebine ni uspelo.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    const confirm = window.confirm('Ali želite izbrisati ta zapis prijave?');
    if (!confirm) return;

    setActionInProgress(reportId);
    try {
      await deleteReportFromFirestore(reportId);
      showNotification('success', 'Prijava je bila odstranjena.');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Odstranitev prijave ni uspela.');
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 flex items-center justify-between">
          <div>
            <div className="text-xs text-outline font-medium">Vse prijave</div>
            <div className="text-2xl font-bold text-on-surface mt-0.5">{reports.length}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-outline">
            <Flag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 flex items-center justify-between">
          <div>
            <div className="text-xs text-error font-semibold">Čaka na pregled</div>
            <div className="text-2xl font-bold text-error mt-0.5">{pendingCount}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center text-error">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-600 font-semibold">Rešeno</div>
            <div className="text-2xl font-bold text-emerald-600 mt-0.5">{resolvedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 flex items-center justify-between">
          <div>
            <div className="text-xs text-outline font-medium">Zavrnjeno</div>
            <div className="text-2xl font-bold text-on-surface-variant mt-0.5">{dismissedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-outline">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`p-3.5 rounded-xl border text-sm font-medium flex items-center gap-2 transition-all ${
          notification.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' 
            : 'bg-error/10 border-error/30 text-error'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              placeholder="Išči po naslovu vsebine, avtorju, razlogu ali prijavitelju..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg bg-surface border border-outline-variant/30 text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-surface rounded-lg border border-outline-variant/20 shrink-0">
            {(['all', 'pending', 'resolved', 'dismissed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === st 
                    ? 'bg-primary text-on-primary shadow-2xs' 
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                {st === 'all' && 'Vse'}
                {st === 'pending' && `Čaka (${pendingCount})`}
                {st === 'resolved' && `Rešeno (${resolvedCount})`}
                {st === 'dismissed' && `Zavrnjeno (${dismissedCount})`}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm rounded-lg bg-surface border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary"
          >
            <option value="all">Vsi tipi vsebin</option>
            <option value="ad">Mali oglasi</option>
            <option value="post">Objave / Blog</option>
            <option value="event">Dogodki</option>
            <option value="deal">Ugodnosti</option>
            <option value="comment">Komentarji</option>
            <option value="news">Novice</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-outline flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Nalagam prijave...</span>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-2">
            <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto text-outline">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="font-bold text-on-surface text-base">Ni najdenih prijav</h3>
            <p className="text-xs text-outline max-w-sm mx-auto">
              Vse vsebine so pregledane ali pa trenutno ni odprtih prijav za izbrane filtre.
            </p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const typeConf = TYPE_CONFIG[report.targetType] || { label: report.targetType, color: 'bg-surface text-outline' };
            const isPending = report.status === 'pending';
            const isBusy = actionInProgress === report.id;

            return (
              <div 
                key={report.id}
                className={`bg-surface rounded-xl border transition-all overflow-hidden p-4 sm:p-5 flex flex-col gap-4 ${
                  isPending 
                    ? 'border-error/30 bg-error/[0.01]' 
                    : 'border-outline-variant/30'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${typeConf.color}`}>
                      {typeConf.label}
                    </span>

                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      report.status === 'pending'
                        ? 'bg-error/10 text-error'
                        : report.status === 'resolved'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'bg-surface-container text-outline'
                    }`}>
                      {report.status === 'pending' && 'Čaka na pregled'}
                      {report.status === 'resolved' && 'Rešeno'}
                      {report.status === 'dismissed' && 'Zavrnjeno'}
                    </span>

                    {report.actionTaken === 'deleted_target' && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-error text-white">
                        Vsebina izbrisana
                      </span>
                    )}

                    <span className="text-xs text-outline flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatFullSlovenianDateTime(report.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDeleteReport(report.id)}
                      disabled={isBusy}
                      title="Izbriši zapis prijave"
                      className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-surface-container transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Target Information */}
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-outline uppercase tracking-wider">
                        Prijavljena vsebina
                      </div>
                      <h4 className="font-bold text-sm sm:text-base text-on-surface leading-snug">
                        {report.targetTitle}
                      </h4>
                      {report.targetAuthor && (
                        <div className="text-xs text-outline flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>Avtor vsebine: <strong>{report.targetAuthor}</strong></span>
                        </div>
                      )}
                    </div>

                    {report.targetId && (
                      <a
                        href={`#${report.targetType}-${report.targetId}`}
                        onClick={(e) => {
                          if (onNavigatePost) {
                            e.preventDefault();
                            onNavigatePost(report.targetType, report.targetId);
                          }
                        }}
                        className="p-2 rounded-lg bg-surface border border-outline-variant/20 hover:bg-surface-container text-primary text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                        title="Ogled vsebine"
                      >
                        <span>Odpri</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Report Reason & Details */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-error uppercase tracking-wider shrink-0 mt-0.5">
                      Razlog prijave:
                    </span>
                    <span className="text-xs font-bold text-on-surface bg-error/5 border border-error/20 px-2 py-0.5 rounded">
                      {report.reasonLabel}
                    </span>
                  </div>

                  {report.details && (
                    <div className="p-3 rounded-lg bg-surface-container-low text-xs sm:text-sm text-on-surface-variant border border-outline-variant/15 leading-relaxed">
                      <strong className="text-on-surface">Pojasnilo prijavitelja: </strong>
                      {report.details}
                    </div>
                  )}

                  <div className="text-xs text-outline flex items-center gap-2">
                    <span>Prijavil:</span>
                    <strong className="text-on-surface">{report.reporterName || 'Neznano'}</strong>
                    {report.reporterEmail && (
                      <span className="text-outline font-mono text-[11px]">({report.reporterEmail})</span>
                    )}
                  </div>
                </div>

                {/* Admin notes & Actions */}
                <div className="pt-3 border-t border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      placeholder="Skrbniška opomba (npr. 'Preverjeno, avtor opozorjen')..."
                      value={adminNoteInput[report.id] ?? (report.adminNotes || '')}
                      onChange={e => setAdminNoteInput({ ...adminNoteInput, [report.id]: e.target.value })}
                      className="w-full text-xs px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/25 text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Mark as resolved */}
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(report.id, 'resolved')}
                      disabled={isBusy}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Rešeno</span>
                    </button>

                    {/* Dismiss report */}
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                      disabled={isBusy}
                      className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Zavrni prijavo</span>
                    </button>

                    {/* Delete reported content */}
                    {report.actionTaken !== 'deleted_target' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteContent(report)}
                        disabled={isBusy}
                        className="px-3 py-1.5 rounded-lg bg-error/10 hover:bg-error text-error hover:text-white border border-error/30 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                        title="Trajno odstrani vsebino iz baze"
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        <span>Izbriši vsebino</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
