export const BUSINESS_PERMISSIONS = [
  "canManageCustomers",
  "canManageCategories",
  "canManageProducts",
  "canManageInventory",
  "canManageOrders",
  "canManageInvoices",
  "canViewReports",
  "canViewDashboard",
] as const;

export type BusinessPermission =
  (typeof BUSINESS_PERMISSIONS)[number];