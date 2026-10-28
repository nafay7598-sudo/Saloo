# A2Z Home Delivery Service — Order-Anything Delivery Website

A premium, mobile-first, **zero-dependency static website** for a WhatsApp-based
express delivery service in Hyderabad, Sindh. Customers fill one form, tap
**Submit Order**, and land in WhatsApp with a perfectly formatted order message
addressed to the business number. The site is 100% English and deliberately
compact — only four short sections plus the order form.

---

## 1. Architecture

```
hyderabad-concierge/
├── index.html          # All page sections, semantic markup, inline SVG icons
├── css/
│   └── styles.css      # Design system (tokens, components, responsive, motion)
├── js/
│   └── main.js         # Nav, scroll effects, validation, WhatsApp builder
└── README.md
```

### Why plain HTML/CSS/JS (and not a framework)?

- **Instant loading on mobile data** — the whole site is ~30 KB of code plus one
  font. No build step, no node_modules, no hydration overhead.
- **Free hosting anywhere** — GitHub Pages, Netlify, Vercel or Cloudflare Pages
  all serve these files as-is.
- **No backend needed** — WhatsApp (`wa.me` deep links) acts as the order pipeline,
  so there is no server, database or form backend to maintain or secure.

### Technology choices

| Concern | Choice | Reason |
|---|---|---|
| Styling | Hand-written CSS with design tokens | Full control over the premium look; replaces the need for a Tailwind build |
| Fonts | Plus Jakarta Sans (Google Fonts) + system fallback | Clean modern sans-serif; renders even if the font is blocked |
| Icons | Inline SVG | Crisse on every screen, no icon-font/CDN dependency |
| State | Vanilla JS, `CONFIG` object | One place to change the business number / name |
| Animation | CSS + `IntersectionObserver` | Buttery 60 fps reveals, respects `prefers-reduced-motion` |
| Accessibility | Labels, ARIA, keyboard focus states, semantic landmarks | Screen-reader and keyboard friendly |

### Page structure

1. **Sticky blurred header** — brand, anchor nav, mobile hamburger, Order CTA.
2. **Hero** — bold English headline, trust points, mock WhatsApp order card.
3. **How it Works (compact)** — single row of 3 numbered mini-steps with arrow
   connectors on desktop; stacked on mobile (form → WhatsApp confirmation → delivery).
4. **Why Us** — no markup, fast turnaround, full city coverage, cash on delivery.
5. **Order form** — the conversion core, with inline validation.
6. **Footer** + **floating WhatsApp button** (pulse ring, safe-area aware).

> The category grid and FAQ sections were intentionally removed to keep the page
> short on mobile.

---

## 2. The WhatsApp order flow

```
Customer fills form
        │
        ▼
main.js validates (name, PK mobile pattern, area, address, list)
        │
        ▼
buildOrderMessage() → multi-line text with *bold* labels
        │
        ▼
encodeURIComponent() → https://wa.me/923243918789?text=...
        │
        ▼
window.open() launches WhatsApp (app on mobile, Web on desktop)
        │
        ▼
Customer sends → delivery charge negotiated in chat → order fulfilled
```

Example of the message the customer sees (line breaks preserved):

```
🛍️ NEW ORDER — A2Z Home Delivery Service

👤 Name: Ali Khan
📱 Mobile: 03001234567
📍 Area: Latifabad
🏠 Delivery Address: House 12, Street 4, Unit 7

📝 Order Details:
1. 2kg basmati rice
2. 1 litre cooking oil

Please confirm the delivery charge for this order.
```

### Change the business number / name

Everything lives in one place — `js/main.js`:

```js
const CONFIG = {
  WHATSAPP_NUMBER: "923243918789", // digits only, country code first (92...)
  BUSINESS_NAME: "A2Z Home Delivery Service",
};
```

To edit the area dropdown, update the `<select id="area">` options in `index.html`.

### Validation rules

- **Mobile** accepts `03XXXXXXXXX`, `+923XXXXXXXXX` or `923XXXXXXXXX`.
- All five fields are required; errors appear inline under the field and clear
  as the customer types. The first invalid field receives focus automatically.

---

## 3. Smart reordering (localStorage)

Returning customers get a one-tap reorder flow — no backend required.

- **What is stored:** only the four identity fields (`name`, `mobile`, `area`,
  `address`) under the key `a2z_customer_profile`. The order-details textarea
  is intentionally never persisted — every order has a new item list.
- **When it saves:** on every successfully validated submit, right before the
  WhatsApp link is opened. Re-locking via the banner button also saves edits.
- **On return:** the profile is pre-filled, the four fields render in a locked
  state (`readonly` on inputs, `disabled` on the `<select>`, `.is-locked`
  styling), and an emerald banner reads *"Welcome back! Your details are
  pre-filled."* with an **Edit Details** toggle that switches to
  **Lock Details** while editing.
- **Safety:** all storage calls are wrapped in `try/catch`, so private-mode or
  quota failures silently degrade to the normal first-time form. A stored area
  is only restored if that option still exists in the dropdown.
- The validation and WhatsApp engine are untouched — locked controls are read
  via their `.value` properties, and the Pakistani mobile regex still gates
  every submit.

---

## 4. Local development

No install step. Either open `index.html` directly, or run a tiny static server:

```bash
# Python (already installed on most machines)
cd hyderabad-concierge
python3 -m http.server 8000
# then visit http://localhost:8000
```

---

## 5. Free hosting (pick one)

### Option A — Netlify Drop (fastest, ~2 minutes)

1. Go to <https://app.netlify.com/drop>.
2. Drag the `hyderabad-concierge` folder onto the page.
3. You get a live URL instantly. Rename it under **Site settings → Change site name**
   (e.g. `hyderabad-concierge.netlify.app`).
4. Free HTTPS is automatic.

### Option B — GitHub Pages (best for version history)

1. Create a new GitHub repository and upload the three files/folders
   (`index.html`, `css/`, `js/`) at the repository root.
2. Repository **Settings → Pages → Source: Deploy from a branch → `main` / root**.
3. Site goes live at `https://<username>.github.io/<repo>/` within a minute.

### Option C — Vercel or Cloudflare Pages

- Import the GitHub repo; leave build command **empty** and output directory
  **`.` (root)**. Both give free HTTPS and global CDN.

### Custom domain

Buy a `.com` / `.pk` domain (e.g. from Namecheap or a Pakistani registrar such as
HostNoc/PKDOM), then point it at Netlify/Pages in their DNS settings — free SSL is
issued automatically. A short domain also works beautifully printed on flyers and
rider cards.

---

## 6. Going further (optional, later)

- **WhatsApp Business app** — set the number `+92 324 3918789` up with a business
  profile, catalog, auto-greeting and away message.
- **Click tracking** — add `?utm_source=website` style params or a Plausible/
  Cloudflare Web Analytics snippet (privacy-friendly, no cookie banner needed).
- **OG image** — add a branded 1200×630 share image and reference it with
  `<meta property="og:image">` so links shared in WhatsApp show a preview card.
- **PWA** — add a `manifest.json` + service worker so repeat customers get an
  "Add to Home Screen" icon and offline shell.
- **When orders outgrow chat** — migrate to a form backend (Formspree) or a
  lightweight dashboard (Supabase) while keeping the same UI.
