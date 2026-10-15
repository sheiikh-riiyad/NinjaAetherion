import assert from "node:assert/strict";
import { test } from "node:test";
import { installmentAvailability, installmentKey, installments, parseOrderBudget, successfulInstallment } from "../src/lib/installments.ts";
test("20/50/30 installments sum to the budget including rounding", () => {
  assert.deepEqual(installments(1000000), [200000, 500000, 300000]);
  for (const total of [100, 101, 999, 10001, 99999999]) {
    const amounts = installments(total);
    assert.equal(amounts.reduce((sum, value) => sum + value, 0), total);
    assert.ok(amounts.every(Number.isInteger));
  }
});
test("installments unlock sequentially at the correct project stages", () => {
  assert.deepEqual(installmentAvailability("Review", [false, false, false]), [true, false, false]);
  assert.deepEqual(installmentAvailability("Building", [true, false, false]), [true, false, false]);
  assert.deepEqual(installmentAvailability("Review", [true, false, false]), [true, true, false]);
  assert.deepEqual(installmentAvailability("Delivered", [true, false, false]), [true, true, false]);
  assert.deepEqual(installmentAvailability("Delivered", [true, true, false]), [true, true, true]);
});
test("receipts are tied to the order, budget, currency and installment", () => {
  const id = installmentKey("order-1", 0, 10000, "BDT");
  const receipt = { mode: "demo", orderId: id, outcome: "success", amountMinor: 2000, currency: "BDT" };
  assert.equal(successfulInstallment(receipt, id, 2000, "BDT"), true);
  assert.equal(successfulInstallment(receipt, id, 2000, "USD"), false);
  assert.equal(successfulInstallment(receipt, id, 3000, "BDT"), false);
  assert.equal(successfulInstallment(receipt, installmentKey("order-1", 1, 10000, "BDT"), 2000, "BDT"), false);
  assert.equal(successfulInstallment({ ...receipt, outcome: "declined" }, id, 2000, "BDT"), false);
  assert.notEqual(id, installmentKey("order-1", 0, 20000, "BDT"));
});
test("budget parsing supports canonical and older grouped budgets", () => {
  assert.deepEqual(parseOrderBudget("BDT 20000.00"), { total: 2000000, currency: "BDT" });
  assert.deepEqual(parseOrderBudget("USD 20,000"), { total: 2000000, currency: "USD" });
  for (const value of ["20,000", "BDT 0.01", "BDT 2,00", "USD 1000000", "BDT -10"]) assert.equal(parseOrderBudget(value), null);
});
