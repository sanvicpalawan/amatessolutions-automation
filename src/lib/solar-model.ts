/**
 * Solar catalogue types and the package maths.
 *
 * Kept out of `solar.ts` (which is `server-only`) so the admin board can
 * recompute a package's cost, price and margin as the owner types, without a
 * round trip and without a second copy of the arithmetic.
 *
 * Money is whole centavos throughout; see `src/lib/money.ts`.
 *
 * Everything here is pure.
 */

export const PRODUCT_CATEGORIES = [
  "inverter",
  "panel",
  "battery",
  "ess",
  "microinverter",
  "mounting",
  "accessory",
  "aircon",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  inverter: "Inverter",
  panel: "PV panel",
  battery: "Battery",
  ess: "All-in-one ESS",
  microinverter: "Microinverter",
  mounting: "Mounting & rails",
  accessory: "Monitoring & accessory",
  aircon: "Solar aircon",
};

export const PACKAGE_KINDS = ["fixed", "custom"] as const;
export type PackageKind = (typeof PACKAGE_KINDS)[number];

export const ITEM_BASES = ["each", "per_kwp"] as const;
export type ItemBasis = (typeof ITEM_BASES)[number];

export type SolarProduct = {
  id: number;
  brand: string;
  category: string;
  model: string;
  headline: string;
  specs: string;
  notes: string;
  /** What it costs us. Never shown to a customer. */
  costMinor: number;
  currency: string;
  freightMinor: number;
  moq: number;
  leadTime: string;
  supplier: string;
  sourceUrl: string;
  warranty: string;
  availability: string;
  active: boolean;
};

export type PackageItem = {
  id: number;
  /** Null on a trade allowance line — mounting, wiring, labour. */
  productId: number | null;
  label: string;
  /** Numeric columns arrive from Postgres as strings. */
  qty: string;
  basis: string;
  unitCostMinor: number;
  sortOrder: number;
};

export type SolarPackage = {
  id: number;
  name: string;
  sizeKwp: string | null;
  kind: string;
  sellPriceMinor: number;
  markupPct: string;
  description: string;
  active: boolean;
  items: PackageItem[];
};

export type SolarData = {
  products: SolarProduct[];
  packages: SolarPackage[];
};

export type ProductIndex = Map<number, SolarProduct>;

export function indexProducts(products: SolarProduct[]): ProductIndex {
  return new Map(products.map((product) => [product.id, product]));
}

/** What one unit of a line costs us — the product's cost, or the allowance. */
export function itemUnitCostMinor(item: PackageItem, products: ProductIndex): number {
  if (item.productId !== null) {
    const product = products.get(item.productId);
    if (product) return product.costMinor + product.freightMinor;
  }
  return item.unitCostMinor;
}

/**
 * How many units a job of this size needs.
 *
 * A `per_kwp` line scales with the job, which is what makes one package work
 * from a 3 kWp house up to a 32 kWp commercial roof.
 */
export function itemQtyAt(item: PackageItem, sizeKwp: number): number {
  const qty = Number(item.qty) || 0;
  return item.basis === "per_kwp" ? qty * sizeKwp : qty;
}

export function itemCostAt(item: PackageItem, products: ProductIndex, sizeKwp: number): number {
  return Math.round(itemQtyAt(item, sizeKwp) * itemUnitCostMinor(item, products));
}

export type PackageTotals = {
  /** The size these figures are for. A fixed tier uses its own size. */
  sizeKwp: number;
  costMinor: number;
  sellMinor: number;
  profitMinor: number;
  marginPct: number;
  /** The number a customer actually compares between tiers. */
  costPerKwpMinor: number;
  sellPerKwpMinor: number;
};

/**
 * Cost, price and margin for one package.
 *
 * A `fixed` tier carries the price the owner set. A `custom` package prices
 * itself from its markup, so it can be quoted at any size.
 */
export function packageTotals(
  pkg: SolarPackage,
  products: ProductIndex,
  sizeKwp?: number,
): PackageTotals {
  const size = sizeKwp ?? (Number(pkg.sizeKwp) || 0);
  const costMinor = pkg.items.reduce(
    (sum, item) => sum + itemCostAt(item, products, size),
    0,
  );
  const markupPct = Number(pkg.markupPct) || 0;
  const sellMinor =
    pkg.kind === "fixed" ? pkg.sellPriceMinor : Math.round(costMinor * (1 + markupPct / 100));
  const profitMinor = sellMinor - costMinor;

  return {
    sizeKwp: size,
    costMinor,
    sellMinor,
    profitMinor,
    marginPct: sellMinor > 0 ? (profitMinor / sellMinor) * 100 : 0,
    costPerKwpMinor: size > 0 ? Math.round(costMinor / size) : 0,
    sellPerKwpMinor: size > 0 ? Math.round(sellMinor / size) : 0,
  };
}

/** The line label to show when a package item has no label of its own. */
export function itemLabel(item: PackageItem, products: ProductIndex): string {
  if (item.label) return item.label;
  if (item.productId !== null) {
    const product = products.get(item.productId);
    if (product) return `${product.brand} ${product.model}`;
  }
  return "Unnamed line";
}

/** How a quantity reads: "16", or "1.61 per kWp". */
export function qtyLabel(item: PackageItem): string {
  const qty = Number(item.qty) || 0;
  const rounded = Math.round(qty * 100) / 100;
  return item.basis === "per_kwp" ? `${rounded} per kWp` : `${rounded}`;
}
