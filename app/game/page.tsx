"use client";

import { useSearchParams } from "next/navigation";
import SurgicalTableGame from "@/components/SurgicalTableGame";

export default function GamePage() {
  const sp = useSearchParams();
  const evaluator = sp.get("e") === "rafael" ? "rafael" : "otto";

  // Tenta .png e, se não existir, o componente troca para .jpg via onError
  const imagePng = `/evaluators/${evaluator}.png`;

  return (
    <div className="p-4">
      <SurgicalTableGame
        evaluator={evaluator}
        evaluatorImageSrc={imagePng}
      />
    </div>
  );
}
