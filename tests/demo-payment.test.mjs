import assert from "node:assert/strict";
import { test } from "node:test";
import { demoAmountMinor, readDemoReceipt } from "../src/lib/demo-payment.ts";

test("demo amounts use integer minor units without floating-point rounding", () => {
  assert.equal(demoAmountMinor("0.01"), 1);
  assert.equal(demoAmountMinor("10.1"), 1010);
  assert.equal(demoAmountMinor("999999.99"), 99999999);
  for (const invalid of ["0", "-2", "1.999", "1e3", "NaN", "", "1000000", "5 USD"]) assert.equal(demoAmountMinor(invalid), null);
});
test("stored results must be demo receipts for the current order", () => {
  const receipt = { mode: "demo", orderId: "order-1", reference: "DEMO-TEST", amountMinor: 100, currency: "BDT", outcome: "success", createdAt: "2026-10-16T00:00:00Z" };
  assert.deepEqual(readDemoReceipt(JSON.stringify(receipt), "order-1"), receipt);
  assert.equal(readDemoReceipt(JSON.stringify(receipt), "order-2"), null);
  for (const invalid of [{ ...receipt, mode: "live" }, { ...receipt, amountMinor: -1 }, { ...receipt, currency: "FAKE" }, { ...receipt, createdAt: "bad-date" }, { ...receipt, reference: "LIVE-123" }]) assert.equal(readDemoReceipt(JSON.stringify(invalid), "order-1"), null);
  assert.equal(readDemoReceipt("broken json", "order-1"), null);
  assert.equal(readDemoReceipt(null, "order-1"), null);
});
