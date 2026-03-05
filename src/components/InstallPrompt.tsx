"use client";

import { useState, useEffect } from "react";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function getOS(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}

const DISMISS_KEY = "ryla-install-dismissed";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [os, setOs] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    setOs(getOS());
    setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  return (
    <div className="bg-blue-50 rounded-xl border border-blue-200 px-4 py-3 relative">
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 text-blue-300 hover:text-blue-500 p-1"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3 pr-6">
        <svg className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-blue-900">Install RYLA App</p>
          {os === "ios" ? (
            <div className="text-xs text-blue-700 mt-1 space-y-1">
              <p>1. Tap the <span className="inline-flex items-center"><svg className="w-3.5 h-3.5 inline mx-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Share</span> button at the bottom of Safari</p>
              <p>2. Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></p>
              <p>3. Tap <strong>&quot;Add&quot;</strong> in the top right</p>
            </div>
          ) : os === "android" ? (
            <div className="text-xs text-blue-700 mt-1 space-y-1">
              <p>1. Tap the <strong>three-dot menu</strong> (&#8942;) in Chrome</p>
              <p>2. Tap <strong>&quot;Add to Home screen&quot;</strong> or <strong>&quot;Install app&quot;</strong></p>
              <p>3. Tap <strong>&quot;Install&quot;</strong></p>
            </div>
          ) : (
            <div className="text-xs text-blue-700 mt-1 space-y-1">
              <p><strong>iPhone/iPad:</strong> In Safari, tap Share → &quot;Add to Home Screen&quot;</p>
              <p><strong>Android:</strong> In Chrome, tap &#8942; menu → &quot;Install app&quot;</p>
            </div>
          )}
          <p className="text-xs text-blue-500 mt-2">Get the full app experience with notifications and offline access.</p>
        </div>
      </div>
    </div>
  );
}
