
const statusIcon = document.getElementById("status-icon");
const statusTitle = document.getElementById("status-title");
const statusText = document.getElementById("status-text");
const statusDetails = document.getElementById("status-details");

const params = new URLSearchParams(window.location.search);
const referenceId =
  params.get("reference_id") ||
  sessionStorage.getItem("nomodDemoReferenceId");

function showStatus(status, message) {
  if (status === "paid") {
    statusIcon.textContent = "✓";
    statusTitle.textContent = "Payment successful";
    statusText.textContent =
      "Nomod confirmed that this checkout is paid.";
    return;
  }

  if (status === "cancelled") {
    statusIcon.textContent = "↩";
    statusTitle.textContent = "Checkout cancelled";
    statusText.textContent =
      "The checkout was cancelled. You can return to the product and try again.";
    return;
  }

  if (status === "expired") {
    statusIcon.textContent = "⌛";
    statusTitle.textContent = "Checkout expired";
    statusText.textContent =
      "This checkout session has expired. Start a new checkout.";
    return;
  }

  statusIcon.textContent = "…";
  statusTitle.textContent = "Payment not confirmed yet";
  statusText.textContent =
    message || "Checking the latest status with Nomod...";
}

async function checkPaymentStatus() {
  if (!referenceId) {
    showStatus("unknown", "No order reference was found. Please start again.");
    return;
  }

  statusDetails.textContent = `Order reference: ${referenceId}`;

  try {
    const response = await fetch(
      `/api/orders/${encodeURIComponent(referenceId)}/status`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || data.error || "Could not verify payment."
      );
    }

    showStatus(data.status, data.message);

    // The session may still be in "created" state.
    // Check again instead of incorrectly showing success.
    if (data.status === "pending") {
      setTimeout(checkPaymentStatus, 3000);
    }
  } catch (error) {
    showStatus("pending", error.message);
    setTimeout(checkPaymentStatus, 5000);
  }
}

checkPaymentStatus();
