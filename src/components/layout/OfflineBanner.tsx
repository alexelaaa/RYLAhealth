"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-14 left-0 right-0 bg-yellow-500 text-yellow-900 text-center py-1.5 text-xs font-medium z-50">
      You are offline. Changes will sync when reconnected.
    </div>
  );
}
