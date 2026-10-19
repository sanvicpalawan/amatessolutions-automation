"use client";

import { useMemo, useState } from "react";

import RowField from "@/components/admin/RowField";
import { Icon } from "@/lib/icons";
import { money, percent, toMinor } from "@/lib/money";
import {
  CATEGORY_LABELS,
  ITEM_BASES,
  PACKAGE_KINDS,
  PRODUCT_CATEGORIES,
  indexProducts,
  itemLabel,
  itemUnitCostMinor,
  packageTotals,
  qtyLabel,
  type PackageItem,
  type SolarData,
  type SolarPackage,
  type SolarProduct,
} from "@/lib/solar-model";

type Tab = "products" | "packages";

const TABS: { value: Tab; label: string; icon: string; }[] = [
  { value: "products", label: "Products", icon: "Boxes" },
  { value: "packages", label: "Packages", icon: "Layers" },
];

/** The top of the range the owner asked to cover, used to preview a recipe. */
const TOP_SIZE_KWP = 32;

type ProductDraft = {
  id: number | null;
  brand: string;
  category: string;
  model: string;
  headline: string;
  specs: string;
  notes: string;
  cost: string;
  freight: string;
  moq: string;
  leadTime: string;
  supplier: string;
  sourceUrl: string;
  warranty: string;
  availability: string;
  active: boolean;
};

type ItemDraft = {
  productId: string;
  label: string;
  qty: string;
  basis: string;
  unitCost: string;
};

type PackageDraft = {
  id: number | null;
  name: string;
  sizeKwp: string;
  kind: string;
  sellPrice: string;
  markupPct: string;
  description: string;
  active: boolean;
  items: ItemDraft[];
};

const EMPTY_PRODUCT: ProductDraft = {
  id: null,
  brand: "Deye",
  category: "inverter",
  model: "",
  headline: "",
  specs: "",
  notes: "",
  cost: "",
  freight: "",
  moq: "1",
  leadTime: "",
  supplier: "",
  sourceUrl: "",
  warranty: "",
  availability: "",
  active: true,
};

const EMPTY_ITEM: ItemDraft = {
  productId: "",
  label: "",
  qty: "1",
  basis: "each",
  unitCost: "",
};

function emptyPackage(): PackageDraft {
  return {
    id: null,
    name: "",
    sizeKwp: "10",
    kind: "fixed",
    sellPrice: "",
    markupPct: "30",
    description: "",
    active: true,
    items: [{ ...EMPTY_ITEM }],
  };
}

/** 150050 becomes "1500.50", for a number input. */
const majorInput = (minor: number) => (minor / 100).toFixed(2);

const labelClass = "block text-[11px] font-bold uppercase tracking-wider text-slate-500";
const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-navy-900 outline-none transition focus:border-solar-400 focus:ring-2 focus:ring-solar-400/30";
const smallFieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-solar-400 focus:ring-2 focus:ring-solar-400/30";
/** A line stacks on narrow screens, where position alone no longer names the field. */
const lineCaptionClass =
  "block text-[10px] font-bold uppercase tracking-wider text-slate-400 @3xl:hidden";
const primaryButtonClass =
  "rounded-full bg-solar-400 px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-navy-950 transition hover:bg-solar-300 disabled:opacity-60";
const ghostButtonClass =
  "rounded-full border border-slate-300 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 transition hover:border-slate-400 disabled:opacity-60";
const iconButtonClass =
  "rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-slate-400 hover:text-navy-900";

const KIND_LABELS: Record<string, string> = {
  fixed: "Fixed package",
  custom: "Built to order",
};

