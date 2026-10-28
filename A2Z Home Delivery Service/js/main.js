/* ============================================================
   A2Z Home Delivery Service — main.js
   Mobile nav · scroll effects · form validation · WhatsApp
   ============================================================ */

"use strict";

/* ---------- Single source of configuration ---------- */
const CONFIG = {
  // International format, digits only (country code 92 + 3243918789)
  WHATSAPP_NUMBER: "923243918789",
  BUSINESS_NAME: "A2Z Home Delivery Service",
};

/* ---------- LocalStorage engine (smart reordering) ----------
   Only the four identity fields persist — the order-details
   textarea stays free-text for every new order. */
const STORAGE_KEY = "a2z_customer_profile";
const LOCKABLE_KEYS = ["name", "mobile", "area", "address"];

function loadCustomerProfile() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null; // private mode / corrupted entry → behave as a first-time visitor
  }
}

function saveCustomerProfile(profile) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    /* storage unavailable (private mode / quota) — ordering still works */
  }
}

/* Read the four persisted fields straight from the form */
function readProfile(fields) {
  return {
    name: fields.name.el.value.trim(),
    mobile: normalizeMobile(fields.mobile.el.value),
    area: fields.area.el.value,
    address: fields.address.el.value.trim(),
  };
}

/* <select> has no readonly — use disabled there, readonly on inputs */
function setFieldsLocked(fields, isLocked) {
  LOCKABLE_KEYS.forEach((key) => {
    const el = fields[key].el;
    if (el.tagName === "SELECT") {
      el.disabled = isLocked;
    } else {
      el.readOnly = isLocked;
    }
    el.closest(".field").classList.toggle("is-locked", isLocked);
  });
}

function optionExists(select, value) {
  return Array.from(select.options).some((option) => option.value === value);
}

/* Build a generic wa.me link (used by floating button + footer) */
function buildWhatsAppUrl(message) {
  return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initMobileNav();
  initRevealOnScroll();
  initOrderForm();
  initWhatsAppLinks();
  initYear();
});

/* ---------- Sticky header shadow on scroll ---------- */
function initHeader() {
  const header = document.getElementById("siteHeader");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---------- Mobile navigation ---------- */
function initMobileNav() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  // Close the menu after tapping a link
  nav.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );
}

/* ---------- Elegant reveal-on-scroll ---------- */
function initRevealOnScroll() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  items.forEach((el) => observer.observe(el));
}

/* ---------- Order form → WhatsApp ---------- */
function initOrderForm() {
  const form = document.getElementById("orderForm");
  const fields = {
    name:    { el: document.getElementById("customerName"), err: document.getElementById("err-name") },
    mobile:  { el: document.getElementById("mobile"),       err: document.getElementById("err-mobile") },
    area:    { el: document.getElementById("area"),         err: document.getElementById("err-area") },
    address: { el: document.getElementById("address"),      err: document.getElementById("err-address") },
    details: { el: document.getElementById("details"),      err: document.getElementById("err-details") },
  };

  // Clear an error state as soon as the customer fixes the field
  Object.values(fields).forEach(({ el }) =>
    el.addEventListener("input", () => clearError(el))
  );

  /* ----- LocalStorage: prefill + lock returning customers ----- */
  const banner = document.getElementById("savedBanner");
  const editBtn = document.getElementById("editDetailsBtn");
  const btnLabel = editBtn.querySelector(".btn-label");
  let locked = false;

  const stored = loadCustomerProfile();
  if (stored) {
    if (stored.name) fields.name.el.value = stored.name;
    if (stored.mobile) fields.mobile.el.value = stored.mobile;
    // Only restore the area if that option still exists in the dropdown
    if (stored.area && optionExists(fields.area.el, stored.area)) {
      fields.area.el.value = stored.area;
    }
    if (stored.address) fields.address.el.value = stored.address;

    banner.hidden = false;
    locked = true;
    setFieldsLocked(fields, true);
    editBtn.setAttribute("aria-pressed", "false");
    btnLabel.textContent = "Edit Details";
  }

  editBtn.addEventListener("click", () => {
    if (locked) {
      // Unlock the identity fields for editing
      locked = false;
      setFieldsLocked(fields, false);
      editBtn.setAttribute("aria-pressed", "true");
      btnLabel.textContent = "Lock Details";
      fields.name.el.focus();
      return;
    }

    // Re-lock and persist any edits (only a complete profile is stored)
    const current = readProfile(fields);
    if (current.name && current.mobile && current.area && current.address) {
      saveCustomerProfile(current);
    }
    locked = true;
    setFieldsLocked(fields, true);
    editBtn.setAttribute("aria-pressed", "false");
    btnLabel.textContent = "Edit Details";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const values = {
      name:    fields.name.el.value.trim(),
      mobile:  normalizeMobile(fields.mobile.el.value),
      area:    fields.area.el.value,
      address: fields.address.el.value.trim(),
      details: fields.details.el.value.trim(),
    };

    // Reset previous errors
    Object.values(fields).forEach(({ el }) => clearError(el));

    const errors = validate(values);
    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([key, message]) =>
        showError(fields[key].el, fields[key].err, message)
      );
      // Focus the first invalid field for keyboard users
      const firstKey = Object.keys(errors)[0];
      fields[firstKey].el.focus();
      return;
    }

    // Persist identity fields for smart reordering (order list is never stored)
    saveCustomerProfile({
      name: values.name,
      mobile: values.mobile,
      area: values.area,
      address: values.address,
    });

    // First-time customers: the profile is now saved — reflect that in the UI
    if (banner.hidden) {
      banner.hidden = false;
      locked = true;
      setFieldsLocked(fields, true);
      editBtn.setAttribute("aria-pressed", "false");
      btnLabel.textContent = "Edit Details";
    }

    const message = buildOrderMessage(values);
    const url = buildWhatsAppUrl(message);

    // On mobile this launches the WhatsApp app; new tab keeps the site open
    const chatWindow = window.open(url, "_blank", "noopener");
    if (!chatWindow) window.location.href = url;
  });
}

