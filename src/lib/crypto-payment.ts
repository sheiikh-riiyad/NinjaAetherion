export const CRYPTO_NETWORKS = ["TRC20", "BEP20", "Polygon"] as const;
export type CryptoNetwork = typeof CRYPTO_NETWORKS[number];
export type WalletSettings = { address: string; trc20Address: string; bep20Address: string; polygonAddress: string; coin: string; usdRate: number; bdtRate: number };
export function normalizeWalletSettings(data: Record<string, unknown>): WalletSettings {
  const address = (field: string) => typeof data[field] === "string" ? data[field].trim() : "";
  return { address: address("address"), trc20Address: address("trc20Address"), bep20Address: address("bep20Address"), polygonAddress: address("polygonAddress"), coin: data.coin === undefined ? "USDT" : address("coin"), usdRate: data.usdRate === undefined ? 1 : typeof data.usdRate === "number" ? data.usdRate : 0, bdtRate: typeof data.bdtRate === "number" ? data.bdtRate : 0 };
}
export function walletCheckoutIssue(settings: WalletSettings | null, currency: string) {
  if (!settings) return "Crypto payments are not set up yet. Please contact Riyad to enable checkout.";
  if (settings.coin !== "USDT" || settings.usdRate !== 1) return "The USDT payment quote is not configured yet. Please contact Riyad.";
  if (!CRYPTO_NETWORKS.some(network => walletAddress(settings, network))) return "A valid receiving wallet address has not been set yet. Please contact Riyad.";
  if (currency === "BDT" && (!Number.isFinite(settings.bdtRate) || settings.bdtRate <= 0)) return "BDT crypto payments are not enabled. Choose USD or contact Riyad for a BDT quote.";
  if (currency !== "USD" && currency !== "BDT") return "Choose USD or BDT for your project budget.";
  return "";
}
export function validNetworkAddress(address: string, network: CryptoNetwork) {
  return network === "TRC20" ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address) : /^0x[a-fA-F0-9]{40}$/.test(address);
}
export function walletAddress(settings: WalletSettings, network: CryptoNetwork) {
  const specific = network === "TRC20" ? settings.trc20Address : network === "BEP20" ? settings.bep20Address : settings.polygonAddress;
  const address = specific || settings.address;
  return validNetworkAddress(address, network) ? address : "";
}
export function cryptoQuote(amountMinor: number, currency: string, settings: WalletSettings) {
  const rate = currency === "USD" ? settings.usdRate : currency === "BDT" ? settings.bdtRate : 0;
  if (!Number.isFinite(rate) || rate <= 0 || !Number.isInteger(amountMinor) || amountMinor <= 0) return null;
  // Round up to six token decimal places; display and stored evidence use the same quote.
  const amount = Math.ceil(amountMinor / 100 / rate * 1e6) / 1e6;
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
