require("dotenv").config();

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const Stripe = require("stripe");

const app = express();
const PORT = process.env.PORT || 3000;

// Public address of your site. On Vercel set BASE_URL in
// Project Settings > Environment Variables, e.g.
// https://nomod-payment-integration.vercel.app  (no trailing slash)
const BASE_URL = (
  process.env.BASE_URL || `http://localhost:${PORT}`
).replace(/\/$/, "");

// ---- Provider keys -------------------------------------------------------
const NOMOD_API_KEY =
  process.env.NOMOD_API_KEY || process.env.NOMOD_HOSTED_CHECKOUT_API_KEY;

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Demo product. The server controls the price.
const PRODUCT = {
  id: "demo-mug",
  name: "Minimal Ceramic Mug",
  description: "A simple everyday mug.",
  amount: "10.00",
  currency: "AED",
  image:
    "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1000&q=85"
};

// Convert "1.00" -> 100 (Stripe wants the smallest currency unit).
// AED has 2 decimals, so this is correct for AED/USD/EUR etc.
function toMinorUnits(amount) {
  return Math.round(Number(amount) * 100);
}

// Demo storage only. On serverless hosts (Vercel) this can be empty on the
// next request, so the status routes also accept the checkout/session id
// from the browser.
const orders = new Map();

app.get("/api/product", (req, res) => {
  res.json(PRODUCT);
});

// ===========================================================================
// NOMOD
// ===========================================================================

