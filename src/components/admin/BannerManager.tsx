import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Image as ImageIcon,
  Code as CodeIcon,
  Check,
  X,
  AlertCircle,
  BarChart3,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Layout,
  PanelLeft,
  PanelRight,
  Maximize2
} from 'lucide-react';
import { PromotionBanner, BannerPosition, BannerType } from '../../types';
import {
  subscribeToBanners,
  saveBanner,
  deleteBanner,
  toggleBannerStatus,
  DEFAULT_SAMPLE_BANNERS
} from '../../services/bannerService';

interface BannerManagerProps {
  currentUserId?: string;
}

export function BannerManager({ currentUserId }: BannerManagerProps) {
  const [banners, setBanners] = useState<PromotionBanner[]>([]);
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PromotionBanner | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewModalBanner, setPreviewModalBanner] = useState<PromotionBanner | null>(null);

  // Form fields
  const [formData, setFormData] = useState<{
    title: string;
    position: BannerPosition;
    type: BannerType;
    imageUrl: string;
    targetUrl: string;
    altText: string;
    caption: string;
    openInNewTab: boolean;
    customCode: string;
    isActive: boolean;
    order: number;
    startDate: string;
    endDate: string;
  }>({
    title: '',
    position: 'right_sidebar',
    type: 'image',
    imageUrl: '',
    targetUrl: '',
    altText: '',
    caption: '',
    openInNewTab: true,
    customCode: '',
    isActive: true,
    order: 1,
    startDate: '',
    endDate: ''
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Real-time subscription to banners
  useEffect(() => {
    const unsub = subscribeToBanners((loaded) => {
      setBanners(loaded);
    });
    return () => unsub();
  }, []);

  const openAddModal = (defaultPos?: BannerPosition) => {
    setEditingBanner(null);
    setFormData({
      title: '',
      position: defaultPos || 'right_sidebar',
      type: 'image',
      imageUrl: '',
      targetUrl: '',
      altText: '',
      caption: '',
      openInNewTab: true,
      customCode: '',
      isActive: true,
      order: (banners.length + 1),
      startDate: '',
      endDate: ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (banner: PromotionBanner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      position: banner.position || 'right_sidebar',
      type: banner.type || 'image',
      imageUrl: banner.imageUrl || '',
      targetUrl: banner.targetUrl || '',
      altText: banner.altText || '',
      caption: banner.caption || '',
      openInNewTab: banner.openInNewTab !== false,
      customCode: banner.customCode || '',
      isActive: banner.isActive !== false,
      order: banner.order || 1,
      startDate: banner.startDate || '',
      endDate: banner.endDate || ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title.trim()) {
      setFormError('Prosimo, vnesite naslov ali naziv pasice.');
      return;
    }

    if (formData.type === 'image' && !formData.imageUrl.trim()) {
      setFormError('Za slikovno pasico je URL slike obvezen.');
      return;
    }

    if (formData.type === 'code' && !formData.customCode.trim()) {
      setFormError('Prosimo, vnesite HTML / JavaScript kodo ali oglasni izrezek.');
      return;
    }

    try {
      setIsSubmitting(true);
      await saveBanner({
        id: editingBanner?.id,
        title: formData.title,
        position: formData.position,
        type: formData.type,
        imageUrl: formData.imageUrl,
        targetUrl: formData.targetUrl,
        altText: formData.altText,
        caption: formData.caption,
        openInNewTab: formData.openInNewTab,
        customCode: formData.customCode,
        isActive: formData.isActive,
        order: Number(formData.order) || 1,
        startDate: formData.startDate,
        endDate: formData.endDate,
        createdById: currentUserId
      });

      setIsModalOpen(false);
      setSuccessNotice(
        editingBanner
          ? `Pasica "${formData.title}" je bila uspešno posodobljena!`
          : `Nova pasica "${formData.title}" je bila uspešno dodana in aktivirana!`
      );
      setTimeout(() => setSuccessNotice(null), 4500);
    } catch (err: any) {
      console.error('Napaka pri shranjevanju pasice:', err);
      setFormError('Napaka pri shranjevanju v bazo. Prosimo, poskusite ponovno.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    try {
      await deleteBanner(id);
      setDeleteConfirmId(null);
      setSuccessNotice('Pasica je bila uspešno izbrisana.');
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err) {
      console.error('Napaka pri brisanju pasice:', err);
    }
  };

  const handleToggleStatus = async (banner: PromotionBanner) => {
    try {
      await toggleBannerStatus(banner.id, !banner.isActive);
    } catch (err) {
      console.error('Napaka pri spremembi statusa pasice:', err);
    }
  };

  // Helper sample insertions
  const insertSampleTemplate = (preset: 'card' | 'adsense' | 'iframe') => {
    if (preset === 'card') {
      setFormData((prev) => ({
        ...prev,
        customCode: `<div style="background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 12px; padding: 14px; color: #fff; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
  <span style="display:inline-block; font-size:10px; font-weight:700; background:#3b82f6; color:#fff; padding:2px 8px; border-radius:9999px; text-transform:uppercase; margin-bottom:6px;">Sponzor</span>
  <h4 style="margin:0 0 6px 0; font-size:14px; font-weight:700;">Promocijska Ponudba Mesta</h4>
  <p style="margin:0 0 10px 0; font-size:11px; color:#94a3b8;">Obiščite nas in izkoristite sezonske ugodnosti za celotno družino.</p>
  <a href="https://portalko.si" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#10b981; color:#fff; padding:6px 14px; border-radius:6px; font-size:11px; font-weight:600; text-decoration:none;">Preveri ponudbo →</a>
</div>`
      }));
    } else if (preset === 'adsense') {
      setFormData((prev) => ({
        ...prev,
        customCode: `<!-- Google AdSense koda -->
<ins class="adsbygoogle"
     style="display:block; text-align:center;"
     data-ad-layout="in-article"
     data-ad-format="fluid"
     data-ad-client="ca-pub-0000000000000000"
     data-ad-slot="0000000000"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>`
      }));
    } else if (preset === 'iframe') {
      setFormData((prev) => ({
        ...prev,
        customCode: `<div style="width:100%; text-align:center; border-radius:12px; overflow:hidden;">
  <iframe src="https://example.com" width="100%" height="200" style="border:none; border-radius:12px;" title="Partnerska vsebina"></iframe>
</div>`
      }));
    }
  };

  // Filtered banners
  const filteredBanners = banners.filter((b) => {
    if (filterPosition !== 'all' && b.position !== filterPosition) return false;
    if (filterType !== 'all' && b.type !== filterType) return false;
    if (filterStatus === 'active' && !b.isActive) return false;
    if (filterStatus === 'inactive' && b.isActive) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = b.title.toLowerCase().includes(q);
      const matchCaption = (b.caption || '').toLowerCase().includes(q);
      const matchUrl = (b.targetUrl || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCaption && !matchUrl) return false;
    }
    return true;
  });

  // Position stats
  const totalCount = banners.length;
  const activeCount = banners.filter((b) => b.isActive).length;
  const leftCount = banners.filter((b) => b.position === 'left_sidebar').length;
  const rightCount = banners.filter((b) => b.position === 'right_sidebar').length;
  const mainCount = banners.filter((b) => b.position === 'main_container').length;

  const positionLabels: Record<BannerPosition, { title: string; color: string; icon: any; hint: string }> = {
    left_sidebar: {
      title: 'Leva stranska vrstica',
      color: 'bg-blue-500/10 text-blue-600 border-blue-200',
      icon: PanelLeft,
      hint: 'Prikaz v levem stolpcu pod glavno navigacijo'
    },
    right_sidebar: {
      title: 'Desna stranska vrstica',
      color: 'bg-purple-500/10 text-purple-600 border-purple-200',
      icon: PanelRight,
      hint: 'Prikaz v desnem stolpcu poleg vremena in novic'
    },
    main_container: {
      title: 'Glavni vsebnik',
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
      icon: Layout,
      hint: 'Prikaz med vsebinami v osrednjem delu portala'
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Success alert notice */}
      {successNotice && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-sm font-semibold shadow-xs">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-container-low">
        <div>
          <h2 className="font-headline-sm text-xl font-bold text-on-surface flex items-center gap-2.5">
            <Megaphone className="w-6 h-6 text-primary" />
            <span>Upravljanje promocijskih pasic</span>
          </h2>
          <p className="font-body-md text-xs sm:text-sm text-outline mt-1">
            Ustvarjanje, urejanje in pozicioniranje slikovnih oglasov ter skriptnih kod tretjih oseb (AdSense, iFrame, HTML) v desni, levi ali glavni stolpec.
          </p>
        </div>

        <button
          onClick={() => openAddModal()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-semibold text-sm shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Dodaj novo pasico</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-surface-container-lowest border border-surface-container/60 rounded-xl p-3.5 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">Skupaj pasic</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-on-surface">{totalCount}</span>
            <span className="text-xs text-outline">vseh</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-surface-container/60 rounded-xl p-3.5 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Aktivne</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{activeCount}</span>
            <span className="text-xs text-outline">v obtoku</span>
          </div>
        </div>

        <div 
          onClick={() => setFilterPosition(filterPosition === 'left_sidebar' ? 'all' : 'left_sidebar')}
          className={`bg-surface-container-lowest border rounded-xl p-3.5 flex flex-col gap-1 cursor-pointer transition-colors ${
            filterPosition === 'left_sidebar' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-surface-container/60 hover:border-blue-300'
          }`}
        >
          <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
            <PanelLeft className="w-3 h-3" />
            <span>Leva vrstica</span>
          </span>
          <span className="text-2xl font-black text-on-surface">{leftCount}</span>
        </div>

        <div 
          onClick={() => setFilterPosition(filterPosition === 'right_sidebar' ? 'all' : 'right_sidebar')}
          className={`bg-surface-container-lowest border rounded-xl p-3.5 flex flex-col gap-1 cursor-pointer transition-colors ${
            filterPosition === 'right_sidebar' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-surface-container/60 hover:border-purple-300'
          }`}
        >
          <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider flex items-center gap-1">
            <PanelRight className="w-3 h-3" />
            <span>Desna vrstica</span>
          </span>
          <span className="text-2xl font-black text-on-surface">{rightCount}</span>
        </div>

        <div 
          onClick={() => setFilterPosition(filterPosition === 'main_container' ? 'all' : 'main_container')}
          className={`bg-surface-container-lowest border rounded-xl p-3.5 flex flex-col gap-1 cursor-pointer transition-colors ${
            filterPosition === 'main_container' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-surface-container/60 hover:border-emerald-300'
          }`}
        >
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <Layout className="w-3 h-3" />
            <span>Glavni vsebnik</span>
          </span>
          <span className="text-2xl font-black text-on-surface">{mainCount}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest border border-surface-container/60 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Position Filter */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterPosition('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterPosition === 'all' ? 'bg-surface-container-lowest text-primary shadow-2xs font-bold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Vse pozicije
            </button>
            <button
              onClick={() => setFilterPosition('left_sidebar')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                filterPosition === 'left_sidebar' ? 'bg-surface-container-lowest text-blue-600 shadow-2xs font-bold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <PanelLeft className="w-3 h-3" />
              <span>Leva</span>
            </button>
            <button
              onClick={() => setFilterPosition('right_sidebar')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                filterPosition === 'right_sidebar' ? 'bg-surface-container-lowest text-purple-600 shadow-2xs font-bold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <PanelRight className="w-3 h-3" />
              <span>Desna</span>
            </button>
            <button
              onClick={() => setFilterPosition('main_container')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                filterPosition === 'main_container' ? 'bg-surface-container-lowest text-emerald-600 shadow-2xs font-bold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Layout className="w-3 h-3" />
              <span>Glavni vsebnik</span>
            </button>
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 bg-surface-container-low border border-surface-container/60 rounded-xl text-xs font-semibold text-on-surface outline-none cursor-pointer"
          >
            <option value="all">Vsi tipi (Slika & Koda)</option>
            <option value="image">Samo slikovne pasice</option>
            <option value="code">Samo koda tretjih oseb</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-surface-container-low border border-surface-container/60 rounded-xl text-xs font-semibold text-on-surface outline-none cursor-pointer"
          >
            <option value="all">Vsi statusi</option>
            <option value="active">Samo aktivne</option>
            <option value="inactive">Samo neaktivne</option>
          </select>
        </div>

        {/* Search input */}
        <div className="relative min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Išči po nazivu ali URL..."
            className="w-full px-3 py-1.5 bg-surface-container-low border border-surface-container/60 rounded-xl text-xs text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/40"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Banner Cards List */}
      {filteredBanners.length === 0 ? (
        <div className="bg-surface-container-lowest border border-dashed border-surface-container-high rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-outline">
            <Megaphone className="w-6 h-6" />
          </div>
          <div className="max-w-md">
            <h4 className="font-bold text-base text-on-surface">Ni najdenih promocijskih pasic</h4>
            <p className="text-xs text-outline mt-1">
              {searchQuery || filterPosition !== 'all' || filterType !== 'all' || filterStatus !== 'all'
                ? 'Za izbrane filtre ni rezultatov. Poskusite ponastaviti iskalne kriterije.'
                : 'Trenutno še niste dodali nobene pasice. Začnite s klikom na spodnji gumb.'}
            </p>
          </div>
          <button
            onClick={() => openAddModal()}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Dodaj prvo pasico</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBanners.map((banner) => {
            const posConfig = positionLabels[banner.position] || positionLabels.main_container;
            const PosIcon = posConfig.icon;

            return (
              <div
                key={banner.id}
                className={`group bg-surface-container-lowest border rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                  banner.isActive ? 'border-surface-container/80 shadow-xs' : 'border-surface-container-high/40 opacity-75 bg-surface-container-low/20'
                }`}
              >
                {/* Visual Header / Banner Thumbnail */}
                <div className="relative h-36 bg-surface-container-low overflow-hidden border-b border-surface-container/50">
                  {banner.type === 'image' && banner.imageUrl ? (
                    <img
                      src={banner.imageUrl}
                      alt={banner.altText || banner.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full p-3 font-mono text-[10px] text-slate-700 bg-slate-900/5 overflow-hidden select-none">
                      <div className="flex items-center gap-1 text-[10px] text-outline font-semibold mb-1">
                        <CodeIcon className="w-3 h-3 text-primary" />
                        <span>Koda tretjih oseb (HTML / Script)</span>
                      </div>
                      <pre className="text-[10px] text-slate-600 line-clamp-4 whitespace-pre-wrap">
                        {banner.customCode || '/* Brez kode */'}
                      </pre>
                    </div>
                  )}

                  {/* Position Badge top-left */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border backdrop-blur-md bg-white/90 shadow-2xs ${posConfig.color}`}>
                      <PosIcon className="w-3 h-3" />
                      <span>{posConfig.title}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border border-surface-container/60 bg-white/90 text-on-surface shadow-2xs">
                      {banner.type === 'image' ? (
                        <>
                          <ImageIcon className="w-3 h-3 text-primary" />
                          <span>Slika</span>
                        </>
                      ) : (
                        <>
                          <CodeIcon className="w-3 h-3 text-amber-600" />
                          <span>Koda</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Active Toggle Switch top-right */}
                  <div className="absolute top-2.5 right-2.5">
                    <button
                      onClick={() => handleToggleStatus(banner)}
                      title={banner.isActive ? 'Kliknite za izklop pasice' : 'Kliknite za vklop pasice'}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                        banner.isActive
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-surface-container-high text-outline hover:bg-surface-container'
                      }`}
                    >
                      {banner.isActive ? (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Aktivno</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Neaktivno</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Order indicator bottom-right */}
                  <div className="absolute bottom-2 right-2">
                    <span className="px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs">
                      Zaporedje: #{banner.order || 1}
                    </span>
                  </div>
                </div>

                {/* Banner Body Content */}
                <div className="p-4 flex flex-col gap-2.5 flex-1">
                  <div>
                    <h3 className="font-headline-sm text-sm font-bold text-on-surface line-clamp-1">
                      {banner.title}
                    </h3>
                    {banner.caption && (
                      <p className="text-xs text-outline line-clamp-2 mt-0.5">
                        {banner.caption}
                      </p>
                    )}
                  </div>

                  {banner.targetUrl && (
                    <a
                      href={banner.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 truncate font-medium"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{banner.targetUrl}</span>
                    </a>
                  )}

                  {/* Analytics Stats */}
                  <div className="flex items-center gap-3 pt-2 mt-auto border-t border-surface-container-low text-[11px] text-outline font-medium">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <span>{banner.viewsCount || 0} ogledov</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{banner.clicksCount || 0} klikov</span>
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-4 py-2.5 bg-surface-container-low/40 border-t border-surface-container-low flex items-center justify-between gap-2">
                  <button
                    onClick={() => setPreviewModalBanner(banner)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                    title="Odpri celozaslonski predogled"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Predogled</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(banner)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Uredi</span>
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(banner.id)}
                      className="p-1.5 rounded-lg text-xs font-semibold text-error hover:bg-error/10 transition-colors cursor-pointer"
                      title="Izbriši pasico"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-surface-container flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-on-surface">Ali ste prepričani?</h4>
                <p className="text-xs text-outline mt-0.5">Izbris te promocijske pasice je trajen in je ni mogoče obnoviti.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container-low">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
              >
                Prekliči
              </button>
              <button
                onClick={() => handleDeleteBanner(deleteConfirmId)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-error text-on-error hover:bg-error/90 transition-colors cursor-pointer"
              >
                Da, izbriši pasico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewModalBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-surface-container flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-low">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-on-surface">
                  Predogled: {previewModalBanner.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewModalBanner(null)}
                className="p-1 rounded-lg hover:bg-surface-container text-outline hover:text-on-surface cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-surface-container-low/40 rounded-xl border border-surface-container/60">
              <div className="text-[11px] font-semibold text-outline uppercase tracking-wider mb-2">
                Pozicija: {positionLabels[previewModalBanner.position]?.title} • Tip: {previewModalBanner.type === 'image' ? 'Slikovna pasica' : 'Koda tretjih oseb'}
              </div>

              {previewModalBanner.type === 'image' && previewModalBanner.imageUrl ? (
                <div className="overflow-hidden rounded-xl border border-surface-container bg-black/5 shadow-xs">
                  <img
                    src={previewModalBanner.imageUrl}
                    alt={previewModalBanner.title}
                    className="w-full max-h-80 object-cover"
                  />
                  <div className="p-3 bg-surface-container-lowest">
                    <h4 className="font-bold text-sm text-on-surface">{previewModalBanner.title}</h4>
                    {previewModalBanner.caption && (
                      <p className="text-xs text-outline mt-1">{previewModalBanner.caption}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-xl p-2 bg-white border border-surface-container/60 overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: previewModalBanner.customCode || '' }}
                />
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewModalBanner(null)}
                className="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container font-semibold text-xs text-on-surface cursor-pointer"
              >
                Zapri predogled
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Banner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-surface-container flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-low">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">
                    {editingBanner ? 'Uredi promocijsko pasico' : 'Dodaj novo promocijsko pasico'}
                  </h3>
                  <p className="text-xs text-outline">
                    Konfigurirajte videz, pozicijo in vsebino oglasne pasice
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-container text-outline hover:text-on-surface cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveBanner} className="flex flex-col gap-4">
              {/* Type Switcher: Slika vs Koda tretjih oseb */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Tip pasice:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'image' })}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold cursor-pointer transition-all ${
                      formData.type === 'image'
                        ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                        : 'border-surface-container/80 text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4 text-primary shrink-0" />
                    <div className="text-left">
                      <div className="font-bold">Slikovna pasica</div>
                      <div className="text-[10px] opacity-75">Slika + povezava na ponudbo</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'code' })}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold cursor-pointer transition-all ${
                      formData.type === 'code'
                        ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                        : 'border-surface-container/80 text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    <CodeIcon className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="text-left">
                      <div className="font-bold">Koda tretjih oseb</div>
                      <div className="text-[10px] opacity-75">AdSense, iFrame, HTML/JS</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Title / Name */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Naslov pasice / Naziv oglaševalca <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Npr. Pomladni popusti v Mestni Kavarni ali AdSense Responsive"
                  className="w-full px-3 py-2 bg-surface-container-low border border-surface-container/70 rounded-xl text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                />
              </div>

              {/* Position Selector */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Pozicija prikaza na portalu <span className="text-error">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, position: 'left_sidebar' })}
                    className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 text-xs cursor-pointer transition-all ${
                      formData.position === 'left_sidebar'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-800 ring-2 ring-blue-500/20 font-bold'
                        : 'border-surface-container/80 text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <PanelLeft className="w-4 h-4 text-blue-600" />
                      <span>Leva vrstica</span>
                    </div>
                    <span className="text-[10px] font-normal text-outline">Stolpec z menijem</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, position: 'right_sidebar' })}
                    className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 text-xs cursor-pointer transition-all ${
                      formData.position === 'right_sidebar'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-800 ring-2 ring-purple-500/20 font-bold'
                        : 'border-surface-container/80 text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <PanelRight className="w-4 h-4 text-purple-600" />
                      <span>Desna vrstica</span>
                    </div>
                    <span className="text-[10px] font-normal text-outline">Poleg vremena in novic</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, position: 'main_container' })}
                    className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 text-xs cursor-pointer transition-all ${
                      formData.position === 'main_container'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 ring-2 ring-emerald-500/20 font-bold'
                        : 'border-surface-container/80 text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Layout className="w-4 h-4 text-emerald-600" />
                      <span>Glavni vsebnik</span>
                    </div>
                    <span className="text-[10px] font-normal text-outline">Med objavami / feedom</span>
                  </button>
                </div>
              </div>

              {/* Conditional Content based on type */}
              {formData.type === 'image' ? (
                <>
                  {/* Image URL & Quick sample buttons */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-on-surface">
                        URL Slike pasice <span className="text-error">*</span>
                      </label>
                      <div className="flex items-center gap-1.5 text-[10px] text-primary">
                        <span>Vzorci:</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
                              caption: 'Okusite lokalne dobrote priznanih domačih pridelovalcev to soboto v mestnem jedru!'
                            })
                          }
                          className="hover:underline cursor-pointer font-semibold"
                        >
                          Sejem
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
                              caption: '15% popust na vse pakete sveže pražene kave s kodo PORTALKO15.'
                            })
                          }
                          className="hover:underline cursor-pointer font-semibold"
                        >
                          Kavarna
                        </button>
                      </div>
                    </div>
                    <input
                      type="url"
                      required
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/... ali URL vaše slike"
                      className="w-full px-3 py-2 bg-surface-container-low border border-surface-container/70 rounded-xl text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary/40"
                    />

                    {/* Image Preview thumbnail */}
                    {formData.imageUrl && (
                      <div className="mt-2 relative rounded-xl overflow-hidden border border-surface-container h-24 bg-surface-container-low">
                        <img
                          src={formData.imageUrl}
                          alt="Predogled"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span className="absolute bottom-1 right-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-xs font-semibold">
                          Predogled slike
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Target URL */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Ciljna spletna povezava (Target URL)
                    </label>
                    <input
                      type="url"
                      value={formData.targetUrl}
                      onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                      placeholder="https://podjetje.si/akcija ali /dogodki"
                      className="w-full px-3 py-2 bg-surface-container-low border border-surface-container/70 rounded-xl text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  {/* Caption & Alt Text */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">
                        Podnapis / Kratko sporočilo
                      </label>
                      <input
                        type="text"
                        value={formData.caption}
                        onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                        placeholder="Npr. Obiščite nas in prihranite!"
                        className="w-full px-3 py-2 bg-surface-container-low border border-surface-container/70 rounded-xl text-xs text-on-surface outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">
                        Alt tekst (za dostopnost)
                      </label>
                      <input
                        type="text"
                        value={formData.altText}
                        onChange={(e) => setFormData({ ...formData, altText: e.target.value })}
                        placeholder="Opis slike"
                        className="w-full px-3 py-2 bg-surface-container-low border border-surface-container/70 rounded-xl text-xs text-on-surface outline-none"
                      />
                    </div>
                  </div>

                  {/* Open in new tab checkbox */}
                  <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.openInNewTab}
                      onChange={(e) => setFormData({ ...formData, openInNewTab: e.target.checked })}
                      className="w-4 h-4 rounded text-primary border-surface-container-high focus:ring-primary/40 cursor-pointer"
                    />
                    <span>Odpri povezavo v novem zavihku (target="_blank")</span>
                  </label>
                </>
              ) : (
                <>
                  {/* Third-party Code Input & Templates */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-on-surface">
                        HTML / Skriptna koda tretjih oseb <span className="text-error">*</span>
                      </label>
                      <div className="flex items-center gap-1.5 text-[10px] text-primary">
                        <span>Vstavi predlogo:</span>
                        <button
                          type="button"
                          onClick={() => insertSampleTemplate('card')}
                          className="hover:underline cursor-pointer font-semibold"
                        >
                          Eko Widget
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => insertSampleTemplate('adsense')}
                          className="hover:underline cursor-pointer font-semibold"
                        >
                          AdSense
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => insertSampleTemplate('iframe')}
                          className="hover:underline cursor-pointer font-semibold"
                        >
                          iFrame
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={6}
                      required
                      value={formData.customCode}
                      onChange={(e) => setFormData({ ...formData, customCode: e.target.value })}
                      placeholder="Vnesite HTML kodo, <script> značke ali <iframe> oglasnega ponudnika..."
                      className="w-full p-3 font-mono text-xs bg-slate-900 text-slate-100 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <p className="text-[11px] text-outline mt-1">
                      Koda se bo samodejno varno izvedla v izbrani poziciji z vsemi pripadajočimi skriptami.
                    </p>
                  </div>
                </>
              )}

              {/* Order & Status */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-surface-container-low">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Vrstni red / Prioriteta
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-surface-container-low border border-surface-container/70 rounded-xl text-xs text-on-surface outline-none"
                  />
                  <span className="text-[10px] text-outline">Manjša številka ima prednost (1 je na vrhu).</span>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="text-xs font-bold text-on-surface mb-1">
                    Stanje aktivnosti
                  </label>
                  <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer select-none py-1">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-primary border-surface-container-high focus:ring-primary/40 cursor-pointer"
                    />
                    <span className="font-semibold">
                      {formData.isActive ? 'Pasica je takoj aktivna' : 'Pasica je onemogočena (osnutek)'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container-low">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Prekliči
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-on-primary transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>Shranjevanje...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingBanner ? 'Shrani spremembe' : 'Objavi pasico'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
