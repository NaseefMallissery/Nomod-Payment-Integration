const nomodButton = document.getElementById("buy-button");
const nomodLabel = document.getElementById("button-label");
const stripeButton = document.getElementById("stripe-button");
const stripeLabel = document.getElementById("stripe-label");
const errorMessage = document.getElementById("error-message");

async function loadProduct() {
  try {
    const response = await fetch("/api/product");
    if (!response.ok) throw new Error("Could not load product.");

    const product = await response.json();

    document.getElementById("product-name").textContent = product.name;
    document.getElementById("product-description").textContent =
      product.description;
    document.getElementById("product-price").textContent =
      `${product.currency} ${Number(product.amount).toFixed(2)}`;
    document.getElementById("product-image").src = product.image;
    document.getElementById("product-image").alt = product.name;
  } catch (error) {
    errorMessage.textContent = error.message;
  }
}

function setBusy(activeButton, activeLabel, text) {
  nomodButton.disabled = true;
  stripeButton.disabled = true;
  activeLabel.textContent = text;
  errorMessage.textContent = "";
  return activeButton;
}

function resetButtons() {
  nomodButton.disabled = false;
  stripeButton.disabled = false;
  nomodLabel.textContent = "Pay with Nomod";
  stripeLabel.textContent = "Pay with Stripe";
}

// Shared flow: ask the backend for a checkout, remember it, redirect.
async function startCheckout({ endpoint, provider, button, label }) {
  setBusy(button, label, "Creating checkout...");

  try {
    // The backend sets the product and price.
    const response = await fetch(endpoint, { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not create checkout.");
    }

    if (!data.checkoutUrl || !data.checkoutUrl.startsWith("https://")) {
      throw new Error("The payment provider did not return a valid checkout URL.");
    }

    // Remember the order so the result page can verify it later.
    sessionStorage.setItem("demoReferenceId", data.referenceId);
    sessionStorage.setItem("demoProvider", provider);
    localStorage.setItem("demoCheckoutId", data.checkoutId);

    // Open the real hosted checkout.
    window.location.assign(data.checkoutUrl);
  } catch (error) {
    errorMessage.textContent = error.message;
    resetButtons();
    label.textContent = "Try again";
  }
}

nomodButton.addEventListener("click", () =>
  startCheckout({
    endpoint: "/api/checkout",
    provider: "nomod",
    button: nomodButton,
    label: nomodLabel
  })
);

stripeButton.addEventListener("click", () =>
  startCheckout({
    endpoint: "/api/stripe/checkout",
    provider: "stripe",
    button: stripeButton,
    label: stripeLabel
  })
);

// If the user comes back with the browser's back button, the page may be
// restored from cache with buttons still disabled.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) resetButtons();
});

loadProduct();