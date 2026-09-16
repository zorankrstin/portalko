import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Sliders, 
  FileText, 
  Bookmark, 
  Settings, 
  User, 
  Briefcase, 
  Tag, 
  Image, 
  Heart, 
  Mail, 
  Calendar, 
  Sparkles, 
  Globe, 
  Link2, 
  MoveUp, 
  MoveDown, 
  Eye, 
  EyeOff, 
  RotateCcw,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { ProfileMenuItem, DEFAULT_PROFILE_MENU } from '../../contexts/AuthContext';

interface ProfileMenuEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: ProfileMenuItem[];
  onSave: (items: ProfileMenuItem[]) => void;
}

export const AVAILABLE_MENU_ICONS: { name: string; label: string; icon: React.ReactNode }[] = [
  { name: 'FileText', label: 'Dokument / Objave', icon: <FileText className="w-4 h-4" /> },
  { name: 'Bookmark', label: 'Zaznamki / Shranjeno', icon: <Bookmark className="w-4 h-4" /> },
  { name: 'User', label: 'Uporabnik / O meni', icon: <User className="w-4 h-4" /> },
  { name: 'Briefcase', label: 'Posel / Portfolio', icon: <Briefcase className="w-4 h-4" /> },
  { name: 'Tag', label: 'Oznake / Ponudba', icon: <Tag className="w-4 h-4" /> },
  { name: 'Image', label: 'Galerija / Slike', icon: <Image className="w-4 h-4" /> },
  { name: 'Heart', label: 'Priljubljeno / Priporočila', icon: <Heart className="w-4 h-4" /> },
  { name: 'Mail', label: 'Kontakt / E-pošta', icon: <Mail className="w-4 h-4" /> },
  { name: 'Calendar', label: 'Dogodki / Urnik', icon: <Calendar className="w-4 h-4" /> },
  { name: 'Sparkles', label: 'Posebnosti / Zanimivosti', icon: <Sparkles className="w-4 h-4" /> },
  { name: 'Globe', label: 'Spletna stran / Vir', icon: <Globe className="w-4 h-4" /> },
  { name: 'Link2', label: 'Povezava', icon: <Link2 className="w-4 h-4" /> },
  { name: 'Settings', label: 'Nastavitve', icon: <Settings className="w-4 h-4" /> },
];

export function getMenuTabIcon(iconName?: string, className = "w-4 h-4") {
  switch (iconName) {
    case 'FileText': return <FileText className={className} />;
    case 'Bookmark': return <Bookmark className={className} />;
    case 'User': return <User className={className} />;
    case 'Briefcase': return <Briefcase className={className} />;
    case 'Tag': return <Tag className={className} />;
    case 'Image': return <Image className={className} />;
    case 'Heart': return <Heart className={className} />;
    case 'Mail': return <Mail className={className} />;
    case 'Calendar': return <Calendar className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    case 'Globe': return <Globe className={className} />;
    case 'Link2': return <Link2 className={className} />;
    case 'Settings': return <Settings className={className} />;
    default: return <FileText className={className} />;
  }
}