// Create a new Nomod checkout session.
app.post("/api/checkout", async (req, res) => {
  try {
    if (!NOMOD_API_KEY) {
      return res.status(500).json({
        error: "Nomod API key is missing from the environment variables"
      });
    }

    const referenceId =
      `demo-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    // All three outcomes return to success.html, which asks the backend
    // for the real status. BASE_URL must be your public address.
    const returnUrl =
      `${BASE_URL}/success.html?provider=nomod` +
      `&reference_id=${encodeURIComponent(referenceId)}`;

    const payload = {
      reference_id: referenceId,
      amount: PRODUCT.amount,
      currency: PRODUCT.currency,
      items: [
        {
          item_id: PRODUCT.id,
          name: PRODUCT.name,
          quantity: 1,
          unit_amount: PRODUCT.amount,
          discount_type: "flat",
          discount_amount: "0.00",
          total_amount: PRODUCT.amount,
          net_amount: PRODUCT.amount
        }
      ],
      success_url: returnUrl,
      failure_url: returnUrl,
      cancelled_url: returnUrl,
      metadata: {
        product_id: PRODUCT.id,
        demo: "true"
      }
    };

    const response = await fetch("https://api.nomod.com/v1/checkout", {
      method: "POST",
      headers: {
        "X-API-KEY": NOMOD_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Nomod error:", response.status, data);
      return res.status(502).json({
        error:
          data?.error?.message ||
          data?.message ||
          "Nomod could not create the checkout session.",
        details: data
      });
    }

    if (!data.id || !data.url) {
      return res.status(502).json({
        error: "Nomod did not return a checkout ID and URL."
      });
    }

    orders.set(referenceId, {
      provider: "nomod",
      referenceId,
      checkoutId: data.id,
      amount: PRODUCT.amount,
      currency: PRODUCT.currency
    });

    res.status(201).json({
      referenceId,
      checkoutId: data.id,
      checkoutUrl: data.url,
      amount: data.amount ?? PRODUCT.amount,
      currency: data.currency ?? PRODUCT.currency,
      status: data.status ?? "created"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to start checkout." });
  }
});

// Ask Nomod for the latest checkout status.
app.get("/api/orders/:referenceId/status", async (req, res) => {
  try {
    if (!NOMOD_API_KEY) {
      return res.status(500).json({
        error: "Nomod API key is not configured."
      });
    }

    const referenceId = req.params.referenceId;
    const order = orders.get(referenceId);
    const checkoutId = order?.checkoutId || req.query.checkoutId;

    if (!checkoutId) {
      return res.status(404).json({
        status: "unknown",
        message: "Order not found. Please start a new checkout."
      });
    }

    const response = await fetch(
      `https://api.nomod.com/v1/checkout/${encodeURIComponent(checkoutId)}`,
      {
        headers: {
          "X-API-KEY": NOMOD_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Nomod status error:", response.status, data);
      return res.status(502).json({
        status: "pending",
        message: "Could not verify with Nomod yet."
      });
    }

    // Nomod checkout statuses: created, cancelled, expired, paid.
    const providerStatus =
      typeof data.status === "string" ? data.status.toLowerCase() : "unknown";

    let status = "pending";
    if (providerStatus === "paid") status = "paid";
    else if (providerStatus === "cancelled") status = "cancelled";
    else if (providerStatus === "expired") status = "expired";

    res.json({
      referenceId,
      status,
      amount: data.amount ?? PRODUCT.amount,
      currency: data.currency ?? PRODUCT.currency,
      providerStatus,
      verifiedByBackend: true
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "pending",
      message: "Could not check payment status."
    });
  }
});

// ===========================================================================
// STRIPE
// ===========================================================================

// Create a new Stripe Checkout Session (hosted by Stripe).
app.post("/api/stripe/checkout", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        error: "Stripe secret key is missing from the environment variables"
      });
    }

    const referenceId =
      `demo-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: referenceId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: PRODUCT.currency.toLowerCase(),
            unit_amount: toMinorUnits(PRODUCT.amount),
            product_data: {
              name: PRODUCT.name,
              description: PRODUCT.description,
              images: [PRODUCT.image]
            }
          }
        }
      ],
      // {CHECKOUT_SESSION_ID} is replaced by Stripe with the real session id.
      success_url:
        `${BASE_URL}/success.html?provider=stripe` +
        `&reference_id=${encodeURIComponent(referenceId)}` +
        `&session_id={CHECKOUT_SESSION_ID}`,
      // Stripe has no placeholder on cancel_url, so the browser supplies the
      // session id it saved before redirecting.
      cancel_url:
        `${BASE_URL}/success.html?provider=stripe` +
        `&reference_id=${encodeURIComponent(referenceId)}&cancelled=1`,
      metadata: {
        product_id: PRODUCT.id,
        reference_id: referenceId,
        demo: "true"
      }
    });

    if (!session.id || !session.url) {
      return res.status(502).json({
        error: "Stripe did not return a checkout ID and URL."
      });
    }

    orders.set(referenceId, {
      provider: "stripe",
      referenceId,
      checkoutId: session.id,
      amount: PRODUCT.amount,
      currency: PRODUCT.currency
    });

    res.status(201).json({
      referenceId,
      checkoutId: session.id,
      checkoutUrl: session.url,
      amount: PRODUCT.amount,
      currency: PRODUCT.currency,
      status: session.status ?? "open"
    });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(502).json({
      error: error?.message || "Stripe could not create the checkout session."
    });
  }
});

// Ask Stripe for the latest Checkout Session status.
app.get("/api/stripe/orders/:referenceId/status", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        error: "Stripe secret key is not configured."
      });
    }

    const referenceId = req.params.referenceId;
    const order = orders.get(referenceId);
    const sessionId = order?.checkoutId || req.query.checkoutId;
    const cancelledByUser = req.query.cancelled === "1";

    if (!sessionId || typeof sessionId !== "string") {
      return res.status(404).json({
        status: "unknown",
        message: "Order not found. Please start a new checkout."
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Make sure this session really belongs to the reference in the URL.
    if (
      session.client_reference_id &&
      session.client_reference_id !== referenceId
    ) {
      return res.status(404).json({
        status: "unknown",
        message: "Order not found. Please start a new checkout."
      });
    }

    // Stripe: session.status = open | complete | expired
    //         session.payment_status = paid | unpaid | no_payment_required
    let status = "pending";
    if (
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required"
    ) {
      status = "paid";
    } else if (session.status === "expired") {
      status = "expired";
    } else if (session.status === "open" && cancelledByUser) {
      // User clicked "back" on Stripe's page; the session is still open.
      status = "cancelled";
    }

    res.json({
      referenceId,
      status,
      amount: session.amount_total != null
        ? (session.amount_total / 100).toFixed(2)
        : PRODUCT.amount,
      currency: (session.currency || PRODUCT.currency).toUpperCase(),
      providerStatus: `${session.status}/${session.payment_status}`,
      verifiedByBackend: true
    });
  } catch (error) {
    console.error("Stripe status error:", error);
    res.status(502).json({
      status: "pending",
      message: "Could not verify with Stripe yet."
    });
  }
});

// Vercel imports the app; locally we start the server ourselves.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at ${BASE_URL}`);
    if (!NOMOD_API_KEY) console.warn("WARNING: Nomod API key is missing");
    if (!STRIPE_SECRET_KEY) console.warn("WARNING: STRIPE_SECRET_KEY is missing");
  });
}

module.exports = app;