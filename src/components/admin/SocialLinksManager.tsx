import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Check, 
  X, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Share2,
  Globe,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { SocialMediaPlatform, SocialMediaLink } from '../../types';
import { 
  usePortalSettings, 
  DEFAULT_SOCIAL_LINKS 
} from '../../services/portalSettingsService';
import { 
  getSocialPlatformName, 
  getSocialPlatformIcon, 
  getSocialPlatformHoverClasses,
  SidebarSocialLinks
} from '../common/SocialMediaIcons';
import { useAuth } from '../../contexts/AuthContext';
import { logAdminActivity } from '../../services/activityLogService';
import { ConfirmationModal } from '../common/ConfirmationModal';

const AVAILABLE_PLATFORMS: { id: SocialMediaPlatform; name: string; defaultPlaceholder: string }[] = [
  { id: 'facebook', name: 'Facebook', defaultPlaceholder: 'https://facebook.com/vasa-stran' },
  { id: 'instagram', name: 'Instagram', defaultPlaceholder: 'https://instagram.com/vas-profil' },
  { id: 'tiktok', name: 'TikTok', defaultPlaceholder: 'https://tiktok.com/@vas-profil' },
  { id: 'twitter', name: 'X (Twitter)', defaultPlaceholder: 'https://x.com/vas-profil' },
  { id: 'youtube', name: 'YouTube', defaultPlaceholder: 'https://youtube.com/@vas-kanal' },
  { id: 'linkedin', name: 'LinkedIn', defaultPlaceholder: 'https://linkedin.com/company/vas-profil' },
  { id: 'threads', name: 'Threads', defaultPlaceholder: 'https://threads.net/@vas-profil' },
  { id: 'telegram', name: 'Telegram', defaultPlaceholder: 'https://t.me/vas-kanal' },
  { id: 'whatsapp', name: 'WhatsApp', defaultPlaceholder: 'https://wa.me/38640123456' },
  { id: 'custom', name: 'Spletna stran / Drugo', defaultPlaceholder: 'https://vasa-stran.si' },
];

