"use client";

import { useContext } from "react";
import { SimulationContext } from "./SimulationProvider";

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation must be used inside <SimulationProvider>");
  return ctx;
}
