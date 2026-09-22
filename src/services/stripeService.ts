import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

export async function getStripeClient(): Promise<Stripe | null> {
  if (!stripePromise) {
    // Check client env variable or fetch from backend endpoint
    const clientKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (clientKey) {
      stripePromise = loadStripe(clientKey);
    } else {
      try {
        const res = await fetch('/api/stripe/config');
        if (res.ok) {
          const data = await res.json();
          if (data.publishableKey) {
            stripePromise = loadStripe(data.publishableKey);
          } else {
            stripePromise = Promise.resolve(null);
          }
        } else {
          stripePromise = Promise.resolve(null);
        }
      } catch (err) {
        console.warn('Failed to retrieve Stripe config from backend:', err);
        stripePromise = Promise.resolve(null);
      }
    }
  }
  return stripePromise;
}

export interface CreatePaymentIntentParams {
  amountEur: number;
  itemId: string;
  itemType: string;
  itemTitle: string;
  planId: string;
  badgeType: string;
  targetSection: string;
  userEmail?: string;
  userId?: string;
}

export interface PaymentIntentResult {
  simulated: boolean;
  clientSecret: string;
  paymentIntentId: string;
  amountEur: number;
  currency: string;
  message?: string;
}

export async function createPromotionPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<PaymentIntentResult> {
  const response = await fetch('/api/stripe/create-payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Napaka strežnika (${response.status}) pri inicializaciji plačila.`);
  }

  return response.json();
}

export async function verifyPromotionPayment(paymentIntentId: string): Promise<{
  status: string;
  paid: boolean;
  simulated?: boolean;
}> {
  const response = await fetch('/api/stripe/verify-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentIntentId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Napaka pri preverjanju Stripe plačila.');
  }

  return response.json();
}
