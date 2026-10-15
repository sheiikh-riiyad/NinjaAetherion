// Run only against the local Firestore emulator, never a live Firebase project.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
const project = "demo-ninja-crypto";
const database = `projects/${project}/databases/(default)`;
const endpoint = `http://127.0.0.1:8085/v1/${database}/documents`;
function token(uid) {
  const now = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ iss: `https://securetoken.google.com/${project}`, aud: project, sub: uid, user_id: uid, iat: now, exp: now + 3600, email: `${uid}@example.test`, firebase: { sign_in_provider: "custom" } })}.`;
}
function value(data) {
  if (typeof data === "string") return { stringValue: data };
  if (typeof data === "boolean") return { booleanValue: data };
  if (typeof data === "number") return Number.isInteger(data) ? { integerValue: String(data) } : { doubleValue: data };
  return { mapValue: { fields: Object.fromEntries(Object.entries(data).map(([key, item]) => [key, value(item)])) } };
}
function write(path, data, timestamps = [], mask) {
  const result = { update: { name: `${database}/documents/${path}`, fields: value(data).mapValue.fields } };
  if (timestamps.length) result.updateTransforms = timestamps.map(fieldPath => ({ fieldPath, setToServerValue: "REQUEST_TIME" }));
  if (mask) result.updateMask = { fieldPaths: mask };
  return result;
}
async function commit(auth, writes, expected = 200) {
  const response = await fetch(`${endpoint}:commit`, { method: "POST", headers: { authorization: `Bearer ${auth}`, "content-type": "application/json" }, body: JSON.stringify({ writes }) });
  const body = await response.text(); assert.equal(response.status, expected, body);
}
test("crypto proofs enforce ownership, amounts, stages, admin review and unique verified transactions", async () => {
  const admin = token("admin1"); const client = token("client1"); const other = token("other1");
  const orderId = `crypto-test-${Date.now()}`;
  const address = "0x" + "a".repeat(40);
  const txid = createHash("sha256").update(orderId).digest("hex");
  await commit("owner", [write("users/admin1", { admin: true, name: "Owner" }), write("users/client1", { admin: false, name: "Client" }), write("users/other1", { admin: false, name: "Other" })]);
  const wallet = { address, trc20Address: "T" + "A".repeat(33), bep20Address: "", polygonAddress: "", coin: "USDT", usdRate: 1, bdtRate: 0 };
  await commit(client, [write("payment/binance", wallet, ["updatedAt"])], 403);
  await commit(admin, [write("payment/binance", wallet, ["updatedAt"])]);
  const order = { clientId: "client1", clientName: "Client", service: "Website", title: "Test project", description: "Emulator-only project", budget: "USD 1000.00", budgetMinor: 100000, currency: "USD", paymentMode: "crypto", deadline: "", referenceUrl: "", status: "Requested", update: "", deliveryUrl: "" };
  await commit(client, [write(`orders/${orderId}`, order, ["createdAt", "updatedAt"])]);
  const advance = status => commit(admin, [write(`orders/${orderId}`, { status, update: `Stage ${status}` }, ["updatedAt"], ["status", "update"])]);
  await commit(admin, [write(`orders/${orderId}`, { status: "Accepted", update: "Starting" }, ["updatedAt"], ["status", "update"])], 403);
  const evidence = { clientId: "client1", installment: 0, status: "pending", amountMinor: 20000, currency: "USD", coin: "USDT", network: "BEP20", address, cryptoAmount: 200, rate: 1, txid, screenshot: { path: `paymentProofs/${orderId}/client1/0/${"A".repeat(20)}/screenshot`, name: "proof.png", size: 1024, type: "image/png" } };
  const proofPath = `orders/${orderId}/cryptoPayments/0`;
  await commit(client, [write(`orders/${orderId}`, { budgetMinor: 100 }, [], ["budgetMinor"])], 403);
  await commit(other, [write(proofPath, evidence, ["createdAt"])], 403);
  await commit(client, [write(proofPath, { ...evidence, amountMinor: 1 }, ["createdAt"])], 403);
  await commit(client, [write(proofPath, { ...evidence, address: "0x" + "b".repeat(40) }, ["createdAt"])], 403);
  await commit(client, [write(proofPath, evidence, ["createdAt"])]);
  await commit(client, [write(`orders/${orderId}/cryptoPayments/1`, { ...evidence, installment: 1, amountMinor: 50000, cryptoAmount: 500, screenshot: { ...evidence.screenshot, path: `paymentProofs/${orderId}/client1/1/${"B".repeat(20)}/screenshot` } }, ["createdAt"])], 403);
  await commit(client, [write(proofPath, { status: "verified" }, ["reviewedAt"], ["status"])], 403);
  await commit(admin, [write(proofPath, { status: "verified" }, ["reviewedAt"], ["status"])], 403);
  await commit(admin, [write(`cryptoTransactions/BEP20_${txid}`, { orderId, installment: 0, network: "BEP20", txid }, ["verifiedAt"]), write(proofPath, { status: "verified" }, ["reviewedAt"], ["status"])]);
  await advance("Accepted"); await advance("Building"); await advance("Review");
  const second = { ...evidence, installment: 1, amountMinor: 50000, cryptoAmount: 500, screenshot: { ...evidence.screenshot, path: `paymentProofs/${orderId}/client1/1/${"B".repeat(20)}/screenshot` } };
  await commit(client, [write(`orders/${orderId}/cryptoPayments/1`, second, ["createdAt"])]);
  // Reusing the already-verified transaction hash for another installment must fail.
  await commit(admin, [write(`cryptoTransactions/BEP20_${txid}`, { orderId, installment: 1, network: "BEP20", txid }, ["verifiedAt"]), write(`orders/${orderId}/cryptoPayments/1`, { status: "verified" }, ["reviewedAt"], ["status"])], 403);
  await commit(admin, [write(`orders/${orderId}`, { status: "Delivered", update: "Finished" }, ["updatedAt"], ["status", "update"])], 403);
  await commit(admin, [write(`orders/${orderId}/cryptoPayments/1`, { status: "rejected" }, ["reviewedAt"], ["status"])]);
  const secondHash = createHash("sha256").update(`${orderId}-second`).digest("hex");
  await commit(client, [write(`orders/${orderId}/cryptoPayments/1`, { ...second, txid: secondHash }, ["createdAt"])]);
  await commit(admin, [write(`cryptoTransactions/BEP20_${secondHash}`, { orderId, installment: 1, network: "BEP20", txid: secondHash }, ["verifiedAt"]), write(`orders/${orderId}/cryptoPayments/1`, { status: "verified" }, ["reviewedAt"], ["status"])]);
  await advance("Delivered");
  const finalHash = createHash("sha256").update(`${orderId}-final`).digest("hex");
  await commit(client, [write(`orders/${orderId}/cryptoPayments/2`, { ...evidence, installment: 2, amountMinor: 30000, cryptoAmount: 300, txid: finalHash, screenshot: { ...evidence.screenshot, path: `paymentProofs/${orderId}/client1/2/${"C".repeat(20)}/screenshot` } }, ["createdAt"])]);
  await commit(admin, [write(`cryptoTransactions/BEP20_${finalHash}`, { orderId, installment: 2, network: "BEP20", txid: finalHash }, ["verifiedAt"]), write(`orders/${orderId}/cryptoPayments/2`, { status: "verified" }, ["reviewedAt"], ["status"])]);
  const privateProof = await fetch(`${endpoint}/${proofPath}`, { headers: { authorization: `Bearer ${other}` } });
  assert.equal(privateProof.status, 403);
  // Existing installations may contain only payment/binance/address.
  await commit("owner", [write("payment/binance", { address: ` ${address} ` })]);
  const legacyWalletOrder = `${orderId}-address-only`;
  await commit(client, [write(`orders/${legacyWalletOrder}`, { ...order, budget: "USD 2000.00", budgetMinor: 200000 }, ["createdAt", "updatedAt"])]);
  await commit(client, [write(`orders/${legacyWalletOrder}/cryptoPayments/0`, { ...evidence, amountMinor: 40000, cryptoAmount: 400, network: "Polygon", txid: createHash("sha256").update(legacyWalletOrder).digest("hex"), screenshot: { ...evidence.screenshot, path: `paymentProofs/${legacyWalletOrder}/client1/0/${"D".repeat(20)}/screenshot` } }, ["createdAt"])]);
});
