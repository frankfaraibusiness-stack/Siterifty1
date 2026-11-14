export function parseCount(str) {
  const trimmed = String(str).trim();
  if (trimmed.endsWith("K")) {
    return Math.round(parseFloat(trimmed) * 1000);
  }
  return parseInt(trimmed.replace(/,/g, ""), 10) || 0;
}

export function formatCount(n) {
  if (n >= 1000) {
    return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "K";
  }
  return String(n);
}
