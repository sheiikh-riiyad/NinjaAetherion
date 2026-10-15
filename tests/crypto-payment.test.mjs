import assert from "node:assert/strict";
import { test } from "node:test";
import { validNetworkAddress, walletAddress, cryptoQuote } from "../src/lib/crypto-payment.ts";
const common = "0x" + "a".repeat(40);
const tron = "T" + "A".repeat(33);
const settings = { address: common, trc20Address: tron, bep20Address: "", polygonAddress: "", coin: "USDT", usdRate: 1, bdtRate: 120 };
test("common addresses are never reused across incompatible network formats", () => {
  assert.equal(walletAddress(settings, "BEP20"), common);
  assert.equal(walletAddress(settings, "Polygon"), common);
  assert.equal(walletAddress(settings, "TRC20"), tron);
  assert.equal(walletAddress({ ...settings, trc20Address: "" }, "TRC20"), "");
  assert.equal(validNetworkAddress(tron, "BEP20"), false);
  assert.equal(walletAddress({ ...settings, polygonAddress: "not-an-address" }, "Polygon"), "");
});
test("quotes use explicit owner-configured rates and never guess a missing conversion", () => {
  assert.equal(cryptoQuote(20000, "USD", settings), 200);
  assert.equal(cryptoQuote(240000, "BDT", settings), 20);
  assert.equal(cryptoQuote(100, "USD", { ...settings, usdRate: 3 }), 0.333334);
  for (const rate of [0, -1, NaN, Infinity]) assert.equal(cryptoQuote(20000, "USD", { ...settings, usdRate: rate }), null);
  assert.equal(cryptoQuote(20000, "EUR", settings), null);
});
