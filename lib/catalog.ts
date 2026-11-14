export const CURRENCY = 'USD';
export const PLANS = [
  { id: 'starter', name: 'Starter', amount: 9, interval: 'month' },
  { id: 'pro', name: 'Pro', amount: 29, interval: 'month' },
  { id: 'business', name: 'Business', amount: 99, interval: 'month' },
] as const;
export const PRODUCTS = [
  { id: 'icons', name: 'Icon Pack', price: 19, cost: 2, category: 'Assets' },
  { id: 'template', name: 'Landing Template', price: 49, cost: 5, category: 'Templates' },
  { id: 'ebook', name: 'Growth Ebook', price: 12, cost: 0, category: 'Education' },
] as const;

// ── Extra sample data for the richer Sitevento events ───────────────────
export const GOALS: { name: string; value?: number }[] = [
  { name: 'Demo booked', value: 250 },
  { name: 'Invoice paid', value: 120 },
  { name: 'Onboarding completed' },
];
export const CUSTOM_EVENTS: { name: string; properties: Record<string, string | number> }[] = [
  { name: 'report_exported', properties: { format: 'csv', rows: 1840 } },
  { name: 'invite_sent', properties: { count: 3 } },
  { name: 'feature_used', properties: { feature: 'dashboard' } },
];
export const SEARCH_TERMS = ['pro', 'template', 'icon', 'dark mode', 'api', 'refund policy'];
export const EXPENSES: { category: 'cogs' | 'opex'; type: string; amount: number; description: string; recurring?: 'month' | 'year' | 'none' }[] = [
  { category: 'cogs', type: 'hosting', amount: 120, description: 'Vercel + Firebase', recurring: 'month' },
  { category: 'opex', type: 'tools', amount: 49, description: 'Design & dev tools', recurring: 'month' },
  { category: 'cogs', type: 'payment_fees', amount: 18.4, description: 'Processor fees' },
  { category: 'opex', type: 'team', amount: 900, description: 'Contractor', recurring: 'none' },
];
export const AD_SOURCES = [
  { source: 'facebook', medium: 'paid_social', campaign: 'launch-nov' },
  { source: 'google', medium: 'cpc', campaign: 'brand-search' },
];