export function SocialLinksManager() {
  const { currentUser } = useAuth();
  const { settings, loading, saveSettings } = usePortalSettings();

  const [links, setLinks] = useState<SocialMediaLink[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [formPlatform, setFormPlatform] = useState<SocialMediaPlatform>('facebook');
  const [formLabel, setFormLabel] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  // Confirmation modals state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Sync initial state once settings are loaded
  React.useEffect(() => {
    if (!loading) {
      const initial = settings.socialLinks && settings.socialLinks.length > 0 
        ? settings.socialLinks 
        : DEFAULT_SOCIAL_LINKS;
      setLinks([...initial].sort((a, b) => (a.order || 0) - (b.order || 0)));
      setIsInitialized(true);
    }
  }, [loading, settings]);

  const openAddModal = () => {
    setEditingLinkId(null);
    setFormPlatform('facebook');
    setFormLabel('Facebook');
    setFormUrl('');
    setFormIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (link: SocialMediaLink) => {
    setEditingLinkId(link.id);
    setFormPlatform(link.platform);
    setFormLabel(link.label || getSocialPlatformName(link.platform));
    setFormUrl(link.url);
    setFormIsActive(link.isActive);
    setFormError('');
    setIsModalOpen(true);
  };

  const handlePlatformChange = (newPlatform: SocialMediaPlatform) => {
    setFormPlatform(newPlatform);
    if (!formLabel || AVAILABLE_PLATFORMS.some(p => p.name === formLabel)) {
      setFormLabel(getSocialPlatformName(newPlatform));
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = formUrl.trim();
    if (!cleanUrl) {
      setFormError('Prosimo, vnesite spletni naslov (URL).');
      return;
    }

    const formattedUrl = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')
      ? cleanUrl
      : `https://${cleanUrl}`;

    let updatedList: SocialMediaLink[];

    if (editingLinkId) {
      // Editing existing link
      updatedList = links.map(l => {
        if (l.id === editingLinkId) {
          return {
            ...l,
            platform: formPlatform,
            label: formLabel.trim() || getSocialPlatformName(formPlatform),
            url: formattedUrl,
            isActive: formIsActive,
          };
        }
        return l;
      });
    } else {
      // Adding new link
      const newLink: SocialMediaLink = {
        id: `social-${Date.now()}`,
        platform: formPlatform,
        label: formLabel.trim() || getSocialPlatformName(formPlatform),
        url: formattedUrl,
        isActive: formIsActive,
        order: links.length + 1,
      };
      updatedList = [...links, newLink];
    }

    setLinks(updatedList);
    setIsModalOpen(false);

    // Save directly to Firestore for instant propagation
    await persistLinks(updatedList, editingLinkId ? 'Ureditev povezave' : 'Dodana nova povezava');
  };

  const persistLinks = async (listToSave: SocialMediaLink[], actionName = 'Posodobitev povezav') => {
    try {
      setIsSaving(true);
      setFeedback(null);
      await saveSettings({ socialLinks: listToSave }, currentUser?.id || 'admin');

      logAdminActivity({
        adminId: currentUser?.id || 'admin',
        adminName: currentUser?.name || 'Administrator',
        adminEmail: currentUser?.email || '',
        adminRole: currentUser?.role || 'admin',
        actionType: 'settings_update',
        category: 'settings',
        targetId: 'social-links',
        targetTitle: 'Povezave do družbenih omrežij',
        details: `${actionName}: shranjenih ${listToSave.length} povezav družbenih omrežij.`,
      }).catch(() => {});

      setFeedback({
        type: 'success',
        message: 'Povezave do družbenih omrežij so bile uspešno shranjene in posodobljene v levem stolpcu!',
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Napaka pri shranjevanju družbenih omrežij:', err);
      setFeedback({
        type: 'error',
        message: err?.message || 'Napaka pri shranjevanju v bazo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (linkId: string) => {
    const updated = links.map(l => l.id === linkId ? { ...l, isActive: !l.isActive } : l);
    setLinks(updated);
    await persistLinks(updated, 'Sprememba statusa aktivnosti');
  };

  const requestDelete = (linkId: string, label: string) => {
    setDeleteTarget({ id: linkId, label });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id: linkId, label } = deleteTarget;
    setDeleteTarget(null);
    const updated = links
      .filter(l => l.id !== linkId)
      .map((l, idx) => ({ ...l, order: idx + 1 }));
    setLinks(updated);
    await persistLinks(updated, `Izbris povezave ${label}`);
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return;

    const copy = [...links];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const reordered = copy.map((l, idx) => ({ ...l, order: idx + 1 }));
    setLinks(reordered);
    await persistLinks(reordered, 'Sprememba vrstnega reda');
  };

  const requestResetToDefault = () => {
    setIsResetConfirmOpen(true);
  };

  const confirmResetToDefault = async () => {
    setIsResetConfirmOpen(false);
    setLinks(DEFAULT_SOCIAL_LINKS);
    await persistLinks(DEFAULT_SOCIAL_LINKS, 'Ponastavitev na privzeta omrežja');
  };

  if (loading && !isInitialized) {
    return (
      <div className="flex items-center justify-center p-12 text-outline">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 font-medium">Nalaganje povezav družbenih omrežij...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header Banner */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline-sm text-lg font-bold text-on-surface">
                Družbena omrežja v nogi leve stranske vrstice
              </h2>
              <p className="text-xs text-outline mt-0.5 max-w-2xl">
                Upravljajte uradne ikone in povezave do družbenih omrežij portala Portalko (Facebook, Instagram, TikTok, X, YouTube itd.), ki so prikazane v nogi levega menija.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={requestResetToDefault}
            disabled={isSaving}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-outline hover:text-on-surface bg-surface-container-low hover:bg-surface-container border border-surface-container/70 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Ponastavi na privzete povezave"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Ponastavi privzeto</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Dodaj omrežje</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`p-4 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' 
            : 'bg-error/10 text-error border border-error/20'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Grid: Links Table + Live Sidebar Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Table of Social Links (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-container/60 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-container-low flex items-center justify-between">
              <span className="font-headline-sm text-xs font-bold text-on-surface uppercase tracking-wider">
                Aktivne povezave ({links.filter(l => l.isActive).length} od {links.length})
              </span>
              <span className="text-[11px] text-outline">
                Uporabite puščici gor/dol za vrstni red prikaza
              </span>
            </div>

            {links.length === 0 ? (
              <div className="p-8 text-center text-outline flex flex-col items-center gap-2">
                <Share2 className="w-8 h-8 opacity-40" />
                <p className="text-xs">Trenutno ni dodanih povezav do družbenih omrežij.</p>
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold cursor-pointer"
                >
                  Dodaj prvo povezavo
                </button>
              </div>
            ) : (
              <div className="divide-y divide-surface-container-low">
                {links.map((link, index) => {
                  const platformName = getSocialPlatformName(link.platform);
                  const hoverClasses = getSocialPlatformHoverClasses(link.platform);

                  return (
                    <div 
                      key={link.id} 
                      className={`p-4 flex items-center justify-between gap-3 transition-colors ${
                        link.isActive ? 'hover:bg-surface-container-lowest/70' : 'bg-surface-container-low/40 opacity-70'
                      }`}
                    >
                      {/* Left: Icon & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Order buttons */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0 || isSaving}
                            onClick={() => handleMove(index, 'up')}
                            className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                            title="Premakni navzgor"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === links.length - 1 || isSaving}
                            onClick={() => handleMove(index, 'down')}
                            className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                            title="Premakni navzdol"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Crisp Brand Icon Badge */}
                        <div className={`w-9 h-9 rounded-xl border border-surface-container/70 flex items-center justify-center shrink-0 transition-transform ${hoverClasses}`}>
                          {getSocialPlatformIcon(link.platform, 'w-4 h-4')}
                        </div>

                        {/* Title and URL */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-headline-sm text-xs font-bold text-on-surface truncate">
                              {link.label || platformName}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-outline font-semibold">
                              {platformName}
                            </span>
                            {!link.isActive && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-error/10 text-error font-semibold">
                                Skrito
                              </span>
                            )}
                          </div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline truncate block font-mono max-w-[260px] sm:max-w-xs"
                            title={link.url}
                          >
                            {link.url}
                          </a>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Active toggle button */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(link.id)}
                          disabled={isSaving}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            link.isActive
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-surface-container text-outline hover:text-on-surface'
                          }`}
                          title={link.isActive ? 'Kliknite za izklop prikaza v nogi' : 'Kliknite za vklop prikaza v nogi'}
                        >
                          {link.isActive ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Aktivno</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Neaktivno</span>
                            </>
                          )}
                        </button>

                        {/* Open external */}
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                          title="Preizkusi povezavo v novem zavihku"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        {/* Edit button */}
                        <button
                          type="button"
                          onClick={() => openEditModal(link)}
                          disabled={isSaving}
                          className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          title="Uredi povezavo"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => requestDelete(link.id, link.label || platformName)}
                          disabled={isSaving}
                          className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                          title="Izbriši povezavo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Preview Box (1 col) */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container/60 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
              <span className="font-headline-sm text-xs font-bold text-on-surface flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-primary" />
                <span>Živi predogled v nogi</span>
              </span>
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                Levi stolpec
              </span>
            </div>

            <p className="text-xs text-outline leading-relaxed">
              Tako so ikone prikazane obiskovalcem na dnu leve navigacijske vrstice:
            </p>

            {/* Mocked sidebar section preview */}
            <div className="bg-surface-container-low/80 p-4 rounded-xl border border-surface-container flex flex-col gap-3">
              <div className="border-t border-surface-container/60 pt-2">
                <SidebarSocialLinks />
              </div>
              
              <div className="text-[11px] text-outline pt-2 border-t border-surface-container/40 flex flex-wrap gap-x-2 gap-y-0.5">
                <span>Pogoji uporabe</span>
                <span>•</span>
                <span>Piškotki</span>
                <span>•</span>
                <span>RSS viri</span>
                <p className="w-full text-[10px] text-outline-variant pt-1">© 2026 Portalko • Vse pravice pridržane</p>
              </div>
            </div>

            <div className="mt-1 p-3 rounded-xl bg-surface-container-low/50 text-xs text-on-surface-variant flex flex-col gap-1.5 border border-surface-container/60">
              <span className="font-bold text-[11px] text-on-surface">💡 Hitri nasvet:</span>
              <span className="text-[11px] leading-relaxed">
                Povezave z neaktivnim statusom ali praznim URL-jem se samodejno skrijejo iz noge. Vsaka sprememba se takoj uveljavi za vse obiskovalce v realnem času.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Dialog: Add / Edit Link */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-surface-container-lowest border border-surface-container rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-surface-container/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">
                    {editingLinkId ? 'Uredi družbeno omrežje' : 'Dodaj novo družbeno omrežje'}
                  </h3>
                  <p className="text-xs text-outline">
                    Povezava bo prikazana v nogi leve stranske vrstice
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveModal} className="p-6 flex flex-col gap-4 text-on-surface">
              {formError && (
                <div className="p-3 rounded-xl bg-error/10 text-error text-xs font-medium flex items-center gap-2 border border-error/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Platform Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">Izberite platformo *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVAILABLE_PLATFORMS.map((platform) => {
                    const isSelected = formPlatform === platform.id;
                    const hoverClasses = getSocialPlatformHoverClasses(platform.id);
                    return (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() => handlePlatformChange(platform.id)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                            : 'border-surface-container bg-surface-container-low text-on-surface hover:bg-surface-container'
                        }`}
                      >
                        <span className={`w-5 h-5 flex items-center justify-center shrink-0 ${hoverClasses}`}>
                          {getSocialPlatformIcon(platform.id, 'w-4 h-4')}
                        </span>
                        <span className="truncate">{platform.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Label */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">
                  Naziv / Oznaka (Label)
                </label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="Npr. Portalko Facebook ali Sledite nam na Instagramu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container/70"
                />
              </div>

              {/* URL */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">
                  Spletni naslov (URL povezava) *
                </label>
                <input
                  type="text"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder={
                    AVAILABLE_PLATFORMS.find(p => p.id === formPlatform)?.defaultPlaceholder || 'https://'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface font-mono focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container/70"
                  autoFocus
                />
              </div>

              {/* Active Checkbox */}
              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-surface-container-high"
                />
                <span className="text-xs font-semibold text-on-surface">
                  Povezava je aktivna in vidna obiskovalcem v nogi
                </span>
              </label>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-container/60 mt-1">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Prekliči
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingLinkId ? 'Shrani spremembe' : 'Dodaj povezavo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete */}
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Odstranitev družbenega omrežja"
        itemTitle={deleteTarget?.label || 'Družbeno omrežje'}
        itemTypeLabel="Povezava"
        message={`Ali ste prepričani, da želite odstraniti povezavo »${deleteTarget?.label || ''}« iz noge leve vrstice?`}
        confirmLabel="Da, odstrani"
        cancelLabel="Prekliči"
        variant="danger"
      />

      {/* Confirmation Modal for Reset to Defaults */}
      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={confirmResetToDefault}
        title="Ponastavitev družbenih omrežij"
        itemTitle="Vse povezave do omrežij"
        itemTypeLabel="Nastavitev"
        message="Ali želite ponastaviti seznam družbenih omrežij na privzete uradne povezave portala Portalko (Facebook, Instagram, TikTok, YouTube)?"
        confirmLabel="Da, ponastavi"
        cancelLabel="Prekliči"
        variant="warning"
      />
    </div>
  );
}
