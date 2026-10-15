import assert from "node:assert/strict";
import { test } from "node:test";
import { clientLevel, canAdvanceOrder } from "../src/lib/orders.ts";

test("client levels require completed projects and reset progress at the next tier", () => {
  assert.deepEqual(clientLevel(0), { name: "New Client", next: "Returning Client", remaining: 2, progress: 0 });
  assert.equal(clientLevel(1).progress, 50);
  assert.deepEqual(clientLevel(2), { name: "Returning Client", next: "Trusted Partner", remaining: 3, progress: 0 });
  assert.equal(clientLevel(4).remaining, 1);
  assert.deepEqual(clientLevel(5), { name: "Trusted Partner", next: null, remaining: 0, progress: 100 });
  assert.equal(clientLevel(20).progress, 100);
});

test("progress allows updates at the current stage or the immediate next stage", () => {
  assert.equal(canAdvanceOrder("Requested", "Requested"), true);
  assert.equal(canAdvanceOrder("Requested", "Accepted"), true);
  assert.equal(canAdvanceOrder("Review", "Delivered"), true);
  assert.equal(canAdvanceOrder("Delivered", "Delivered"), true);
  assert.equal(canAdvanceOrder("Requested", "Delivered"), false);
  assert.equal(canAdvanceOrder("Building", "Accepted"), false);
  assert.equal(canAdvanceOrder("Delivered", "Review"), false);
  assert.equal(canAdvanceOrder("Unknown", "Accepted"), false);
});
