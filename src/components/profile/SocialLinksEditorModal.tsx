import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  ExternalLink, 
  Share2, 
  AlertCircle 
} from 'lucide-react';
import { SocialLink, SocialPlatform } from '../../contexts/AuthContext';
import { getPlatformIcon, getPlatformLabel } from './SocialLinksDisplay';

interface SocialLinksEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  socialLinks: SocialLink[];
  onSave: (links: SocialLink[]) => void;
}

const AVAILABLE_PLATFORMS: { value: SocialPlatform; label: string; placeholder: string; prefix?: string }[] = [
  { value: 'website', label: 'Spletna stran / Blog', placeholder: 'https://mojastran.si' },
  { value: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/uporabnik ali @uporabnik' },
  { value: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/uporabnik' },
  { value: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/uporabnik' },
  { value: 'twitter', label: 'X (Twitter)', placeholder: 'https://x.com/uporabnik ali @uporabnik' },
  { value: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@kanal' },
  { value: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@uporabnik' },
  { value: 'github', label: 'GitHub', placeholder: 'https://github.com/uporabnik' },
  { value: 'telegram', label: 'Telegram', placeholder: 'https://t.me/uporabnik' },
  { value: 'custom', label: 'Druga povezava', placeholder: 'https://...' },
];

function normalizeUrl(platform: SocialPlatform, rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url) return '';

  // Handle @handle shortcuts
  if (url.startsWith('@')) {
    const handle = url.slice(1);
    switch (platform) {
      case 'instagram': return `https://instagram.com/${handle}`;
      case 'twitter': return `https://x.com/${handle}`;
      case 'tiktok': return `https://tiktok.com/@${handle}`;
      case 'telegram': return `https://t.me/${handle}`;
      case 'github': return `https://github.com/${handle}`;
      default: return `https://${handle}`;
    }
  }

  // Ensure protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  return url;
}

export function SocialLinksEditorModal({
  isOpen,
  onClose,
  socialLinks: initialLinks,
  onSave,
}: SocialLinksEditorModalProps) {
  const [links, setLinks] = useState<SocialLink[]>(initialLinks);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state for adding/editing a link
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('instagram');
  const [urlInput, setUrlInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [formError, setFormError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state if modal reopens
  React.useEffect(() => {
    if (isOpen) {
      setLinks(initialLinks);
      setEditingId(null);
      setUrlInput('');
      setLabelInput('');
      setFormError('');
      setSaveSuccess(false);
    }
  }, [isOpen, initialLinks]);

  if (!isOpen) return null;

  const currentPlatformInfo = AVAILABLE_PLATFORMS.find(p => p.value === selectedPlatform) || AVAILABLE_PLATFORMS[0];

  const handleStartEdit = (link: SocialLink) => {
    setEditingId(link.id);
    setSelectedPlatform(link.platform);
    setUrlInput(link.url);
    setLabelInput(link.label || '');
    setFormError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setUrlInput('');
    setLabelInput('');
    setFormError('');
  };

  const handleSubmitLink = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!urlInput.trim()) {
      setFormError('Prosimo, vnesite spletni naslov ali uporabniško ime.');
      return;
    }

    const cleanUrl = normalizeUrl(selectedPlatform, urlInput);

    if (editingId) {
      // Update existing link
      setLinks(prev => prev.map(l => l.id === editingId ? {
        ...l,
        platform: selectedPlatform,
        url: cleanUrl,
        label: labelInput.trim() || undefined,
      } : l));
      setEditingId(null);
    } else {
      // Add new link
      const newLink: SocialLink = {
        id: `social-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        platform: selectedPlatform,
        url: cleanUrl,
        label: labelInput.trim() || undefined,
      };
      setLinks(prev => [...prev, newLink]);
    }

    // Reset inputs
    setUrlInput('');
    setLabelInput('');
  };

  const handleDeleteLink = (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));
    if (editingId === id) {
      handleCancelEdit();
    }
  };

  const handleSaveAll = () => {
    onSave(links);
    setSaveSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container/60 overflow-hidden flex flex-col max-h-[90vh]"
        id="social-links-editor-modal"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-container-low flex items-center justify-between bg-surface-container-low/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline-sm text-base font-bold text-on-surface">
                Družbena omrežja in povezave
              </h2>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Dodajte povezave do svojih profilov, ki bodo vidne na vašem profilu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
            aria-label="Zapri"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6 flex-1">
          {/* List of current social links */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider">
                Aktivne povezave ({links.length})
              </label>
            </div>

            {links.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-surface-container bg-surface-container-low/30 text-center text-xs text-on-surface-variant">
                Trenutno še nimate dodanih povezav do družbenih omrežij.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {links.map((link) => {
                  const isBeingEdited = editingId === link.id;
                  const formattedUrl = link.url.startsWith('http') ? link.url : `https://${link.url}`;

                  return (
                    <div
                      key={link.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                        isBeingEdited
                          ? 'border-primary bg-primary/5 shadow-2xs'
                          : 'border-surface-container bg-surface-container-low/60 hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-surface-container-highest text-primary shrink-0">
                          {getPlatformIcon(link.platform, "w-4 h-4")}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">
                            {link.label || getPlatformLabel(link.platform)}
                          </p>
                          <a
                            href={formattedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-outline hover:text-primary truncate block hover:underline"
                            title={formattedUrl}
                          >
                            {formattedUrl}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={formattedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                          title="Preizkusi povezavo"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(link)}
                          className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-surface-container transition-colors"
                          title="Uredi to povezavo"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLink(link.id)}
                          className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors"
                          title="Odstrani povezavo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add / Edit Form Card */}
          <form 
            onSubmit={handleSubmitLink}
            className="p-4 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-3.5"
          >
            <div className="flex items-center justify-between pb-1 border-b border-surface-container/60">
              <span className="font-label-md text-xs font-bold text-on-surface flex items-center gap-1.5">
                {editingId ? <Edit3 className="w-3.5 h-3.5 text-primary" /> : <Plus className="w-3.5 h-3.5 text-primary" />}
                <span>{editingId ? 'Uredi izbrano povezavo' : 'Dodaj novo povezavo'}</span>
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[11px] text-outline hover:text-on-surface font-semibold"
                >
                  Prekliči urejanje
                </button>
              )}
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Platforma / Omrežje</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => {
                    const newPlat = e.target.value as SocialPlatform;
                    setSelectedPlatform(newPlat);
                    if (!labelInput) {
                      setLabelInput(getPlatformLabel(newPlat));
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary font-medium"
                >
                  {AVAILABLE_PLATFORMS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Oznaka (poljubno)</label>
                <input
                  type="text"
                  placeholder={getPlatformLabel(selectedPlatform)}
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface">Spletni naslov (URL) ali uporabniško ime</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  placeholder={currentPlatformInfo.placeholder}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary pr-20"
                />
                <button
                  type="submit"
                  className="absolute right-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-bold transition-all shadow-2xs"
                >
                  {editingId ? 'Posodobi' : 'Dodaj'}
                </button>
              </div>
              <span className="text-[10px] text-outline">
                Primer: https://instagram.com/mojprofil ali @mojprofil
              </span>
            </div>
          </form>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-surface-container-low bg-surface-container-low/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Zapri
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{saveSuccess ? 'Shranjeno!' : 'Shrani vse povezave'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
