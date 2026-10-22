require("dotenv").config();

const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = (
  process.env.BASE_URL || `http://localhost:${PORT}`
).replace(/\/$/, "");

const API_KEY = process.env.NOMOD_API_KEY;
console.log("Key length:", API_KEY?.length, "| starts with:", API_KEY?.slice(0, 8), "| ends with:", API_KEY?.slice(-4));
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

// Demo storage only. Use a database in a real application.
const orders = new Map();

app.get("/api/product", (req, res) => {
  res.json(PRODUCT);
});

// Create a new checkout session.
app.post("/api/checkout", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        error: "Nomod API key is missing from .env"
      });
    }

    const referenceId =
      `demo-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

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
      success_url:
        `${BASE_URL}/success.html?reference_id=${encodeURIComponent(referenceId)}`,
      failure_url:
        `${BASE_URL}/success.html?reference_id=${encodeURIComponent(referenceId)}`,
      cancelled_url:
        `${BASE_URL}/success.html?reference_id=${encodeURIComponent(referenceId)}`,
      metadata: {
        product_id: PRODUCT.id,
        demo: "true"
      }
    };

    const response = await fetch(
      "https://api.nomod.com/v1/checkout",
      {
        method: "POST",
        headers: {
          "X-API-KEY": API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

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

    // Save the checkout ID against our own order reference.
    orders.set(referenceId, {
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
    res.status(500).json({
      error: "Unable to start checkout."
    });
  }
});

// Ask Nomod for the latest checkout status.
app.get("/api/orders/:referenceId/status", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({
        error: "Nomod API key is not configured."
      });
    }

    const order = orders.get(req.params.referenceId);

    if (!order) {
      return res.status(404).json({
        status: "unknown",
        message: "Order not found. The demo server may have restarted."
      });
    }

    const response = await fetch(
      `https://api.nomod.com/v1/checkout/${encodeURIComponent(order.checkoutId)}`,
      {
        headers: {
          "X-API-KEY": API_KEY,
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

    // Nomod documents checkout statuses: created, cancelled, expired, paid.
    const providerStatus =
      typeof data.status === "string"
        ? data.status.toLowerCase()
        : "unknown";

    let status = "pending";

    if (providerStatus === "paid") {
      status = "paid";
    } else if (providerStatus === "cancelled") {
      status = "cancelled";
    } else if (providerStatus === "expired") {
      status = "expired";
    }

    res.json({
      referenceId: order.referenceId,
      status,
      amount: data.amount ?? order.amount,
      currency: data.currency ?? order.currency,
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

app.listen(PORT, () => {
  console.log(`Server running at ${BASE_URL}`);
  if (!API_KEY) {
    console.warn("WARNING: NOMOD_API_KEY is missing in .env");
  }
});