import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  FolderPlus, 
  RotateCcw, 
  Search, 
  Check, 
  X, 
  Tag, 
  Layers, 
  ShoppingBag, 
  Calendar, 
  FileText, 
  Percent, 
  ChevronRight, 
  ChevronDown, 
  AlertTriangle,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  CategoryItem, 
  CategorySection, 
  SubCategory, 
  useCategories 
} from '../../hooks/useCategories';
import { 
  addCategory, 
  updateCategory, 
  deleteCategory, 
  addSubcategory, 
  updateSubcategory, 
  deleteSubcategory, 
  seedCategoriesToFirestore 
} from '../../services/categoryService';

export interface CategoryManagerProps {
  categories?: CategoryItem[];
  onUpdateCategory?: (categoryId: string, data: Partial<CategoryItem>) => Promise<void>;
  onUpdateSubcategory?: (categoryId: string, subcategoryId: string, data: Partial<SubCategory>) => Promise<void>;
  onAddCategory?: (category: Omit<CategoryItem, 'createdAt' | 'updatedAt'>) => Promise<CategoryItem>;
  onAddSubcategory?: (categoryId: string, subcategory: SubCategory) => Promise<void>;
  onDeleteCategory?: (categoryId: string) => Promise<void>;
  onDeleteSubcategory?: (categoryId: string, subcategoryId: string) => Promise<void>;
}

