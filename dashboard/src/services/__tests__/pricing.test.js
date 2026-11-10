import { describe, it, expect } from 'vitest';
import { parsePrice, formatPrice, extendedPrice } from '../pricing.js';

describe('pricing service', () => {
  it('parses valid numeric and formatted prices', () => {
    expect(parsePrice(1234)).toBe(1234);
    expect(parsePrice(0)).toBe(0);
    expect(parsePrice('1234.50')).toBe(1234.5);
    expect(parsePrice('$1,234.56')).toBe(1234.56);
    expect(parsePrice('USD $500')).toBe(500);
    expect(parsePrice('   100   ')).toBe(100);
  });

  it('returns null for missing, unknown or invalid prices', () => {
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice(undefined)).toBeNull();
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('N/A')).toBeNull();
    expect(parsePrice('FREE')).toBeNull();
    expect(parsePrice(NaN)).toBeNull();
    expect(parsePrice(Infinity)).toBeNull();
  });

  it('formats integer and decimal prices properly', () => {
    expect(formatPrice(15000)).toBe('$15,000');
    expect(formatPrice(15000.5)).toBe('$15,000.50');
    expect(formatPrice(0)).toBe('$0');
    expect(formatPrice(null)).toBe('Price unavailable');
    expect(formatPrice('invalid')).toBe('Price unavailable');
  });

  it('calculates extended price safely with priceKnown flag', () => {
    expect(extendedPrice({ priceKnown: false, unitPriceUsd: 100, quantity: 2 })).toBeNull();
    expect(extendedPrice({ priceKnown: true, unitPriceUsd: 100, quantity: 2 })).toBe(200);
    expect(extendedPrice({ unitPriceUsd: '50.25', quantity: 4 })).toBe(201);
    expect(extendedPrice({ unitPriceUsd: 100, quantity: 0 })).toBeNull();
    expect(extendedPrice({ unitPriceUsd: 100, quantity: -1 })).toBeNull();
    expect(extendedPrice({ unitPriceUsd: 100, quantity: 1.5 })).toBeNull();
    expect(extendedPrice({ unitPriceUsd: null, quantity: 2 })).toBeNull();
  });
});
