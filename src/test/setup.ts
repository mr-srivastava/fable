if (typeof window !== 'undefined') {
  if (!('PointerEvent' in window)) {
    Object.defineProperty(window, 'PointerEvent', { value: MouseEvent })
  }

  if (!Element.prototype.getAnimations) {
    Element.prototype.getAnimations = () => []
  }
}
