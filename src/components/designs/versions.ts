/**
 * The exploration index. Kept out of the route layouts because Next only allows
 * a known set of exports from a `layout.tsx`.
 */
export const LANDING_VERSIONS = [
  { slug: "v1", name: "Editorial", note: "Premium African editorial publication. People and stories first." },
  { slug: "v2", name: "Movement", note: "Cultural movement. The Ajo conversation turned into something useful." },
  { slug: "v3", name: "Impact platform", note: "High-end philanthropic infrastructure. Trust and verification." },
  { slug: "v4", name: "Discovery", note: "Product-first. Browsing businesses is the first interaction." },
];

export const DASHBOARD_VERSIONS = [
  { slug: "v1", name: "Command centre", note: "Operational. What needs action, nothing else." },
  { slug: "v2", name: "Impact desk", note: "Stories and impact alongside the operational queues." },
  { slug: "v3", name: "Review workspace", note: "Split pane built around reviewing applications fast." },
  { slug: "v4", name: "Hybrid", note: "Balance of operations, impact, campaigns and approvals." },
];