export default function SolarBoard({ initialData }: { initialData: SolarData }) {
  const [data, setData] = useState<SolarData>(initialData);
  // An empty catalogue opens on Products so the "load the starter catalogue"
  // prompt is the first thing seen. Once there is something to show, the
  // packages are the point, so it opens there.
  const [tab, setTab] = useState<Tab>(
    initialData.products.length === 0 ? "products" : "packages",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [productDraft, setProductDraft] = useState<ProductDraft | null>(null);
  const [packageDraft, setPackageDraft] = useState<PackageDraft | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const productIndex = useMemo(() => indexProducts(data.products), [data.products]);

  async function refresh() {
    const response = await fetch("/api/admin/solar", { cache: "no-store" });
    if (!response.ok) return;
    setData((await response.json()) as SolarData);
  }

  async function send(
    method: "POST" | "PATCH" | "DELETE",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<boolean> {
    if (busy) return false;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response = await fetch(path, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        const problem = (await response.json().catch(() => ({}))) as { error?: string };
        setError(problem.error ?? "Could not save that.");
        return false;
      }
      await refresh();
      return true;
    } catch {
      setError("Could not reach the server.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  /* ---------------- Starter catalogue ---------------- */

  async function loadStarter(reset: boolean) {
    const question = reset
      ? "Replace every product and package with the starter catalogue? Leads, jobs and finance are not touched."
      : "Load the starter catalogue from the Deye + Jinko workbook?";
    if (!confirm(question)) return;

    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response = await fetch("/api/admin/solar/seed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reset }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        products?: number;
        packages?: number;
      };
      if (!response.ok) {
        setError(payload.error ?? "Could not load the catalogue.");
        return;
      }
      await refresh();
      setNotice(
        `Loaded ${payload.products ?? 0} products and ${payload.packages ?? 0} packages. Prices are placeholders.`,
      );
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------------- Submissions ---------------- */

  async function saveProduct() {
    if (!productDraft) return;
    const payload = {
      brand: productDraft.brand,
      category: productDraft.category,
      model: productDraft.model,
      headline: productDraft.headline,
      specs: productDraft.specs,
      notes: productDraft.notes,
      costMinor: toMinor(productDraft.cost),
      freightMinor: toMinor(productDraft.freight),
      moq: Number(productDraft.moq) || 1,
      leadTime: productDraft.leadTime,
      supplier: productDraft.supplier,
      sourceUrl: productDraft.sourceUrl,
      warranty: productDraft.warranty,
      availability: productDraft.availability,
      active: productDraft.active,
    };
    const ok = productDraft.id
      ? await send("PATCH", `/api/admin/solar/products/${productDraft.id}`, payload)
      : await send("POST", "/api/admin/solar/products", payload);
    if (ok) setProductDraft(null);
  }

  async function savePackage() {
    if (!packageDraft) return;
    const payload = {
      name: packageDraft.name,
      sizeKwp: packageDraft.sizeKwp || null,
      kind: packageDraft.kind,
      sellPriceMinor: toMinor(packageDraft.sellPrice),
      markupPct: Number(packageDraft.markupPct) || 0,
      description: packageDraft.description,
      active: packageDraft.active,
      items: packageDraft.items.map((item) => ({
        productId: item.productId ? Number(item.productId) : null,
        label: item.label,
        qty: Number(item.qty) || 0,
        basis: item.basis,
        unitCostMinor: toMinor(item.unitCost),
      })),
    };
    const ok = packageDraft.id
      ? await send("PATCH", `/api/admin/solar/packages/${packageDraft.id}`, payload)
      : await send("POST", "/api/admin/solar/packages", payload);
    if (ok) setPackageDraft(null);
  }

  async function removeRow(kind: string, id: number, what: string) {
    if (!confirm(`Delete this ${what}?`)) return;
    await send("DELETE", `/api/admin/solar/${kind}/${id}`);
  }

  async function toggleProduct(product: SolarProduct) {
    await send("PATCH", `/api/admin/solar/products/${product.id}`, { active: !product.active });
  }

  function editProduct(product: SolarProduct) {
    setError("");
    setProductDraft({
      id: product.id,
      brand: product.brand,
      category: product.category,
      model: product.model,
      headline: product.headline,
      specs: product.specs,
      notes: product.notes,
      cost: majorInput(product.costMinor),
      freight: majorInput(product.freightMinor),
      moq: String(product.moq),
      leadTime: product.leadTime,
      supplier: product.supplier,
      sourceUrl: product.sourceUrl,
      warranty: product.warranty,
      availability: product.availability,
      active: product.active,
    });
    setTab("products");
  }

  function editPackage(pkg: SolarPackage) {
    setError("");
    setPackageDraft({
      id: pkg.id,
      name: pkg.name,
      sizeKwp: pkg.sizeKwp ? String(Number(pkg.sizeKwp)) : "",
      kind: pkg.kind,
      sellPrice: majorInput(pkg.sellPriceMinor),
      markupPct: String(Number(pkg.markupPct) || 0),
      description: pkg.description,
      active: pkg.active,
      items:
        pkg.items.length > 0
          ? pkg.items.map((item) => ({
              productId: item.productId ? String(item.productId) : "",
              label: item.label,
              qty: String(Number(item.qty)),
              basis: item.basis,
              unitCost: item.unitCostMinor ? majorInput(item.unitCostMinor) : "",
            }))
          : [{ ...EMPTY_ITEM }],
    });
    setTab("packages");
  }

  /* ---------------- Derived ---------------- */

  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return data.products.filter((product) => {
      if (categoryFilter !== "all" && product.category !== categoryFilter) return false;
      if (!needle) return true;
      return `${product.brand} ${product.model} ${product.headline} ${product.specs} ${product.supplier}`
        .toLowerCase()
        .includes(needle);
    });
  }, [data.products, search, categoryFilter]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of data.products) {
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    }
    return counts;
  }, [data.products]);

  /** The draft, run through the same maths the server would use. */
  const draftTotals = useMemo(() => {
    if (!packageDraft) return null;
    const pkg: SolarPackage = {
      id: packageDraft.id ?? 0,
      name: packageDraft.name,
      sizeKwp: packageDraft.sizeKwp || null,
      kind: packageDraft.kind,
      sellPriceMinor: toMinor(packageDraft.sellPrice),
      markupPct: packageDraft.markupPct || "0",
      description: packageDraft.description,
      active: packageDraft.active,
      items: packageDraft.items.map((item, index) => ({
        id: index,
        productId: item.productId ? Number(item.productId) : null,
        label: item.label,
        qty: item.qty || "0",
        basis: item.basis,
        unitCostMinor: toMinor(item.unitCost),
        sortOrder: index,
      })),
    };
    return packageTotals(pkg, productIndex);
  }, [packageDraft, productIndex]);

  const catalogue = useMemo(() => {
    let sellMinor = 0;
    let sizeKwp = 0;
    for (const pkg of data.packages) {
      const totals = packageTotals(pkg, productIndex);
      sellMinor += totals.sellMinor;
      sizeKwp += totals.sizeKwp;
    }
    return { sellMinor, sizeKwp, perKwpMinor: sizeKwp > 0 ? Math.round(sellMinor / sizeKwp) : 0 };
  }, [data.packages, productIndex]);

  const statCard = (label: string, value: string, hint: string) => (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1.5 text-base font-extrabold tracking-tight break-words text-navy-900 @xl:text-xl">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {hint}
      </p>
    </div>
  );

  /** The row actions, shared by the wide table and the narrow card. */
  const productActions = (product: SolarProduct) => (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => void toggleProduct(product)}
        className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:border-solar-400 hover:text-solar-600"
      >
        {product.active ? "Hide" : "Unhide"}
      </button>
      <button
        type="button"
        aria-label="Edit product"
        onClick={() => editProduct(product)}
        className={iconButtonClass}
      >
        <Icon name="Pencil" className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Delete product"
        onClick={() => void removeRow("products", product.id, "product")}
        className={`${iconButtonClass} hover:border-red-300 hover:text-red-500`}
      >
        <Icon name="Trash2" className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  /* ---------------- Products ---------------- */

  const productsTab = (
    <div className="space-y-5">
      {data.products.length === 0 ? (
        <section className="rounded-2xl border border-solar-300 bg-solar-50/60 p-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
            The catalogue is empty
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Load the 74 Deye and Jinko models from the procurement workbook. Model numbers, specs and
            categories are real. Prices in the workbook were blank, so they arrive as placeholders
            built around a 10 kWp system at &#8369;1.4 million — edit them once a supplier quotes.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadStarter(false)}
              disabled={busy}
              className={primaryButtonClass}
            >
              {busy ? "Loading…" : "Load starter catalogue"}
            </button>
            <button
              type="button"
              onClick={() => setProductDraft({ ...EMPTY_PRODUCT })}
              className={ghostButtonClass}
            >
              Add one product by hand
            </button>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
          {statCard("Products", String(data.products.length), `${data.products.filter((p) => p.active).length} active`)}
          {statCard("Packages", String(data.packages.length), `${data.packages.filter((p) => p.active).length} active`)}
          {statCard(
            "Catalogue sell value",
            money(catalogue.sellMinor),
            "sum of every package as priced",
          )}
          {statCard(
            "Packages per kWp",
            catalogue.perKwpMinor > 0 ? money(catalogue.perKwpMinor) : "—",
            `${catalogue.sizeKwp} kWp across ${data.packages.length} package(s)`,
          )}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
              Hardware catalogue
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              What we buy and what it costs us. Cost is never shown to a customer — packages carry
              the selling price.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setProductDraft(productDraft ? null : { ...EMPTY_PRODUCT })}
              className={primaryButtonClass}
            >
              {productDraft ? "Close" : "+ Add product"}
            </button>
          </div>
        </div>

        {productDraft ? (
          <div className="mt-4 rounded-2xl border border-solar-300 bg-solar-50/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass} htmlFor="prod-brand">
                  Brand
                </label>
                <input
                  id="prod-brand"
                  className={fieldClass}
                  value={productDraft.brand}
                  placeholder="Deye"
                  onChange={(event) =>
                    setProductDraft({ ...productDraft, brand: event.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="prod-category">
                  Category
                </label>
                <select
                  id="prod-category"
                  className={fieldClass}
                  value={productDraft.category}
                  onChange={(event) =>
                    setProductDraft({ ...productDraft, category: event.target.value })
                  }
                >
                  {PRODUCT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="prod-model">
                  Model
                </label>
                <input
                  id="prod-model"
                  className={fieldClass}
                  value={productDraft.model}
                  placeholder="SUN-10K-SG04LP3-EU"
                  onChange={(event) =>
                    setProductDraft({ ...productDraft, model: event.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="prod-headline">
                  Rated power or capacity
                </label>
                <input
                  id="prod-headline"
                  className={fieldClass}
                  value={productDraft.headline}
                  placeholder="10 kW"
                  onChange={(event) =>
                    setProductDraft({ ...productDraft, headline: event.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="prod-cost">
                  Cost to us
                </label>
                <input
                  id="prod-cost"
                  className={fieldClass}
                  value={productDraft.cost}
                  inputMode="decimal"
                  placeholder="0"
                  onChange={(event) =>
                    setProductDraft({ ...productDraft, cost: event.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="prod-freight">
                  Freight to Palawan
                </label>
                <input
                  id="prod-freight"
                  className={fieldClass}
                  value={productDraft.freight}
                  inputMode="decimal"
                  placeholder="0"
                  onChange={(event) =>
                    setProductDraft({ ...productDraft, freight: event.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="prod-supplier">
                  Supplier
                </label>
                <input
                  id="prod-supplier"
                  className={fieldClass}
                  value={productDraft.supplier}
                  placeholder="Local supplier"
                  onChange={(event) =>
                    setProductDraft({ ...productDraft, supplier: event.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="prod-lead">
                  Lead time
                </label>
                <input
                  id="prod-lead"
                  className={fieldClass}
                  value={productDraft.leadTime}
                  placeholder="2 weeks"
                  onChange={(event) =>
                    setProductDraft({ ...productDraft, leadTime: event.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="prod-moq">
                  Minimum order
                </label>
                <input
                  id="prod-moq"
                  className={fieldClass}
                  value={productDraft.moq}
                  inputMode="numeric"
                  onChange={(event) =>
                    setProductDraft({ ...productDraft, moq: event.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="prod-warranty">
                  Warranty
                </label>
                <input
                  id="prod-warranty"
                  className={fieldClass}
                  value={productDraft.warranty}
                  placeholder="5 years"
                  onChange={(event) =>
                    setProductDraft({ ...productDraft, warranty: event.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="prod-availability">
                  Availability
                </label>
                <input
                  id="prod-availability"
                  className={fieldClass}
                  value={productDraft.availability}
                  placeholder="In stock / on order"
                  onChange={(event) =>
                    setProductDraft({ ...productDraft, availability: event.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className={labelClass} htmlFor="prod-url">
                  Datasheet link
                </label>
                <input
                  id="prod-url"
                  className={fieldClass}
                  value={productDraft.sourceUrl}
                  placeholder="https://"
                  onChange={(event) =>
                    setProductDraft({ ...productDraft, sourceUrl: event.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={labelClass} htmlFor="prod-specs">
                  Specs
                </label>
                <input
                  id="prod-specs"
                  className={fieldClass}
                  value={productDraft.specs}
                  placeholder="Max PV 20 kW; battery 40-60 V; 3 MPPT; IP65"
                  onChange={(event) =>
                    setProductDraft({ ...productDraft, specs: event.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={labelClass} htmlFor="prod-notes">
                  Notes
                </label>
                <input
                  id="prod-notes"
                  className={fieldClass}
                  value={productDraft.notes}
                  placeholder="Anything the agent should know when recommending this"
                  onChange={(event) =>
                    setProductDraft({ ...productDraft, notes: event.target.value })
                  }
                />
              </div>
            </div>

            <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={productDraft.active}
                onChange={(event) =>
                  setProductDraft({ ...productDraft, active: event.target.checked })
                }
              />
              Active — the agent may quote this
            </label>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void saveProduct()}
                disabled={busy}
                className={primaryButtonClass}
              >
                {busy ? "Saving…" : productDraft.id ? "Save changes" : "Add product"}
              </button>
              <button
                type="button"
                onClick={() => setProductDraft(null)}
                className={ghostButtonClass}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Icon
              name="Search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              className="w-64 rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-solar-400 focus:ring-2 focus:ring-solar-400/30"
              value={search}
              placeholder="Search model, spec, supplier…"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                categoryFilter === "all"
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              All {data.products.length}
            </button>
            {PRODUCT_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                  categoryFilter === category
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                }`}
              >
                {CATEGORY_LABELS[category]} {categoryCounts.get(category) ?? 0}
              </button>
            ))}
          </div>
          {data.products.length > 0 ? (
            <button
              type="button"
              onClick={() => void loadStarter(true)}
              disabled={busy}
              className="ml-auto rounded-full border border-slate-300 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 transition hover:border-amber-400 hover:text-amber-700"
            >
              Reset to starter catalogue
            </button>
          ) : null}
        </div>

        {/* A real table once there is room, because aligned columns across rows
            are the point. Below that, one card per product. */}
        <div className="mt-4 hidden overflow-x-auto @4xl:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Freight</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Lead time</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className={product.active ? undefined : "opacity-50"}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-navy-900">{product.model}</p>
                    <p className="text-xs text-slate-500">
                      {product.brand}
                      {product.headline ? ` · ${product.headline}` : ""}
                    </p>
                    {product.specs ? (
                      <p className="mt-0.5 max-w-md truncate text-xs text-slate-400" title={product.specs}>
                        {product.specs}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {CATEGORY_LABELS[product.category as keyof typeof CATEGORY_LABELS] ??
                      product.category}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-navy-900">
                    {money(product.costMinor, product.currency)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                    {product.freightMinor > 0 ? money(product.freightMinor) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{product.supplier || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{product.leadTime || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">{productActions(product)}</div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && data.products.length > 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    Nothing matches that search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <ul className="mt-2 divide-y divide-slate-100 @4xl:hidden">
          {filteredProducts.map((product) => (
            <li key={product.id} className={`py-4 ${product.active ? "" : "opacity-50"}`}>
              <p className="font-semibold break-words text-navy-900">{product.model}</p>
              <p className="mt-0.5 text-xs break-words text-slate-500">
                {product.brand}
                {product.headline ? ` · ${product.headline}` : ""}
              </p>
              {/* On its own line: "Monitoring & accessory" is wide enough that
                  sitting beside the name squeezes it to a few characters. */}
              <span className="mt-1.5 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                {CATEGORY_LABELS[product.category as keyof typeof CATEGORY_LABELS] ??
                  product.category}
              </span>

              {product.specs ? (
                <p className="mt-2 text-xs break-words text-slate-400">{product.specs}</p>
              ) : null}

              <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5">
                <RowField label="Cost to us" value={money(product.costMinor, product.currency)} />
                <RowField
                  label="Freight"
                  value={product.freightMinor > 0 ? money(product.freightMinor) : "—"}
                  tone="muted"
                />
                <RowField label="Supplier" value={product.supplier || "—"} tone="muted" />
                <RowField label="Lead time" value={product.leadTime || "—"} tone="muted" />
              </dl>

              <div className="mt-2.5">{productActions(product)}</div>
            </li>
          ))}
          {filteredProducts.length === 0 && data.products.length > 0 ? (
            <li className="py-10 text-center text-sm text-slate-500">Nothing matches that search.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );

  /* ---------------- Packages ---------------- */

  /** The kind pill, shown next to the package name at every width. */
  const kindBadge = (pkg: SolarPackage) => (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        pkg.kind === "custom" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-800"
      }`}
    >
      {KIND_LABELS[pkg.kind] ?? pkg.kind}
    </span>
  );

  /** The package row actions, shared by the wide row and the narrow card. */
  const packageActions = (pkg: SolarPackage, isOpen: boolean) => (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setExpanded(isOpen ? null : pkg.id)}
        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:border-slate-400"
      >
        {isOpen ? "Hide lines" : "Lines"}
      </button>
      <button
        type="button"
        aria-label="Edit package"
        onClick={() => editPackage(pkg)}
        className={iconButtonClass}
      >
        <Icon name="Pencil" className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Delete package"
        onClick={() => void removeRow("packages", pkg.id, "package")}
        className={`${iconButtonClass} hover:border-red-300 hover:text-red-500`}
      >
        <Icon name="Trash2" className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const packagesTab = (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
              Total packages
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              A <strong>fixed package</strong> is a set bill of materials with one price. A{" "}
              <strong>built-to-order</strong> package is a recipe priced per kWp, so it scales to any
              size — including commercial work — and the inverter and battery are chosen to suit.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPackageDraft(packageDraft ? null : emptyPackage())}
            className={primaryButtonClass}
          >
            {packageDraft ? "Close" : "+ Add package"}
          </button>
        </div>

        {packageDraft ? (
          <div className="mt-4 rounded-2xl border border-solar-300 bg-solar-50/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className={labelClass} htmlFor="pkg-name">
                  Package name
                </label>
                <input
                  id="pkg-name"
                  className={fieldClass}
                  value={packageDraft.name}
                  placeholder="Home Hybrid 10 kWp"
                  onChange={(event) =>
                    setPackageDraft({ ...packageDraft, name: event.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="pkg-size">
                  Size (kWp)
                </label>
                <input
                  id="pkg-size"
                  className={fieldClass}
                  value={packageDraft.sizeKwp}
                  inputMode="decimal"
                  placeholder="10"
                  onChange={(event) =>
                    setPackageDraft({ ...packageDraft, sizeKwp: event.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="pkg-kind">
                  Type
                </label>
                <select
                  id="pkg-kind"
                  className={fieldClass}
                  value={packageDraft.kind}
                  onChange={(event) =>
                    setPackageDraft({ ...packageDraft, kind: event.target.value })
                  }
                >
                  {PACKAGE_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </div>

              {packageDraft.kind === "fixed" ? (
                <div>
                  <label className={labelClass} htmlFor="pkg-sell">
                    Customer price
                  </label>
                  <input
                    id="pkg-sell"
                    className={fieldClass}
                    value={packageDraft.sellPrice}
                    inputMode="decimal"
                    placeholder="1400000"
                    onChange={(event) =>
                      setPackageDraft({ ...packageDraft, sellPrice: event.target.value })
                    }
                  />
                </div>
              ) : (
                <div>
                  <label className={labelClass} htmlFor="pkg-markup">
                    Markup on cost (%)
                  </label>
                  <input
                    id="pkg-markup"
                    className={fieldClass}
                    value={packageDraft.markupPct}
                    inputMode="decimal"
                    placeholder="30"
                    onChange={(event) =>
                      setPackageDraft({ ...packageDraft, markupPct: event.target.value })
                    }
                  />
                </div>
              )}

              <div className="sm:col-span-2 lg:col-span-3">
                <label className={labelClass} htmlFor="pkg-desc">
                  Description
                </label>
                <input
                  id="pkg-desc"
                  className={fieldClass}
                  value={packageDraft.description}
                  placeholder="What this package suits"
                  onChange={(event) =>
                    setPackageDraft({ ...packageDraft, description: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="mt-4">
              <span className={labelClass}>What is in it</span>
              <p className="mt-1 text-xs text-slate-500">
                Pick a catalogue product, or leave it blank for a trade line and give an allowance —
                mounting, wiring and labour are not catalogue items. A line priced{" "}
                <em>per kWp</em> multiplies by the job size.
              </p>
              <div className="mt-2 space-y-2">
                {packageDraft.items.map((item, index) => {
                  const linked = item.productId ? productIndex.get(Number(item.productId)) : undefined;
                  const unit = item.productId
                    ? linked
                      ? linked.costMinor + linked.freightMinor
                      : 0
                    : toMinor(item.unitCost);
                  const qty = (Number(item.qty) || 0) * (item.basis === "per_kwp" ? Number(packageDraft.sizeKwp) || 0 : 1);
                  return (
                    <div
                      key={index}
                      className="grid gap-2 rounded-xl bg-white p-3 @3xl:grid-cols-[minmax(0,2fr)_5rem_7rem_8rem_auto] @3xl:items-center @3xl:p-2"
                    >
                      <div className="min-w-0">
                        <span className={lineCaptionClass}>Product</span>
                        <select
                          aria-label="Product"
                          className={smallFieldClass}
                          value={item.productId}
                          onChange={(event) => {
                            const next = [...packageDraft.items];
                            const chosen = event.target.value
                              ? productIndex.get(Number(event.target.value))
                              : undefined;
                            next[index] = {
                              ...next[index],
                              productId: event.target.value,
                              label:
                                next[index].label || (chosen ? `${chosen.brand} ${chosen.model}` : ""),
                            };
                            setPackageDraft({ ...packageDraft, items: next });
                          }}
                        >
                          <option value="">Trade line — no catalogue product</option>
                          {data.products.map((product) => (
                            <option key={product.id} value={String(product.id)}>
                              {product.brand} {product.model}
                              {product.headline ? ` — ${product.headline}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className={lineCaptionClass}>Qty</span>
                        <input
                          aria-label="Quantity"
                          className={smallFieldClass}
                          value={item.qty}
                          inputMode="decimal"
                          placeholder="1"
                          onChange={(event) => {
                            const next = [...packageDraft.items];
                            next[index] = { ...next[index], qty: event.target.value };
                            setPackageDraft({ ...packageDraft, items: next });
                          }}
                        />
                      </div>
                      <div>
                        <span className={lineCaptionClass}>Basis</span>
                        <select
                          aria-label="Pricing basis"
                          className={smallFieldClass}
                          value={item.basis}
                          onChange={(event) => {
                            const next = [...packageDraft.items];
                            next[index] = { ...next[index], basis: event.target.value };
                            setPackageDraft({ ...packageDraft, items: next });
                          }}
                        >
                          {ITEM_BASES.map((basis) => (
                            <option key={basis} value={basis}>
                              {basis === "each" ? "each" : "per kWp"}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="min-w-0">
                        <span className={lineCaptionClass}>
                          {item.productId ? "Line total" : "Allowance each"}
                        </span>
                        {item.productId ? (
                          <span className="block text-xs text-slate-500 @3xl:px-2 @3xl:text-right">
                            {money(unit)} each
                            <span className="block font-semibold text-navy-900">
                              {money(Math.round(qty * unit))}
                            </span>
                          </span>
                        ) : (
                          <input
                            aria-label="Allowance per unit"
                            className={smallFieldClass}
                            value={item.unitCost}
                            inputMode="decimal"
                            placeholder="allowance"
                            onChange={(event) => {
                              const next = [...packageDraft.items];
                              next[index] = { ...next[index], unitCost: event.target.value };
                              setPackageDraft({ ...packageDraft, items: next });
                            }}
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label="Remove line"
                        onClick={() =>
                          setPackageDraft({
                            ...packageDraft,
                            items:
                              packageDraft.items.length > 1
                                ? packageDraft.items.filter((_, i) => i !== index)
                                : [{ ...EMPTY_ITEM }],
                          })
                        }
                        className={`${iconButtonClass} justify-self-end hover:border-red-300 hover:text-red-500`}
                      >
                        <Icon name="X" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() =>
                  setPackageDraft({ ...packageDraft, items: [...packageDraft.items, { ...EMPTY_ITEM }] })
                }
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-solar-600 transition hover:text-solar-500"
              >
                <Icon name="Plus" className="h-3.5 w-3.5" /> Add line
              </button>
            </div>

            {draftTotals ? (
              <div className="mt-4 grid grid-cols-2 gap-3 @2xl:grid-cols-4">
                <div className="rounded-xl bg-white px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Cost to us
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-navy-900">
                    {money(draftTotals.costMinor)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {draftTotals.sizeKwp > 0 ? `${money(draftTotals.costPerKwpMinor)} per kWp` : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-white px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Customer pays
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-navy-900">
                    {money(draftTotals.sellMinor)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {draftTotals.sizeKwp > 0 ? `${money(draftTotals.sellPerKwpMinor)} per kWp` : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-white px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Gross profit
                  </p>
                  <p
                    className={`mt-1 text-lg font-extrabold ${
                      draftTotals.profitMinor >= 0 ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {money(draftTotals.profitMinor)}
                  </p>
                  <p className="text-[11px] text-slate-400">{percent(draftTotals.marginPct)} margin</p>
                </div>
                {packageDraft.kind === "custom" ? (
                  <div className="rounded-xl bg-white px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      At {TOP_SIZE_KWP} kWp
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-navy-900">
                      {money(
                        packageTotals(
                          {
                            id: 0,
                            name: "",
                            sizeKwp: String(TOP_SIZE_KWP),
                            kind: "custom",
                            sellPriceMinor: 0,
                            markupPct: packageDraft.markupPct || "0",
                            description: "",
                            active: true,
                            items: packageDraft.items.map((item, index) => ({
                              id: index,
                              productId: item.productId ? Number(item.productId) : null,
                              label: item.label,
                              qty: item.qty || "0",
                              basis: item.basis,
                              unitCostMinor: toMinor(item.unitCost),
                              sortOrder: index,
                            })),
                          },
                          productIndex,
                          TOP_SIZE_KWP,
                        ).sellMinor,
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400">top of the range</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void savePackage()}
                disabled={busy}
                className={primaryButtonClass}
              >
                {busy ? "Saving…" : packageDraft.id ? "Save changes" : "Add package"}
              </button>
              <button
                type="button"
                onClick={() => setPackageDraft(null)}
                className={ghostButtonClass}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <ul className="mt-4 divide-y divide-slate-100">
          {data.packages.map((pkg) => {
            const totals = packageTotals(pkg, productIndex);
            const isOpen = expanded === pkg.id;
            return (
              <li key={pkg.id} className={`py-3 ${pkg.active ? "" : "opacity-50"}`}>
                <div className="hidden items-center gap-3 @3xl:flex">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold break-words text-navy-900">
                      {pkg.name} <span className="ml-1 align-middle">{kindBadge(pkg)}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {totals.sizeKwp > 0 ? `${totals.sizeKwp} kWp` : "no size set"} ·{" "}
                      {pkg.items.length} line(s)
                      {pkg.description ? ` · ${pkg.description}` : ""}
                    </p>
                  </div>
                  <div className="w-32 shrink-0 text-right text-xs text-slate-500">
                    <p>cost {money(totals.costMinor)}</p>
                    {pkg.kind === "custom" ? (
                      <p>+{Number(pkg.markupPct) || 0}% on cost</p>
                    ) : (
                      <p>
                        {totals.sizeKwp > 0 ? `${money(totals.sellPerKwpMinor)} per kWp` : "—"}
                      </p>
                    )}
                  </div>
                  <div className="w-32 shrink-0 text-right">
                    <p className="text-sm font-extrabold tabular-nums text-navy-900">
                      {money(totals.sellMinor)}
                    </p>
                    <p
                      className={`text-[11px] font-semibold ${
                        totals.profitMinor >= 0 ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {money(totals.profitMinor)} · {percent(totals.marginPct)}
                    </p>
                  </div>
                  {packageActions(pkg, isOpen)}
                </div>

                {/* Below that the same row cannot hold its five columns, so the
                    fields stack and each one carries its own label. */}
                <div className="@3xl:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-semibold break-words text-navy-900">{pkg.name}</p>
                    <span className="shrink-0">{kindBadge(pkg)}</span>
                  </div>
                  <p className="mt-0.5 text-xs break-words text-slate-500">
                    {totals.sizeKwp > 0 ? `${totals.sizeKwp} kWp` : "no size set"} ·{" "}
                    {pkg.items.length} line(s)
                  </p>
                  {pkg.description ? (
                    <p className="mt-1 text-xs break-words text-slate-500">{pkg.description}</p>
                  ) : null}

                  <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5">
                    <RowField label="Cost to us" value={money(totals.costMinor)} />
                    <RowField
                      label="Pricing rule"
                      value={
                        pkg.kind === "custom"
                          ? `+${Number(pkg.markupPct) || 0}% on cost`
                          : totals.sizeKwp > 0
                            ? `${money(totals.sellPerKwpMinor)}/kWp`
                            : "—"
                      }
                      tone="muted"
                    />
                    <RowField
                      label="Customer pays"
                      value={money(totals.sellMinor)}
                      tone="strong"
                    />
                    <RowField
                      label="Profit"
                      value={`${money(totals.profitMinor)} · ${percent(totals.marginPct)}`}
                      tone={totals.profitMinor >= 0 ? "good" : "bad"}
                    />
                  </dl>

                  <div className="mt-2.5">{packageActions(pkg, isOpen)}</div>
                </div>

                {isOpen ? (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <ul className="divide-y divide-slate-200 text-xs">
                      {pkg.items.map((item: PackageItem) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-slate-700">
                              {itemLabel(item, productIndex)}
                            </p>
                            <p className="mt-0.5 text-slate-500">
                              {qtyLabel(item)} × {money(itemUnitCostMinor(item, productIndex))}
                              {item.basis === "per_kwp" ? ` × ${totals.sizeKwp} kWp` : ""}
                            </p>
                          </div>
                          <p className="shrink-0 font-semibold tabular-nums text-navy-900">
                            {money(
                              Math.round(
                                (Number(item.qty) || 0) *
                                  itemUnitCostMinor(item, productIndex) *
                                  (item.basis === "per_kwp" ? totals.sizeKwp : 1),
                              ),
                            )}
                          </p>
                        </li>
                      ))}
                      {pkg.items.length === 0 ? (
                        <li className="py-4 text-center text-slate-500">
                          No lines yet — open the package and add what is in it.
                        </li>
                      ) : null}
                    </ul>
                    {pkg.kind === "custom" ? (
                      <p className="mt-2 text-[11px] text-slate-500">
                        Priced per kWp. At {TOP_SIZE_KWP} kWp this package quotes{" "}
                        {money(packageTotals(pkg, productIndex, TOP_SIZE_KWP).sellMinor)}
                        {packageTotals(pkg, productIndex, TOP_SIZE_KWP).sizeKwp > 0
                          ? ` (${money(packageTotals(pkg, productIndex, TOP_SIZE_KWP).sellPerKwpMinor)} per kWp)`
                          : ""}
                        .
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
          {data.packages.length === 0 ? (
            <li className="py-8 text-center text-sm text-slate-500">
              No packages yet. Load the starter catalogue from the Products tab, or add one by hand.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );

  return (
    // `@container`: everything inside responds to the width this board actually
    // gets, not the viewport. Next to a 256px sidebar a "desktop" viewport can
    // still leave this column phone-width, and a container query reads that
    // correctly where a `md:` breakpoint would not.
    <div className="@container space-y-5">
      <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Icon name="TriangleAlert" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Prices here started as placeholders, worked back from a 10 kWp installed system at
          &#8369;1.4 million. Model numbers and specs are real; every number is editable. Replace them
          with supplier quotes before a customer sees a figure.
        </span>
      </p>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider transition ${
              tab === item.value
                ? "border-navy-900 bg-navy-900 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            <Icon name={item.icon} className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "products" ? productsTab : null}
      {tab === "packages" ? packagesTab : null}
    </div>
  );
}
