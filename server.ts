import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Lazy-initialize Stripe client
  let stripeClient: any = null;
  async function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return null;
    }
    if (!stripeClient) {
      const Stripe = (await import("stripe")).default;
      stripeClient = new Stripe(key, { apiVersion: "2023-10-16" as any });
    }
    return stripeClient;
  }

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Stripe config status check (returns publishable key if configured)
  app.get("/api/stripe/config", (req, res) => {
    const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || "";
    const hasSecretKey = Boolean(process.env.STRIPE_SECRET_KEY);
    res.json({
      configured: hasSecretKey,
      publishableKey,
    });
  });

  // Create Stripe Checkout Session or Payment Intent for post promotion
  app.post("/api/stripe/create-payment-intent", async (req, res) => {
    try {
      const {
        amountEur,
        itemId,
        itemType,
        itemTitle,
        planId,
        badgeType,
        targetSection,
        userEmail,
        userId,
      } = req.body;

      if (!amountEur || amountEur <= 0) {
        return res.status(400).json({ error: "Neveljaven znesek plačila." });
      }

      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        // Mock / simulation mode when Stripe secret key has not been configured in Secrets yet
        const simulatedPaymentIntentId = `pi_sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        return res.json({
          simulated: true,
          clientSecret: `${simulatedPaymentIntentId}_secret_simulated`,
          paymentIntentId: simulatedPaymentIntentId,
          amountEur,
          currency: "eur",
          message: "Stripe testna simulacija (STRIPE_SECRET_KEY ni nastavljen v .env).",
        });
      }

      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(key, { apiVersion: "2023-10-16" as any });

      const amountCents = Math.round(Number(amountEur) * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "eur",
        automatic_payment_methods: { enabled: true },
        description: `Izpostavitev (${badgeType || "PROMO"}) za: ${itemTitle || itemId}`,
        receipt_email: userEmail || undefined,
        metadata: {
          itemId: String(itemId || ""),
          itemType: String(itemType || ""),
          itemTitle: String((itemTitle || "").substring(0, 100)),
          planId: String(planId || ""),
          badgeType: String(badgeType || "PROMO"),
          targetSection: String(targetSection || "all"),
          userId: String(userId || ""),
        },
      });

      res.json({
        simulated: false,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amountEur,
        currency: "eur",
      });
    } catch (err: any) {
      console.error("Stripe error creating payment intent:", err);
      res.status(500).json({
        error: err.message || "Prišlo je do napake pri vzpostavitvi Stripe plačila.",
      });
    }
  });

  // Verify payment status
  app.post("/api/stripe/verify-payment", async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      if (!paymentIntentId) {
        return res.status(400).json({ error: "Manjka paymentIntentId." });
      }

      // If simulated
      if (paymentIntentId.startsWith("pi_sim_")) {
        return res.json({
          status: "succeeded",
          paid: true,
          simulated: true,
        });
      }

      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        return res.status(500).json({ error: "STRIPE_SECRET_KEY ni nastavljen." });
      }

      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(key, { apiVersion: "2023-10-16" as any });

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const isPaid = paymentIntent.status === "succeeded";

      res.json({
        status: paymentIntent.status,
        paid: isPaid,
        amountReceived: paymentIntent.amount_received ? paymentIntent.amount_received / 100 : 0,
        currency: paymentIntent.currency,
      });
    } catch (err: any) {
      console.error("Stripe verification error:", err);
      res.status(500).json({
        error: err.message || "Napaka pri preverjanju plačila.",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
