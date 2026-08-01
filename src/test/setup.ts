if (typeof window !== 'undefined') {
  if (!('PointerEvent' in window)) {
    Object.defineProperty(window, 'PointerEvent', { value: MouseEvent })
  }

  // JSDOM may omit this API even though it is required by the DOM types.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!Element.prototype.getAnimations) {
    Element.prototype.getAnimations = () => []
  }
}
