# Pitch-Ready Phase 1 Frontend Architecture & Plan: SCHNAP Electric Products
*A Decoupled, Zero-Access B2B Storefront Prototype for https://www.schnap.com.au/*

## 1. Pitch Context & Zero-Access Constraints

This plan is tailored specifically for **pitching a modernized frontend directly to the stakeholders at [SCHNAP Electric Products](https://www.schnap.com.au/)**. 

Because you do not have administrative access, server access, or code deployment rights on their existing infrastructure, the prototype must satisfy strict real-world demonstration constraints:

| Constraint | Pitch Strategy & Guardrail |
| :--- | :--- |
| **No Access to CS-Cart Backend** | You cannot modify CS-Cart PHP files, install addons, or alter database tables on their server. The frontend must interact exclusively with existing public HTTP endpoints and native [CS-Cart dispatch controller routes](https://docs.cs-cart.com/latest/developer_guide/core/controllers/index.html). |
| **No Server-Side CORS Control** | SCHNAP’s server does not emit `Access-Control-Allow-Origin` headers for third-party domains. Direct browser `fetch()` calls across domains will be blocked by CORS unless handled via a transparent Edge Proxy or native form dispatch. |
| **100% Static HTML + Vanilla JS** | No database, no local backend persistence, and no heavy runtime framework. Pure static HTML and ES modules that run directly in any browser and deploy to static hosts (GitHub Pages, Cloudflare Pages, Netlify). |
| **Direct Hotlinking of Real Assets** | 100% of product photos, brand logos, and media are referenced directly from SCHNAP’s live [CloudFront Media CDN (`d35gtgjy55l0bn.cloudfront.net`)](https://d35gtgjy55l0bn.cloudfront.net/images/logos/169/schnap.png) and theme assets ([SCHNAP Theme Media](https://www.schnap.com.au/design/themes/schnap_theme/media/images/hero-banner.webp))—proving to the client that their existing catalog media works out-of-the-box with zero image re-uploading. |
| **Backend Bottleneck Insulation** | CS-Cart backend response times on complex dispatches can be slow. The pitch UI uses deterministic CSS skeletons, optimistic UI updates, and an in-memory/session cache so the demo feels instant and rock-solid during your live presentation. |

---

## 2. Zero-Access Cross-Domain Architecture & Demo Strategies

To demonstrate live functionality without touching their server, the prototype utilizes two pitch-proven proxy and bridge patterns:

```
+-----------------------------------------------------------------------------------+
|                           YOUR PITCH DOMAIN (Static)                              |
|   index.html | category.html | search.html | product.html | cart.html | checkout  |
+-----------------------------------------------------------------------------------+
                                   |
                +------------------+------------------+
                |                                     |
    [Approach A: Live Edge Proxy]          [Approach B: Native Form Handoff]
     Cloudflare Worker / Reverse Proxy       Direct CS-Cart POST Form Action
 (Injects CORS, Proxies Cookies & AJAX)   (Transfers Cart Directly to Real Site)
                |                                     |
                +------------------+------------------+
                                   |
                                   v
             +---------------------------------------------+
             |       SCHNAP CS-Cart Live Production        |
             |        https://www.schnap.com.au/           |
             |  index.php?dispatch=... & CloudFront CDN    |
             +---------------------------------------------+
```

### Approach A: The Transparent Edge Gateway (Recommended for Live Demo)
Deploy your static frontend on **Cloudflare Pages** (or Netlify) paired with a lightweight **Cloudflare Worker** (under 40 lines of code) mapped to `/api/*`:
- When your JS requests `/api/index.php?dispatch=products.search&q=rcbo&is_ajax=1`, the Worker forwards the request to `https://www.schnap.com.au/index.php?...`.
- The Worker injects `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Credentials: true`.
- The Worker rewrites the cookie domain on `sid_customer_...` so session persistence (anonymous carts, CSRF tokens) works transparently in the browser.
- **Why this wins the pitch**: It proves to the client that a decoupled frontend can talk to their live CS-Cart store today **with zero modifications to their existing server**.

### Approach B: Hybrid Standalone Pitch with Live Form Handoff (Zero-Dependency)
If presenting in an environment without an edge proxy or when showing cart checkout:
1. **Catalog Browsing**: Bundle a lightweight client-side seed file (`assets/js/data/pitchSeeds.js`) populated with real SCHNAP products, paired with on-demand scraping via a free public CORS proxy (`https://corsproxy.io/?...`) for live SKU searches.
2. **Native Form Handoff for Cart/Checkout**:
   In CS-Cart, standard HTML form posts bypass browser CORS restrictions. When the user clicks "Proceed to Live Checkout" on your custom cart page, your JS creates and submits an off-screen standard HTML form:
   ```html
   <form action="https://www.schnap.com.au/index.php" method="POST" target="_blank">
     <input type="hidden" name="dispatch[checkout.add]" value="Add to cart">
     <input type="hidden" name="product_data[12345][amount]" value="2">
     <input type="hidden" name="redirect_url" value="index.php?dispatch=checkout.cart">
   </form>
   ```
   This actually adds the configured items to SCHNAP's real cart and opens their native cart/checkout in a new tab—delivering an unforgettable "magic moment" in your pitch.

### Recommended Cross-Domain Transport Pattern
To keep the frontend 100% static HTML + JS without touching a database, route all frontend JS calls to a lightweight edge rewrite/proxy rule on the new domain (`/api/cscart/*` -> `https://www.schnap.com.au/index.php*`):

| Transport Layer Aspect | Implementation Detail | Reference / Grounding |
| :--- | :--- | :--- |
| **Static Hosting + Edge Rewrite** | Serve static HTML/CSS/JS from Cloudflare Pages, Netlify, or Nginx; rewrite `/cscart/*` to `https://www.schnap.com.au/*` while rewriting `Set-Cookie` domain to the new top-level domain | Standard reverse-proxy pattern for [CS-Cart `index.php` frontend controllers](https://docs.cs-cart.com/latest/developer_guide/core/controllers/index.html) |
| **AJAX Dispatch Protocol** | Append `is_ajax=1` and `result_ids=...` (or custom JSON/HTML block targets) to `index.php?dispatch=controller.mode` requests and send `X-Requested-With: XMLHttpRequest` | [CS-Cart Layout & Dispatch Locations](https://docs.cs-cart.com/latest/designer_guide/layout.html) |
| **DOM / Payload Adapter (`parser.js`)** | Parse CS-Cart's JSON response envelope (`{ html: { ... }, notifications: { ... }, current_url: "..." }`) using browser `DOMParser` to extract clean product objects, facets, and `security_hash` tokens | [CS-Cart Frontend Microformats & Dispatch](https://docs.cs-cart.com/4.1.x/core/front-end/microformats.html) |
| **Media & Image Resolution** | Rewrite any relative image paths to absolute URLs pointing to `https://d35gtgjy55l0bn.cloudfront.net/images/...` or `https://www.schnap.com.au/...` | Observed on [SCHNAP Clipsal Brand Page](https://www.schnap.com.au/clipsal/) and [SCHNAP Newest Products](https://www.schnap.com.au/index.php?dispatch=products.newest&page=240) |

---

## 3. Complete CS-Cart Dispatch Mapping for Phase 1

Every Phase 1 page maps strictly to native [CS-Cart `dispatch=[controller].[mode]` endpoints](https://docs.cs-cart.com/latest/user_guide/look_and_feel/layouts/layout_pages/layout_page_attributes.html) observed on [SCHNAP Electric Products](https://www.schnap.com.au/):

| Frontend Static Page | Primary User Action | CS-Cart `dispatch` Endpoint & Parameters | Method | Response Extraction Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `index.html` (Home) | Load mega-menu categories, trade highlights, newest arrivals, and session `security_hash` | `index.php?dispatch=index.index` & `index.php?dispatch=products.newest&currency=AUD` ([SCHNAP Newest Dispatch](https://www.schnap.com.au/index.php?dispatch=products.newest&currency=AUD&page=728)) | `GET` | Extract category tree, featured trade discount cards, `security_hash`, and active cart summary |
| `category.html` (Category & Subcategory) | Browse category grid, subcategories, pagination, sort order, and technical filters | `index.php?dispatch=categories.view&category_id={id}&page={n}&sort_by={field}&features_hash={hash}` and `index.php?dispatch=categories.subcategories&category_id={id}` ([SCHNAP Hand Tools Subcategories](https://www.schnap.com.au/index.php?dispatch=categories.subcategories&category_id=4472)) | `GET` | Parse subcategory cards, product grid items, facet filter groups, and pagination metadata from `html` blocks |
| `search.html` (Catalog Search & Tags) | Keyword/SKU search and electrical spec tag filtering | `index.php?dispatch=products.search&q={query}&match=all&subcats=Y&page={n}` and `index.php?dispatch=tags.view&tag={tag}` ([SCHNAP 16 AWG Tag View](https://www.schnap.com.au/index.php?dispatch=tags.view&tag=16+AWG)) | `GET` | Extract matched products, SKU codes, trade discount percentages, and facet counters |
| `product.html` (Product Detail) | View full electrical specs, tier pricing, approvals, stock status, and high-res gallery | `index.php?dispatch=products.view&product_id={id}` or `index.php?dispatch=products.quick_view&product_id={id}` ([CS-Cart Controllers](https://docs.cs-cart.com/latest/developer_guide/core/controllers/index.html)) | `GET` | Extract title, SKU/part number, trade price, list price, image array (`detailed` & `thumbnails`), options, and specs table |
| `cart.html` (Cart Page & Mini-Cart Drawer) | View cart items, add item, update quantities, remove line item, or apply promo code | View: `index.php?dispatch=checkout.cart` ([CS-Cart Layout Docs](https://docs.cs-cart.com/latest/designer_guide/layout.html))<br>Add/Update: `index.php?dispatch=checkout.add` / `checkout.update`<br>Delete: `index.php?dispatch=checkout.delete&cart_id={cid}` | `GET` / `POST` | Submit `product_data[{id}][amount]`, `security_hash`, `is_ajax=1`; read updated cart lines, subtotal, and notifications |
| `checkout.html` (Checkout Flow) | Enter customer/shipping address, select shipping (Delivery vs. Kingsgrove Pickup), and complete payment | View/Recalculate: `index.php?dispatch=checkout.checkout` & `checkout.update_steps` ([CS-Cart Layout Docs](https://docs.cs-cart.com/latest/designer_guide/layout.html))<br>Place Order: `index.php?dispatch=checkout.place_order` | `GET` / `POST` | Render shipping methods (enforcing the $150 delivery rule per [SCHNAP Shipping Policy](https://www.schnap.com.au/payment-and-shipping/)), payment methods, and handle redirect/payment form submission |

---

## 4. Directory & File Structure (Pure Static HTML + JS)

```text
/opt/homebrew/var/www/for-fun/commerce/
├── index.html                  # Home page (Hero, Trade Highlights, Category Matrix, Value Props)
├── category.html               # Category & Subcategory listing with technical facet filters
├── search.html                 # Instant SKU/Keyword search & tag results page
├── product.html                # Product detail page (Specs, Gallery, Bulk/Trade Pricing)
├── cart.html                   # Full Trade Cart & Project List review
├── checkout.html               # Streamlined 3-step Trade Checkout (Address, Fulfillment, Payment)
├── assets/
│   ├── css/
│   │   ├── tokens.css          # Design system variables (colors, typography, spacing, elevation)
│   │   ├── base.css            # Reset, layout grid, header, mega-menu, footer, skeleton animations
│   │   ├── catalog.css         # Product cards, technical spec tables, filter sidebar, quick-view modal
│   │   └── checkout.css        # Cart table, $150 delivery progress bar, checkout stepper
│   └── js/
│       ├── core/
│       │   ├── config.js       # Backend origin URL, CDN prefixes, $150 threshold constant
│       │   ├── dispatch.js     # Fetch wrapper for index.php?dispatch=..., is_ajax=1, security_hash
│       │   ├── parser.js       # DOMParser adapter turning CS-Cart HTML blocks into structured JSON
│       │   ├── media.js        # Image URL normalizer for CloudFront & schnap_theme paths
│       │   └── cache.js        # Stale-while-revalidate sessionStorage cache for slow BE mitigation
│       ├── components/
│       │   ├── header.js       # Sticky trade header, mega-menu drawer, live search bar, mini-cart
│       │   ├── productCard.js  # Reusable B2B product card with SKU, trade badge, +/- qty stepper
│       │   ├── quickView.js    # Modal quick-view powered by dispatch=products.quick_view
│       │   └── notifications.js# Toast notifications mapping CS-Cart's notifications object
│       └── pages/
│           ├── home.js         # Hydrates index.html
│           ├── catalog.js      # Hydrates category.html and search.html
│           ├── product.js      # Hydrates product.html
│           ├── cart.js         # Hydrates cart.html
│           └── checkout.js     # Hydrates checkout.html
└── plan.md                     # Architectural & implementation plan
```

---

## 5. Visual Design System & B2B Trade UX Overhaul

[SCHNAP Electric Products](https://www.schnap.com.au/) serves working electricians, industrial engineers, and commercial contractors who value **speed of identification, technical accuracy, and transparent trade pricing** over consumer-style fluff.

### 5.1 Aesthetic Direction & Design Tokens (`tokens.css`)
- **Color Palette**:
  - **Primary Industrial Navy (`#0F172A`)**: High-contrast header, structural navigation, and primary text for crisp legibility in bright on-site lighting.
  - **Electric Trade Amber / Orange (`#F97316` / `#EA580C`)**: Primary call-to-action buttons (`Add to Cart`, `Checkout`), active filter states, and trade discount callouts.
  - **Compliance Emerald (`#10B981`)**: Stock availability badges, "Same-Day Sydney Dispatch" indicators ([SCHNAP Delivery Guide](https://www.schnap.com.au/schnap-electric-products-blog/same-day-electrical-delivery-sydney/)), and $150 delivery unlocked states.
  - **Neutral Slate Surfaces (`#F8FAFC`, `#FFFFFF`, `#E2E8F0` borders)**: Clean tabular backgrounds with `1px solid #E2E8F0` hairlines inspired by industrial supply catalogs.
- **Typography**:
  - **UI & Headings**: `Inter` or `Plus Jakarta Sans` (600/700 weights, tight tracking) for scannable category headers and product titles.
  - **Part Numbers, SKUs & Electrical Ratings**: `JetBrains Mono` or system monospace (`ui-monospace`) for SKU codes (e.g., `AURORA220-SQ-HDALI`, `LX620G2`, `64923.197.WH1` on [SCHNAP Home](https://www.schnap.com.au/)), voltage/amperage ratings (`230V`, `20A`, `6kA`, `IP65`), and pricing tables.

### 5.2 Image Handling Strategy (`media.js`)
Per requirement #3, all product and brand visuals are sourced directly from SCHNAP's existing servers:
- **CloudFront Product Thumbnails & High-Res Images**: Extracted directly from CS-Cart's `<img>` and `data-ca-image-*` attributes (e.g., `https://d35gtgjy55l0bn.cloudfront.net/images/thumbnails/200/200/detailed/739/1492-CJP2-50_1000x1000_ofzp-9c.jpg` from [SCHNAP Newest Products](https://www.schnap.com.au/index.php?dispatch=products.newest&page=240)).
- **Resolution Upgrading**: When CS-Cart list blocks return small `200/200` thumbnail URLs on [CloudFront](https://d35gtgjy55l0bn.cloudfront.net/images/thumbnails/200/200/detailed/68/clip4.jpg?t=1770909293), `media.js` inspects the higher-resolution `detailed/` path or `srcset` so product cards on retina screens look sharp inside a consistent `1:1` padded white container (`object-fit: contain; padding: 12px; background: #FFF`).
- **Fallback Placeholder**: If a legacy product lacks an image, render a clean SVG technical schematic placeholder with the brand name and SKU rather than a broken image icon.

---

## 6. Page-by-Page Functional Specifications (Phase 1)

### 6.1 Global Shell (Header, Mega-Menu, Trade Bar & Mini-Cart)
- **Top Trade Utility Bar**: Displays verified store facts from [SCHNAP Home](https://www.schnap.com.au/):
  - Phone (`02 9150 7744`), Kingsgrove Trade Counter hours (`Open 7 Days — Mon-Fri 6:30am-5pm, Sat-Sun 8am-2pm` at `3/192A Kingsgrove Rd, Kingsgrove NSW 2208`), `Same-Day Sydney Delivery`, and `4.8★ (1,100+ Google Reviews)`.
  - Quick triggers for **Send Us a Photo** (product identification via WhatsApp) and **Request Bulk Quote** drawer.
- **Sticky Search & Navigation Bar**:
  - Instant search input with debounced `dispatch=products.search` preview dropdown showing SKU, thumbnail, trade price, and direct `+ Add` button.
  - **6-Pillar Mega-Menu** matching [SCHNAP's Catalog Taxonomy](https://www.schnap.com.au/): *Cable*, *Electrical*, *Lighting*, *Solar & Smart*, *Industrial*, and *Tools* ([SCHNAP Tools Category](https://www.schnap.com.au/index.php?dispatch=categories.subcategories&category_id=4264)), plus *Brands* ([SCHNAP Brands](https://www.schnap.com.au/brands)).
  - **Slide-Over Mini-Cart Drawer**: Shows live item count, subtotal, and a **dynamic $150 Delivery Eligibility Progress Bar** (`"Add $X more to unlock Australia-wide delivery, or collect free from Kingsgrove"` per [SCHNAP Payment & Shipping](https://www.schnap.com.au/payment-and-shipping/)).

### 6.2 Home Page (`index.html`)
- **Trade-Focused Hero Split Banner**: Highlights Australia's largest electrical range, same-day Sydney dispatch, and direct CTA buttons (`Shop Full Catalog`, `Browse by Brand`, `Bulk Quote`).
- **Interactive Category Bento Grid**: Visual entry points into high-velocity trade categories (Switchgear & Protection, Power & Data Cable, LED Downlights & Battens, Solar & EV Chargers, Industrial Controls, Test & Measurement Tools).
- **SCHNAP Trade Highlights Carousel/Grid**: Hydrated via `dispatch=index.index` / `dispatch=products.newest` ([SCHNAP Newest Dispatch](https://www.schnap.com.au/index.php?dispatch=products.newest&currency=AUD&page=728)). Each card displays:
  - **Trade Discount Badge** (e.g., `Trade Discount 56%` on RCBO `LX620G2` or `Trade Discount 25%` on `AURORA220-SQ-HDALI` per [SCHNAP Home](https://www.schnap.com.au/)).
  - Monospace **SKU / Part Number** with one-click copy.
  - **Trade Price** (bold large) alongside strikethrough retail list price.
  - Inline `- / qty / +` stepper and `Add to Cart` button (`dispatch=checkout.add`) + `Quick View` button.
- **Authorized Trade Brands Ribbon**: Direct links to brand landing dispatches such as [Clipsal](https://www.schnap.com.au/clipsal/), Hager, Legrand, ABB, AJAX, and Allen-Bradley ([SCHNAP Brands](https://www.schnap.com.au/brands)).
- **Verified Electrician Reviews & Trade FAQ Accordion**: Displays the 4.8★ Google review highlights and answers key ordering/delivery questions from [SCHNAP Home](https://www.schnap.com.au/).

### 6.3 Catalog Pages: Category, Subcategory & Search (`category.html` & `search.html`)
- **Subcategory Visual Pills**: When viewing a parent category like `category_id=4472` ([Hand Tools Subcategories](https://www.schnap.com.au/index.php?dispatch=categories.subcategories&category_id=4472)) or `category_id=4264` ([Tools Subcategories](https://www.schnap.com.au/index.php?dispatch=categories.subcategories&category_id=4264)), displays scannable subcategory pills at the top so electricians can drill down in one click.
- **Grid View vs. Compact Trade Table View Toggle**:
  - **Grid View**: Visual cards with large product image, SKU, specs, and pricing.
  - **Trade Table View (Power-User Mode)**: Dense single-line rows showing Thumbnail (`48x48`), SKU, Product Name, Trade Discount %, Unit Price, Quantity Input, and `Add` button—allowing contractors to rapidly add 10–20 line items from a bill of materials without scrolling through tall cards.
- **Faceted Filtering & Sorting Sidebar**:
  - Parses CS-Cart's `product_filters` block (`features_hash` parameter) for Brand, Amperage, IP Rating, Poles, Colour Temperature, and Price Range.
  - Selecting a filter triggers an AJAX dispatch (`dispatch=categories.view&category_id=...&features_hash=...&is_ajax=1`) and updates the URL via `history.pushState` so filter states are shareable and bookmarkable.

### 6.4 Product Detail Page (`product.html`)
- **Breadcrumb & Compliance Header**: Full category path, Brand badge, and monospace Part Number / SKU.
- **High-Resolution Image Gallery**: Uses existing [CloudFront `detailed/` images](https://d35gtgjy55l0bn.cloudfront.net/images/thumbnails/200/200/detailed/739/1492-CJP2-50_1000x1000_ofzp-9c.jpg?t=1777471570) with hover zoom and thumbnail switcher.
- **Buy Box & Fulfillment Clarity**:
  - Upfront Trade Price, List Price savings badge, and GST notation.
  - Quantity selector with quick-increment buttons (`+1`, `+5`, `+10`, `+Box`) and primary `Add to Cart` action (`dispatch=checkout.add`).
  - **Fulfillment Indicator**: Shows whether the item + current cart qualifies for Australia-wide courier delivery (`>= $150`) or free 7-day pickup at `Unit 3/192A Kingsgrove Rd, Kingsgrove NSW 2208` ([SCHNAP About Us](https://www.schnap.com.au/about-us/)).
  - Direct **Request Bulk Quote on WhatsApp** button pre-populated with the current SKU and quantity.
- **Structured Technical Specifications & Approvals Tabs**:
  - Parses CS-Cart's product description and `product_features` blocks into clean, striped specification tables (Electrical Ratings, Dimensions, Standards/Approvals, Warranty).

### 6.5 Cart Page (`cart.html`)
- **Hydration via `dispatch=checkout.cart`**: Fetches live session cart contents from [CS-Cart's `checkout.cart` controller](https://docs.cs-cart.com/latest/designer_guide/layout.html).
- **Line-Item Management**:
  - Displays product thumbnail, title, SKU, unit trade price, quantity stepper (`dispatch=checkout.update`), line total, and remove button (`dispatch=checkout.delete`).
  - **Quick-Add by SKU Row**: Allows trade customers to type a known SKU or search term directly inside the cart to append missing items.
- **Delivery vs. Pickup Threshold Banner**:
  - Dynamically evaluates cart subtotal against SCHNAP's **$150 delivery rule** ([SCHNAP Payment & Shipping](https://www.schnap.com.au/payment-and-shipping/)):
    - **Subtotal < $150**: Highlights *Free Kingsgrove Trade Counter Pickup (Open 7 Days)* and shows exact dollar amount needed to unlock Australia-wide delivery.
    - **Subtotal >= $150**: Displays green badge confirming eligibility for *Same-Day Sydney Dispatch & Australia-Wide Delivery* ([SCHNAP Same-Day Delivery Blog](https://www.schnap.com.au/schnap-electric-products-blog/same-day-electrical-delivery-sydney/)).

### 6.6 Checkout Page (`checkout.html`)
- **Hydration & State Sync via `dispatch=checkout.checkout`**: Connects directly to [CS-Cart's `checkout.checkout` location](https://docs.cs-cart.com/latest/designer_guide/layout.html).
- **Clean 3-Step Accordion Layout**:
  1. **Customer & Trade Contact Details**: Guest checkout or Trade Account sign-in (`dispatch=auth.login`), email, phone, and company/ABN fields (`user_data[...]`).
  2. **Fulfillment & Shipping Method**:
     - If cart `< $150`: Automatically locks/selects **Kingsgrove Trade Counter Pickup (`Unit 3/192A Kingsgrove Rd, Kingsgrove NSW 2208`)** with clear pickup notification instructions ([SCHNAP Home](https://www.schnap.com.au/)).
     - If cart `>= $150`: Enables Australia-wide delivery address inputs, triggers `dispatch=checkout.update_steps` on suburb/postcode change to fetch live CS-Cart shipping rates (`shipping_ids[...]`), and offers Kingsgrove pickup as an alternative.
  3. **Payment & Order Placement**:
     - Dynamically renders payment options returned by CS-Cart (`payment_id` selection via `dispatch=checkout.update_steps`).
     - Submits final order payload to `dispatch=checkout.place_order` (`POST`) with CS-Cart's `security_hash`, handling either inline payment widgets or gateway redirects cleanly.

---

## 7. Mitigating Backend Bottlenecks on the Frontend (Phase 1 Resilience Strategy)

While backend optimization is deferred to a later phase, the static frontend will mask slow CS-Cart controller execution using four client-side techniques:

1. **Stale-While-Revalidate `sessionStorage` Cache (`cache.js`)**:
   - Category trees, brand lists, and previously visited category/product dispatches are cached in `sessionStorage` with a 5-minute soft TTL.
   - Navigating back to a category or product renders **instantly (0ms)** from `sessionStorage` while silently re-validating stock and pricing via a background `dispatch` call.
2. **Deterministic Skeleton Screens**:
   - Every page (`index.html`, `category.html`, `product.html`, `cart.html`, `checkout.html`) ships with pre-sized CSS shimmer skeletons matching exact card and table dimensions—eliminating layout shift (CLS) while waiting for `index.php?dispatch=...` responses.
3. **Optimistic Cart & Quantity Updates**:
   - Clicking `+` / `-` or `Add to Cart` immediately updates the button state and mini-cart badge count in the UI while queuing a debounced (300ms) `POST` request to `dispatch=checkout.add` or `dispatch=checkout.update`, preventing request storms against the slow backend when a user rapidly clicks `+` five times.
4. **Hover Prefetching on High-Intent Links**:
   - Hovering over a category or product card for `> 150ms` triggers a low-priority background fetch of `dispatch=products.view&product_id={id}` into the in-memory/session cache so the page is already loaded by the time the user clicks.

---

## 8. Step-by-Step Implementation Roadmap

### Milestone 1: Core Runtime, Proxy Config & Design System (`assets/css/` & `assets/js/core/`)
- Configure local/edge proxy rewrite (`/cscart/*` -> `https://www.schnap.com.au/*`) to preserve `sid_customer` cookies and avoid CORS blocks.
- Build `dispatch.js` (handling `GET`/`POST`, `is_ajax=1`, `security_hash` extraction, and retry/timeout handling) and `parser.js` (converting CS-Cart HTML/JSON responses into structured JS models).
- Implement `media.js` to normalize all [CloudFront (`d35gtgjy55l0bn.cloudfront.net`)](https://d35gtgjy55l0bn.cloudfront.net/images/logos/169/schnap.png) and [SCHNAP theme image URLs](https://www.schnap.com.au/design/themes/schnap_theme/media/images/hero-banner.webp).
- Create `tokens.css` and `base.css` with the Industrial Navy & Trade Amber theme, sticky header, 6-pillar mega-menu, and slide-over mini-cart.

### Milestone 2: Home Page & Catalog Discovery (`index.html`, `category.html`, `search.html`)
- Build `index.html` + `home.js` featuring the Trade Hero, 6-pillar Category Bento Grid, Trade Highlights (`dispatch=products.newest`), Brands showcase ([SCHNAP Brands](https://www.schnap.com.au/brands)), and Trade FAQ.
- Build `category.html` & `search.html` + `catalog.js` supporting `dispatch=categories.view`, `dispatch=categories.subcategories` ([Hand Tools Subcategories](https://www.schnap.com.au/index.php?dispatch=categories.subcategories&category_id=4472)), `dispatch=products.search`, and `dispatch=tags.view` ([Power Supplies Tag](https://www.schnap.com.au/index.php?dispatch=tags.view&tag=Power+Supplies)).
- Add the **Grid vs. Trade Table View** toggle, facet filter sidebar (`features_hash`), and Quick View modal (`dispatch=products.quick_view`).

### Milestone 3: Product Detail Page (`product.html`)
- Build `product.html` + `product.js` powered by `dispatch=products.view&product_id={id}`.
- Implement the high-res CloudFront image gallery, trade pricing & savings badge, box-quantity quick-selectors, structured technical specifications table, and pre-filled WhatsApp Bulk Quote drawer.

### Milestone 4: Cart & Checkout Flow (`cart.html` & `checkout.html`)
- Build `cart.html` + `cart.js` wired to `dispatch=checkout.cart`, `checkout.update`, and `checkout.delete`, complete with the interactive **$150 Delivery vs. Free Kingsgrove Pickup** eligibility tracker ([SCHNAP Payment & Shipping](https://www.schnap.com.au/payment-and-shipping/)).
- Build `checkout.html` + `checkout.js` wired to `dispatch=checkout.checkout`, `checkout.update_steps`, and `checkout.place_order`, ensuring seamless session persistence and order confirmation handling.
