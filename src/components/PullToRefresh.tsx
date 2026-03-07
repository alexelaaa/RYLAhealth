"use client";

import { useRef, useState, useCallback, useEffect } from "react";

const THRESHOLD = 80; // pixels to pull before triggering
const MAX_PULL = 120;

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAtTop = useCallback(() => {
    return window.scrollY <= 0;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isAtTop() && !refreshing) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, [isAtTop, refreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling || refreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0 && isAtTop()) {
      // Apply resistance — distance decreases as you pull further
      const distance = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(distance);
      if (distance > 10) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
    }
  }, [pulling, refreshing, isAtTop]);

  const handleTouchEnd = useCallback(() => {
    if (!pulling) return;

    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD * 0.5);

      // Reload the page data
      window.location.reload();
    } else {
      setPullDistance(0);
    }
    setPulling(false);
  }, [pulling, pullDistance, refreshing]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const ready = pullDistance >= THRESHOLD;

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: pullDistance > 5 ? `${pullDistance}px` : 0 }}
      >
        <div className={`flex items-center gap-2 transition-opacity ${pullDistance > 10 ? "opacity-100" : "opacity-0"}`}>
          <div
            className={`w-5 h-5 border-2 rounded-full ${
              refreshing
                ? "border-green-700 border-t-transparent animate-spin"
                : ready
                  ? "border-green-700"
                  : "border-slate-300"
            }`}
            style={{
              transform: refreshing ? "none" : `rotate(${pullDistance * 3}deg)`,
              transition: pulling ? "none" : "transform 0.2s",
            }}
          />
          <span className={`text-xs font-medium ${ready ? "text-green-700" : "text-slate-400"}`}>
            {refreshing ? "Refreshing..." : ready ? "Release to refresh" : "Pull to refresh"}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
