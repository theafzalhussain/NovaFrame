/**
 * Razorpay Checkout loader + typed helper.
 * The Checkout script is loaded lazily, only when the visitor is about to pay.
 */

export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number; // paise
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string; backdrop_color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void; confirm_close?: boolean; escape?: boolean };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, cb: (payload: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let scriptPromise: Promise<boolean> | null = null;

/** Loads the Razorpay Checkout script once; resolves true when ready. */
export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      scriptPromise = null; // allow a retry
      script.remove();
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

export type CheckoutResult =
  | { status: "success"; response: RazorpaySuccess }
  /** The visitor closed the window. `error` holds the last failed attempt's reason, if any. */
  | { status: "dismissed"; error?: string };

/**
 * Opens Razorpay Checkout. A failed attempt keeps the window open so the customer can retry
 * with another method, so we only settle on success or when the window is closed.
 */
export function openCheckout(options: Omit<RazorpayOptions, "handler" | "modal">): Promise<CheckoutResult> {
  return new Promise((resolve) => {
    if (!window.Razorpay) {
      resolve({ status: "dismissed", error: "The secure payment window couldn't be opened." });
      return;
    }
    let settled = false;
    let lastError: string | undefined;
    const done = (result: CheckoutResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const rzp = new window.Razorpay({
      ...options,
      handler: (response) => done({ status: "success", response }),
      modal: {
        confirm_close: true,
        ondismiss: () => done({ status: "dismissed", error: lastError }),
      },
    });
    rzp.on("payment.failed", (payload) => {
      const error = (payload as { error?: { description?: string } } | undefined)?.error;
      lastError = error?.description || "The payment was declined by the bank.";
    });
    rzp.open();
  });
}
