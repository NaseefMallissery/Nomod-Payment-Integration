const buyButton = document.getElementById("buy-button");
const buttonLabel = document.getElementById("button-label");
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

buyButton.addEventListener("click", async () => {
  buyButton.disabled = true;
  buttonLabel.textContent = "Creating checkout...";
  errorMessage.textContent = "";

  try {
    // The backend sets the product and price.
    const response = await fetch("/api/checkout", { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not create checkout.");
    }

    if (!data.checkoutUrl || !data.checkoutUrl.startsWith("https://")) {
      throw new Error("Nomod did not return a valid checkout URL.");
    }

    // Remember the order so the success page can verify it later.
    sessionStorage.setItem("nomodDemoReferenceId", data.referenceId);
    localStorage.setItem("nomodDemoCheckoutId", data.checkoutId);

    // Open the real Nomod-hosted checkout.
    window.location.assign(data.checkoutUrl);
  } catch (error) {
    errorMessage.textContent = error.message;
    buyButton.disabled = false;
    buttonLabel.textContent = "Try again";
  }
});

loadProduct();