import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { solarPackageItems, solarPackages, solarProducts } from "@/db/schema";
import { STARTER_PACKAGES, STARTER_PRODUCTS } from "@/lib/solar-catalogue";
import {
  ITEM_BASES,
  PACKAGE_KINDS,
  PRODUCT_CATEGORIES,
  type PackageItem,
  type SolarData,
  type SolarPackage,
  type SolarProduct,
} from "@/lib/solar-model";

/**
 * Server data layer for the solar catalogue backoffice.
 *
 * Two collections: the hardware we buy (`solar_products`) and the packages we
 * quote from (`solar_packages` + their lines). Prices are catalogued per
 * product and per package; a job is costed from those, not from a guess.
 *
 * All money crossing this boundary is whole centavos; no money crosses as a
 * float. See `src/lib/money.ts`.
 */

export const SOLAR_KINDS = ["products", "packages"] as const;
export type SolarKind = (typeof SOLAR_KINDS)[number];

export function isSolarKind(value: string): value is SolarKind {
  return (SOLAR_KINDS as readonly string[]).includes(value);
}

type Fields = Record<string, unknown>;

/* ------------------------------------------------------------------ *
 * Field sanitisers. Everything arrives from a form, so nothing is trusted.
 * ------------------------------------------------------------------ */

function text(value: unknown, fallback = "", max = 200): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max);
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function pick<T extends readonly string[]>(
  options: T,
  value: unknown,
  fallback: T[number],
): T[number] {
  return typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T[number])
    : fallback;
}

function currencyOf(value: unknown): string {
  return value === "USD" ? "USD" : "PHP";
}

/** Whole centavos, never negative, capped below the integer column's ceiling. */
function minorOf(value: unknown): number {
  const amount = Math.round(Number(value) || 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.min(amount, 2_000_000_000);
}

function countOf(value: unknown, fallback: number): number {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, 100_000);
}

function numericOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed.toFixed(2);
}

/** A percentage between 0 and 500, as the string a numeric column wants. */
function percentOf(value: unknown): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return "0.00";
  return Math.min(parsed, 500).toFixed(2);
}

/** A positive quantity with at most two decimals, as a numeric string. */
function qtyOf(value: unknown): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "1.00";
  return Math.min(parsed, 100_000).toFixed(2);
}

/* ------------------------------------------------------------------ *
 * Read
 * ------------------------------------------------------------------ */

export async function listSolar(): Promise<SolarData> {
  const [productRows, packageRows, itemRows] = await Promise.all([
    db
      .select()
      .from(solarProducts)
      .orderBy(asc(solarProducts.category), asc(solarProducts.brand), asc(solarProducts.model)),
    db
      .select()
      .from(solarPackages)
      .orderBy(desc(solarPackages.active), asc(solarPackages.sizeKwp), asc(solarPackages.name)),
    db.select().from(solarPackageItems).orderBy(asc(solarPackageItems.sortOrder)),
  ]);

  const products: SolarProduct[] = productRows.map((row) => ({
    id: row.id,
    brand: row.brand,
    category: row.category,
    model: row.model,
    headline: row.headline,
    specs: row.specs,
    notes: row.notes,
    costMinor: row.costMinor,
    currency: row.currency,
    freightMinor: row.freightMinor,
    moq: row.moq,
    leadTime: row.leadTime,
    supplier: row.supplier,
    sourceUrl: row.sourceUrl,
    warranty: row.warranty,
    availability: row.availability,
    active: row.active,
  }));

  const itemsByPackage = new Map<number, PackageItem[]>();
  for (const row of itemRows) {
    const list = itemsByPackage.get(row.packageId) ?? [];
    list.push({
      id: row.id,
      productId: row.productId ?? null,
      label: row.label,
      qty: row.qty,
      basis: row.basis,
      unitCostMinor: row.unitCostMinor,
      sortOrder: row.sortOrder,
    });
    itemsByPackage.set(row.packageId, list);
  }

  const packages: SolarPackage[] = packageRows.map((row) => ({
    id: row.id,
    name: row.name,
    sizeKwp: row.sizeKwp ?? null,
    kind: row.kind,
    sellPriceMinor: row.sellPriceMinor,
    markupPct: row.markupPct,
    description: row.description,
    active: row.active,
    items: itemsByPackage.get(row.id) ?? [],
  }));

  return { products, packages };
}

