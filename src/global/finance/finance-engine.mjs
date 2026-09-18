export function calculateQuote(items = []) {
  const totals = {
    subtotal: 0,
    governmentFees: 0,
    serviceFees: 0,
    taxAmount: 0,
    discounts: 0,
    total: 0
  };
  for (const item of items) {
    const quantity = Number(item.quantity ?? 1);
    const unit = Number(item.unitAmount ?? 0);
    const amount = quantity * unit;
    switch (item.type) {
      case "government_fee": totals.governmentFees += amount; break;
      case "service_fee": totals.serviceFees += amount; break;
      case "tax": totals.taxAmount += amount; break;
      case "discount": totals.discounts += Math.abs(amount); break;
      default: totals.subtotal += amount; break;
    }
  }
  totals.total = totals.subtotal + totals.governmentFees + totals.serviceFees + totals.taxAmount - totals.discounts;
  return totals;
}

export function assertPaymentReady({ amount, currency, approvalRequired = false, approvalGranted = false }) {
  if (!Number.isFinite(Number(amount)) || Number(amount) < 0) throw new Error("invalid amount");
  if (!/^[A-Z]{3}$/.test(String(currency || ""))) throw new Error("invalid currency");
  if (approvalRequired && !approvalGranted) throw new Error("payment approval required");
  return true;
}