/* ---------- Validation ---------- */
function validate(v) {
  const errors = {};

  if (v.name.length < 2) {
    errors.name = "Please enter your full name.";
  }

  // Accepts 03XXXXXXXXX, +923XXXXXXXXX or 923XXXXXXXXX
  const mobilePattern = /^(\+?92|0)3\d{9}$/;
  if (!mobilePattern.test(v.mobile.replace(/[\s-]/g, ""))) {
    errors.mobile = "Enter a valid Pakistani mobile number, e.g. 03001234567.";
  }

  if (!v.area) {
    errors.area = "Please select your neighbourhood.";
  }

  if (v.address.length < 8) {
    errors.address = "Please enter a complete delivery address with a landmark.";
  }

  if (v.details.length < 5) {
    errors.details = "Please list at least one item you want delivered.";
  }

  return errors;
}

function normalizeMobile(value) {
  return value.replace(/[\s-]/g, "").trim();
}

function showError(input, errorEl, message) {
  input.closest(".field").classList.add("invalid");
  input.setAttribute("aria-invalid", "true");
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError(input) {
  const field = input.closest(".field");
  field.classList.remove("invalid");
  input.removeAttribute("aria-invalid");
  const errorEl = field.querySelector(".field-error");
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.hidden = true;
  }
}

/* ---------- The WhatsApp order message ----------
   WhatsApp supports *bold* and _italic_. Line breaks
   are preserved because the whole string is passed
   through encodeURIComponent in buildWhatsAppUrl(). */
function buildOrderMessage(v) {
  return [
    "*🛍️ NEW ORDER — A2Z Home Delivery Service*",
    "",
    `*👤 Name:* ${v.name}`,
    `*📱 Mobile:* ${v.mobile}`,
    `*📍 Area:* ${v.area}`,
    `*🏠 Delivery Address:* ${v.address}`,
    "",
    "*📝 Order Details:*",
    v.details,
    "",
    "_Please confirm the delivery charge for this order._",
  ].join("\n");
}

/* ---------- Floating button & footer chat links ---------- */
function initWhatsAppLinks() {
  const greeting =
    "Hello! I want to place an order with A2Z Home Delivery Service.";
  const url = buildWhatsAppUrl(greeting);

  document.querySelectorAll("#fabWhatsApp, #footerWhatsApp").forEach((link) => {
    link.href = url;
  });
}

/* ---------- Footer year ---------- */
function initYear() {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}