export function ProfileMenuEditorModal({
  isOpen,
  onClose,
  menuItems: initialMenuItems,
  onSave,
}: ProfileMenuEditorModalProps) {
  const [items, setItems] = useState<ProfileMenuItem[]>(initialMenuItems);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [itemLabel, setItemLabel] = useState('');
  const [itemType, setItemType] = useState<'custom' | 'externalLink'>('custom');
  const [itemIcon, setItemIcon] = useState('User');
  const [itemContent, setItemContent] = useState('');
  const [itemUrl, setItemUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setItems(initialMenuItems);
      setEditingId(null);
      setItemLabel('');
      setItemType('custom');
      setItemIcon('User');
      setItemContent('');
      setItemUrl('');
      setFormError('');
      setSaveSuccess(false);
    }
  }, [isOpen, initialMenuItems]);

  if (!isOpen) return null;

  const handleStartEdit = (item: ProfileMenuItem) => {
    setEditingId(item.id);
    setItemLabel(item.label);
    setItemType(item.type === 'externalLink' ? 'externalLink' : 'custom');
    setItemIcon(item.icon || 'User');
    setItemContent(item.content || '');
    setItemUrl(item.url || '');
    setFormError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setItemLabel('');
    setItemType('custom');
    setItemIcon('User');
    setItemContent('');
    setItemUrl('');
    setFormError('');
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    // re-assign order numbers
    const reordered = newItems.map((item, idx) => ({ ...item, order: idx + 1 }));
    setItems(reordered);
  };

  const handleToggleVisibility = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, visible: !item.visible } : item));
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    if (editingId === id) {
      handleCancelEdit();
    }
  };

  const handleResetToDefault = () => {
    setItems(DEFAULT_PROFILE_MENU);
    handleCancelEdit();
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!itemLabel.trim()) {
      setFormError('Prosimo, vnesite naziv menijskega elementa.');
      return;
    }

    if (itemType === 'externalLink') {
      if (!itemUrl.trim()) {
        setFormError('Prosimo, vnesite veljaven spletni naslov.');
        return;
      }
    }

    let cleanUrl = itemUrl.trim();
    if (itemType === 'externalLink' && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    if (editingId) {
      setItems(prev => prev.map(item => {
        if (item.id === editingId) {
          return {
            ...item,
            label: itemLabel.trim(),
            icon: itemIcon,
            type: item.type === 'builtIn' ? 'builtIn' : itemType,
            content: itemContent.trim(),
            url: itemType === 'externalLink' ? cleanUrl : undefined,
          };
        }
        return item;
      }));
      setEditingId(null);
    } else {
      const newItem: ProfileMenuItem = {
        id: `menu-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: itemLabel.trim(),
        icon: itemIcon,
        type: itemType,
        content: itemType === 'custom' ? itemContent.trim() : undefined,
        url: itemType === 'externalLink' ? cleanUrl : undefined,
        visible: true,
        order: items.length + 1,
      };
      setItems(prev => [...prev, newItem]);
    }

    setItemLabel('');
    setItemContent('');
    setItemUrl('');
  };

  const handleSaveAll = () => {
    onSave(items);
    setSaveSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container/60 overflow-hidden flex flex-col max-h-[90vh]"
        id="profile-menu-editor-modal"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-container-low flex items-center justify-between bg-surface-container-low/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline-sm text-base font-bold text-on-surface">
                Prilagodi profilni meni
              </h2>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Dodajte nove zavihke, uredite vrstni red ali prilagodite vsebino svojega profila
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
          {/* Current Menu Tabs List */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider">
                Trenutni zavihki v meniju ({items.length})
              </label>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[11px] text-outline hover:text-primary flex items-center gap-1 font-semibold transition-colors"
                title="Povrni privzete zavihke"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Ponastavi na privzeto</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {items.map((item, index) => {
                const isBeingEdited = editingId === item.id;
                const isFirst = index === 0;
                const isLast = index === items.length - 1;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                      isBeingEdited 
                        ? 'border-primary bg-primary/5 shadow-2xs' 
                        : item.visible 
                          ? 'border-surface-container bg-surface-container-low/60 hover:bg-surface-container-low' 
                          : 'border-surface-container/50 bg-surface-container-low/20 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-surface-container-highest text-primary shrink-0">
                        {getMenuTabIcon(item.icon, "w-4 h-4")}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-on-surface truncate">
                            {item.label}
                          </p>
                          {item.type === 'builtIn' ? (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-surface-container text-outline">
                              Sistemski
                            </span>
                          ) : item.type === 'externalLink' ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-secondary/10 text-secondary flex items-center gap-0.5">
                              <span>Povezava</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                              Po meri
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-outline truncate">
                          {item.type === 'builtIn' ? (
                            item.builtInTab === 'posts' ? 'Prikazuje objave uporabnika' :
                            item.builtInTab === 'saved' ? 'Prikazuje shranjene objave' :
                            'Nastavitve profila in varnosti'
                          ) : item.type === 'externalLink' ? (
                            item.url || 'Brez URL naslova'
                          ) : (
                            item.content ? `${item.content.slice(0, 45)}...` : 'Vsebinski zavihek'
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Reordering */}
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => handleMove(index, 'up')}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isFirst ? 'text-surface-container-highest cursor-not-allowed' : 'text-outline hover:text-on-surface hover:bg-surface-container'
                        }`}
                        title="Premakni navzgor"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => handleMove(index, 'down')}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isLast ? 'text-surface-container-highest cursor-not-allowed' : 'text-outline hover:text-on-surface hover:bg-surface-container'
                        }`}
                        title="Premakni navzdol"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Visibility toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(item.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          item.visible ? 'text-outline hover:text-on-surface hover:bg-surface-container' : 'text-error/70 hover:bg-error/10'
                        }`}
                        title={item.visible ? 'Skrij zavihek' : 'Pokaži zavihek'}
                      >
                        {item.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-surface-container transition-colors"
                        title="Uredi ta zavihek"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete (only for custom tabs) */}
                      {item.type !== 'builtIn' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors"
                          title="Izbriši zavihek"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add or Edit Tab Form */}
          <form 
            onSubmit={handleSubmitForm}
            className="p-4 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-3.5"
          >
            <div className="flex items-center justify-between pb-1 border-b border-surface-container/60">
              <span className="font-label-md text-xs font-bold text-on-surface flex items-center gap-1.5">
                {editingId ? <Edit3 className="w-3.5 h-3.5 text-primary" /> : <Plus className="w-3.5 h-3.5 text-primary" />}
                <span>{editingId ? 'Uredi izbrani zavihek' : 'Dodaj nov zavihek v meni'}</span>
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
                <label className="text-xs font-semibold text-on-surface">Naziv zavihka</label>
                <input
                  type="text"
                  required
                  placeholder="npr. O meni, Storitve, Portfolio..."
                  value={itemLabel}
                  onChange={(e) => setItemLabel(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Vrsta zavihka</label>
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as 'custom' | 'externalLink')}
                  className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary font-medium"
                >
                  <option value="custom">Vsebinski zavihek (stran na profilu)</option>
                  <option value="externalLink">Zunanja povezava (odpre povezavo)</option>
                </select>
              </div>
            </div>

            {/* Icon picker */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface">Izberi ikono</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-32 overflow-y-auto p-1.5 rounded-xl bg-surface-container-lowest border border-surface-container">
                {AVAILABLE_MENU_ICONS.map((ic) => (
                  <button
                    key={ic.name}
                    type="button"
                    onClick={() => setItemIcon(ic.name)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-all ${
                      itemIcon === ic.name
                        ? 'bg-primary text-on-primary font-bold shadow-2xs'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                    title={ic.label}
                  >
                    {ic.icon}
                    <span className="text-[10px] truncate max-w-[50px]">{ic.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional input based on type */}
            {itemType === 'externalLink' ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Spletni naslov (URL)</label>
                <input
                  type="text"
                  required
                  placeholder="https://..."
                  value={itemUrl}
                  onChange={(e) => setItemUrl(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Vsebina zavihka (besedilo, predstavitev ali opis)</label>
                <textarea
                  rows={3}
                  placeholder="Vnesite vsebino, ki se bo prikazala ob kliku na ta zavihek..."
                  value={itemContent}
                  onChange={(e) => setItemContent(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface outline-none focus:border-primary resize-none"
                />
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold transition-all shadow-2xs"
              >
                {editingId ? 'Posodobi zavihek' : 'Dodaj v meni'}
              </button>
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
            <span>{saveSuccess ? 'Shranjeno!' : 'Shrani spremembe menija'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
