// Costing engine — ported from Rice_Simple_Cost_Sheet. Pay-a-mill (column B) vs
// own mini-miller (column C), break-even cost/kg, and miller ROI/payback.
// Pure functions; the spreadsheet is the spec (see Verification in the plan).

export type CostingInputs = {
  palayPricePerKg: number;
  palayKg: number;
  dryingTotal: number;
  packagingTotal: number;
  otherTotal: number;
  sellingPricePerKg: number;
  marketPricePerKg: number;

  // Pay a rice mill
  millMillingPricePerKg: number;
  millTransportTotal: number;
  millRecovery: number;

  // Own mini miller
  ownMotorKw: number;
  ownElectricityRate: number; // ₱ per kWh
  ownMaintenancePerKg: number; // ₱ per kg palay
  ownCapacityKgPerHr: number;
  ownTransportTotal: number;
  ownRecovery: number;
  millerPrice: number;
};

export type MethodMetrics = {
  palayCost: number;
  millingPricePerKg: number;
  millingTotal: number;
  totalOtherCosts: number;
  totalBatchCost: number;
  riceKg: number;
  costPerKg: number;
  profitPerKg: number;
  salesIfAllSold: number;
  profitFromBatch: number;
  competitive: boolean;
};

export type CostingResult = {
  mill: MethodMetrics;
  own: MethodMetrics;
  ownMilling: { electricityCostPerHr: number; hoursToMill: number };
  roi: {
    extraProfitPerBatch: number;
    batchesToPayback: number;
    palayKgToPayback: number;
  };
};

type Common = {
  palayPricePerKg: number;
  palayKg: number;
  dryingTotal: number;
  packagingTotal: number;
  otherTotal: number;
};

function methodMetrics(
  c: Common,
  millingPricePerKg: number,
  transportTotal: number,
  recovery: number,
  sellingPricePerKg: number,
  marketPricePerKg: number,
): MethodMetrics {
  const palayCost = c.palayPricePerKg * c.palayKg;
  const millingTotal = millingPricePerKg * c.palayKg;
  const totalOtherCosts =
    c.dryingTotal + millingTotal + transportTotal + c.packagingTotal + c.otherTotal;
  const totalBatchCost = palayCost + totalOtherCosts;
  const riceKg = c.palayKg * recovery;
  const costPerKg = riceKg > 0 ? totalBatchCost / riceKg : 0;
  const profitPerKg = sellingPricePerKg - costPerKg;
  const salesIfAllSold = sellingPricePerKg * riceKg;
  const profitFromBatch = salesIfAllSold - totalBatchCost;
  const competitive = sellingPricePerKg <= marketPricePerKg;

  return {
    palayCost,
    millingPricePerKg,
    millingTotal,
    totalOtherCosts,
    totalBatchCost,
    riceKg,
    costPerKg,
    profitPerKg,
    salesIfAllSold,
    profitFromBatch,
    competitive,
  };
}

export function computeCosting(i: CostingInputs): CostingResult {
  const common: Common = {
    palayPricePerKg: i.palayPricePerKg,
    palayKg: i.palayKg,
    dryingTotal: i.dryingTotal,
    packagingTotal: i.packagingTotal,
    otherTotal: i.otherTotal,
  };

  const mill = methodMetrics(
    common,
    i.millMillingPricePerKg,
    i.millTransportTotal,
    i.millRecovery,
    i.sellingPricePerKg,
    i.marketPricePerKg,
  );

  // Own-miller milling cost per kg = electricity/capacity + maintenance.
  const electricityCostPerHr = i.ownMotorKw * i.ownElectricityRate;
  const ownMillingPricePerKg =
    (i.ownCapacityKgPerHr > 0 ? electricityCostPerHr / i.ownCapacityKgPerHr : 0) +
    i.ownMaintenancePerKg;

  const own = methodMetrics(
    common,
    ownMillingPricePerKg,
    i.ownTransportTotal,
    i.ownRecovery,
    i.sellingPricePerKg,
    i.marketPricePerKg,
  );

  const hoursToMill =
    i.ownCapacityKgPerHr > 0 ? i.palayKg / i.ownCapacityKgPerHr : 0;
  const extraProfitPerBatch = own.profitFromBatch - mill.profitFromBatch;
  const extraProfitPerKgPalay =
    i.palayKg > 0 ? extraProfitPerBatch / i.palayKg : 0;
  const batchesToPayback =
    extraProfitPerBatch > 0 ? i.millerPrice / extraProfitPerBatch : Infinity;
  const palayKgToPayback =
    extraProfitPerKgPalay > 0 ? i.millerPrice / extraProfitPerKgPalay : Infinity;

  return {
    mill,
    own,
    ownMilling: { electricityCostPerHr, hoursToMill },
    roi: { extraProfitPerBatch, batchesToPayback, palayKgToPayback },
  };
}

export const defaultCostingInputs: CostingInputs = {
  palayPricePerKg: 22,
  palayKg: 4118,
  dryingTotal: 4340,
  packagingTotal: 1783,
  otherTotal: 0,
  sellingPricePerKg: 60,
  marketPricePerKg: 60,
  millMillingPricePerKg: 4,
  millTransportTotal: 2786,
  millRecovery: 0.62,
  ownMotorKw: 2.2,
  ownElectricityRate: 12,
  ownMaintenancePerKg: 0.3,
  ownCapacityKgPerHr: 120,
  ownTransportTotal: 1393,
  ownRecovery: 0.6,
  millerPrice: 15000,
};
