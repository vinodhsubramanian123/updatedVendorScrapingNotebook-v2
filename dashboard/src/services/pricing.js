/** Display helpers preserve unknown prices, exact zero and invalid quantities. */
export function parsePrice(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim().replace(/^USD\s*/i, '').replace(/^\$\s*/, '').replace(/,/g, '');
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

export function formatPrice(value) {
  const price = parsePrice(value);
  return price === null ? 'Price unavailable' : price.toLocaleString('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(price) ? 0 : 2, maximumFractionDigits: 2
  });
}

export function extendedPrice(part) {
  if (part.priceKnown === false) return null;
  const unit = parsePrice(part.unitPriceUsd);
  const quantity = part.quantity;
  if (unit === null || !Number.isSafeInteger(quantity) || quantity <= 0) return null;
  return unit * quantity;
}
