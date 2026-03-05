"use client";

import { useState, useEffect, useCallback } from "react";

type Status = "loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [acting, setActing] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "subscribed" : "unsubscribed");
    } catch {
      setStatus("unsubscribed");
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const subscribe = async () => {
    setActing(true);
    try {
      const res = await fetch("/api/push/vapid-key");
      const { publicKey } = await res.json();
      if (!publicKey) throw new Error("No VAPID key");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      setStatus("subscribed");
    } catch {
      // Permission denied or error
      if (Notification.permission === "denied") {
        setStatus("denied");
      }
    } finally {
      setActing(false);
    }
  };

  const unsubscribe = async () => {
    setActing(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch {
      // ignore
    } finally {
      setActing(false);
    }
  };

  if (status === "loading") return null;

  if (status === "unsupported") {
    return (
      <div className="bg-slate-100 rounded-xl px-4 py-3 text-xs text-slate-500">
        Push notifications are not supported on this device.
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="bg-red-50 rounded-xl px-4 py-3 text-xs text-red-600">
        Notifications blocked. Enable them in your browser settings.
      </div>
    );
  }

  return (
    <button
      onClick={status === "subscribed" ? unsubscribe : subscribe}
      disabled={acting}
      className={`w-full flex items-center justify-between rounded-xl px-4 py-3 border transition-colors disabled:opacity-50 ${
        status === "subscribed"
          ? "bg-green-50 border-green-200"
          : "bg-white border-slate-200 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span className="text-sm font-medium text-slate-700">
          {acting ? "..." : status === "subscribed" ? "Notifications On" : "Enable Notifications"}
        </span>
      </div>
      <span
        className={`w-10 h-6 rounded-full relative transition-colors ${
          status === "subscribed" ? "bg-green-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            status === "subscribed" ? "left-5" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}
