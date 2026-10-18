/**
 * Pure ROI / sizing engine — NO server-only imports, so it can run in the
 * browser (live quote estimator) and on the server (proposal generation).
 * Keep this module free of `db`, `process.env` and Node built-ins.
 */

export const ENERGY_ASSUMPTIONS = {
  gridTariffPhpPerKwh: 12.5,
  dieselTariffPhpPerKwh: 28.0,
  peakSunHours: 4.8,
  performanceRatio: 0.8,
  installedCostPhpPerKw: 72000,
  batteryCostPhpPerKwh: 26000,
  annualDegradation: 0.005,
  annualOmPhp: 6000,
};

export type RoiInput = {
  energyUsageKwh?: number | string | null;
  monthlyBillPhp?: number | string | null;
  gridState?: string;
  propertyType?: string;
};

export type RoiModel = {
  dailyUsageKwh: number;
  systemSizeKw: number;
  batteryKwh: number;
  estimatedCostPhp: number;
  monthlySavingsPhp: number;
  annualSavingsPhp: number;
  paybackYears: number;
  twentyFiveYearSavingsPhp: number;
  co2TonnesPerYear: number;
  tariffPhpPerKwh: number;
  assumptions: string[];
};

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function tariffFor(gridState: string): number {
  if (gridState === "generator" || gridState === "off_grid") {
    return ENERGY_ASSUMPTIONS.dieselTariffPhpPerKwh;
  }
  if (gridState === "rationed") {
    return (ENERGY_ASSUMPTIONS.dieselTariffPhpPerKwh + ENERGY_ASSUMPTIONS.gridTariffPhpPerKwh) / 2;
  }
  return ENERGY_ASSUMPTIONS.gridTariffPhpPerKwh;
}

function autonomyFactor(gridState: string): number {
  switch (gridState) {
    case "off_grid":
      return 1.6;
    case "generator":
      return 1.3;
    case "rationed":
      return 1.1;
    case "unstable":
      return 0.9;
    default:
      return 0.5;
  }
}

/** Deterministic ROI engine — runs identically in browser and server. */
export function computeRoi(input: RoiInput): RoiModel {
  const gridState = input.gridState ?? "unstable";
  const tariff = tariffFor(gridState);
  const billPhp = toNumber(input.monthlyBillPhp);
  const statedKwh = toNumber(input.energyUsageKwh);

  const defaultByType: Record<string, number> = {
    residential: 450,
    commercial: 2600,
    industrial_marine: 9000,
    maintenance: 800,
  };

  const monthlyKwh =
    statedKwh > 0
      ? statedKwh
      : billPhp > 0
        ? billPhp / tariff
        : (defaultByType[input.propertyType ?? ""] ?? 600);

  const dailyUsageKwh = monthlyKwh / 30;
  const productionPerKw = ENERGY_ASSUMPTIONS.peakSunHours * ENERGY_ASSUMPTIONS.performanceRatio;

  const rawSize = dailyUsageKwh / productionPerKw;
  const systemSizeKw = Math.max(3, Math.round(rawSize * 2) / 2);
  const batteryKwh = Math.max(5, Math.round(dailyUsageKwh * autonomyFactor(gridState)));

  const estimatedCostPhp =
    systemSizeKw * ENERGY_ASSUMPTIONS.installedCostPhpPerKw +
    batteryKwh * ENERGY_ASSUMPTIONS.batteryCostPhpPerKwh;

  const annualProductionKwh = systemSizeKw * productionPerKw * 365;
  const offsetKwh = Math.min(annualProductionKwh, monthlyKwh * 12);
  const annualSavingsPhp = Math.max(0, offsetKwh * tariff - ENERGY_ASSUMPTIONS.annualOmPhp);
  const monthlySavingsPhp = annualSavingsPhp / 12;
  const paybackYears = annualSavingsPhp > 0 ? estimatedCostPhp / annualSavingsPhp : 25;

  let cumulative = 0;
  for (let year = 1; year <= 25; year += 1) {
    cumulative += annualSavingsPhp * (1 - ENERGY_ASSUMPTIONS.annualDegradation) ** (year - 1);
  }

  return {
    dailyUsageKwh: Number(dailyUsageKwh.toFixed(2)),
    systemSizeKw,
    batteryKwh,
    estimatedCostPhp: Math.round(estimatedCostPhp),
    monthlySavingsPhp: Math.round(monthlySavingsPhp),
    annualSavingsPhp: Math.round(annualSavingsPhp),
    paybackYears: Number(paybackYears.toFixed(2)),
    twentyFiveYearSavingsPhp: Math.round(cumulative - estimatedCostPhp),
    co2TonnesPerYear: Number(((annualProductionKwh * 0.68) / 1000).toFixed(2)),
    tariffPhpPerKwh: tariff,
    assumptions: [
      `${ENERGY_ASSUMPTIONS.peakSunHours} peak sun hours, ${ENERGY_ASSUMPTIONS.performanceRatio * 100}% performance ratio`,
      `Energy priced at PHP ${tariff.toFixed(2)}/kWh for this grid state`,
      `Installed cost PHP ${ENERGY_ASSUMPTIONS.installedCostPhpPerKw}/kW + PHP ${ENERGY_ASSUMPTIONS.batteryCostPhpPerKwh}/kWh storage`,
      `${ENERGY_ASSUMPTIONS.annualDegradation * 100}% annual degradation, PHP ${ENERGY_ASSUMPTIONS.annualOmPhp}/yr O&M`,
    ],
  };
}

export const php = (value: number) =>
  `PHP ${Math.round(value).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
