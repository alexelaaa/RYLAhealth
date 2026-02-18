"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isBusRider } from "@/lib/bus-utils";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ role: string; label: string } | null>(null);
  const router = useRouter();

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError("");
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError("Enter at least 4 digits");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid PIN");
        setPin("");
        setLoading(false);
        return;
      }

      setSuccess({ role: data.role, label: data.label });
      const dest = isBusRider(data.label) ? "/bus-rider" : "/dashboard";
      setTimeout(() => router.push(dest), 800);
    } catch {
      setError("Connection error. Try again.");
      setLoading(false);
    }
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", ""];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">RYLA Camp</h1>
          <p className="text-slate-400">Enter your staff PIN</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all ${
                i < pin.length
                  ? "bg-blue-500 scale-110"
                  : "bg-slate-600"
              }`}
            />
          ))}
        </div>

        {/* Status messages */}
        {error && (
          <div className="text-red-400 text-center mb-4 text-sm animate-pulse">
            {error}
          </div>
        )}
        {success && (
          <div className="text-green-400 text-center mb-4 text-sm">
            Welcome, {success.label}!
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {digits.map((digit, i) => {
            if (i === 9) {
              return <div key="spacer-left" />;
            }
            if (i === 11) {
              return (
                <button
                  key="delete"
                  onClick={handleDelete}
                  className="h-16 rounded-xl bg-slate-700 text-white text-lg font-medium active:bg-slate-600 transition-colors"
                  disabled={loading}
                >
                  ←
                </button>
              );
            }
            return (
              <button
                key={digit}
                onClick={() => handleDigit(digit)}
                className="h-16 rounded-xl bg-slate-800 text-white text-2xl font-medium active:bg-slate-600 transition-colors hover:bg-slate-700"
                disabled={loading}
              >
                {digit}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || pin.length < 4}
          className="w-full h-14 rounded-xl bg-blue-600 text-white text-lg font-semibold disabled:opacity-40 active:bg-blue-700 transition-colors"
        >
          {loading ? "Verifying..." : "Enter"}
        </button>
      </div>
    </div>
  );
}