/* ------------------------------------------------------------------ *
 * Write
 *
 * Updates merge the incoming body over the stored row and rewrite the whole
 * record, the same shape the finance board uses.
 * ------------------------------------------------------------------ */

function productValues(body: Fields) {
  return {
    brand: text(body.brand, "", 80) || "Deye",
    category: pick(PRODUCT_CATEGORIES, body.category, "accessory"),
    model: text(body.model, "", 160) || "New product",
    headline: text(body.headline, "", 120),
    specs: text(body.specs, "", 600),
    notes: text(body.notes, "", 600),
    costMinor: minorOf(body.costMinor),
    currency: currencyOf(body.currency),
    freightMinor: minorOf(body.freightMinor),
    moq: countOf(body.moq, 1),
    leadTime: text(body.leadTime, "", 80),
    supplier: text(body.supplier, "", 140),
    sourceUrl: text(body.sourceUrl, "", 500),
    warranty: text(body.warranty, "", 120),
    availability: text(body.availability, "", 80),
    active: bool(body.active, true),
    updatedAt: new Date(),
  };
}

function packageValues(body: Fields) {
  const kind = pick(PACKAGE_KINDS, body.kind, "fixed");
  return {
    name: text(body.name, "", 140) || "Untitled package",
    sizeKwp: numericOrNull(body.sizeKwp),
    kind,
    // A fixed tier carries the price the owner sets. A built-to-order package
    // prices itself from markup instead, so a stale price cannot linger on it.
    sellPriceMinor: kind === "fixed" ? minorOf(body.sellPriceMinor) : 0,
    markupPct: kind === "custom" ? percentOf(body.markupPct) : "0.00",
    description: text(body.description, "", 600),
    active: bool(body.active, true),
    updatedAt: new Date(),
  };
}

function packageItemsOf(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 60)
    .map((entry, index) => {
      const record = (entry ?? {}) as Fields;
      const productId = Number(record.productId);
      return {
        productId: Number.isInteger(productId) && productId > 0 ? productId : null,
        label: text(record.label, "", 160),
        qty: qtyOf(record.qty),
        basis: pick(ITEM_BASES, record.basis, "each"),
        unitCostMinor: minorOf(record.unitCostMinor),
        sortOrder: index,
      };
    })
    .filter(
      (item) =>
        item.productId !== null || item.label.length > 0 || item.unitCostMinor > 0,
    );
}

export async function createSolarItem(kind: SolarKind, body: Fields): Promise<number> {
  if (kind === "products") {
    const [row] = await db
      .insert(solarProducts)
      .values(productValues(body))
      .returning({ id: solarProducts.id });
    return row.id;
  }

  const items = packageItemsOf(body.items);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(solarPackages)
      .values(packageValues(body))
      .returning({ id: solarPackages.id });
    if (items.length > 0) {
      await tx
        .insert(solarPackageItems)
        .values(items.map((item) => ({ ...item, packageId: row.id })));
    }
    return row.id;
  });
}

export async function updateSolarItem(
  kind: SolarKind,
  id: number,
  body: Fields,
): Promise<boolean> {
  if (kind === "products") {
    const [row] = await db.select().from(solarProducts).where(eq(solarProducts.id, id)).limit(1);
    if (!row) return false;
    const written = await db
      .update(solarProducts)
      .set(productValues({ ...row, ...body }))
      .where(eq(solarProducts.id, id))
      .returning({ id: solarProducts.id });
    return written.length > 0;
  }

  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(solarPackages).where(eq(solarPackages.id, id)).limit(1);
    if (!row) return false;
    await tx
      .update(solarPackages)
      .set(packageValues({ ...row, ...body }))
      .where(eq(solarPackages.id, id));

    // The board always sends the complete line list, so the lines are replaced
    // wholesale rather than diffed. Order is the array order.
    if (body.items !== undefined) {
      const items = packageItemsOf(body.items);
      await tx.delete(solarPackageItems).where(eq(solarPackageItems.packageId, id));
      if (items.length > 0) {
        await tx
          .insert(solarPackageItems)
          .values(items.map((item) => ({ ...item, packageId: id })));
      }
    }
    return true;
  });
}

