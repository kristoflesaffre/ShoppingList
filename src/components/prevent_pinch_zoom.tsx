"use client";

import { useEffect } from "react";

/** Safari gesture fallback for touch devices, including installed iOS PWAs. */
export function PreventPinchZoom() {
  useEffect(() => {
    if (navigator.maxTouchPoints === 0) return;

    const preventGesture = (event: Event) => event.preventDefault();
    const preventMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };
    const options = { passive: false };

    document.addEventListener("gesturestart", preventGesture, options);
    document.addEventListener("gesturechange", preventGesture, options);
    document.addEventListener("touchmove", preventMultiTouch, options);

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("touchmove", preventMultiTouch);
    };
  }, []);

  return null;
}
