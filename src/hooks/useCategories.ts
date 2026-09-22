import { useState, useEffect } from 'react';
import { 
  CategoryItem, 
  CategorySection, 
  SubCategory,
  subscribeToCategories, 
  getCategoriesForSection,
  DEFAULT_CATEGORIES 
} from '../services/categoryService';

export type { 
  CategoryItem, 
  CategorySection, 
  SubCategory 
};

export function useCategories(section?: CategorySection) {
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    return section ? getCategoriesForSection(section, DEFAULT_CATEGORIES) : DEFAULT_CATEGORIES;
  });
  const [allCategories, setAllCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeToCategories((updated) => {
      setAllCategories(updated);
      if (section) {
        setCategories(getCategoriesForSection(section, updated));
      } else {
        setCategories(updated);
      }
    });

    return () => unsub();
  }, [section]);

  return {
    categories,
    allCategories,
    isLoading,
    getCategoriesForSection: (sec: CategorySection) => getCategoriesForSection(sec, allCategories),
  };
}
