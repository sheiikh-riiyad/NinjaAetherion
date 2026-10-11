import test from "node:test";
import assert from "node:assert/strict";
import { presenceStatus } from "../src/lib/presence.ts";

const now = 1_000_000;
const session = (lastActiveAt, online = true) => ({ uid: "client", admin: false, online, lastActiveAt });
test("a fresh heartbeat shows active now", () => assert.equal(presenceStatus([session(now - 30_000)], now).active, true));
test("a crashed tab expires after 90 seconds", () => assert.equal(presenceStatus([session(now - 90_000)], now).active, false));
test("one closed tab does not hide an active second tab", () => assert.equal(presenceStatus([session(now, false), session(now - 20_000)], now).active, true));
test("offline users retain their last active time", () => assert.deepEqual(presenceStatus([session(now - 180_000, false)], now), { active: false, lastActiveAt: now - 180_000, label: "Active 3m ago" }));
test("missing activity never invents online status", () => assert.equal(presenceStatus([], now).label, "Activity unavailable"));
