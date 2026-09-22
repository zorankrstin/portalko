import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, Rss, Trash2, Plus, Users, FileText, Shield, Search, Filter, 
  CheckCircle, XCircle, MoreVertical, UserPlus, Crown, AlertCircle, 
  RefreshCw, ExternalLink, Globe, Check, Clock, Edit3, Eye, Ban, 
  Layers, Tag, Calendar, MapPin, Sparkles, MessageSquare, AlertTriangle, CheckCheck,
  UserCheck, X, Flag
} from 'lucide-react';
import { ReportsManager } from './admin/ReportsManager';
import { subscribeToReports } from '../services/reportService';
import { useAuth, Role } from '../contexts/AuthContext';
import { 
  RssFeedConfig, 
  DEFAULT_RSS_FEEDS, 
  getAdminRssFeeds, 
  saveAdminRssFeeds, 
  validateRssFeedUrl 
} from '../services/rssService';
import { 
  FirestorePost, 
  FirestoreAd, 
  FirestoreEvent, 
  subscribeToPosts, 
  subscribeToAds, 
  subscribeToEvents,
  approveItemInFirestore,
  rejectItemInFirestore,
  deletePostInFirestore,
  deleteAdInFirestore,
  deleteEventInFirestore,
  updatePostInFirestore,
  updateAdInFirestore,
  updateEventInFirestore
} from '../services/firestoreService';
import { EditPostModal, EditablePostItem, EditableItemType } from './posts/EditPostModal';
import { PromotionModal, PromotableItemData } from './common/PromotionModal';
import { PromotedBadge } from './common/PromotedBadge';
import { setItemPromotionInFirestore, removeItemPromotionInFirestore } from '../services/firestoreService';
import { PromotionConfig } from '../types';
import { CategoryManager } from './admin/CategoryManager';
import { 
  CategoryItem, 
  SubCategory, 
  useCategories 
} from '../hooks/useCategories';
import { 
  updateCategory, 
  updateSubcategory, 
  addCategory, 
  addSubcategory, 
  deleteCategory, 
  deleteSubcategory 
} from '../services/categoryService';

export type { RssFeedConfig };

interface AdminPost {
  id: string;
  title: string;
  author: string;
  type: 'blog' | 'ad' | 'event' | 'deal';
  status: 'published' | 'pending' | 'removed' | 'rejected';
  date: string;
}

const MOCK_POSTS: AdminPost[] = [
  { id: 'p1', title: 'Potep po dolini Soče: 5 skritih kotičkov', author: 'Maja Zupan', type: 'blog', status: 'published', date: '12. Sep 2026' },
  { id: 'p2', title: 'Prodam Audi A4 2.0 TDI', author: 'Janez Horvat', type: 'ad', status: 'removed', date: '11. Sep 2026' },
  { id: 'p3', title: 'Koncert Joker Out', author: 'Kino Šiška', type: 'event', status: 'published', date: '10. Sep 2026' },
  { id: 'p4', title: '-20% popust na pnevmatike', author: 'Vulkanizerstvo', type: 'deal', status: 'published', date: '09. Sep 2026' },
];

