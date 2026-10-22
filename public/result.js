const statusTitle = document.getElementById("status-title");
const statusText = document.getElementById("status-text");
const statusNote = document.getElementById("status-note");
const statusDetails = document.getElementById("status-details");

const params = new URLSearchParams(window.location.search);
const referenceId =
  params.get("reference_id") ||
  sessionStorage.getItem("nomodDemoReferenceId");

const STATES = {
  paid: {
    title: "All done, thank you very much!",
    text: "Your payment was successful and confirmed by Nomod.",
    note: "A receipt will be sent to the email you entered at checkout."
  },
  cancelled: {
    title: "Checkout cancelled",
    text: "No payment was taken.",
    note: "You can go back to the shop and try again whenever you like."
  },
  expired: {
    title: "Checkout expired",
    text: "This checkout session is no longer valid.",
    note: "Please start a new checkout from the shop."
  },
  pending: {
    title: "Checking your payment…",
    text: "Hang tight while we confirm the latest status with Nomod.",
    note: "This page updates automatically. Please don't close it."
  },
  unknown: {
    title: "We couldn't find this order",
    text: "Something went wrong while looking up your payment.",
    note: "If you were charged, please contact the store with your order reference."
  }
};

function showStatus(status, message, amountText) {
  const s = STATES[status] || STATES.pending;
  document.body.dataset.state = STATES[status] ? status : "pending";

  statusTitle.textContent = s.title;
  statusText.textContent =
    status === "pending" || status === "unknown"
      ? message || s.text
      : s.text;
  statusNote.textContent = s.note;

  if (referenceId) {
    statusDetails.textContent =
      `Order reference: ${referenceId}` +
      (amountText ? ` · ${amountText}` : "");
  }
}

async function checkPaymentStatus() {
  if (!referenceId) {
    showStatus("unknown", "No order reference was found. Please start again.");
    return;
  }

  const checkoutId = localStorage.getItem("nomodDemoCheckoutId") || "";

  try {
    const response = await fetch(
      `/api/orders/${encodeURIComponent(referenceId)}/status` +
        `?checkoutId=${encodeURIComponent(checkoutId)}`
    );

    const data = await response.json();

    if (!response.ok) {
      // Order truly unknown: stop retrying and show the message.
      if (response.status === 404) {
        showStatus("unknown", data.message);
        return;
      }
      throw new Error(data.message || data.error || "Could not verify payment.");
    }

    const amountText =
      data.amount && data.currency
        ? `${data.currency} ${Number(data.amount).toFixed(2)}`
        : "";

    showStatus(data.status, data.message, amountText);

    // Still "created"? Check again instead of showing success too early.
    if (data.status === "pending") {
      setTimeout(checkPaymentStatus, 3000);
    }
  } catch (error) {
    showStatus("pending", error.message);
    setTimeout(checkPaymentStatus, 5000);
  }
}

checkPaymentStatus();