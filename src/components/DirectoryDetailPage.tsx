import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  Globe,
  HelpCircle,
  MapPin,
  QrCode,
  ShieldCheck,
  Star,
  Tag,
  Calendar,
  Phone,
  Mail,
  Clock,
  Pencil,
  MessageSquare,
  Send,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { scrollToPageTop } from '../utils/scrollUtils';
import {
  DirectoryEntry,
  DirectoryReview,
  getDirectoryEntrySlug,
  subscribeToDirectoryReviews,
  addDirectoryReview,
  deleteDirectoryReview,
} from '../services/directoryService';

interface DirectoryDetailPageProps {
  entry: DirectoryEntry;
  relatedEntries: DirectoryEntry[];
  canEdit?: boolean;
  onBack: () => void;
  onSelectEntry: (entry: DirectoryEntry) => void;
  onOpenQr: (entry: DirectoryEntry) => void;
  onEdit?: (entry: DirectoryEntry) => void;
}

function upsertMetaTag(
  selector: string,
  attrName: 'name' | 'property',
  attrValue: string,
  content: string
): () => void {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  const created = !el;
  const previousContent = el?.getAttribute('content') ?? null;

  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);

  return () => {
    if (!el) return;
    if (created) {
      el.remove();
    } else if (previousContent !== null) {
      el.setAttribute('content', previousContent);
    }
  };
}