export function AdminDashboard() {
  const { users, currentUser, updateUser, register } = useAuth();
  const [activeTab, setActiveTab] = useState<'posts' | 'users' | 'categories' | 'rss' | 'reports'>('posts');
  const [pendingReportsCount, setPendingReportsCount] = useState<number>(0);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('geslo123');
  const [newUserRole, setNewUserRole] = useState<Role>('registered');
  const [addUserError, setAddUserError] = useState('');
  const [addUserSuccess, setAddUserSuccess] = useState('');

  // Firestore Live Posts & Subscriptions
  const [firestorePosts, setFirestorePosts] = useState<FirestorePost[]>([]);
  const [firestoreAds, setFirestoreAds] = useState<FirestoreAd[]>([]);
  const [firestoreEvents, setFirestoreEvents] = useState<FirestoreEvent[]>([]);
  const [isPostsLoading, setIsPostsLoading] = useState(true);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<EditablePostItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Promotion Modal State
  const [promotingItem, setPromotingItem] = useState<PromotableItemData | null>(null);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);

  // Post search & filters
  const [postSearchQuery, setPostSearchQuery] = useState('');
  const [postTypeFilter, setPostTypeFilter] = useState<string>('all');
  const [postStatusFilter, setPostStatusFilter] = useState<string>('all');
  const [userFilterRole, setUserFilterRole] = useState<string>('all');
  const [actionFeedback, setActionFeedback] = useState<{ id: string; message: string; type: 'success' | 'error' } | null>(null);

  // Category & Subcategory State Management in AdminDashboard
  // Uses functional updates that merge new items with the existing list instead of replacing the entire array
  const { allCategories: hookCategories } = useCategories();
  const [adminCategories, setAdminCategories] = useState<CategoryItem[]>(hookCategories);

  // Synchronize when hookCategories changes, merging safely into existing state to prevent data loss
  useEffect(() => {
    setAdminCategories(prev => {
      const mergedMap = new Map<string, CategoryItem>();
      prev.forEach(c => mergedMap.set(c.id, c));
      hookCategories.forEach(c => mergedMap.set(c.id, { ...mergedMap.get(c.id), ...c }));
      return Array.from(mergedMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
    });
  }, [hookCategories]);

  // When a category is edited: merge updated fields into existing item without overwriting or replacing the entire array
  const handleAdminUpdateCategory = async (categoryId: string, data: Partial<CategoryItem>) => {
    setAdminCategories(prevList => 
      prevList.map(item => 
        item.id === categoryId 
          ? { ...item, ...data, updatedAt: new Date().toISOString() } 
          : item
      )
    );
    await updateCategory(categoryId, data);
  };

  // When a subcategory is edited: merge updated fields into the target category's subcategories list
  const handleAdminUpdateSubcategory = async (categoryId: string, subcategoryId: string, data: Partial<SubCategory>) => {
    setAdminCategories(prevList => 
      prevList.map(cat => {
        if (cat.id !== categoryId) return cat;
        const updatedSubs = (cat.subcategories || []).map(sub => 
          sub.id === subcategoryId ? { ...sub, ...data } : sub
        );
        return { 
          ...cat, 
          subcategories: updatedSubs, 
          updatedAt: new Date().toISOString() 
        };
      })
    );
    await updateSubcategory(categoryId, subcategoryId, data);
  };

  // When a category is added: merge new item into existing array
  const handleAdminAddCategory = async (catData: Omit<CategoryItem, 'createdAt' | 'updatedAt'>) => {
    const created = await addCategory(catData);
    setAdminCategories(prevList => {
      const exists = prevList.some(item => item.id === created.id);
      if (exists) {
        return prevList.map(item => item.id === created.id ? { ...item, ...created } : item);
      }
      return [...prevList, created];
    });
    return created;
  };

  // When a subcategory is added: merge new subcategory into existing category's subcategories array
  const handleAdminAddSubcategory = async (categoryId: string, sub: SubCategory) => {
    setAdminCategories(prevList => 
      prevList.map(cat => {
        if (cat.id !== categoryId) return cat;
        const currentSubs = cat.subcategories || [];
        const exists = currentSubs.some(s => s.id === sub.id);
        const updatedSubs = exists
          ? currentSubs.map(s => s.id === sub.id ? { ...s, ...sub } : s)
          : [...currentSubs, sub];
        return { 
          ...cat, 
          subcategories: updatedSubs, 
          updatedAt: new Date().toISOString() 
        };
      })
    );
    await addSubcategory(categoryId, sub);
  };

  // Category deletion: remove only the target category, keeping all others intact
  const handleAdminDeleteCategory = async (categoryId: string) => {
    setAdminCategories(prevList => prevList.filter(item => item.id !== categoryId));
    await deleteCategory(categoryId);
  };

  // Subcategory deletion: remove only target subcategory from target category
  const handleAdminDeleteSubcategory = async (categoryId: string, subcategoryId: string) => {
    setAdminCategories(prevList => 
      prevList.map(cat => {
        if (cat.id !== categoryId) return cat;
        return {
          ...cat,
          subcategories: (cat.subcategories || []).filter(s => s.id !== subcategoryId),
          updatedAt: new Date().toISOString()
        };
      })
    );
    await deleteSubcategory(categoryId, subcategoryId);
  };

  const pendingVerifications = useMemo(() => {
    return users.filter(u => u.verificationRequested);
  }, [users]);

  const handleApproveVerification = (userId: string, userName: string) => {
    updateUser(userId, {
      role: 'verified',
      verificationRequested: false,
      verificationNote: '',
    });
    setActionFeedback({
      id: userId,
      message: `Uporabnik ${userName} je bil uspešno verificiran (vloga Preverjen)!`,
      type: 'success',
    });
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleRejectVerification = (userId: string, userName: string) => {
    updateUser(userId, {
      verificationRequested: false,
    });
    setActionFeedback({
      id: userId,
      message: `Zahtevek za verifikacijo uporabnika ${userName} je bil zavrnjen.`,
      type: 'success',
    });
    setTimeout(() => setActionFeedback(null), 3500);
  };

  useEffect(() => {
    const unsubPosts = subscribeToPosts((posts) => {
      setFirestorePosts(posts);
      setIsPostsLoading(false);
    });
    const unsubAds = subscribeToAds((ads) => {
      setFirestoreAds(ads);
    });
    const unsubEvents = subscribeToEvents((events) => {
      setFirestoreEvents(events);
    });
    const unsubReports = subscribeToReports((reportsList) => {
      const pending = reportsList.filter(r => r.status === 'pending').length;
      setPendingReportsCount(pending);
    });

    return () => {
      unsubPosts();
      unsubAds();
      unsubEvents();
      unsubReports();
    };
  }, []);

  // Map all content into a unified list
  const allUnifiedItems = useMemo<EditablePostItem[]>(() => {
    const items: EditablePostItem[] = [];

    firestorePosts.forEach(p => {
      const isDeal = p.category === 'deal' || 
                     p.category === 'ugodnosti' || 
                     p.category?.startsWith('deal') || 
                     p.categoryName === 'Ugodnosti' || 
                     p.categoryName === 'Ugodnost' ||
                     p.id.startsWith('deal-') || 
                     p.id.startsWith('hero-bento-') || 
                     !!p.price;
      items.push({
        id: p.id,
        type: isDeal ? 'deal' : 'post',
        title: p.title,
        content: p.content,
        category: isDeal ? (p.category && p.category !== 'blog' && p.category !== 'post' ? p.category : 'deal') : p.category,
        categoryName: isDeal ? (p.categoryName || 'Ugodnosti') : p.categoryName,
        authorName: p.authorName || 'Uporabnik',
        authorId: p.authorId,
        authorRole: p.authorRole,
        authorAvatar: p.authorAvatar,
        status: p.status || 'published',
        imageUrl: p.imageUrl,
        price: p.price,
        location: p.location,
        rejectionReason: p.rejectionReason,
        isPromoted: p.isPromoted,
        promotion: p.promotion,
        promotedUntil: p.promotedUntil,
        promotionBadgeType: p.promotionBadgeType,
      });
    });

    firestoreAds.forEach(a => {
      const normalizedStatus = (a.status === 'active' || a.status === 'sold' || a.status === 'closed') 
        ? 'published' 
        : (a.status as any || 'published');
      items.push({
        id: a.id,
        type: 'ad',
        title: a.title,
        content: a.description,
        category: a.category,
        categoryName: a.categoryName,
        authorName: a.authorName || 'Uporabnik',
        authorId: a.authorId,
        authorRole: a.authorRole,
        authorAvatar: a.authorAvatar,
        status: normalizedStatus,
        imageUrl: a.imageUrl,
        price: a.price,
        location: a.location,
        rejectionReason: a.rejectionReason,
        isPromoted: a.isPromoted,
        promotion: a.promotion,
        promotedUntil: a.promotedUntil,
        promotionBadgeType: a.promotionBadgeType,
      });
    });

    firestoreEvents.forEach(e => {
      items.push({
        id: e.id,
        type: 'event',
        title: e.title,
        content: e.description,
        category: e.category,
        categoryName: e.categoryName,
        authorName: e.authorName || 'Uporabnik',
        authorId: e.authorId,
        authorRole: e.authorRole,
        authorAvatar: e.authorAvatar,
        status: e.status || 'published',
        imageUrl: e.imageUrl,
        price: e.price,
        location: e.location,
        eventDate: e.eventDate || e.date,
        rejectionReason: e.rejectionReason,
        isPromoted: e.isPromoted,
        promotion: e.promotion,
        promotedUntil: e.promotedUntil,
        promotionBadgeType: e.promotionBadgeType,
      });
    });

    return items;
  }, [firestorePosts, firestoreAds, firestoreEvents]);

  // Pending approval items
  const pendingItems = useMemo(() => {
    return allUnifiedItems.filter(item => item.status === 'pending');
  }, [allUnifiedItems]);

  // Filtered posts for all posts manager
  const filteredPosts = useMemo(() => {
    return allUnifiedItems.filter(item => {
      const matchesSearch = 
        !postSearchQuery ||
        item.title.toLowerCase().includes(postSearchQuery.toLowerCase()) ||
        item.authorName.toLowerCase().includes(postSearchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(postSearchQuery.toLowerCase());
      
      const matchesType = postTypeFilter === 'all' || item.type === postTypeFilter;
      const matchesStatus = postStatusFilter === 'all' || item.status === postStatusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [allUnifiedItems, postSearchQuery, postTypeFilter, postStatusFilter]);

  const handleApproveItem = async (item: EditablePostItem) => {
    try {
      await approveItemInFirestore(item.id, item.type);
      setActionFeedback({ id: item.id, message: `Objava "${item.title}" je uspešno odobrena!`, type: 'success' });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback({ id: item.id, message: 'Napaka pri odobritvi objave.', type: 'error' });
    }
  };

  const handleRejectItem = async (item: EditablePostItem) => {
    const reason = window.prompt('Vnesite razlog za zavrnitev (viden avtorju):', 'Vsebina ne ustreza pravilom skupnosti');
    if (reason === null) return; // User cancelled prompt

    try {
      await rejectItemInFirestore(item.id, item.type, reason.trim() || undefined);
      setActionFeedback({ id: item.id, message: `Objava "${item.title}" je bila zavrnjena.`, type: 'success' });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback({ id: item.id, message: 'Napaka pri zavrnitvi objave.', type: 'error' });
    }
  };

  const handleDeleteItem = async (item: EditablePostItem) => {
    if (!window.confirm(`Ali ste prepričani, da želite trajno izbrisati objavo "${item.title}"?`)) return;

    try {
      if (item.type === 'ad') {
        await deleteAdInFirestore(item.id);
      } else if (item.type === 'event') {
        await deleteEventInFirestore(item.id);
      } else {
        await deletePostInFirestore(item.id);
      }
      setActionFeedback({ id: item.id, message: `Objava "${item.title}" je bila izbrisana.`, type: 'success' });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback({ id: item.id, message: 'Napaka pri brisanju objave.', type: 'error' });
    }
  };

  const handleEditItem = (item: EditablePostItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handlePromoteItem = (item: EditablePostItem) => {
    // Determine target section
    let targetSection: 'ads' | 'events' | 'blog' | 'deals' = 'blog';
    if (item.type === 'ad') targetSection = 'ads';
    else if (item.type === 'event') targetSection = 'events';
    else if (item.type === 'deal') targetSection = 'deals';

    setPromotingItem({
      id: item.id,
      type: item.type,
      title: item.title,
      category: item.category,
      categoryName: item.categoryName,
      targetSection,
      promotion: item.promotion,
      isPromoted: item.isPromoted,
      promotedUntil: item.promotedUntil,
      promotionBadgeType: item.promotionBadgeType,
    });
    setIsPromotionModalOpen(true);
  };

  const handleSavePromotion = async (id: string, type: 'post' | 'ad' | 'event' | 'deal', config: PromotionConfig) => {
    try {
      await setItemPromotionInFirestore(id, type, config);
      setActionFeedback({
        id: id,
        message: `Objavi je bila uspešno nastavljena promocija (${config.badgeType})!`,
        type: 'success',
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Error setting promotion:', err);
      setActionFeedback({
        id: id,
        message: 'Napaka pri shranjevanju promocije.',
        type: 'error',
      });
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleRemovePromotion = async (id: string, type: 'post' | 'ad' | 'event' | 'deal') => {
    try {
      await removeItemPromotionInFirestore(id, type);
      setActionFeedback({
        id: id,
        message: `Promocija za objavo je bila odstranjena.`,
        type: 'success',
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Error removing promotion:', err);
      setActionFeedback({
        id: id,
        message: 'Napaka pri odstranjevanju promocije.',
        type: 'error',
      });
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // RSS State
  const [feeds, setFeeds] = useState<RssFeedConfig[]>(() => getAdminRssFeeds());
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [isTestingFeed, setIsTestingFeed] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; count?: number; sampleTitle?: string } | null>(null);

  useEffect(() => {
    saveAdminRssFeeds(feeds);
  }, [feeds]);

  const handleTestFeed = async () => {
    if (!newUrl) return;
    setIsTestingFeed(true);
    setTestResult(null);
    const result = await validateRssFeedUrl(newUrl, newName || 'Nov vir');
    setTestResult(result);
    setIsTestingFeed(false);
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl || !newName) return;

    setIsTestingFeed(true);
    const validation = await validateRssFeedUrl(newUrl, newName);
    setIsTestingFeed(false);

    if (!validation.success) {
      setTestResult(validation);
      return;
    }

    setFeeds([...feeds, { id: Date.now().toString(), url: newUrl.trim(), name: newName.trim(), active: true }]);
    setNewUrl('');
    setNewName('');
    setTestResult(null);
  };

  const addPresetFeed = (preset: RssFeedConfig) => {
    if (feeds.some(f => f.url.toLowerCase() === preset.url.toLowerCase())) return;
    setFeeds([...feeds, { ...preset, id: Date.now().toString(), active: true }]);
  };

  const resetToDefaultFeeds = () => {
    setFeeds(DEFAULT_RSS_FEEDS);
  };

  const renderTabs = () => (
    <div className="flex flex-wrap gap-2 mb-4 border-b border-surface-container-low pb-3">
      <button 
        onClick={() => setActiveTab('posts')}
        className={`px-4 py-2 rounded-xl font-label-md text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
          activeTab === 'posts' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
        }`}
      >
        <FileText className="w-4 h-4" />
        <span>Vse objave & Urejanje</span>
        <span className="text-xs opacity-75">({allUnifiedItems.length})</span>
      </button>
      <button 
        onClick={() => setActiveTab('users')}
        className={`px-4 py-2 rounded-xl font-label-md text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
          activeTab === 'users' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
        }`}
      >
        <Users className="w-4 h-4" />
        <span>Uporabniki</span>
        {pendingVerifications.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-white shadow-xs" title={`${pendingVerifications.length} čaka na verifikacijo`}>
            {pendingVerifications.length}
          </span>
        )}
      </button>
      <button 
        onClick={() => setActiveTab('categories')}
        className={`px-4 py-2 rounded-xl font-label-md text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
          activeTab === 'categories' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
        }`}
      >
        <Layers className="w-4 h-4" />
        <span>Kategorije & Podkategorije</span>
      </button>
      <button 
        onClick={() => setActiveTab('rss')}
        className={`px-4 py-2 rounded-xl font-label-md text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
          activeTab === 'rss' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
        }`}
      >
        <Rss className="w-4 h-4" />
        <span>RSS Viri</span>
      </button>
      <button 
        onClick={() => setActiveTab('reports')}
        className={`px-4 py-2 rounded-xl font-label-md text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
          activeTab === 'reports' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
        }`}
      >
        <Flag className="w-4 h-4" />
        <span>Prijave vsebine</span>
        {pendingReportsCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-error text-white shadow-xs animate-pulse" title={`${pendingReportsCount} neobravnavanih prijav`}>
            {pendingReportsCount}
          </span>
        )}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-space-md">
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm">
        
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-surface-container-low pb-4 mb-2">
          <div className="w-12 h-12 rounded-xl bg-error/10 text-error flex items-center justify-center">
            <Shield className="w-[1em] h-[1em] text-2xl" />
          </div>
          <div>
            <h2 className="font-headline-sm text-xl font-bold text-on-surface">Admin Nadzorna Plošča</h2>
            <p className="font-body-sm text-sm text-outline">Upravljanje uporabnikov, vsebin in sistemskih virov.</p>
          </div>
        </div>

        {renderTabs()}

        {/* Tab Content: Users */}
        {activeTab === 'users' && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-headline-sm text-base font-bold text-on-surface">Upravljanje uporabnikov</h3>
                <p className="text-xs text-outline">Skupaj registriranih uporabnikov: {users.length}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <select
                  value={userFilterRole}
                  onChange={(e) => setUserFilterRole(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-transparent focus:border-primary focus:outline-none text-xs font-semibold text-on-surface cursor-pointer"
                >
                  <option value="all">Vsi uporabniki ({users.length})</option>
                  <option value="verification">⭐ Čakajo na verifikacijo ({pendingVerifications.length})</option>
                  <option value="registered">Registrirani ({users.filter(u => u.role === 'registered').length})</option>
                  <option value="verified">Preverjeni ({users.filter(u => u.role === 'verified').length})</option>
                  <option value="admin">Administratorji ({users.filter(u => u.role === 'admin').length})</option>
                  <option value="superadmin">Superadmini ({users.filter(u => u.role === 'superadmin').length})</option>
                </select>

                <div className="relative flex-1 sm:w-56">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                  <input 
                    type="text" 
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Išči po imenu, e-pošti..." 
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-container-low border border-transparent focus:border-primary focus:outline-none text-sm font-body-sm" 
                  />
                  {userSearchQuery && (
                    <button 
                      onClick={() => setUserSearchQuery('')} 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-outline hover:text-on-surface"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {currentUser?.role === 'superadmin' && (
                  <button
                    onClick={() => {
                      setIsAddUserOpen(true);
                      setAddUserError('');
                      setAddUserSuccess('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Dodaj uporabnika</span>
                  </button>
                )}
              </div>
            </div>

            {/* Pending Verifications Notice Banner */}
            {pendingVerifications.length > 0 && userFilterRole !== 'verification' && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
                  <UserCheck className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">
                      {pendingVerifications.length} {pendingVerifications.length === 1 ? 'uporabnik čaka' : 'uporabnikov čaka'} na potrditev verifikacije.
                    </span>
                    <p className="text-[11px] text-on-surface-variant">
                      Uporabniki z vlogo »Preverjen« imajo polno zaupanje in označbo preverjenega profila.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUserFilterRole('verification')}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shrink-0 shadow-2xs cursor-pointer"
                >
                  Prikaži čakajoče ({pendingVerifications.length})
                </button>
              </div>
            )}

            {/* Modal for adding user as superadmin */}
            {isAddUserOpen && (
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-primary" />
                    Ustvari novega uporabnika (kot Superadmin)
                  </h4>
                  <button 
                    onClick={() => setIsAddUserOpen(false)}
                    className="text-outline hover:text-on-surface text-xs"
                  >
                    Zapri
                  </button>
                </div>

                {addUserError && (
                  <div className="p-2.5 rounded-lg bg-error/10 text-error text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{addUserError}</span>
                  </div>
                )}
                {addUserSuccess && (
                  <div className="p-2.5 rounded-lg bg-secondary/10 text-secondary text-xs flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{addUserSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="Ime in priimek *"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:border-primary outline-none"
                  />
                  <input
                    type="email"
                    placeholder="E-poštni naslov *"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:border-primary outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Geslo *"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:border-primary outline-none font-mono"
                  />
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as Role)}
                    className="px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-container text-xs text-on-surface focus:border-primary outline-none cursor-pointer"
                  >
                    <option value="superadmin">⭐ Superadmin</option>
                    <option value="admin">Administrator</option>
                    <option value="verified">Preverjeni uporabnik</option>
                    <option value="registered">Registrirani uporabnik</option>
                    <option value="guest">Gost</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setIsAddUserOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-on-surface-variant hover:bg-surface-container transition-colors"
                  >
                    Prekliči
                  </button>
                  <button
                    onClick={() => {
                      setAddUserError('');
                      setAddUserSuccess('');
                      const res = register({
                        name: newUserName,
                        email: newUserEmail,
                        password: newUserPassword,
                        role: newUserRole,
                      });
                      if (!res.success) {
                        setAddUserError(res.error || 'Napaka pri ustvarjanju.');
                      } else {
                        setAddUserSuccess(`Uporabnik ${res.user?.name} z vlogo ${res.user?.role} uspešno ustvarjen!`);
                        setNewUserName('');
                        setNewUserEmail('');
                        setNewUserPassword('geslo123');
                        setNewUserRole('registered');
                        setTimeout(() => {
                          setIsAddUserOpen(false);
                          setAddUserSuccess('');
                        }, 1200);
                      }
                    }}
                    className="px-4 py-1.5 rounded-lg bg-primary text-on-primary font-bold text-xs hover:bg-primary-container transition-colors shadow-sm"
                  >
                    Ustvari uporabnika
                  </button>
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto rounded-xl border border-surface-container">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low/50">
                  <tr>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold">Uporabnik</th>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold">Vloga</th>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold">Status</th>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {users
                    .filter(user => {
                      if (userFilterRole === 'verification' && !user.verificationRequested) return false;
                      if (userFilterRole !== 'all' && userFilterRole !== 'verification' && user.role !== userFilterRole) return false;
                      if (!userSearchQuery) return true;
                      const q = userSearchQuery.toLowerCase();
                      return (
                        user.name.toLowerCase().includes(q) ||
                        user.email.toLowerCase().includes(q) ||
                        user.role.toLowerCase().includes(q) ||
                        (user.verificationNote && user.verificationNote.toLowerCase().includes(q))
                      );
                    })
                    .map(user => {
                      const isSuperadmin = currentUser?.role === 'superadmin';
                      const canManageVerification = isSuperadmin || currentUser?.role === 'admin';

                      return (
                        <tr key={user.id} className={`hover:bg-surface-container-lowest transition-colors ${user.verificationRequested ? 'bg-amber-500/5' : ''}`}>
                          <td className="p-3">
                            <div className="flex items-start gap-2.5">
                              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" />
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-sm text-on-surface flex items-center gap-1">
                                  {user.name}
                                  {user.role === 'superadmin' && <Crown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                                  {user.role === 'verified' && <CheckCircle className="w-3.5 h-3.5 text-secondary" />}
                                </span>
                                <span className="text-xs text-outline truncate">{user.email}</span>

                                {user.verificationRequested && (
                                  <div className="mt-1.5 flex flex-col gap-1">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 w-max">
                                      <UserCheck className="w-3 h-3 text-amber-600" />
                                      Zahteva verifikacijo
                                      {user.verificationRequestedAt && (
                                        <span className="opacity-75 font-normal">
                                          ({new Date(user.verificationRequestedAt).toLocaleDateString('sl-SI')})
                                        </span>
                                      )}
                                    </span>
                                    {user.verificationNote && (
                                      <p className="text-[11px] text-on-surface-variant bg-surface-container-low p-2 rounded-lg border border-surface-container/60 max-w-sm">
                                        <strong className="text-on-surface">Utemeljitev:</strong> {user.verificationNote}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 align-top">
                            {isSuperadmin && user.id !== currentUser?.id ? (
                              <select
                                value={user.role}
                                onChange={(e) => updateUser(user.id, { role: e.target.value as any })}
                                className="bg-surface-container-low text-xs p-1 rounded border-none outline-none cursor-pointer"
                              >
                                <option value="superadmin">superadmin</option>
                                <option value="admin">admin</option>
                                <option value="verified">verified</option>
                                <option value="registered">registered</option>
                                <option value="guest">guest</option>
                              </select>
                            ) : (
                              <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${
                                user.role === 'superadmin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 
                                user.role === 'admin' ? 'bg-error/10 text-error' : 
                                user.role === 'verified' ? 'bg-secondary/10 text-secondary' : 'bg-surface-container text-on-surface-variant'
                              }`}>
                                {user.role}
                              </span>
                            )}
                          </td>
                          <td className="p-3 align-top">
                            {user.status === 'active' ? (
                              <span className="flex items-center gap-1 text-xs text-secondary font-medium"><CheckCircle className="w-3 h-3" /> Aktiven</span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-error font-medium"><XCircle className="w-3 h-3" /> Baniran</span>
                            )}
                          </td>
                          <td className="p-3 text-right align-top">
                            <div className="flex flex-col items-end gap-1.5">
                              {user.verificationRequested && canManageVerification && (
                                <div className="flex items-center gap-1">
                                  <button 
                                    type="button"
                                    onClick={() => handleApproveVerification(user.id, user.name)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                                    title="Potrdi verifikacijo (dodelitev vloge Preverjen)"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Potrdi verifikacijo</span>
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => handleRejectVerification(user.id, user.name)}
                                    className="p-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-outline hover:text-error transition-colors cursor-pointer"
                                    title="Zavrni zahtevek"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}

                              {isSuperadmin && user.id !== currentUser?.id && (
                                <button 
                                  onClick={() => updateUser(user.id, { status: user.status === 'active' ? 'banned' : 'active' })}
                                  className={`px-3 py-1 rounded text-xs font-bold ${user.status === 'active' ? 'bg-error/10 text-error hover:bg-error/20' : 'bg-secondary/10 text-secondary hover:bg-secondary/20'}`}
                                >
                                  {user.status === 'active' ? 'Blokiraj' : 'Odblokiraj'}
                                </button>
                              )}

                              {(!isSuperadmin || user.id === currentUser?.id) && !user.verificationRequested && (
                                <button className="p-1.5 text-outline hover:text-primary transition-colors rounded-lg hover:bg-primary/10" title="Brez dodatnih akcij">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action feedback notification */}
        {actionFeedback && (
          <div className={`p-3 rounded-xl flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 mb-2 ${
            actionFeedback.type === 'success' ? 'bg-secondary/10 border border-secondary/20 text-secondary' : 'bg-error/10 border border-error/20 text-error'
          }`}>
            <div className="flex items-center gap-2">
              {actionFeedback.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{actionFeedback.message}</span>
            </div>
            <button onClick={() => setActionFeedback(null)} className="p-1 hover:opacity-75 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Tab Content: All Posts & Edit (Vse objave & Urejanje) */}
        {activeTab === 'posts' && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-headline-sm text-base font-bold text-on-surface flex items-center gap-2">
                  <span>Vse objave v sistemu</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-semibold">
                    {filteredPosts.length} od {allUnifiedItems.length}
                  </span>
                </h3>
                <p className="text-xs text-outline">
                  Kot admin ali superadmin lahko urejate, spreminjate statuse in brišete vse objave.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-outline absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={postSearchQuery}
                    onChange={(e) => setPostSearchQuery(e.target.value)}
                    placeholder="Išči po naslovu..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-container-low text-xs text-on-surface border border-surface-container outline-none focus:border-primary"
                  />
                </div>

                {/* Type filter */}
                <select
                  value={postTypeFilter}
                  onChange={(e) => setPostTypeFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-surface-container-low text-xs text-on-surface border border-surface-container outline-none cursor-pointer"
                >
                  <option value="all">Vsi tipi</option>
                  <option value="post">Članki</option>
                  <option value="ad">Mali oglasi</option>
                  <option value="event">Dogodki</option>
                  <option value="deal">Ugodnosti</option>
                </select>

                {/* Status filter */}
                <select
                  value={postStatusFilter}
                  onChange={(e) => setPostStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-surface-container-low text-xs text-on-surface border border-surface-container outline-none cursor-pointer"
                >
                  <option value="all">Vsi statusi</option>
                  <option value="published">Objavljeno / Aktivno</option>
                  <option value="rejected">Zavrnjeno</option>
                </select>
              </div>
            </div>

            {/* Posts Table */}
            <div className="overflow-x-auto rounded-xl border border-surface-container bg-surface-container-lowest">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low/60">
                  <tr>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold">Naslov & Vsebina</th>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold">Avtor</th>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold">Tip & Kategorija</th>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold">Status</th>
                    <th className="p-3 font-label-caps text-xs text-outline uppercase font-semibold text-right">Skrbniške akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {filteredPosts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-xs text-outline">
                        Nobena objava ne ustreza izbranim filtrom.
                      </td>
                    </tr>
                  ) : (
                    filteredPosts.map(post => (
                      <tr key={post.id} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5 max-w-xs sm:max-w-md">
                            {post.imageUrl && (
                              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-surface-container border border-surface-container">
                                <img src={post.imageUrl} alt="" className="w-full h-full object-cover" onError={() => {}} />
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-sm text-on-surface truncate">{post.title}</span>
                                {post.isPromoted && (
                                  <PromotedBadge 
                                    type={post.promotionBadgeType || post.promotion?.badgeType || 'PROMO'} 
                                    size="sm" 
                                    showSparkle={false}
                                  />
                                )}
                              </div>
                              <span className="text-xs text-outline truncate">{post.content || 'Brez opisa'}</span>
                              {(post.price || post.location || (post.isPromoted && post.promotedUntil)) && (
                                <span className="text-[11px] text-on-surface-variant font-medium mt-0.5 flex items-center gap-1 flex-wrap">
                                  {post.price && <span>{post.price}</span>}
                                  {post.location && <span>• {post.location}</span>}
                                  {post.isPromoted && post.promotedUntil && (
                                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                      • Do {new Date(post.promotedUntil).toLocaleDateString('sl-SI')}
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-xs text-on-surface">{post.authorName}</span>
                            {post.authorRole && (
                              <span className="text-[10px] text-outline">{post.authorRole}</span>
                            )}
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full w-max ${
                              post.type === 'ad' ? 'bg-primary/10 text-primary' :
                              post.type === 'event' ? 'bg-secondary/10 text-secondary' :
                              post.type === 'deal' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                              'bg-surface-container-high text-on-surface-variant'
                            }`}>
                              {post.type === 'ad' ? 'Oglas' :
                               post.type === 'event' ? 'Dogodek' :
                               post.type === 'deal' ? 'Ugodnost' : 'Članek'}
                            </span>
                            <span className="text-[11px] text-outline">{post.category}</span>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={post.status === 'active' ? 'published' : post.status}
                              onChange={(e) => {
                                const newStatus = e.target.value as any;
                                if (newStatus === 'published') {
                                  handleApproveItem(post);
                                } else if (newStatus === 'rejected') {
                                  handleRejectItem(post);
                                }
                              }}
                              className={`text-[11px] font-bold py-1 px-2 rounded-lg border outline-none cursor-pointer transition-colors ${
                                post.status === 'published' || post.status === 'active'
                                  ? 'bg-secondary/10 text-secondary border-secondary/30'
                                  : 'bg-error/10 text-error border-error/30'
                              }`}
                            >
                              <option value="published">Objavljeno</option>
                              <option value="rejected">Zavrnjeno</option>
                            </select>
                          </div>
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handlePromoteItem(post)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                                post.isPromoted 
                                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30' 
                                  : 'bg-surface-container-high hover:bg-surface-container text-on-surface'
                              }`}
                              title={post.isPromoted ? 'Uredi promocijo (PROMO / OGLAS)' : 'Nastavi promocijo (PROMO / OGLAS)'}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span className="hidden sm:inline">{post.isPromoted ? 'Promocija' : 'Promoviraj'}</span>
                            </button>
                            <button 
                              onClick={() => handleEditItem(post)}
                              className="px-2.5 py-1 text-xs font-semibold bg-surface-container-high hover:bg-surface-container text-on-surface rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Uredi celotno objavo"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-primary" />
                              <span>Uredi</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteItem(post)}
                              className="p-1.5 text-outline hover:text-error hover:bg-error/10 transition-colors rounded-lg cursor-pointer"
                              title="Odstrani objavo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Categories & Subcategories */}
        {activeTab === 'categories' && (
          <CategoryManager 
            categories={adminCategories}
            onUpdateCategory={handleAdminUpdateCategory}
            onUpdateSubcategory={handleAdminUpdateSubcategory}
            onAddCategory={handleAdminAddCategory}
            onAddSubcategory={handleAdminAddSubcategory}
            onDeleteCategory={handleAdminDeleteCategory}
            onDeleteSubcategory={handleAdminDeleteSubcategory}
          />
        )}

        {/* Tab Content: RSS */}
        {activeTab === 'rss' && (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-surface-container-low">
              <div>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface flex items-center gap-2">
                  <Rss className="w-5 h-5 text-primary" /> Upravljanje RSS novičarskih virov
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant mt-1">
                  V novicah se prikazujejo <strong>izključno resnične novice</strong>, pridobljene iz spodnjih virov. Drugi viri se lahko uporabijo le, če so pravilno preneseni in se povezujejo na dejansko objavo v novem oknu.
                </p>
              </div>
              <button
                onClick={resetToDefaultFeeds}
                className="px-3 py-1.5 rounded-lg border border-surface-container text-xs text-on-surface-variant hover:bg-surface-container flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Povrni na preverjene privzete slovenske medije"
              >
                <RefreshCw className="w-3.5 h-3.5 text-primary" />
                <span>Privzeti viri</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-col gap-2 bg-surface-container-lowest p-3.5 rounded-xl border border-surface-container/60">
              <span className="font-label-caps text-xs text-outline uppercase font-semibold">Priporočeni slovenski viri (dodaj z enim klikom):</span>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_RSS_FEEDS.map(preset => {
                  const alreadyAdded = feeds.some(f => f.url.toLowerCase() === preset.url.toLowerCase());
                  return (
                    <button
                      key={preset.id}
                      onClick={() => addPresetFeed(preset)}
                      disabled={alreadyAdded}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                        alreadyAdded 
                          ? 'bg-surface-container text-outline opacity-60 cursor-default' 
                          : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 cursor-pointer'
                      }`}
                    >
                      <span>+ {preset.name}</span>
                      {alreadyAdded && <span className="text-[10px] text-primary">(dodan)</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add Feed Form */}
            <form onSubmit={handleAddFeed} className="flex flex-col gap-3 bg-surface-container-low p-4 rounded-xl border border-surface-container">
              <div className="font-label-md text-sm font-semibold text-on-surface flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                <span>Dodaj nov preverjen RSS vir</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4 flex flex-col gap-1.5">
                  <label className="font-label-caps text-xs text-outline uppercase">Ime vira (npr. medij)</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={e => { setNewName(e.target.value); setTestResult(null); }}
                    placeholder="Npr. Delo - Novice"
                    className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-body-sm text-sm text-on-surface border border-surface-container focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>
                <div className="sm:col-span-5 flex flex-col gap-1.5">
                  <label className="font-label-caps text-xs text-outline uppercase">RSS URL naslov</label>
                  <input 
                    type="url" 
                    value={newUrl}
                    onChange={e => { setNewUrl(e.target.value); setTestResult(null); }}
                    placeholder="https://primer.si/rss"
                    className="w-full bg-surface-container-lowest px-3 py-2 rounded-lg font-body-sm text-sm text-on-surface border border-surface-container focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>
                <div className="sm:col-span-3 flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={handleTestFeed}
                    disabled={isTestingFeed || !newUrl}
                    className="flex-1 py-2 px-3 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    title="Preizkusi, če vir uspešno vrača novice z veljavnimi povezavami"
                  >
                    {isTestingFeed ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span>Preveri</span>
                  </button>
                  <button 
                    type="submit" 
                    disabled={isTestingFeed || !newUrl || !newName}
                    className="flex-1 py-2 px-3 bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Dodaj</span>
                  </button>
                </div>
              </div>

              {/* Feed Validation Feedback */}
              {testResult && (
                <div className={`p-3 rounded-lg text-xs flex flex-col gap-1 ${
                  testResult.success 
                    ? 'bg-secondary/10 border border-secondary/20 text-secondary' 
                    : 'bg-error/10 border border-error/20 text-error'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {testResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.sampleTitle && (
                    <div className="text-[11px] text-on-surface-variant mt-0.5">
                      Primer zadnjega prenesenega članka: <em>"{testResult.sampleTitle}"</em>
                    </div>
                  )}
                </div>
              )}
            </form>

            {/* List of active feeds */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs text-outline px-1">
                <span>Trenutno konfigurirani viri ({feeds.length}):</span>
                <span>Aktivni: {feeds.filter(f => f.active).length}</span>
              </div>
              {feeds.length === 0 ? (
                <div className="text-outline text-sm text-center py-6 bg-surface-container-lowest rounded-xl border border-surface-container">
                  Ni dodanih RSS virov. Kliknite "Privzeti viri" zgoraj za samodejno dodajanje.
                </div>
              ) : (
                feeds.map(feed => (
                  <div key={feed.id} className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-surface-container bg-surface-container-lowest hover:border-primary/40 transition-colors shadow-xs">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button 
                        onClick={() => setFeeds(feeds.map(f => f.id === feed.id ? { ...f, active: !f.active } : f))}
                        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${feed.active ? 'bg-primary' : 'bg-surface-variant'}`}
                        title={feed.active ? 'Kliknite za izklop vira' : 'Kliknite za vklop vira'}
                      >
                        <div className={`w-4 h-4 rounded-full bg-surface-container-lowest absolute top-1 transition-all shadow-xs ${feed.active ? 'left-6' : 'left-1'}`}></div>
                      </button>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm truncate ${feed.active ? 'text-on-surface' : 'text-outline line-through'}`}>
                            {feed.name}
                          </span>
                          {feed.active ? (
                            <span className="text-[10px] bg-secondary/10 text-secondary px-1.5 py-0.2 rounded font-bold">Aktiven</span>
                          ) : (
                            <span className="text-[10px] bg-surface-container text-outline px-1.5 py-0.2 rounded">Izklopljen</span>
                          )}
                        </div>
                        <a 
                          href={feed.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-outline font-mono truncate hover:text-primary transition-colors flex items-center gap-1"
                        >
                          <span>{feed.url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    </div>
                    <button 
                      onClick={() => setFeeds(feeds.filter(f => f.id !== feed.id))}
                      className="p-2 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                      title="Odstrani vir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Reports */}
        {activeTab === 'reports' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ReportsManager />
          </div>
        )}
      </div>

      {/* Edit Post Modal for Admin & Superadmin */}
      <EditPostModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        item={editingItem}
        onOpenPromotion={(item) => handlePromoteItem(item)}
        onSaved={() => {
          setActionFeedback({
            id: 'edit-saved',
            message: `Spremembe za "${editingItem?.title}" so bile uspešno shranjene!`,
            type: 'success',
          });
          setTimeout(() => setActionFeedback(null), 4000);
        }}
      />

      {/* Promotion Modal for Admin & Superadmin */}
      <PromotionModal
        isOpen={isPromotionModalOpen}
        onClose={() => {
          setIsPromotionModalOpen(false);
          setPromotingItem(null);
        }}
        item={promotingItem}
        onSavePromotion={handleSavePromotion}
        onRemovePromotion={handleRemovePromotion}
      />
    </div>
  );
}
