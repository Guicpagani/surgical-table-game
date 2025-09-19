"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SurgicalTableGame from "@/components/SurgicalTableGame";

// Opcional: evita tentativa de pré-render estático dessa página
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
  const evalParam = (params.get("eval") || "otto") as "otto" | "rafael";

  return (
    <div className="p-4">
      <SurgicalTableGame evaluator={evalParam} />
    </div>
  );
}

