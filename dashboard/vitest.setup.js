import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom doesn't support scrollIntoView, so we mock it
window.HTMLElement.prototype.scrollIntoView = function() {};

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);
