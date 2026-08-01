import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)

if (!('PointerEvent' in window)) {
  Object.defineProperty(window, 'PointerEvent', { value: MouseEvent })
}

// JSDOM may omit APIs that are required by the DOM types.
if (typeof Reflect.get(Element.prototype, 'getAnimations') !== 'function') {
  Element.prototype.getAnimations = () => []
}

if (typeof Reflect.get(Element.prototype, 'scrollIntoView') !== 'function') {
  Element.prototype.scrollIntoView = () => undefined
}

if (typeof Reflect.get(window, 'matchMedia') !== 'function') {
  window.matchMedia = (query) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })
}

if (typeof Reflect.get(globalThis, 'ResizeObserver') !== 'function') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
