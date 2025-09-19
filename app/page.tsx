"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";

function EvaluatorCard({
  name,
  fileBase, // "otto" ou "rafael"
  selected,
  onSelect,
}: {
  name: string;
  fileBase: "otto" | "rafael";
  selected: boolean;
  onSelect: () => void;
}) {
  const png = `/evaluators/${fileBase}.png`;
  const jpg = `/evaluators/${fileBase}.jpg`;

  return (
    <button
      onClick={onSelect}
      className={`group rounded-2xl border p-5 bg-white flex items-center gap-4 hover:shadow-md transition ${
        selected ? "ring-2 ring-emerald-500 border-emerald-300" : "border-slate-200"
      }`}
    >
      <div className="shrink-0 w-20 h-20 rounded-2xl overflow-hidden border bg-slate-100">
        <img
          src={png}
          alt={`${name} (Avaliador)`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // fallback para .jpg se .png não existir
            if (!e.currentTarget.dataset.fallback) {
              e.currentTarget.dataset.fallback = "1";
              e.currentTarget.src = jpg;
            }
          }}
        />
      </div>
      <div className="text-left">
        <div className="text-base font-bold text-slate-900">{name}</div>
        <div className="text-sm text-slate-600">Avaliador</div>
      </div>
    </button>
  );
}

export default function SelectEvaluatorPage() {
  const router = useRouter();
  const [choice, setChoice] = useState<"otto" | "rafael" | null>(null);

  const start = () => {
    const who = choice ?? "otto";
    router.push(`/game?e=${who}`);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
          Jogo educativo de montagem de mesa cirúrgica
        </h1>

        <p className="mt-6 text-lg font-semibold text-slate-800">Selecione o seu avaliador</p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EvaluatorCard
            name="Otto"
            fileBase="otto"
            selected={choice === "otto"}
            onSelect={() => setChoice("otto")}
          />
          <EvaluatorCard
            name="Rafael"
            fileBase="rafael"
            selected={choice === "rafael"}
            onSelect={() => setChoice("rafael")}
          />
        </div>

        <div className="mt-8">
          <button
            onClick={start}
            className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700"
          >
            Iniciar
          </button>
        </div>

        <p className="mt-4 text-xs italic text-slate-500">
          jogo educativo criado por Guilherme Pagani
        </p>
        <p className="text-xs italic">
          <a
            href="https://www.linkedin.com/in/paganig/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-700 underline underline-offset-2 hover:text-sky-800"
          >
            linkedin.com/in/paganig
          </a>
        </p>
      </div>
    </main>
  );
}

