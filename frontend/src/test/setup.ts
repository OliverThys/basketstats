import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

// jsdom has no PointerEvent constructor; ShotPad (and anything else using
// pointer events for touch-safe tap handling) needs one so
// fireEvent.pointerUp(el, { clientX, clientY }) carries real coordinates.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    constructor(type: string, params: MouseEventInit = {}) {
      super(type, params);
    }
  }
  // @ts-expect-error - minimal polyfill, not a spec-complete PointerEvent
  window.PointerEvent = PointerEventPolyfill;
}
