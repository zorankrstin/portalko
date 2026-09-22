import React, { useState } from 'react';
import { 
  Home, 
  ChevronRight, 
  ArrowLeft, 
  Check, 
  Copy,
  Rss,
  Store,
  CalendarDays,
  Percent,
  BookOpen,
  Bookmark,
  Shield,
  User,
  Search,
  X
} from 'lucide-react';
import { ViewMode, PostDetailTarget, AuthorProfileTarget } from '../types';

export interface BreadcrumbCrumb {
  id: string;
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isCurrent?: boolean;
  onClick?: () => void;
  fullTitle?: string;
}

export interface BreadcrumbsProps {
  currentView: ViewMode;
  previousView: ViewMode;
  selectedPostTarget: PostDetailTarget | null;
  postTitle?: string;
  selectedAuthorProfile: AuthorProfileTarget | null;
  searchQuery?: string;
  onViewChange: (view: ViewMode) => void;
  onHomeClick: () => void;
  onBack?: () => void;
  onClearSearch?: () => void;
  className?: string;
}

export function Breadcrumbs({
  currentView,
  previousView,
  selectedPostTarget,
  postTitle,
  selectedAuthorProfile,
  searchQuery,
  onViewChange,
  onHomeClick,
  onBack,
  onClearSearch,
  className = '',
}: BreadcrumbsProps) {
  const [isCopied, setIsCopied] = useState(false);

  // Construct breadcrumb items list
  const crumbs: BreadcrumbCrumb[] = [];

  // Root item: Domov
  crumbs.push({
    id: 'home',
    label: 'Domov',
    href: '#domov',
    icon: Home,
    isCurrent: currentView === 'main' && !searchQuery,
    onClick: onHomeClick,
  });

  if (currentView === 'main') {
    if (searchQuery && searchQuery.trim()) {
      crumbs.push({
        id: 'search',
        label: `Iskanje: "${searchQuery.trim()}"`,
        icon: Search,
        isCurrent: true,
        fullTitle: `Iskalni niz: ${searchQuery}`,
      });
    }
  } else if (currentView === 'news') {
    crumbs.push({
      id: 'news',
      label: 'Novice',
      href: '#novice',
      icon: Rss,
      isCurrent: !searchQuery,
      onClick: () => onViewChange('news'),
    });
    if (searchQuery && searchQuery.trim()) {
      crumbs.push({
        id: 'search',
        label: `Iskanje: "${searchQuery.trim()}"`,
        icon: Search,
        isCurrent: true,
      });
    }
  } else if (currentView === 'ads') {
    crumbs.push({
      id: 'ads',
      label: 'Mali oglasi',
      href: '#mali-oglasi',
      icon: Store,
      isCurrent: !searchQuery,
      onClick: () => onViewChange('ads'),
    });
    if (searchQuery && searchQuery.trim()) {
      crumbs.push({
        id: 'search',
        label: `Iskanje: "${searchQuery.trim()}"`,
        icon: Search,
        isCurrent: true,
      });
    }
  } else if (currentView === 'events') {
    crumbs.push({
      id: 'events',
      label: 'Dogodki & Prireditve',
      href: '#dogodki',
      icon: CalendarDays,
      isCurrent: !searchQuery,
      onClick: () => onViewChange('events'),
    });
    if (searchQuery && searchQuery.trim()) {
      crumbs.push({
        id: 'search',
        label: `Iskanje: "${searchQuery.trim()}"`,
        icon: Search,
        isCurrent: true,
      });
    }
  } else if (currentView === 'deals') {
    crumbs.push({
      id: 'deals',
      label: 'Ugodnosti & Popusti',
      href: '#ugodnosti',
      icon: Percent,
      isCurrent: !searchQuery,
      onClick: () => onViewChange('deals'),
    });
    if (searchQuery && searchQuery.trim()) {
      crumbs.push({
        id: 'search',
        label: `Iskanje: "${searchQuery.trim()}"`,
        icon: Search,
        isCurrent: true,
      });
    }
  } else if (currentView === 'blog') {
    crumbs.push({
      id: 'blog',
      label: 'Blog & Članki',
      href: '#blog',
      icon: BookOpen,
      isCurrent: !searchQuery,
      onClick: () => onViewChange('blog'),
    });
    if (searchQuery && searchQuery.trim()) {
      crumbs.push({
        id: 'search',
        label: `Iskanje: "${searchQuery.trim()}"`,
        icon: Search,
        isCurrent: true,
      });
    }
  } else if (currentView === 'saved') {
    crumbs.push({
      id: 'saved',
      label: 'Shranjene objave',
      href: '#shranjeno',
      icon: Bookmark,
      isCurrent: true,
      onClick: () => onViewChange('saved'),
    });
  } else if (currentView === 'admin') {
    crumbs.push({
      id: 'admin',
      label: 'Nadzorna plošča',
      href: '#admin',
      icon: Shield,
      isCurrent: true,
      onClick: () => onViewChange('admin'),
    });
  } else if (currentView === 'profile') {
    if (selectedAuthorProfile) {
      if (selectedAuthorProfile.fromPostTarget) {
        // Intermediate category
        const parentType = selectedAuthorProfile.fromPostTarget.type;
        const parentView: ViewMode = parentType === 'deal' ? 'deals' :
                                    parentType === 'event' ? 'events' :
                                    parentType === 'ad' ? 'ads' :
                                    (previousView === 'news' ? 'news' : 'blog');
        const parentLabel = parentView === 'deals' ? 'Ugodnosti' :
                            parentView === 'events' ? 'Dogodki' :
                            parentView === 'ads' ? 'Mali oglasi' :
                            (parentView === 'news' ? 'Novice' : 'Blog');
        crumbs.push({
          id: 'author-parent-category',
          label: parentLabel,
          href: `#${parentView}`,
          onClick: () => onViewChange(parentView),
        });
      }
      crumbs.push({
        id: 'author-profile',
        label: `Avtor: ${selectedAuthorProfile.name}`,
        icon: User,
        isCurrent: true,
        fullTitle: `Profil avtorja ${selectedAuthorProfile.name}`,
      });
    } else {
      crumbs.push({
        id: 'profile',
        label: 'Moj profil',
        href: '#profil',
        icon: User,
        isCurrent: true,
        onClick: () => onViewChange('profile'),
      });
    }
  } else if (currentView === 'post-detail' && selectedPostTarget) {
    // Determine category based on target type and previousView
    const type = selectedPostTarget.type;
    if (type === 'deal') {
      crumbs.push({
        id: 'parent-deals',
        label: 'Ugodnosti',
        href: '#ugodnosti',
        icon: Percent,
        onClick: () => onViewChange('deals'),
      });
    } else if (type === 'event') {
      crumbs.push({
        id: 'parent-events',
        label: 'Dogodki',
        href: '#dogodki',
        icon: CalendarDays,
        onClick: () => onViewChange('events'),
      });
    } else if (type === 'ad') {
      crumbs.push({
        id: 'parent-ads',
        label: 'Mali oglasi',
        href: '#mali-oglasi',
        icon: Store,
        onClick: () => onViewChange('ads'),
      });
    } else {
      // blog or post
      if (previousView === 'news') {
        crumbs.push({
          id: 'parent-news',
          label: 'Novice',
          href: '#novice',
          icon: Rss,
          onClick: () => onViewChange('news'),
        });
      } else {
        crumbs.push({
          id: 'parent-blog',
          label: 'Blog',
          href: '#blog',
          icon: BookOpen,
          onClick: () => onViewChange('blog'),
        });
      }
    }

    // Active single post crumb
    const fallbackTitle = type === 'deal' ? 'Posamezna ugodnost' :
                          type === 'event' ? 'Posamezen dogodek' :
                          type === 'ad' ? 'Posamezen oglas' :
                          previousView === 'news' ? 'Posamezna novica' : 'Posamezen članek';
    const displayTitle = postTitle || fallbackTitle;

    crumbs.push({
      id: `post-${selectedPostTarget.id}`,
      label: displayTitle,
      isCurrent: true,
      fullTitle: displayTitle,
    });
  }

  // Handle copy current link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const showBackButton = currentView !== 'main';

  return (
    <nav 
      aria-label="Drobtice" 
      id="main-breadcrumbs"
      className={`bg-surface-container-lowest border border-surface-container/60 shadow-xs rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 overflow-hidden text-xs ${className}`}
      itemScope 
      itemType="https://schema.org/BreadcrumbList"
    >
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-x-auto scrollbar-none py-0.5">
        {/* Compact Back Button */}
        {showBackButton && onBack && (
          <div className="flex items-center gap-1.5 shrink-0 pr-1 sm:pr-1.5 border-r border-surface-container/60">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors font-medium text-xs cursor-pointer group"
              title="Nazaj na prejšnjo stran"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-outline group-hover:text-primary transition-colors" />
              <span className="hidden sm:inline">Nazaj</span>
            </button>
          </div>
        )}

        {/* Breadcrumbs List */}
        <ol className="flex items-center flex-nowrap sm:flex-wrap gap-1 sm:gap-1.5 min-w-0">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            const Icon = crumb.icon;

            return (
              <li 
                key={crumb.id} 
                className="flex items-center gap-1 sm:gap-1.5 shrink-0 min-w-0"
                itemProp="itemListElement" 
                itemScope 
                itemType="https://schema.org/ListItem"
              >
                {index > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-outline/40 shrink-0" aria-hidden="true" />
                )}

                {crumb.isCurrent || !crumb.onClick ? (
                  <span 
                    className={`flex items-center gap-1.5 font-semibold transition-colors truncate max-w-[140px] sm:max-w-[200px] md:max-w-[280px] lg:max-w-[340px] ${
                      isLast ? 'text-primary' : 'text-on-surface'
                    }`}
                    itemProp="name"
                    title={crumb.fullTitle || crumb.label}
                    aria-current={crumb.isCurrent ? 'page' : undefined}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">{crumb.label}</span>
                  </span>
                ) : (
                  <a
                    href={crumb.href || '#'}
                    onClick={(e) => {
                      e.preventDefault();
                      crumb.onClick?.();
                    }}
                    className="flex items-center gap-1.5 text-outline hover:text-primary hover:underline transition-colors cursor-pointer py-0.5 px-1 rounded-md hover:bg-surface-container-low shrink-0"
                    itemProp="item"
                    title={crumb.fullTitle || crumb.label}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                    <span itemProp="name">{crumb.label}</span>
                  </a>
                )}

                <meta itemProp="position" content={String(index + 1)} />
              </li>
            );
          })}
        </ol>
      </div>

      {/* Right-side utilities (Clear search or Copy link) */}
      <div className="flex items-center gap-1.5 shrink-0 pl-1">
        {searchQuery && onClearSearch && (
          <button
            type="button"
            onClick={onClearSearch}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-[11px] font-medium text-outline hover:text-on-surface transition-colors cursor-pointer"
            title="Počisti iskanje"
          >
            <span>Počisti</span>
            <X className="w-3 h-3" />
          </button>
        )}

        <button
          type="button"
          onClick={handleCopyLink}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-outline hover:text-primary hover:bg-surface-container-low transition-colors text-[11px] font-medium cursor-pointer"
          title="Kopiraj trenutno povezavo"
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-secondary" />
              <span className="hidden md:inline text-secondary font-semibold">Kopirano!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-outline" />
              <span className="hidden md:inline">Kopiraj</span>
            </>
          )}
        </button>
      </div>
    </nav>
  );
}