export function CategoryManager({
  categories: externalCategories,
  onUpdateCategory,
  onUpdateSubcategory,
  onAddCategory,
  onAddSubcategory,
  onDeleteCategory,
  onDeleteSubcategory,
}: CategoryManagerProps = {}) {
  const [activeSection, setActiveSection] = useState<CategorySection>('ads');
  const { allCategories: hookCategories } = useCategories();
  
  // Local state for categories with immutable merging to prevent data loss
  const [categories, setCategories] = useState<CategoryItem[]>(externalCategories || hookCategories);

  // Synchronize when externalCategories or hookCategories change, safely merging new data into existing list
  useEffect(() => {
    const source = externalCategories || hookCategories;
    setCategories(prev => {
      const mergedMap = new Map<string, CategoryItem>();
      prev.forEach(c => mergedMap.set(c.id, c));
      source.forEach(c => mergedMap.set(c.id, { ...mergedMap.get(c.id), ...c }));
      return Array.from(mergedMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
    });
  }, [externalCategories, hookCategories]);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('📁');
  const [catId, setCatId] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catOrder, setCatOrder] = useState(1);

  // Subcategory Modal State
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [targetCategoryForSub, setTargetCategoryForSub] = useState<CategoryItem | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<SubCategory | null>(null);
  const [subName, setSubName] = useState('');
  const [subId, setSubId] = useState('');
  const [subDescription, setSubDescription] = useState('');

  // Status & Feedback
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Filter categories for the current section
  const sectionCategories = categories
    .filter(c => c.section === activeSection)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const filteredCategories = sectionCategories.filter(cat => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesCat = cat.name.toLowerCase().includes(q) || (cat.description && cat.description.toLowerCase().includes(q));
    const matchesSub = cat.subcategories?.some(s => s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q)));
    return matchesCat || matchesSub;
  });

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  const toggleCategoryExpand = (id: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Helper to slugify
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/č/g, 'c')
      .replace(/š/g, 's')
      .replace(/ž/g, 'z')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Open modal to add category
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatIcon(
      activeSection === 'ads' ? '🚗' :
      activeSection === 'events' ? '🎵' :
      activeSection === 'blog' ? '🏔️' : '⚡'
    );
    setCatId('');
    setCatDescription('');
    setCatOrder(sectionCategories.length + 1);
    setIsCategoryModalOpen(true);
  };

  // Open modal to edit category
  const handleOpenEditCategory = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatIcon(cat.icon || '📁');
    setCatId(cat.id);
    setCatDescription(cat.description || '');
    setCatOrder(cat.order || 1);
    setIsCategoryModalOpen(true);
  };

  // Save Category (Create or Update)
  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      showNotification('error', 'Ime kategorije je obvezno!');
      return;
    }

    const generatedId = catId.trim() || `${activeSection}-${slugify(catName)}`;

    try {
      if (editingCategory) {
        const updatePayload = {
          name: catName.trim(),
          icon: catIcon.trim() || '📁',
          description: catDescription.trim(),
          order: Number(catOrder) || 1,
        };

        // State update: merge new category data with existing list, never replacing or overwriting the entire array
        setCategories(prev => 
          prev.map(item => 
            item.id === editingCategory.id 
              ? { ...item, ...updatePayload, updatedAt: new Date().toISOString() } 
              : item
          )
        );

        if (onUpdateCategory) {
          await onUpdateCategory(editingCategory.id, updatePayload);
        } else {
          await updateCategory(editingCategory.id, updatePayload);
        }
        showNotification('success', `Kategorija "${catName}" je bila uspešno posodobljena.`);
      } else {
        const newCatPayload: CategoryItem = {
          id: generatedId,
          name: catName.trim(),
          section: activeSection,
          icon: catIcon.trim() || '📁',
          description: catDescription.trim(),
          order: Number(catOrder) || 1,
          subcategories: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // State update: merge new category into existing list
        setCategories(prev => {
          const exists = prev.some(item => item.id === newCatPayload.id);
          if (exists) {
            return prev.map(item => item.id === newCatPayload.id ? { ...item, ...newCatPayload } : item);
          }
          return [...prev, newCatPayload];
        });

        if (onAddCategory) {
          await onAddCategory(newCatPayload);
        } else {
          await addCategory(newCatPayload);
        }
        showNotification('success', `Kategorija "${catName}" je bila uspešno dodana.`);
      }
      setIsCategoryModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showNotification('error', 'Napaka pri shranjevanju kategorije.');
    }
  };

  // Delete Category
  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (!window.confirm(`Ali ste prepričani, da želite izbrisati kategorijo "${cat.name}" in vseh njenih ${cat.subcategories?.length || 0} podkategorij?`)) {
      return;
    }

    try {
      setCategories(prev => prev.filter(item => item.id !== cat.id));
      if (onDeleteCategory) {
        await onDeleteCategory(cat.id);
      } else {
        await deleteCategory(cat.id);
      }
      showNotification('success', `Kategorija "${cat.name}" je bila izbrisana.`);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Napaka pri brisanju kategorije.');
    }
  };

  // Open Subcategory Modal
  const handleOpenAddSubcategory = (cat: CategoryItem) => {
    setTargetCategoryForSub(cat);
    setEditingSubcategory(null);
    setSubName('');
    setSubId('');
    setSubDescription('');
    setIsSubcategoryModalOpen(true);
  };

  const handleOpenEditSubcategory = (cat: CategoryItem, sub: SubCategory) => {
    setTargetCategoryForSub(cat);
    setEditingSubcategory(sub);
    setSubName(sub.name);
    setSubId(sub.id);
    setSubDescription(sub.description || '');
    setIsSubcategoryModalOpen(true);
  };

  // Save Subcategory
  const handleSaveSubcategory = async () => {
    if (!targetCategoryForSub) return;
    if (!subName.trim()) {
      showNotification('error', 'Ime podkategorije je obvezno!');
      return;
    }

    const generatedSubId = subId.trim() || slugify(subName);

    try {
      if (editingSubcategory) {
        const updateSubPayload = {
          name: subName.trim(),
          description: subDescription.trim(),
        };

        // State update: merge new subcategory data with existing list of categories and their subcategories
        setCategories(prev => 
          prev.map(cat => {
            if (cat.id !== targetCategoryForSub.id) return cat;
            const updatedSubs = (cat.subcategories || []).map(sub => 
              sub.id === editingSubcategory.id 
                ? { ...sub, ...updateSubPayload } 
                : sub
            );
            return {
              ...cat,
              subcategories: updatedSubs,
              updatedAt: new Date().toISOString()
            };
          })
        );

        if (onUpdateSubcategory) {
          await onUpdateSubcategory(targetCategoryForSub.id, editingSubcategory.id, updateSubPayload);
        } else {
          await updateSubcategory(targetCategoryForSub.id, editingSubcategory.id, updateSubPayload);
        }
        showNotification('success', `Podkategorija "${subName}" je bila posodobljena.`);
      } else {
        const newSubPayload: SubCategory = {
          id: generatedSubId,
          name: subName.trim(),
          description: subDescription.trim(),
          order: (targetCategoryForSub.subcategories?.length || 0) + 1,
        };

        // State update: merge new subcategory into the existing category's subcategories array
        setCategories(prev => 
          prev.map(cat => {
            if (cat.id !== targetCategoryForSub.id) return cat;
            const currentSubs = cat.subcategories || [];
            const exists = currentSubs.some(s => s.id === newSubPayload.id);
            const updatedSubs = exists
              ? currentSubs.map(s => s.id === newSubPayload.id ? { ...s, ...newSubPayload } : s)
              : [...currentSubs, newSubPayload];
            return {
              ...cat,
              subcategories: updatedSubs,
              updatedAt: new Date().toISOString()
            };
          })
        );

        if (onAddSubcategory) {
          await onAddSubcategory(targetCategoryForSub.id, newSubPayload);
        } else {
          await addSubcategory(targetCategoryForSub.id, newSubPayload);
        }
        showNotification('success', `Podkategorija "${subName}" je bila dodana.`);
      }
      setIsSubcategoryModalOpen(false);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Napaka pri shranjevanju podkategorije.');
    }
  };

  // Delete Subcategory
  const handleDeleteSubcategory = async (cat: CategoryItem, sub: SubCategory) => {
    if (!window.confirm(`Izbrišem podkategorijo "${sub.name}"?`)) {
      return;
    }

    try {
      setCategories(prev => 
        prev.map(item => {
          if (item.id !== cat.id) return item;
          return {
            ...item,
            subcategories: (item.subcategories || []).filter(s => s.id !== sub.id),
            updatedAt: new Date().toISOString()
          };
        })
      );

      if (onDeleteSubcategory) {
        await onDeleteSubcategory(cat.id, sub.id);
      } else {
        await deleteSubcategory(cat.id, sub.id);
      }
      showNotification('success', `Podkategorija "${sub.name}" je bila izbrisana.`);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Napaka pri brisanju podkategorije.');
    }
  };

  // Seed / Reset to defaults
  const handleSeedDefaults = async () => {
    if (!window.confirm('Ali želite sinhronizirati in naložiti privzete kategorije ter podkategorije v Firestore? To bo osvežilo celoten nabor za vseh 4 sekcij.')) {
      return;
    }

    setIsSeeding(true);
    try {
      const res = await seedCategoriesToFirestore();
      showNotification('success', `Uspešno naloženih ${res.count} privzetih kategorij v bazo.`);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Napaka pri sinhronizaciji kategorij.');
    } finally {
      setIsSeeding(false);
    }
  };

  const sections: Array<{ id: CategorySection; label: string; icon: any; count: number }> = [
    { id: 'ads', label: 'Mali oglasi', icon: ShoppingBag, count: categories.filter(c => c.section === 'ads').length },
    { id: 'events', label: 'Dogodki', icon: Calendar, count: categories.filter(c => c.section === 'events').length },
    { id: 'blog', label: 'Blog & Članki', icon: FileText, count: categories.filter(c => c.section === 'blog').length },
    { id: 'deals', label: 'Ugodnosti & Popusti', icon: Percent, count: categories.filter(c => c.section === 'deals').length },
  ];

  const totalSubcategories = sectionCategories.reduce((acc, c) => acc + (c.subcategories?.length || 0), 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Top Notification */}
      {statusMessage && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm transition-all ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
            : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Section Navigation Tabs */}
      <div className="bg-surface-container-low p-1.5 rounded-2xl flex flex-wrap gap-1.5 border border-surface-container/60">
        {sections.map(sec => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => { setActiveSection(sec.id); setSearchQuery(''); }}
              className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl font-label-md text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isActive 
                  ? 'bg-surface-container-lowest text-primary shadow-sm border border-surface-container/80' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-outline'}`} />
              <span>{sec.label}</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-primary/10 text-primary font-bold' : 'bg-surface-container-high text-outline'
              }`}>
                {sec.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Header with Search and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest p-4 rounded-2xl border border-surface-container/60 shadow-xs">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-headline-sm text-base font-bold text-on-surface flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span>Kategorije za sekcijo: {sections.find(s => s.id === activeSection)?.label}</span>
          </h3>
          <p className="text-xs text-outline">
            {sectionCategories.length} glavnih kategorij • {totalSubcategories} podkategorij
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Išči kategorije & podkategorije..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface text-xs focus:outline-none focus:border-primary border border-transparent"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={handleSeedDefaults}
            disabled={isSeeding}
            className="px-3 py-1.5 rounded-xl border border-surface-container text-outline hover:text-on-surface hover:bg-surface-container-low text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Naloži privzete slovenske kategorije v Firestore bazo"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Ponastavi privzete</span>
          </button>

          <button
            onClick={handleOpenAddCategory}
            className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova kategorija</span>
          </button>
        </div>
      </div>

      {/* Categories & Subcategories List */}
      <div className="flex flex-col gap-3">
        {filteredCategories.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center text-outline border border-dashed border-surface-container">
            <Info className="w-8 h-8 mx-auto mb-2 text-outline/60" />
            <p className="font-semibold text-sm text-on-surface">Ni najdenih kategorij</p>
            <p className="text-xs mt-1">
              {searchQuery ? 'Nobena kategorija ali podkategorija ne ustreza iskalnemu nizu.' : 'Za to sekcijo še ni ustvarjenih kategorij.'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleSeedDefaults}
                className="mt-4 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold inline-flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Naloži privzete kategorije</span>
              </button>
            )}
          </div>
        ) : (
          filteredCategories.map(cat => {
            const isExpanded = expandedCategories[cat.id] ?? true;
            const subCount = cat.subcategories?.length || 0;

            return (
              <div 
                key={cat.id}
                className="bg-surface-container-lowest rounded-2xl border border-surface-container/60 shadow-xs overflow-hidden transition-all hover:border-primary/30"
              >
                {/* Category Card Header */}
                <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest hover:bg-surface-container-low/40 transition-colors">
                  <div 
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-[200px]"
                    onClick={() => toggleCategoryExpand(cat.id)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-xl flex items-center justify-center shrink-0">
                      {cat.icon || '📁'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface">
                          {cat.name}
                        </h4>
                        <span className="text-[10px] font-mono bg-surface-container px-2 py-0.5 rounded text-outline">
                          #{cat.id}
                        </span>
                      </div>
                      {cat.description && (
                        <p className="text-xs text-outline mt-0.5 line-clamp-1">{cat.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-outline font-semibold px-2 py-1 rounded-lg bg-surface-container-low">
                      {subCount} {subCount === 1 ? 'podkategorija' : subCount === 2 ? 'podkategoriji' : 'podkategorij'}
                    </span>

                    <button
                      onClick={() => handleOpenAddSubcategory(cat)}
                      className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Dodaj podkategorijo"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Dodaj podkat.</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditCategory(cat)}
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                      title="Uredi kategorijo"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors cursor-pointer"
                      title="Izbriši kategorijo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => toggleCategoryExpand(cat.id)}
                      className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Subcategories Container */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-surface-container-low/60 bg-surface-container-lowest">
                    {subCount === 0 ? (
                      <div className="py-3 px-4 rounded-xl bg-surface-container-low/50 text-xs text-outline text-center flex items-center justify-center gap-2">
                        <span>Ta kategorija še nima podkategorij.</span>
                        <button
                          onClick={() => handleOpenAddSubcategory(cat)}
                          className="text-primary font-bold hover:underline"
                        >
                          Dodaj prvo podkategorijo
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                        {cat.subcategories.map(sub => (
                          <div
                            key={sub.id}
                            className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-surface-container/50 transition-colors flex items-start justify-between gap-2 group"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-label-md text-xs font-bold text-on-surface truncate flex items-center gap-1.5">
                                <Tag className="w-3 h-3 text-primary shrink-0" />
                                <span>{sub.name}</span>
                              </div>
                              <div className="text-[10px] text-outline font-mono truncate mt-0.5">
                                #{sub.id}
                              </div>
                              {sub.description && (
                                <p className="text-[11px] text-on-surface-variant truncate mt-0.5" title={sub.description}>
                                  {sub.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenEditSubcategory(cat, sub)}
                                className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                                title="Uredi podkategorijo"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteSubcategory(cat, sub)}
                                className="p-1 rounded hover:bg-error/10 text-error transition-colors cursor-pointer"
                                title="Izbriši podkategorijo"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Category Modal (Add / Edit) */}
      {isCategoryModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div 
            className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-surface-container"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-container-low pb-3">
              <h3 className="font-headline-sm text-base font-bold text-on-surface flex items-center gap-2">
                <span>{editingCategory ? 'Uredi kategorijo' : 'Nova kategorija'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold uppercase">
                  {activeSection}
                </span>
              </h3>
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-container text-outline"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1 flex flex-col gap-1">
                  <label className="text-xs font-semibold text-outline">Ikona / Emoji</label>
                  <input
                    type="text"
                    value={catIcon}
                    onChange={e => setCatIcon(e.target.value)}
                    placeholder="🚗"
                    className="w-full p-2.5 rounded-xl bg-surface-container-low text-center text-xl border border-transparent focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="col-span-3 flex flex-col gap-1">
                  <label className="text-xs font-semibold text-outline">Ime kategorije *</label>
                  <input
                    type="text"
                    value={catName}
                    onChange={e => {
                      setCatName(e.target.value);
                      if (!editingCategory && !catId) {
                        setCatId(`${activeSection}-${slugify(e.target.value)}`);
                      }
                    }}
                    placeholder="npr. Avto-moto"
                    className="w-full p-2.5 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface border border-transparent focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-outline">Unikatni ID / Slug</label>
                <input
                  type="text"
                  value={catId}
                  disabled={!!editingCategory}
                  onChange={e => setCatId(slugify(e.target.value))}
                  placeholder="npr. ads-avto-moto"
                  className="w-full p-2.5 rounded-xl bg-surface-container-low font-mono text-xs text-on-surface border border-transparent focus:border-primary focus:outline-none disabled:opacity-60"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-outline">Kratek opis</label>
                <textarea
                  value={catDescription}
                  onChange={e => setCatDescription(e.target.value)}
                  placeholder="Kratek opis vsebine te kategorije..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border border-transparent focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-outline">Vrstni red prikaza</label>
                <input
                  type="number"
                  value={catOrder}
                  onChange={e => setCatOrder(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border border-transparent focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-surface-container-low pt-3">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-surface-container text-on-surface-variant"
              >
                Prekliči
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors shadow-xs"
              >
                {editingCategory ? 'Shrani spremembe' : 'Ustvari kategorijo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subcategory Modal (Add / Edit) */}
      {isSubcategoryModalOpen && targetCategoryForSub && (
        <div 
          className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsSubcategoryModalOpen(false)}
        >
          <div 
            className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-surface-container"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-container-low pb-3">
              <div>
                <h3 className="font-headline-sm text-base font-bold text-on-surface">
                  {editingSubcategory ? 'Uredi podkategorijo' : 'Nova podkategorija'}
                </h3>
                <p className="text-xs text-outline mt-0.5">
                  Za kategorijo: <strong className="text-primary">{targetCategoryForSub.name}</strong>
                </p>
              </div>
              <button 
                onClick={() => setIsSubcategoryModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-container text-outline"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-outline">Ime podkategorije *</label>
                <input
                  type="text"
                  value={subName}
                  onChange={e => {
                    setSubName(e.target.value);
                    if (!editingSubcategory && !subId) {
                      setSubId(slugify(e.target.value));
                    }
                  }}
                  placeholder="npr. Osebna vozila"
                  className="w-full p-2.5 rounded-xl bg-surface-container-low text-xs font-bold text-on-surface border border-transparent focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-outline">Unikatni ID / Slug</label>
                <input
                  type="text"
                  value={subId}
                  disabled={!!editingSubcategory}
                  onChange={e => setSubId(slugify(e.target.value))}
                  placeholder="npr. osebna-vozila"
                  className="w-full p-2.5 rounded-xl bg-surface-container-low font-mono text-xs text-on-surface border border-transparent focus:border-primary focus:outline-none disabled:opacity-60"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-outline">Kratek opis (neobvezno)</label>
                <textarea
                  value={subDescription}
                  onChange={e => setSubDescription(e.target.value)}
                  placeholder="Kratek opis..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface border border-transparent focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-surface-container-low pt-3">
              <button
                onClick={() => setIsSubcategoryModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-surface-container text-on-surface-variant"
              >
                Prekliči
              </button>
              <button
                onClick={handleSaveSubcategory}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors shadow-xs"
              >
                {editingSubcategory ? 'Shrani spremembe' : 'Dodaj podkategorijo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