export function DirectoryDetailPage({
  entry,
  relatedEntries,
  canEdit = false,
  onBack,
  onSelectEntry,
  onOpenQr,
  onEdit,
}: DirectoryDetailPageProps) {
  const { currentUser } = useAuth();
  const [copiedLink, setCopiedLink] = useState(false);
  const [reviews, setReviews] = useState<DirectoryReview[]>([]);
  const [newRating, setNewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);

  useEffect(() => {
    scrollToPageTop();
  }, [entry.id]);

  useEffect(() => {
    const unsub = subscribeToDirectoryReviews(entry.id, setReviews);
    return () => unsub();
  }, [entry.id]);

  const { averageRating, reviewCount } = useMemo(() => {
    if (reviews.length > 0) {
      const avg =
        Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;
      return { averageRating: avg, reviewCount: reviews.length };
    }
    return {
      averageRating: entry.ratingAverage || 0,
      reviewCount: entry.ratingCount || 0,
    };
  }, [reviews, entry.ratingAverage, entry.ratingCount]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmittingReview(true);
    setReviewFeedback(null);
    try {
      await addDirectoryReview(entry.id, {
        rating: newRating,
        comment: newComment,
        authorId: currentUser?.id || `guest-${Date.now()}`,
        authorName: currentUser?.name || 'Obiskovalec',
        authorAvatar: currentUser?.avatar,
      });
      setNewComment('');
      setNewRating(5);
      setReviewFeedback('Hvala! Vaša ocena in komentar sta bila uspešno objavljena.');
    } catch (err) {
      console.error('Failed to add review:', err);
      setReviewFeedback('Pri objavi ocene je prišlo do napake. Poskusite znova.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const slug = useMemo(() => getDirectoryEntrySlug(entry), [entry]);

  const canonicalUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('imenik', slug);
    return url.toString();
  }, [slug]);

  const seoTitle = useMemo(() => {
    const loc = entry.location?.trim() || 'Slovenija';
    return `${entry.name} (${loc}) – ${entry.categoryName} | Imenik Portalko`;
  }, [entry.name, entry.location, entry.categoryName]);

  const seoDescription = useMemo(() => {
    const loc = entry.location?.trim() || 'Slovenija';
    const base = `${entry.name} (${entry.domain}) – ${entry.categoryName}, ${loc}. ${entry.description}`;
    return base.length > 158 ? `${base.slice(0, 155).trim()}...` : base;
  }, [entry.name, entry.domain, entry.categoryName, entry.location, entry.description]);

  const geoFaqs = useMemo(() => {
    const loc = entry.location?.trim() || 'Slovenija';
    const tagsText =
      entry.tags && entry.tags.length > 0
        ? ` Ključna področja delovanja vključujejo: ${entry.tags.join(', ')}.`
        : '';
    return [
      {
        q: `Kaj ponuja ${entry.name}?`,
        a: `${entry.description}${tagsText}`,
      },
      {
        q: `Kje deluje ${entry.name} in v katero kategorijo spada?`,
        a: `${entry.name} je uvrščen v kategorijo »${entry.categoryName}« v slovenskem spletnem imeniku Portalko in deluje na območju: ${loc}, Slovenija.`,
      },
      {
        q: `Kateri je uradni spletni naslov podjetja ${entry.name}?`,
        a: `Uradna spletna stran je ${entry.url} (domena ${entry.domain}).${
          entry.isVerified
            ? ' Vnos je uradno preverjen in potrjen s strani uredništva Portalko.'
            : ''
        }`,
      },
    ];
  }, [entry]);

  // Inject dynamic SEO meta tags, OpenGraph, Twitter Cards, Canonical URL, and JSON-LD (LocalBusiness + BreadcrumbList + FAQPage)
  useEffect(() => {
    const prevTitle = document.title;
    document.title = seoTitle;

    const cleanups: Array<() => void> = [
      upsertMetaTag('meta[name="description"]', 'name', 'description', seoDescription),
      upsertMetaTag('meta[property="og:type"]', 'property', 'og:type', 'article'),
      upsertMetaTag('meta[property="og:title"]', 'property', 'og:title', seoTitle),
      upsertMetaTag('meta[property="og:description"]', 'property', 'og:description', seoDescription),
      upsertMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl),
      upsertMetaTag('meta[property="og:locale"]', 'property', 'og:locale', 'sl_SI'),
      upsertMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image'),
      upsertMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', seoTitle),
      upsertMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', seoDescription),
    ];

    // Canonical link
    let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const createdCanonical = !canonicalLink;
    const prevCanonicalHref = canonicalLink?.getAttribute('href') ?? null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // Schema.org JSON-LD Graph (Organization/LocalBusiness + BreadcrumbList + FAQPage for SEO & GEO)
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'LocalBusiness',
          '@id': `${canonicalUrl}#business`,
          name: entry.name,
          url: entry.url,
          description: entry.description,
          image:
            entry.logoUrl ||
            `https://www.google.com/s2/favicons?domain=${encodeURIComponent(entry.domain)}&sz=128`,
          ...(entry.phone?.trim() ? { telephone: entry.phone.trim() } : {}),
          ...(entry.email?.trim() ? { email: entry.email.trim() } : {}),
          ...(entry.workingHours?.trim() ? { openingHours: entry.workingHours.trim() } : {}),
          address: {
            '@type': 'PostalAddress',
            ...(entry.address?.trim() ? { streetAddress: entry.address.trim() } : {}),
            addressLocality: entry.location || 'Slovenija',
            addressCountry: 'SI',
          },
          areaServed: {
            '@type': 'Country',
            name: 'Slovenija',
          },
          knowsAbout: [entry.categoryName, ...(entry.tags || [])],
          sameAs: [entry.url],
          ...(reviewCount > 0
            ? {
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: averageRating,
                  reviewCount,
                  bestRating: 5,
                  worstRating: 1,
                },
              }
            : {}),
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Imenik',
              item: `${window.location.origin}${window.location.pathname}`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: entry.categoryName,
              item: `${window.location.origin}${window.location.pathname}`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: entry.name,
              item: canonicalUrl,
            },
          ],
        },
        {
          '@type': 'FAQPage',
          mainEntity: geoFaqs.map((faq) => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.a,
            },
          })),
        },
      ],
    };

    const scriptId = 'directory-entry-jsonld';
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = scriptId;
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(jsonLd);

    return () => {
      document.title = prevTitle;
      cleanups.forEach((fn) => fn());
      if (canonicalLink) {
        if (createdCanonical) canonicalLink.remove();
        else if (prevCanonicalHref !== null) canonicalLink.setAttribute('href', prevCanonicalHref);
      }
      document.getElementById(scriptId)?.remove();
    };
  }, [entry, canonicalUrl, seoTitle, seoDescription, geoFaqs, averageRating, reviewCount]);

  const handleCopyCanonical = async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const formattedDate = useMemo(() => {
    try {
      return new Date(entry.createdAt).toLocaleDateString('sl-SI', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }, [entry.createdAt]);

  return (
    <article
      itemScope
      itemType="https://schema.org/LocalBusiness"
      className="flex flex-col gap-4 pb-8"
    >
      {/* Breadcrumb & Back Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center justify-between gap-2 bg-surface-container-lowest rounded-2xl px-4 py-3 border border-surface-container/60 shadow-xs"
      >
        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant min-w-0 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 font-bold text-primary hover:underline cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Nazaj v Imenik</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-outline shrink-0" />
          <span className="truncate">{entry.categoryName}</span>
          <ChevronRight className="w-3.5 h-3.5 text-outline shrink-0" />
          <span className="font-bold text-on-surface truncate">{entry.name}</span>
        </div>

        <button
          type="button"
          onClick={handleCopyCanonical}
          className="px-2.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-[11px] font-bold inline-flex items-center gap-1.5 border border-surface-container transition-colors cursor-pointer shrink-0"
          title="Kopiraj povezavo do te strani"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kopirano</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-primary" />
              <span>Deli stran</span>
            </>
          )}
        </button>
      </nav>

      {/* Main Hero & Editorial Summary */}
      <header className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 border border-surface-container/60 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-low border border-surface-container flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src={
                  entry.logoUrl ||
                  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(entry.domain)}&sz=128`
                }
                alt={`Logotip ${entry.name}`}
                itemProp="image"
                className="w-9 h-9 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>

            <div className="min-w-0 flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  itemProp="name"
                  className="font-headline-md text-2xl font-black text-on-surface tracking-tight"
                >
                  {entry.name}
                </h1>
                {entry.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[11px] font-bold">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    <span>Uradno preverjeno</span>
                  </span>
                )}
                {entry.isFeatured && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-[11px] font-bold">
                    <Star className="w-3 h-3 fill-current" />
                    <span>Izbor uredništva</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap text-xs text-on-surface-variant">
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  itemProp="url"
                  className="font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{entry.domain}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                {entry.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-outline" />
                    <span itemProp="address">{entry.location}, Slovenija</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(entry)}
                className="px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-primary/10 text-on-surface hover:text-primary text-xs font-bold border border-surface-container inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Uredi vnos</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenQr(entry)}
              className="px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold border border-surface-container inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-primary" />
              <span>QR vizitka</span>
            </button>
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Obišči uradno stran</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Structured Editorial Description (GEO-ready clear summary) */}
        <div className="flex flex-col gap-2 pt-4 border-t border-surface-container-low">
          <h2 className="text-xs font-bold uppercase tracking-wider text-outline">
            Predstavitev podjetja / spletne strani
          </h2>
          <p
            itemProp="description"
            className="text-sm text-on-surface leading-relaxed"
          >
            {entry.description}
          </p>
        </div>

        {/* Key Facts Grid (Structured for users & AI/search engines) */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-surface-container-low/70 border border-surface-container/60">
            <dt className="text-[11px] font-semibold text-outline mb-0.5">Kategorija</dt>
            <dd className="text-xs font-bold text-on-surface">{entry.categoryName}</dd>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low/70 border border-surface-container/60">
            <dt className="text-[11px] font-semibold text-outline mb-0.5">Lokacija / Območje</dt>
            <dd className="text-xs font-bold text-on-surface">
              {entry.location || 'Slovenija'}, Slovenija
            </dd>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low/70 border border-surface-container/60">
            <dt className="text-[11px] font-semibold text-outline mb-0.5">Status vnosa</dt>
            <dd className="text-xs font-bold text-on-surface inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{entry.isVerified ? 'Uradno preverjeno' : 'Objavljeno v imeniku'}</span>
            </dd>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low/70 border border-surface-container/60">
            <dt className="text-[11px] font-semibold text-outline mb-0.5">Dodano v imenik</dt>
            <dd className="text-xs font-bold text-on-surface inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>{formattedDate || 'Aktivno'}</span>
            </dd>
          </div>
        </dl>

        {/* Semantic Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <Tag className="w-3.5 h-3.5 text-outline mr-0.5" />
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-primary/8 text-primary border border-primary/15"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Contact Details Section */}
      {(entry.phone || entry.email || entry.address || entry.workingHours) && (
        <section className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container/60 shadow-xs flex flex-col gap-3">
          <h2 className="text-sm font-bold text-on-surface">Kontaktni podatki</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {entry.phone && (
              <a
                href={`tel:${entry.phone.replace(/\s+/g, '')}`}
                itemProp="telephone"
                className="p-3 rounded-xl bg-surface-container-low/70 hover:bg-surface-container-low border border-surface-container/60 flex items-center gap-2.5 transition-colors"
              >
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-outline">Telefon</div>
                  <div className="text-xs font-bold text-on-surface truncate">{entry.phone}</div>
                </div>
              </a>
            )}
            {entry.email && (
              <a
                href={`mailto:${entry.email}`}
                itemProp="email"
                className="p-3 rounded-xl bg-surface-container-low/70 hover:bg-surface-container-low border border-surface-container/60 flex items-center gap-2.5 transition-colors"
              >
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-outline">E-pošta</div>
                  <div className="text-xs font-bold text-on-surface truncate">{entry.email}</div>
                </div>
              </a>
            )}
            {entry.address && (
              <div className="p-3 rounded-xl bg-surface-container-low/70 border border-surface-container/60 flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-outline">Naslov</div>
                  <div className="text-xs font-bold text-on-surface">{entry.address}</div>
                </div>
              </div>
            )}
            {entry.workingHours && (
              <div className="p-3 rounded-xl bg-surface-container-low/70 border border-surface-container/60 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-outline">Delovni čas</div>
                  <div className="text-xs font-bold text-on-surface">{entry.workingHours}</div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* User Ratings & Comments Section */}
      <section className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container/60 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-container-low pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-on-surface">
              Ocene in komentarji uporabnikov ({reviewCount})
            </h2>
          </div>

          {reviewCount > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/12 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-bold">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= Math.round(averageRating)
                        ? 'fill-amber-500 text-amber-500'
                        : 'text-outline/40'
                    }`}
                  />
                ))}
              </div>
              <span className="tabular-nums">{averageRating.toFixed(1)} / 5</span>
            </div>
          )}
        </div>

        {/* Add Review Form */}
        <form
          onSubmit={handleSubmitReview}
          className="p-3.5 rounded-xl bg-surface-container-low/65 border border-surface-container flex flex-col gap-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-on-surface">
              Ocenite svojo izkušnjo z {entry.name}:
            </span>
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Ocena z zvezdicami">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= (hoverRating || newRating);
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setNewRating(star)}
                    className="p-0.5 cursor-pointer transition-transform hover:scale-110"
                    aria-label={`${star} od 5 zvezdic`}
                  >
                    <Star
                      className={`w-5 h-5 ${
                        active ? 'fill-amber-500 text-amber-500' : 'text-outline/40'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-1.5 text-xs font-bold text-on-surface tabular-nums">
                {newRating}/5
              </span>
            </div>
          </div>

          <textarea
            required
            rows={2}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Delite svojo izkušnjo, kakovost storitev ali priporočilo za druge uporabnike..."
            className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary resize-none"
          />

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-outline">
              Objavljate kot <strong className="text-on-surface">{currentUser?.name || 'Obiskovalec'}</strong>
            </span>
            <button
              type="submit"
              disabled={isSubmittingReview || !newComment.trim()}
              className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmittingReview ? 'Objavljam...' : 'Objavi oceno'}</span>
            </button>
          </div>

          {reviewFeedback && (
            <p className="text-xs font-semibold text-secondary">{reviewFeedback}</p>
          )}
        </form>

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <p className="text-xs text-outline text-center py-4">
            Za to podjetje še ni ocen. Bodite prvi in delite svojo izkušnjo!
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {reviews.map((rev) => {
              const canDelete =
                canEdit || (currentUser?.id && currentUser.id === rev.authorId);
              return (
                <div
                  key={rev.id}
                  className="p-3.5 rounded-xl bg-surface-container-low/50 border border-surface-container/60 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-on-surface">
                        {rev.authorName}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              star <= rev.rating
                                ? 'fill-amber-500 text-amber-500'
                                : 'text-outline/30'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-outline">
                        {new Date(rev.createdAt).toLocaleDateString('sl-SI')}
                      </span>
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => deleteDirectoryReview(entry.id, rev.id)}
                        className="p-1 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                        title="Izbriši komentar"
                        aria-label="Izbriši komentar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {rev.comment}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* GEO-Optimized FAQ Section (Matches FAQPage JSON-LD) */}
      <section className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container/60 shadow-xs flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-on-surface">
            Pogosta vprašanja o {entry.name}
          </h2>
        </div>
        <div className="flex flex-col gap-2.5">
          {geoFaqs.map((faq) => (
            <div
              key={faq.q}
              className="p-3.5 rounded-xl bg-surface-container-low/60 border border-surface-container/60"
            >
              <h3 className="text-xs font-bold text-on-surface mb-1">{faq.q}</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related Businesses in Same Category (Internal SEO Linking) */}
      {relatedEntries.length > 0 && (
        <section className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container/60 shadow-xs flex flex-col gap-3">
          <h2 className="text-sm font-bold text-on-surface">
            Podobna podjetja v kategoriji {entry.categoryName}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {relatedEntries.map((rel) => (
              <button
                key={rel.id}
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  scrollToPageTop();
                  onSelectEntry(rel);
                }}
                className="text-left p-3 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low border border-surface-container/60 hover:border-primary/35 transition-all flex items-center justify-between gap-2 cursor-pointer group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-on-surface group-hover:text-primary truncate">
                      {rel.name}
                    </span>
                    {rel.isVerified && (
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] text-on-surface-variant truncate block">
                    {rel.domain} • {rel.location || 'Slovenija'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-outline group-hover:text-primary shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