export async function deleteSolarItem(kind: SolarKind, id: number): Promise<boolean> {
  if (kind === "products") {
    // Lines pointing at a deleted product survive with the link cleared and the
    // line's own allowance kept, so a package never silently loses a cost.
    const rows = await db
      .delete(solarProducts)
      .where(eq(solarProducts.id, id))
      .returning({ id: solarProducts.id });
    return rows.length > 0;
  }

  // Lines are owned by the package, so they go with it.
  const rows = await db
    .delete(solarPackages)
    .where(eq(solarPackages.id, id))
    .returning({ id: solarPackages.id });
  return rows.length > 0;
}

/* ------------------------------------------------------------------ *
 * Starter catalogue
 * ------------------------------------------------------------------ */

export type SeedResult = { products: number; packages: number; reset: boolean };

export class CatalogueNotEmptyError extends Error {
  constructor(public readonly count: number) {
    super(`The catalogue already has ${count} product(s).`);
    this.name = "CatalogueNotEmptyError";
  }
}

/**
 * Loads the starter catalogue.
 *
 * Products come from the Deye + Jinko workbook with **placeholder** prices, so
 * there is something real to show before supplier quotes arrive. A reset wipes
 * the catalogue and rebuilds it, which is how the demo gets back to a clean
 * state; it never touches leads, jobs or anything else.
 */
export async function loadStarterCatalogue(reset = false): Promise<SeedResult> {
  const existing = await db.select({ id: solarProducts.id }).from(solarProducts);
  if (existing.length > 0 && !reset) {
    throw new CatalogueNotEmptyError(existing.length);
  }

  if (reset) {
    // Packages first: their lines are owned by them. Products go after, so the
    // `set null` on a line's product link never has to fire.
    await db.delete(solarPackages);
    await db.delete(solarProducts);
  }

  const productIdByModel = new Map<string, number>();
  let productCount = 0;
  for (const item of STARTER_PRODUCTS) {
    const [row] = await db
      .insert(solarProducts)
      .values({
        brand: item.brand,
        category: item.category,
        model: item.model,
        headline: item.headline,
        specs: item.specs,
        notes: item.notes,
        costMinor: item.costMinor,
        currency: "PHP",
        supplier: item.supplier,
        sourceUrl: item.sourceUrl,
        availability: item.availability,
      })
      .returning({ id: solarProducts.id });
    // One model can appear twice in the workbook. The first row wins the link,
    // so a package line always resolves to a single product.
    if (!productIdByModel.has(item.model)) productIdByModel.set(item.model, row.id);
    productCount += 1;
  }

  let packageCount = 0;
  for (const template of STARTER_PACKAGES) {
    const [row] = await db
      .insert(solarPackages)
      .values({
        name: template.name,
        sizeKwp: template.sizeKwp.toFixed(2),
        kind: template.kind,
        sellPriceMinor: template.kind === "fixed" ? template.sellPriceMinor : 0,
        markupPct: template.kind === "custom" ? template.markupPct.toFixed(2) : "0.00",
        description: template.description,
      })
      .returning({ id: solarPackages.id });

    if (template.items.length > 0) {
      await db.insert(solarPackageItems).values(
        template.items.map((entry, index) => ({
          packageId: row.id,
          productId: entry.model ? productIdByModel.get(entry.model) ?? null : null,
          label: entry.label,
          qty: entry.qty.toFixed(2),
          basis: entry.basis,
          unitCostMinor: entry.unitCostMinor,
          sortOrder: index,
        })),
      );
    }
    packageCount += 1;
  }

  return { products: productCount, packages: packageCount, reset };
}
