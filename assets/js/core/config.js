// ==========================================================================
// SCHNAP Electric Products — Core Configuration & Catalog Taxonomy
// ==========================================================================

export const CONFIG = {
  STORE_NAME: 'SCHNAP Electric Products',
  UPSTREAM_ORIGIN: 'https://www.schnap.com.au',
  CDN_ORIGIN: 'https://d35gtgjy55l0bn.cloudfront.net',
  WORKER_ORIGIN: 'https://commerce-worker.situs.id',
  PROXY_BASE: 'https://commerce-worker.situs.id/cscart',
  CORS_FALLBACK_PROXY: 'https://corsproxy.io/?',

  // SCHNAP $150 Delivery Policy (Orders < $150 are Free Kingsgrove Pickup; >= $150 unlock Australia-wide delivery)
  FREE_DELIVERY_THRESHOLD: 150.0,
  CURRENCY: 'AUD',
  CURRENCY_SYMBOL: '$',

  // Verified Store & Trade Counter Facts
  STORE_FACTS: {
    phone: '02 9150 7744',
    phoneHref: 'tel:0291507744',
    whatsappHref: 'https://wa.me/61291507744',
    email: 'sales@schnap.com.au',
    address: 'Unit 3/192A Kingsgrove Rd, Kingsgrove NSW 2208',
    hoursShort: 'Open 7 Days: Mon–Fri 6:30am–5pm, Sat–Sun 8am–2pm',
    rating: '4.8★',
    reviewCount: '1,100+ Google Reviews',
    logoUrl: 'https://d35gtgjy55l0bn.cloudfront.net/images/logos/169/schnap.png?t=1730781474',
    heroBannerUrl: 'https://www.schnap.com.au/design/themes/schnap_theme/media/images/hero-banner.webp',
  },

  // Cache & Resilience Constants
  CACHE_SOFT_TTL_MS: 5 * 60 * 1000,   // 5 minutes soft TTL (stale-while-revalidate)
  CACHE_HARD_TTL_MS: 30 * 60 * 1000,  // 30 minutes hard TTL
  CART_DEBOUNCE_MS: 300,              // 300ms debounce for optimistic +/- cart updates
  HOVER_PREFETCH_MS: 150,             // > 150ms hover intent triggers background prefetch

  // 6-Pillar Mega-Menu Taxonomy (Verified against live SCHNAP CS-Cart category_ids & SEO slugs)
  PILLARS: [
    {
      id: '4255',
      name: 'Cable',
      slug: 'cable.html',
      tagline: 'AS/NZS 5000.1 & 3000 Compliant Power, Data & Control Cable',
      badge: 'Drums & Cut Lengths',
      subcategories: [
        { id: '4266', name: 'Power Cables', slug: 'power-cables.html' },
        { id: '4267', name: 'Building Wire', slug: 'building-wire.html' },
        { id: '4268', name: 'Twin & Earth Cable', slug: 'twin-and-earth-cable.html' },
        { id: '4269', name: 'Orange Circular Cable', slug: 'orange-circular-cable.html' },
        { id: '4270', name: 'Data & Comms (Cat6/6A)', slug: 'data-and-comms-cable.html' },
        { id: '4271', name: 'Flexible & Tinned Wire', slug: 'flexible-cable.html' },
        { id: '4272', name: 'Solar DC Cable', slug: 'solar-cable.html' },
        { id: '4273', name: 'Cable Lugs & Glands', slug: 'cable-accessories.html' },
        { id: '4274', name: 'Conduit & Cable Tray', slug: 'conduit-and-ducts.html' },
      ],
      featuredSearch: 'cable',
    },
    {
      id: '4257',
      name: 'Electrical',
      slug: 'electrical.html',
      tagline: 'RCBOs, Circuit Protection, Switchgear, Powerpoints & Wiring Devices',
      badge: 'Up to 56% Trade Off',
      subcategories: [
        { id: '4275', name: 'Powerpoints (GPOs)', slug: 'powerpoints.html' },
        { id: '4276', name: 'Switches & Mechs', slug: 'switches-and-mechs.html' },
        { id: '4277', name: 'RCBOs & Circuit Breakers', slug: 'electrical.html', query: 'rcbo' },
        { id: '4278', name: 'Plugs, Sockets & Adaptors', slug: 'plugs-sockets-and-adaptors.html' },
        { id: '4279', name: 'Cover Plates & Grids', slug: 'cover-plates-and-grid-plates.html' },
        { id: '4280', name: 'Mounting Accessories', slug: 'mounting-accessories.html' },
        { id: '4281', name: 'Smoke & Heat Alarms', slug: 'sensors-bells-and-chimes.html', query: 'alarm' },
        { id: '4282', name: 'Enclosures & Switchboards', slug: 'electrical.html', query: 'enclosure' },
        { id: '4283', name: 'MATV & Comms Outlets', slug: 'matv-and-tv.html' },
      ],
      featuredSearch: 'rcbo',
    },
    {
      id: '4258',
      name: 'Lighting',
      slug: 'lighting.html',
      tagline: 'IC-4 LED Downlights, DALI Commercial Panels, Highbays & Emergency',
      badge: 'SAA & IC-4 Rated',
      subcategories: [
        { id: '4284', name: 'Indoor LED Downlights', slug: 'indoor-lighting.html' },
        { id: '4285', name: 'Commercial & Industrial LED', slug: 'commercial-and-industrial.html' },
        { id: '4286', name: 'Outdoor & Floodlights', slug: 'outdoor-and-landscape.html' },
        { id: '4287', name: 'Exit & Emergency Lighting', slug: 'exit-and-emergency.html' },
        { id: '4288', name: 'LED Battens & Linear', slug: 'commercial-and-industrial.html', query: 'batten' },
        { id: '4289', name: 'Lamps, Tubes & Globes', slug: 'lamps-and-globes.html' },
        { id: '4290', name: 'Ceiling Fans & Fittings', slug: 'ceiling-fan-lights-and-fittings.html' },
        { id: '4291', name: 'DALI Drivers & Accessories', slug: 'lighting-accessories.html' },
      ],
      featuredSearch: 'downlight',
    },
    {
      id: '4261',
      name: 'Solar & Smart',
      slug: 'solar-panels.html',
      tagline: 'Clean Energy Council Approved Inverters, EV Chargers, BESS & CCTV',
      badge: 'CEC & Smart Trade',
      subcategories: [
        { id: '4292', name: 'EV Chargers & Accessories', slug: 'ev-chargers-and-accessories.html' },
        { id: '4293', name: 'Solar Inverters', slug: 'inverters.html' },
        { id: '4294', name: 'Battery Storage (BESS)', slug: 'battery-storage.html' },
        { id: '4295', name: 'Solar Panels', slug: 'solar-panels.html' },
        { id: '4296', name: 'Solar Racking & Mounting', slug: 'solar-racking.html' },
        { id: '4297', name: 'Solar BOS & Isolators', slug: 'solar-bos-and-accessories.html' },
        { id: '4298', name: 'AJAX Smart Security & CCTV', slug: 'solar-panels.html', query: 'ajax' },
        { id: '4299', name: 'Network Protection Boards', slug: 'network-protection-boards.html' },
      ],
      featuredSearch: 'ajax',
    },
    {
      id: '4263',
      name: 'Industrial',
      slug: 'industrial.html',
      tagline: 'IP66 Three-Phase Outlets, Contactors, Pushbuttons, VFDs & PLC Gear',
      badge: 'Heavy Commercial',
      subcategories: [
        { id: '4300', name: 'Industrial Plugs & Sockets', slug: 'industrial-plugs-and-sockets.html' },
        { id: '4301', name: 'Industrial Switchgear', slug: 'industrial-switchgear.html' },
        { id: '4302', name: 'Motors & Motor Control', slug: 'motors-and-motor-control.html' },
        { id: '4303', name: 'Switching, Relays & Control', slug: 'switching-and-control.html' },
        { id: '4304', name: 'E-Stops, Pushbuttons & Beacons', slug: 'lights-bells-and-beacons.html' },
        { id: '4305', name: 'Automation & PLC', slug: 'automation-and-control.html' },
        { id: '4306', name: 'Industrial Enclosures', slug: 'industrial-accessories.html' },
        { id: '4307', name: 'Enclosure Climate Control', slug: 'climate-control.html' },
      ],
      featuredSearch: 'contactor',
    },
    {
      id: '4264',
      name: 'Tools',
      slug: 'tools.html',
      tagline: '1000V VDE Insulated Hand Tools, Clamp Meters, Crimpers & Test Gear',
      badge: '1000V VDE Rated',
      subcategories: [
        { id: '4472', name: 'Hand Tools', slug: 'tools-hand-tools.html' },
        { id: '4473', name: 'Pliers, Cutters & Strippers', slug: 'hand-tools-pliers.html' },
        { id: '4474', name: 'Meters & Multifunction Testers', slug: 'meters-and-testers.html' },
        { id: '4475', name: 'Power Tool Accessories', slug: 'power-tool-accessories.html' },
        { id: '4476', name: 'Heat Guns & Soldering', slug: 'heat-and-soldering.html' },
        { id: '4477', name: 'Work & Site Safety Lights', slug: 'work-and-safety-lights.html' },
        { id: '4478', name: 'Tool Bags & Storage', slug: 'tool-storage.html' },
        { id: '4479', name: 'Fixings, Silicone & Hardware', slug: 'fixings-and-hardware.html' },
      ],
      featuredSearch: 'pliers',
    },
  ],

  // Authorized Trade Brands (Direct CloudFront Logos & Brand Dispatches)
  BRANDS: [
    {
      name: 'Clipsal',
      slug: 'clipsal/',
      query: 'Clipsal',
      logo: 'https://d35gtgjy55l0bn.cloudfront.net/images/thumbnails/75/75/feature_variant/381/dd5517_c4d0354e28964f258c594e3b3a1fdd34~mv2.png?t=1770909322',
      specialty: 'Switchgear & Wiring Devices',
    },
    {
      name: 'Hager',
      slug: 'hager/',
      query: 'Hager',
      logo: 'https://d35gtgjy55l0bn.cloudfront.net/images/thumbnails/75/75/feature_variant/382/logo_hager.png?t=1770909322',
      specialty: 'Loadcentres & Protection',
    },
    {
      name: 'ABB',
      slug: 'abb/',
      query: 'ABB',
      logo: 'https://d35gtgjy55l0bn.cloudfront.net/images/thumbnails/75/75/feature_variant/539/abb-logo.png?t=1770909322',
      specialty: 'Industrial Controls & Breakers',
    },
    {
      name: 'AJAX Systems',
      slug: 'ajax/',
      query: 'AJAX',
      logo: 'https://d35gtgjy55l0bn.cloudfront.net/images/thumbnails/75/75/feature_variant/595/AJAX.png?t=1770909322',
      specialty: 'NDAA Security & Smart Automation',
    },
    {
      name: 'LANX Electric',
      slug: 'lanx/',
      query: 'LANX',
      logo: 'https://d35gtgjy55l0bn.cloudfront.net/images/logos/169/schnap.png?t=1730781474',
      specialty: '6kA Type A RCBOs & Protection',
    },
    {
      name: 'Haneco Lighting',
      slug: 'haneco/',
      query: 'Haneco',
      logo: 'https://d35gtgjy55l0bn.cloudfront.net/images/thumbnails/75/75/feature_variant/673/download__3_.png?t=1789658083',
      specialty: 'Commercial DALI & LED Lighting',
    },
    {
      name: 'Allen-Bradley',
      slug: 'allen-bradley/',
      query: 'Allen-Bradley',
      logo: 'https://d35gtgjy55l0bn.cloudfront.net/images/thumbnails/75/75/feature_variant/673/AMCI-Logo.jpg?t=1789658084',
      specialty: 'Industrial Automation & Terminals',
    },
    {
      name: 'Brooks',
      slug: 'brooks/',
      query: 'Brooks',
      logo: 'https://d35gtgjy55l0bn.cloudfront.net/images/thumbnails/75/75/feature_variant/759/activor.png?t=1789658575',
      specialty: 'AS 3786 Smoke & Heat Alarms',
    },
  ],
};
