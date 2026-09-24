import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Megaphone, Calendar, Tag, Layers, CheckCircle2, 
  CreditCard, AlertCircle, Clock, Trash2, ArrowRight, ShieldCheck, Lock, Loader2
} from 'lucide-react';
import { 
  PromotionConfig, 
  PromotionTargetSection, 
  PromotionBadgeType 
} from '../../types';
import { 
  PROMOTION_PRICING_PLANS, 
  getPromotionTimeRemaining, 
  PromotionPricingPlan 
} from '../../services/promotionService';
import { useCategories, CategorySection } from '../../hooks/useCategories';
import { useAuth } from '../../contexts/AuthContext';
import { PromotedBadge } from '../common/PromotedBadge';
import { createPromotionPaymentIntent, verifyPromotionPayment } from '../../services/stripeService';

export interface PromotableItemData {
  id: string;
  title: string;
  type: 'post' | 'ad' | 'event' | 'deal';
  category?: string;
  categoryName?: string;
  subcategory?: string;
  subcategoryName?: string;
  imageUrl?: string;
  authorName?: string;
  authorRole?: string;
  isPromoted?: boolean;
  promotion?: PromotionConfig;
  promotedUntil?: string;
  promotionBadgeType?: PromotionBadgeType;
  targetSection?: PromotionTargetSection;
}

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PromotableItemData | null;
  onSavePromotion: (id: string, type: 'post' | 'ad' | 'event' | 'deal', config: PromotionConfig) => Promise<void>;
  onRemovePromotion?: (id: string, type: 'post' | 'ad' | 'event' | 'deal') => Promise<void>;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  onClose,
  item,
  onSavePromotion,
  onRemovePromotion,
}) => {
  const { currentUser } = useAuth();
  const isAdminOrSuper = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';

  // Section options
  const defaultTargetSection: PromotionTargetSection = 
    item?.type === 'ad' ? 'ads' :
    item?.type === 'event' ? 'events' :
    item?.type === 'deal' ? 'deals' : 'blog';

  const [targetSection, setTargetSection] = useState<PromotionTargetSection>(defaultTargetSection);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan-7-days');
  const [customDays, setCustomDays] = useState<number>(7);
  const [useCustomExpiry, setUseCustomExpiry] = useState<boolean>(false);
  const [customExpiryDate, setCustomExpiryDate] = useState<string>('');
  const [badgeType, setBadgeType] = useState<PromotionBadgeType>('PROMO');
  const [targetCategory, setTargetCategory] = useState<string>('all');
  const [targetSubcategory, setTargetSubcategory] = useState<string>('all');
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'flik' | 'invoice' | 'admin_waived'>('card');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Stripe card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState(currentUser?.name || '');
  const [isProcessingStripe, setIsProcessingStripe] = useState(false);
  const [stripeSuccessNote, setStripeSuccessNote] = useState('');

  // Categories for the chosen targetSection
  const categorySectionKey: CategorySection | undefined = 
    targetSection === 'all' ? undefined : (targetSection as CategorySection);
  const { categories } = useCategories(categorySectionKey);

  // Initialize state when modal opens or item changes
  useEffect(() => {
    if (isOpen && item) {
      const existingPromo = item.promotion;
      const initialSection = existingPromo?.targetSection || (
        item.type === 'ad' ? 'ads' :
        item.type === 'event' ? 'events' :
        item.type === 'deal' ? 'deals' : 'blog'
      );
      setTargetSection(initialSection);
      setBadgeType(existingPromo?.badgeType || (item.type === 'ad' ? 'OGLAS' : 'PROMO'));
      setTargetCategory(existingPromo?.targetCategory || item.category || 'all');
      setTargetSubcategory(existingPromo?.targetSubcategory || item.subcategory || 'all');
      setIsPaid(existingPromo?.isPaid ?? true);

      if (existingPromo?.promotedUntil) {
        setUseCustomExpiry(true);
        // format to YYYY-MM-DD
        const d = new Date(existingPromo.promotedUntil);
        if (!isNaN(d.getTime())) {
          setCustomExpiryDate(d.toISOString().split('T')[0]);
        }
      } else {
        setUseCustomExpiry(false);
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        setCustomExpiryDate(defaultDate.toISOString().split('T')[0]);
      }
      setFeedback(null);
      setStripeSuccessNote('');
    }
  }, [isOpen, item]);

  // Handle selected plan change
  const selectedPlan = PROMOTION_PRICING_PLANS.find(p => p.id === selectedPlanId) || PROMOTION_PRICING_PLANS[1];

  if (!isOpen || !item) return null;

  const activeCategoryObj = categories.find(c => c.id === targetCategory);

  const calculateExpiryISO = (): string => {
    if (useCustomExpiry && customExpiryDate) {
      const date = new Date(customExpiryDate);
      date.setHours(23, 59, 59, 999);
      return date.toISOString();
    }
    const days = selectedPlan.days || customDays || 7;
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  };

  const handleSave = async () => {
    if (!item) return;
    setIsSubmitting(true);
    setFeedback(null);

    const price = paymentMethod === 'admin_waived' ? 0 : selectedPlan.priceEur;

    // If paying via card (Stripe) and not already marked as paid
    if (paymentMethod === 'card' && price > 0) {
      setIsProcessingStripe(true);
      try {
        const intentResult = await createPromotionPaymentIntent({
          amountEur: price,
          itemId: item.id,
          itemType: item.type,
          itemTitle: item.title,
          planId: selectedPlan.id,
          badgeType,
          targetSection,
          userEmail: currentUser?.email,
          userId: currentUser?.id,
        });

        // Verify the payment
        const verification = await verifyPromotionPayment(intentResult.paymentIntentId);
        if (!verification.paid && !verification.simulated) {
          throw new Error('Plačilo prek Stripe ni bilo uspešno zaključeno.');
        }

        setStripeSuccessNote(
          intentResult.simulated
            ? `Plačilo ${price.toFixed(2)} € uspešno zabeleženo prek Stripe testnega okolja.`
            : `Plačilo ${price.toFixed(2)} € uspešno procesirano prek Stripe (${intentResult.paymentIntentId}).`
        );
      } catch (stripeErr: any) {
        setIsProcessingStripe(false);
        setIsSubmitting(false);
        setFeedback({
          message: stripeErr.message || 'Napaka pri obdelavi Stripe plačila.',
          type: 'error',
        });
        return;
      }
      setIsProcessingStripe(false);
    }

    const expiryISO = calculateExpiryISO();
    const config: PromotionConfig = {
      isPromoted: true,
      promotedUntil: expiryISO,
      targetSection,
      ...(targetCategory && targetCategory !== 'all' ? { targetCategory } : {}),
      ...(targetSubcategory && targetSubcategory !== 'all' ? { targetSubcategory } : {}),
      badgeType,
      paidAmount: price,
      isPaid: true,
      promotedAt: new Date().toISOString(),
      assignedBy: currentUser?.name || 'Administrator',
      assignedById: currentUser?.id,
    };

    try {
      await onSavePromotion(item.id, item.type, config);
      setFeedback({
        message: `Objava je uspešno označena kot izpostavljena (${badgeType}) na vrhu seznama!`,
        type: 'success',
      });
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1400);
    } catch (err: any) {
      setIsSubmitting(false);
      setFeedback({
        message: err.message || 'Napaka pri shranjevanju promocije.',
        type: 'error',
      });
    }
  };

  const handleRemove = async () => {
    if (!item || !onRemovePromotion) return;
    if (!window.confirm('Ali res želite preklicati izpostavitev te objave?')) return;
    setIsSubmitting(true);
    try {
      await onRemovePromotion(item.id, item.type);
      setFeedback({
        message: 'Izpostavitev je bila uspešno odstranjena.',
        type: 'success',
      });
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setIsSubmitting(false);
      setFeedback({
        message: err.message || 'Napaka pri odstranjevanju promocije.',
        type: 'error',
      });
    }
  };

  const currentPromoStatus = getPromotionTimeRemaining(item.promotion?.promotedUntil || item.promotedUntil);
  const isCurrentlyActive = item.isPromoted && !currentPromoStatus.isExpired;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-surface-container-lowest w-full max-w-2xl rounded-2xl shadow-2xl border border-surface-container flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-container flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-surface-container-low to-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
                <span>Izpostavitev objave na vrhu (PROMO / OGLAS)</span>
              </h2>
              <p className="text-xs text-outline line-clamp-1">
                {item.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            aria-label="Zapri"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">

          {/* Feedback banner */}
          {feedback && (
            <div className={`p-3 rounded-xl flex items-center gap-2 font-semibold ${
              feedback.type === 'success' ? 'bg-secondary/15 text-secondary border border-secondary/30' : 'bg-error/15 text-error border border-error/30'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Current Status if already promoted */}
          {isCurrentlyActive && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <PromotedBadge type={item.promotion?.badgeType || item.promotionBadgeType || 'PROMO'} size="md" />
                <div>
                  <span className="font-bold text-on-surface text-xs block">Objava je trenutno aktivno izpostavljena</span>
                  <span className="text-[11px] text-outline">
                    Veljavnost: <strong className="text-on-surface">{currentPromoStatus.text}</strong>
                    {item.promotion?.promotedUntil && ` (do ${new Date(item.promotion.promotedUntil).toLocaleDateString('sl-SI')})`}
                  </span>
                </div>
              </div>
              {isAdminOrSuper && onRemovePromotion && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isSubmitting}
                  className="px-2.5 py-1 text-xs text-error hover:bg-error/10 border border-error/30 rounded-lg font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Prekliči</span>
                </button>
              )}
            </div>
          )}

          {/* 1. Badge Type Selection ("PROMO" vs "OGLAS") */}
          <div className="space-y-2">
            <label className="font-bold text-on-surface block text-xs">
              1. Izberite tip oznake na vrhu:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label 
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  badgeType === 'PROMO' 
                    ? 'border-amber-500 bg-amber-500/10 shadow-xs' 
                    : 'border-surface-container bg-surface-container-low hover:border-surface-container-high'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="badgeType"
                    checked={badgeType === 'PROMO'}
                    onChange={() => setBadgeType('PROMO')}
                    className="accent-amber-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <PromotedBadge type="PROMO" size="sm" />
                      <span className="font-bold text-xs text-on-surface">PROMO</span>
                    </div>
                    <p className="text-[11px] text-outline mt-0.5">Za posebne ponudbe, dogodke in ugodnosti</p>
                  </div>
                </div>
              </label>

              <label 
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  badgeType === 'OGLAS' 
                    ? 'border-primary bg-primary/10 shadow-xs' 
                    : 'border-surface-container bg-surface-container-low hover:border-surface-container-high'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="badgeType"
                    checked={badgeType === 'OGLAS'}
                    onChange={() => setBadgeType('OGLAS')}
                    className="accent-primary"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <PromotedBadge type="OGLAS" size="sm" />
                      <span className="font-bold text-xs text-on-surface">OGLAS</span>
                    </div>
                    <p className="text-[11px] text-outline mt-0.5">Za plačane male oglase ali sponzorirane objave</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 2. Target Section & Category / Subcategory */}
          <div className="space-y-3 bg-surface-container-low/50 p-3.5 rounded-xl border border-surface-container">
            <label className="font-bold text-on-surface block text-xs flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" />
              <span>2. Ciljanje prikaza (Glavni razdelek, Kategorija, Podkategorija)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Target Section */}
              <div>
                <span className="text-[11px] font-semibold text-outline block mb-1">Glavni razdelek:</span>
                <select
                  value={targetSection}
                  onChange={(e) => {
                    const sec = e.target.value as PromotionTargetSection;
                    setTargetSection(sec);
                    setTargetCategory('all');
                    setTargetSubcategory('all');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container text-xs text-on-surface font-medium focus:border-primary focus:outline-none cursor-pointer"
                >
                  <option value="all">Vsi razdelki (Maksimalen doseg)</option>
                  <option value="ads">Mali oglasi</option>
                  <option value="events">Dogodki</option>
                  <option value="deals">Ugodnosti</option>
                  <option value="blog">Blog &amp; Novice</option>
                </select>
              </div>

              {/* Target Category */}
              <div>
                <span className="text-[11px] font-semibold text-outline block mb-1">Ciljna kategorija:</span>
                <select
                  value={targetCategory}
                  onChange={(e) => {
                    setTargetCategory(e.target.value);
                    setTargetSubcategory('all');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container text-xs text-on-surface font-medium focus:border-primary focus:outline-none cursor-pointer"
                >
                  <option value="all">Vse kategorije v razdelku</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Subcategory */}
              <div>
                <span className="text-[11px] font-semibold text-outline block mb-1">Ciljna podkategorija:</span>
                <select
                  value={targetSubcategory}
                  onChange={(e) => setTargetSubcategory(e.target.value)}
                  disabled={!activeCategoryObj || !activeCategoryObj.subcategories || activeCategoryObj.subcategories.length === 0}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container text-xs text-on-surface font-medium focus:border-primary focus:outline-none cursor-pointer disabled:opacity-50"
                >
                  <option value="all">Vse podkategorije</option>
                  {activeCategoryObj?.subcategories?.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-outline">
              Objava se bo uvrstila na <strong>1. mesto</strong> v vseh izbranih pogledih in filtriranjih.
            </p>
          </div>

          {/* 3. Duration & Expiry Date (Tarifni paket ali Poljuben datum) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-on-surface block text-xs flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" />
                <span>3. Časovno trajanje in datum poteka</span>
              </label>
              <button
                type="button"
                onClick={() => setUseCustomExpiry(!useCustomExpiry)}
                className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
              >
                {useCustomExpiry ? 'Uporabi prednastavljene pakete' : 'Vnesi poljuben datum poteka'}
              </button>
            </div>

            {!useCustomExpiry ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PROMOTION_PRICING_PLANS.map((plan) => (
                  <label
                    key={plan.id}
                    className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all relative ${
                      selectedPlanId === plan.id
                        ? 'border-primary bg-primary/10 shadow-xs'
                        : 'border-surface-container bg-surface-container-lowest hover:border-surface-container-high'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2 right-3 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-secondary text-on-secondary">
                        Priporočeno
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="pricingPlan"
                          checked={selectedPlanId === plan.id}
                          onChange={() => setSelectedPlanId(plan.id)}
                          className="accent-primary"
                        />
                        <span className="font-bold text-xs text-on-surface">{plan.name}</span>
                      </div>
                      <span className="font-black text-xs text-primary">{plan.priceEur.toFixed(2)} €</span>
                    </div>
                    <p className="text-[11px] text-outline mt-1.5 pl-6">{plan.description}</p>
                  </label>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-surface-container bg-surface-container-lowest flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-on-surface block">Točen datum izteka izpostavitve:</span>
                  <span className="text-[11px] text-outline">Objava bo izpostavljena na prvem mestu do konca izbranega dneva.</span>
                </div>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={customExpiryDate}
                  onChange={(e) => setCustomExpiryDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container text-xs font-bold text-on-surface cursor-pointer focus:border-primary focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* 4. Payment & Billing Section */}
          <div className="p-4 rounded-xl border border-surface-container bg-surface-container-low/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-primary" />
                <span>4. Plačilo in znesek storitve</span>
              </span>
              <div className="text-right">
                <span className="text-[11px] text-outline block">Skupaj za plačilo:</span>
                <span className="font-black text-sm text-primary">
                  {paymentMethod === 'admin_waived' ? '0.00 € (Brezplačno skrbnik)' : `${selectedPlan.priceEur.toFixed(2)} € z DDV`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                  paymentMethod === 'card' ? 'border-primary bg-primary text-on-primary font-bold' : 'border-surface-container bg-surface-container-lowest text-on-surface'
                }`}
              >
                Plačilna kartica (Stripe)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('flik')}
                className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                  paymentMethod === 'flik' ? 'border-primary bg-primary text-on-primary font-bold' : 'border-surface-container bg-surface-container-lowest text-on-surface'
                }`}
              >
                Flik / TRR
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('invoice')}
                className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                  paymentMethod === 'invoice' ? 'border-primary bg-primary text-on-primary font-bold' : 'border-surface-container bg-surface-container-lowest text-on-surface'
                }`}
              >
                Po predračunu
              </button>
              {isAdminOrSuper && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('admin_waived')}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                    paymentMethod === 'admin_waived' ? 'border-purple-600 bg-purple-600 text-white font-bold' : 'border-surface-container bg-surface-container-lowest text-purple-700 dark:text-purple-300'
                  }`}
                >
                  Admin dodelitev (0€)
                </button>
              )}
            </div>

            {/* If Card / Stripe is selected, show embedded card form & secure badges */}
            {paymentMethod === 'card' && (
              <div className="p-3.5 rounded-xl border border-primary/20 bg-surface-container-lowest space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-secondary" />
                    <span>Varno Stripe plačilo s kartico</span>
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-outline">
                    <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
                    <span>256-bit SSL / PCI-DSS</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-semibold text-outline block mb-1">
                      Ime in priimek na kartici
                    </label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Janez Novak"
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container text-xs text-on-surface focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-outline block mb-1">
                      Številka kartice (Visa, Mastercard, Maestro)
                    </label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 text-outline absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                          const formatted = val.replace(/(\d{4})/g, '$1 ').trim();
                          setCardNumber(formatted);
                        }}
                        placeholder="•••• •••• •••• ••••"
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container text-xs text-on-surface font-mono focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-outline block mb-1">
                        Veljavnost (MM/LL)
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                          if (val.length > 2) {
                            val = val.slice(0, 2) + '/' + val.slice(2);
                          }
                          setCardExpiry(val);
                        }}
                        placeholder="MM/LL"
                        className="w-full px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container text-xs text-on-surface font-mono focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-outline block mb-1">
                        CVC / CVV
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                        placeholder="•••"
                        className="w-full px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container text-xs text-on-surface font-mono focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-outline flex items-center justify-between border-t border-surface-container pt-2">
                  <span>Zaščiteno z varnostnim protokolom Stripe.</span>
                  <span className="font-bold text-primary">Preverjanje avtentikacije (3D Secure)</span>
                </div>
              </div>
            )}

            {stripeSuccessNote && (
              <div className="p-2.5 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{stripeSuccessNote}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isPaidCheck"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="w-4 h-4 accent-secondary rounded"
              />
              <label htmlFor="isPaidCheck" className="text-xs text-on-surface font-semibold cursor-pointer">
                Plačilo je potrjeno / zabeleženo kot poravnano (omogoča takojšnjo aktivacijo na vrhu)
              </label>
            </div>
          </div>

          {/* Live Preview */}
          <div className="p-3 bg-surface-container-lowest rounded-xl border border-surface-container">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline block mb-2">
              Predogled prikaza na vrhu seznama:
            </span>
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-container-low border border-surface-container">
              <PromotedBadge type={badgeType} size="md" />
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs text-on-surface truncate block">{item.title}</span>
                <span className="text-[10px] text-outline">
                  Ciljanje: {targetSection === 'all' ? 'Vsi razdelki' : targetSection} 
                  {targetCategory !== 'all' ? ` • Kategorija: ${activeCategoryObj?.name || targetCategory}` : ''}
                  {targetSubcategory !== 'all' ? ` • Podkategorija: ${targetSubcategory}` : ''}
                </span>
              </div>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded shrink-0">
                1. Mesto v feedu
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-container bg-surface-container-low/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container text-xs font-semibold transition-colors cursor-pointer"
          >
            Prekliči
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || isProcessingStripe}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isProcessingStripe ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Obdelava Stripe plačila...</span>
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Shranjevanje...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {paymentMethod === 'card' && selectedPlan.priceEur > 0
                      ? `Plačaj ${selectedPlan.priceEur.toFixed(2)} € in aktiviraj`
                      : 'Potrdi in aktiviraj izpostavitev'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
