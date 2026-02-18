"use client";

import { createContext, useContext } from "react";
import type { SessionData } from "@/types";

interface CampContextValue {
  campWeekend: string;
  setCampWeekend: (weekend: string) => void;
  session: SessionData | null;
}

export const CampContext = createContext<CampContextValue>({
  campWeekend: "",
  setCampWeekend: () => {},
  session: null,
});

export function useCamp() {
  return useContext(CampContext);
}
