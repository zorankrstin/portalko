import React, { useState, useEffect, useRef } from 'react';
import { 
  ImageIcon, 
  Upload, 
  Link, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Info,
  Calendar,
  Store,
  BookOpen,
  RefreshCw,
  Eye,
  Sliders,
  Check,
  Zap,
  ArrowRight
} from 'lucide-react';
import { usePortalSettings, PortalSettings } from '../../services/portalSettingsService';
import { compressImageFileToDataUrl } from '../../utils/imageUtils';
import { FALLBACK_PRESETS, FallbackPreset } from '../../utils/fallbackPresets';

interface PortalSettingsManagerProps {
  currentUserId?: string;
}

export const PortalSettingsManager: React.FC<PortalSettingsManagerProps> = ({ currentUserId }) => {
  const { settings, loading, saveSettings } = usePortalSettings();

  const [fallbackImageUrl, setFallbackImageUrl] = useState('');
  const [useFallbackForMissingImages, setUseFallbackForMissingImages] = useState(false);
  const [useFallbackForBrokenImages, setUseFallbackForBrokenImages] = useState(true);
  const [fallbackTypes, setFallbackTypes] = useState({
    posts: true,
    events: true,
    ads: true,
    deals: true,
    news: true,
  });

  const [inputMode, setInputMode] = useState<'upload' | 'presets' | 'url'>('upload');
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileDetails, setFileDetails] = useState<{ name?: string; size?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Live Simulator state
  const [previewTab, setPreviewTab] = useState<'blog' | 'event' | 'ad'>('blog');
  const [isSimulatingBrokenImage, setIsSimulatingBrokenImage] = useState(false);
  const [simulatedErrorTriggered, setSimulatedErrorTriggered] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && settings) {
      setFallbackImageUrl(settings.fallbackImageUrl || '');
      setUseFallbackForMissingImages(!!settings.useFallbackForMissingImages);
      setUseFallbackForBrokenImages(settings.useFallbackForBrokenImages !== undefined ? !!settings.useFallbackForBrokenImages : true);
      if (settings.fallbackTypes) {
        setFallbackTypes({
          posts: settings.fallbackTypes.posts !== false,
          events: settings.fallbackTypes.events !== false,
          ads: settings.fallbackTypes.ads !== false,
          deals: settings.fallbackTypes.deals !== false,
          news: settings.fallbackTypes.news !== false,
        });
      }
    }
  }, [loading, settings]);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFeedback({
        type: 'error',
        message: 'Izbrana datoteka mora biti veljavna slika (PNG, JPG, WebP, AVIF, GIF).'
      });
      return;
    }

    try {
      setIsProcessingUpload(true);
      setFeedback(null);
      const dataUrl = await compressImageFileToDataUrl(file, 1200);
      setFallbackImageUrl(dataUrl);
      setFileDetails({
        name: file.name,
        size: `${Math.round(file.size / 1024)} KB`
      });
      // Enable broken image fallback by default when an image is uploaded
      setUseFallbackForBrokenImages(true);
      setFeedback({
        type: 'success',
        message: `Fotografija »${file.name}« je bila uspešno obdelana in pripravljena za shranjevanje.`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Napaka pri obdelavi datoteke.'
      });
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSelectPreset = (preset: FallbackPreset) => {
    setFallbackImageUrl(preset.dataUrl);
    setFileDetails({
      name: `${preset.name} (Predloga)`,
      size: 'Optimiziran SVG'
    });
    setUseFallbackForBrokenImages(true);
    setFeedback({
      type: 'success',
      message: `Izbrana je bila predloga »${preset.name}«.`
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const cleanUrl = fallbackImageUrl.trim();
      await saveSettings(
        {
          fallbackImageUrl: cleanUrl,
          useFallbackForMissingImages: cleanUrl ? useFallbackForMissingImages : false,
          useFallbackForBrokenImages: cleanUrl ? useFallbackForBrokenImages : false,
          fallbackTypes,
        },
        currentUserId
      );
      setFeedback({
        type: 'success',
        message: 'Privzeta nadomestna slika in pravila so bila uspešno shranjena in takoj uveljavljena po celotnem portalu.'
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Napaka pri shranjevanju: ' + (err.message || 'Neznana napaka.')
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveImage = () => {
    if (window.confirm('Ali ste prepričani, da želite odstraniti privzeto nadomestno sliko portala?')) {
      setFallbackImageUrl('');
      setFileDetails(null);
      setUseFallbackForMissingImages(false);
      setUseFallbackForBrokenImages(false);
      setFeedback({
        type: 'success',
        message: 'Nadomestna slika je bila ponastavljena. Kliknite »Shrani nastavitve« za uveljavitev v bazi.'
      });
    }
  };

  const toggleFallbackType = (key: keyof typeof fallbackTypes) => {
    setFallbackTypes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-outline">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 font-medium">Nalaganje sistemskih nastavitev...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header Banner */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline-sm text-lg font-bold text-on-surface">
                Privzeta nadomestna slika portala (Fallback Image)
              </h2>
              <p className="text-xs text-outline mt-0.5 max-w-2xl">
                Določite osrednjo fotografijo ali grafiko, ki se prikaže pri objavah brez lastne slike ter samodejno nadomesti nedelujoče zunanje povezave (broken image links).
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-bold text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto shrink-0"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Shranjevanje...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Shrani nastavitve</span>
            </>
          )}
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in fade-in duration-200 ${
          feedback.type === 'success' 
            ? 'bg-secondary/10 text-secondary border border-secondary/20' 
            : 'bg-error/10 text-error border border-error/20'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Two Column Layout: Uploader & Configuration + Live Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Image Selector & Rules (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Card: Image Picker */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container/60 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-2">
                <span>1. Izbira ali naložitev slike</span>
                {fallbackImageUrl ? (
                  <span className="px-2.5 py-0.5 rounded-md bg-secondary/10 text-secondary text-[11px] font-bold">
                    ✓ Slika izbrana
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-md bg-surface-container text-outline text-[11px] font-medium">
                    Ni nastavljena
                  </span>
                )}
              </label>

              {/* Mode Switcher */}
              <div className="flex items-center bg-surface-container-low p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    inputMode === 'upload' 
                      ? 'bg-surface-container-lowest text-primary font-bold shadow-xs' 
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Naloži z naprave</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('presets')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    inputMode === 'presets' 
                      ? 'bg-surface-container-lowest text-primary font-bold shadow-xs' 
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Uradne predloge</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('url')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    inputMode === 'url' 
                      ? 'bg-surface-container-lowest text-primary font-bold shadow-xs' 
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>URL povezava</span>
                </button>
              </div>
            </div>

            {/* Mode 1: Drag-and-Drop & File Upload */}
            {inputMode === 'upload' && (
              <div className="flex flex-col gap-3">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group ${
                    isDragging
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-surface-container hover:border-primary/50 bg-surface-container-low/40 hover:bg-surface-container-low'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="p-3.5 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-on-primary transition-all">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-on-surface block">
                      Povlecite sliko sem ali kliknite za izbiro datoteke
                    </span>
                    <span className="text-xs text-outline block mt-1">
                      Podprti formati: PNG, JPG, WebP, AVIF (slika se samodejno optimizira za hitro nalaganje)
                    </span>
                  </div>
                </div>

                {isProcessingUpload && (
                  <div className="flex items-center justify-center gap-2 text-xs text-primary font-medium p-3 bg-primary/5 rounded-xl border border-primary/20">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Optimiziram in stiskam fotografijo v brskalniku...</span>
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Curated Presets */}
            {inputMode === 'presets' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FALLBACK_PRESETS.map((preset) => {
                  const isSelected = fallbackImageUrl === preset.dataUrl;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative ${
                        isSelected 
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs' 
                          : 'border-surface-container bg-surface-container-low/40 hover:border-primary/40 hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="w-full h-24 rounded-lg overflow-hidden bg-surface-container relative">
                        <img 
                          src={preset.dataUrl} 
                          alt={preset.name}
                          className="w-full h-full object-cover" 
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-primary text-on-primary rounded-full p-1 shadow-sm">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-on-surface">{preset.name}</span>
                          <span className="text-[10px] text-primary font-semibold">{preset.categoryHint}</span>
                        </div>
                        <p className="text-[11px] text-outline mt-0.5 line-clamp-2">
                          {preset.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mode 3: Direct URL */}
            {inputMode === 'url' && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                    <input
                      type="url"
                      value={fallbackImageUrl}
                      onChange={(e) => {
                        setFallbackImageUrl(e.target.value);
                        setFileDetails(null);
                      }}
                      placeholder="https://primer.si/uradna-slika-portala.jpg"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container text-sm text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                  {fallbackImageUrl && (
                    <button
                      type="button"
                      onClick={() => setFallbackImageUrl('')}
                      className="px-3 py-2 text-xs font-semibold rounded-xl bg-surface-container-low hover:bg-surface-container text-outline"
                    >
                      Počisti
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-outline">
                  Vnesite neposredno spletno povezavo do slike (npr. iz vašega strežnika ali CDN).
                </span>
              </div>
            )}

            {/* Active Image Preview Box */}
            {fallbackImageUrl && (
              <div className="p-3.5 rounded-2xl bg-surface-container-low/70 border border-surface-container flex flex-col sm:flex-row items-center justify-between gap-4 mt-1">
                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                  <div className="relative w-28 h-18 rounded-xl overflow-hidden bg-surface-container border border-surface-container shrink-0 shadow-2xs">
                    <img
                      src={fallbackImageUrl}
                      alt="Predogled nadomestne slike"
                      className="w-full h-full object-cover"
                      onError={() => {
                        setFeedback({
                          type: 'error',
                          message: 'Povezava do slike ni dosegljiva ali ne deluje.'
                        });
                      }}
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-on-surface block">
                      Aktivna nadomestna slika
                    </span>
                    <span className="text-[11px] text-outline block mt-0.5">
                      {fileDetails ? `${fileDetails.name} • ${fileDetails.size}` : 'Spletna slika / Podatkovni URL'}
                    </span>
                    <span className="text-[10px] text-secondary font-semibold mt-1 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Pripravljeno za uveljavitev
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (inputMode !== 'upload') setInputMode('upload');
                      fileInputRef.current?.click();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-colors cursor-pointer"
                  >
                    Zamenjaj
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-error/10 hover:bg-error/20 text-error text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Odstrani</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card: Rules & Toggles */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container/60 shadow-xs flex flex-col gap-4">
            <h3 className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <span>2. Pravila prikaza in obnašanja</span>
            </h3>

            <div className="space-y-3">
              {/* Pravilo A: Zlomljene povezave */}
              <label className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer ${
                useFallbackForBrokenImages 
                  ? 'bg-primary/5 border-primary/30 shadow-2xs' 
                  : 'bg-surface-container-low/30 border-surface-container hover:bg-surface-container-low'
              }`}>
                <input
                  type="checkbox"
                  checked={useFallbackForBrokenImages}
                  onChange={(e) => setUseFallbackForBrokenImages(e.target.checked)}
                  disabled={!fallbackImageUrl}
                  className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:opacity-40"
                />
                <div className="flex flex-col">
                  <span className={`text-sm font-bold ${!fallbackImageUrl ? 'text-outline' : 'text-on-surface'}`}>
                    Nadomesti zlomljene in nedelujoče zunanje povezave (broken image links)
                  </span>
                  <span className="text-xs text-outline mt-0.5">
                    Če zunanji vir slike odpove (HTTP 404, blokada ali nedosegljivost strežnika), se namesto praznine ali zlomljene ikone samodejno in brez napak prikaže privzeta nadomestna slika.
                  </span>
                </div>
              </label>

              {/* Pravilo B: Objave brez fotografije */}
              <div className={`p-4 rounded-xl border transition-all flex flex-col gap-3 ${
                useFallbackForMissingImages 
                  ? 'bg-primary/5 border-primary/30 shadow-2xs' 
                  : 'bg-surface-container-low/30 border-surface-container'
              }`}>
                <label className="flex items-start gap-3.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useFallbackForMissingImages}
                    onChange={(e) => setUseFallbackForMissingImages(e.target.checked)}
                    disabled={!fallbackImageUrl}
                    className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:opacity-40"
                  />
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold ${!fallbackImageUrl ? 'text-outline' : 'text-on-surface'}`}>
                      Uporabi pri objavah, ki nimajo naložene fotografije (missing photo fallback)
                    </span>
                    <span className="text-xs text-outline mt-0.5">
                      Če avtor objavi vsebino brez lastne fotografije, se na kartici in v podrobnem pogledu prikaže ta nadomestna slika.
                    </span>
                  </div>
                </label>

                {/* Sub-type filters when missing photo fallback is enabled */}
                {useFallbackForMissingImages && fallbackImageUrl && (
                  <div className="mt-1 pt-3 border-t border-surface-container/60 pl-7 flex flex-col gap-2">
                    <span className="text-xs font-bold text-on-surface">
                      Velja za naslednje tipe objav:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer text-on-surface-variant hover:text-on-surface">
                        <input
                          type="checkbox"
                          checked={fallbackTypes.posts}
                          onChange={() => toggleFallbackType('posts')}
                          className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span>Blog članki</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-on-surface-variant hover:text-on-surface">
                        <input
                          type="checkbox"
                          checked={fallbackTypes.events}
                          onChange={() => toggleFallbackType('events')}
                          className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span>Dogodki</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-on-surface-variant hover:text-on-surface">
                        <input
                          type="checkbox"
                          checked={fallbackTypes.ads}
                          onChange={() => toggleFallbackType('ads')}
                          className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span>Mali oglasi</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-on-surface-variant hover:text-on-surface">
                        <input
                          type="checkbox"
                          checked={fallbackTypes.deals}
                          onChange={() => toggleFallbackType('deals')}
                          className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span>Ugodnosti</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-on-surface-variant hover:text-on-surface">
                        <input
                          type="checkbox"
                          checked={fallbackTypes.news}
                          onChange={() => toggleFallbackType('news')}
                          className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span>RSS Novice</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Card Preview & Simulator (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container/60 shadow-xs flex flex-col gap-4 sticky top-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <h3 className="font-headline-sm text-sm font-bold text-on-surface">
                  Predogled kartice v živo
                </h3>
              </div>

              {/* Preview Type Switcher */}
              <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewTab('blog')}
                  className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    previewTab === 'blog' 
                      ? 'bg-surface-container-lowest text-primary shadow-2xs' 
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  Članek
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('event')}
                  className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    previewTab === 'event' 
                      ? 'bg-surface-container-lowest text-primary shadow-2xs' 
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  Dogodek
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('ad')}
                  className={`px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    previewTab === 'ad' 
                      ? 'bg-surface-container-lowest text-primary shadow-2xs' 
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  Oglas
                </button>
              </div>
            </div>

            <p className="text-xs text-outline">
              Tako bodo obiskovalci videli objavo, kadar slika manjka ali se zgodi napaka nalaganja.
            </p>

            {/* Simulated Post Card */}
            <div className="border border-surface-container rounded-2xl overflow-hidden bg-surface-container-lowest shadow-sm flex flex-col">
              {/* Card Photo Area */}
              <div className="relative h-44 w-full bg-surface-container overflow-hidden flex items-center justify-center">
                {fallbackImageUrl && !isSimulatingBrokenImage ? (
                  <img
                    src={fallbackImageUrl}
                    alt="Predogled"
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                ) : isSimulatingBrokenImage ? (
                  <img
                    src="https://broken-example-link-simulator.invalid/non-existent-image.jpg"
                    alt="Zlomljena povezava"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      setSimulatedErrorTriggered(true);
                      if (useFallbackForBrokenImages && fallbackImageUrl) {
                        (e.target as HTMLImageElement).src = fallbackImageUrl;
                      } else {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-outline gap-1.5 p-4 text-center">
                    <ImageIcon className="w-8 h-8 opacity-40" />
                    <span className="text-xs">Brez nadomestne slike</span>
                    <span className="text-[10px] text-outline/70">
                      (objava se prikaže v tekstovnem pogledu brez okvirja)
                    </span>
                  </div>
                )}

                {/* Badge Overlay */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-md bg-primary text-on-primary font-label-caps text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    {previewTab === 'blog' ? 'Blog' : previewTab === 'event' ? 'Dogodek' : 'Mali Oglas'}
                  </span>
                  {useFallbackForMissingImages && fallbackImageUrl && (
                    <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium shadow-xs">
                      Fallback aktiven
                    </span>
                  )}
                </div>

                {previewTab === 'event' && (
                  <div className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-bold">
                    Vstop prost
                  </div>
                )}
              </div>

              {/* Card Text Content */}
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-outline">
                  <span className="font-semibold text-on-surface">Uredništvo Portalko</span>
                  <span>•</span>
                  <span>Danes ob 18:00</span>
                </div>
                
                <h4 className="font-headline-sm text-sm font-bold text-on-surface line-clamp-1">
                  {previewTab === 'blog' 
                    ? 'Pomladni vodnik: Odkrijte najlepše kotičke Slovenije' 
                    : previewTab === 'event'
                    ? 'Večerni akustični koncert na grajskem dvorišču'
                    : 'Prodam brezhibno ohranjen gorski e-kolo z opremo'}
                </h4>
                
                <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                  {previewTab === 'blog'
                    ? 'V tem prispevku raziskujemo manj znane naravne bisere in kotičke, ki so kot nalašč za sproščujoč vikend izlet v naravi.'
                    : previewTab === 'event'
                    ? 'Pridružite se nam na nepozabnem glasbenem večeru pod zvezdami. Število mest je omejeno.'
                    : 'Kolo je redno servisirano, malo voženo in pripravljeno na novo kolesarsko sezono.'}
                </p>
              </div>
            </div>

            {/* Live Simulator Tool */}
            <div className="p-4 rounded-xl bg-surface-container-low/60 border border-surface-container flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Preizkuševalnik napak (Simulator)
                </span>
                {simulatedErrorTriggered && (
                  <span className="text-[10px] font-bold text-secondary flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> onError ujet & popravljen
                  </span>
                )}
              </div>

              <p className="text-[11px] text-outline">
                Kliknite spodnji gumb za simulacijo objave z nedelujočim zunanjim URL naslovom slike, da se prepričate o delovanju pravila.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSimulatedErrorTriggered(false);
                  setIsSimulatingBrokenImage(true);
                  setTimeout(() => {
                    setIsSimulatingBrokenImage(false);
                  }, 3500);
                }}
                disabled={isSimulatingBrokenImage}
                className="w-full py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingBrokenImage ? 'animate-spin text-primary' : ''}`} />
                <span>
                  {isSimulatingBrokenImage ? 'Simuliram zlomljeno povezavo...' : 'Preizkusi zlomljeno povezavo (Simulate Error)'}
                </span>
              </button>
            </div>

            {/* Informative Note */}
            <div className="p-3 rounded-xl bg-surface-container-low/40 border border-surface-container/70 flex items-start gap-2.5 text-xs text-on-surface-variant">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>Varovanje izgleda portala:</strong> S to nastavitvijo preprečite prazne prostore ali neprivlačne privzete ikone brskalnika, ko zunanji strežniki odpovejo.
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
