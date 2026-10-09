"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BusinessPermission } from "@/lib/permissions";

type NavigationItem = {
  label: string;
  path: string;
  permission?: BusinessPermission;
  ownerOnly?: boolean;
};

const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: "Overview", path: "" },
  {
    label: "Dashboard",
    path: "/dashboard",
    permission: "canViewDashboard",
  },
  {
    label: "Customers",
    path: "/customers",
    permission: "canManageCustomers",
  },
  {
    label: "Categories",
    path: "/categories",
    permission: "canManageCategories",
  },
  {
    label: "Products",
    path: "/products",
    permission: "canManageProducts",
  },
  {
    label: "Inventory",
    path: "/inventory",
    permission: "canManageInventory",
  },
  {
    label: "Orders",
    path: "/orders",
    permission: "canManageOrders",
  },
  {
    label: "Invoices",
    path: "/invoices",
    permission: "canManageInvoices",
  },
  {
    label: "Reports",
    path: "/reports",
    permission: "canViewReports",
  },
  {
    label: "Media",
    path: "/media",
    permission: "canManageProducts",
  },
  { label: "Staff", path: "/staff", ownerOnly: true },
  { label: "Audit history", path: "/audit-logs", ownerOnly: true },
  { label: "Business settings", path: "/settings", ownerOnly: true },
];

type WorkspaceNavProps = {
  businessId: string;
  role: "Owner" | "Staff";
  permissions: readonly BusinessPermission[];
};

export function WorkspaceNav({
  businessId,
  role,
  permissions,
}: WorkspaceNavProps) {
  const pathname = usePathname();
  const basePath = `/businesses/${businessId}`;
  const isOwner = role === "Owner";

  const visibleItems = NAVIGATION_ITEMS.filter((item) => {
    if (item.ownerOnly) return isOwner;

    return (
      !item.permission ||
      isOwner ||
      permissions.includes(item.permission)
    );
  });

  const links = (
    <ul className="space-y-1">
      {visibleItems.map((item) => {
        const href = `${basePath}${item.path}`;
        const active =
          pathname === href ||
          (item.path !== "" && pathname.startsWith(`${href}/`));

        return (
          <li key={item.label}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`block rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? "border-indigo-300/25 bg-indigo-500/20 text-indigo-100"
                  : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <nav
        aria-label="Business navigation"
        className="hidden lg:block"
      >
        {links}
      </nav>

      <details className="lg:hidden">
        <summary className="cursor-pointer rounded-lg py-2 text-sm font-semibold text-indigo-200">
          Business menu
        </summary>

        <nav
          aria-label="Business navigation"
          className="mt-3"
        >
          {links}
        </nav>
      </details>
    </>
  );
}