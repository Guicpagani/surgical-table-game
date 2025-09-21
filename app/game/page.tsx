"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SurgicalTableGame from "@/components/SurgicalTableGame";

// Evita o erro de prerender + useSearchParams
export const dynamic = "force-dynamic";

export default function GamePage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-600">Carregando…</div>}>
      <GamePageInner />
    </Suspense>
  );
}

function GamePageInner() {
  const params = useSearchParams();

  // aceita ?e=otto|rafael ou ?eval=otto|rafael
  const evalParam = (params.get("e") ?? params.get("eval") ?? "otto") as
    | "otto"
    | "rafael";

  const SCALE = 0.8; // 80%

  return (
    <div className="min-h-screen w-screen overflow-auto bg-slate-50">
      <div
        style={{
          transform: `scale(${SCALE})`,
          transformOrigin: "top center",
          width: `${100 / SCALE}%`, // compensa a escala para não cortar na horizontal
        }}
      >
        <SurgicalTableGame evaluator={evalParam} scale={SCALE} />
      </div>
    </div>
  );
}

