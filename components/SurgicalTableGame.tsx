"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Mesa Cirúrgica — Protótipo (com correções de imagens e preview)
 */

type Evaluator = "otto" | "rafael";
type CategoryId =
  | "dierese"
  | "preensao"
  | "hemostasia"
  | "afastadores"
  | "especiais"
  | "sintese";

type Instrument = {
  id: string;
  label: string;
  category: CategoryId;
  renderIcon: React.FC<React.SVGProps<SVGSVGElement>>;
  imageBase?: string; // nome exato do arquivo SEM extensão (case/acentos iguais ao arquivo)
};

type Zone = {
  id: string;
  label: string;
  category: CategoryId;
  x: number;
  y: number;
  w: number;
  h: number;
};

type ItemReport = {
  item: string;
  finalZone: string | null;
  correct: boolean;
  corrected: boolean;
  wrongZonesTried: string[];
};

type GameReport = {
  finishedAtISO: string;
  timeSec: number;
  totalItems: number;
  correctItems: number;
  correctedItems: number;
  perItem: ItemReport[];
};

/* ===== Layout ===== */
const TABLE_W = 1000;
const TABLE_H = 680;
const PADDING = 16;

/* ===== Grid/colocação ===== */
const PLACED_SIZE = 64;
const GRID_COLS = 4;
const GRID_GAP = 8;

/* ===== Ícones fallback ===== */
const IconScalpel: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg viewBox="0 0 64 64" width={22} height={22} {...p}>
    <path d="M8 48l26-26 6 6-26 26H8v-6z" fill="currentColor" opacity=".8" />
    <path d="M40 18l6 6 6-6-6-6-6 6z" fill="currentColor" />
  </svg>
);
const IconScissors: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg viewBox="0 0 64 64" width={22} height={22} {...p}>
    <circle cx="18" cy="20" r="8" stroke="currentColor" strokeWidth="4" fill="none" />
    <circle cx="46" cy="44" r="8" stroke="currentColor" strokeWidth="4" fill="none" />
    <path d="M24 26l10 6m-10 6l10-6m6-18L28 26m18 12L28 38" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
);
const IconForceps: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg viewBox="0 0 64 64" width={22} height={22} {...p}>
    <path d="M12 12c6 6 18 26 20 30 2 4 8 10 12 10" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M52 12c-6 6-18 26-20 30-2 4-8 10-12 10" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
  </svg>
);
const IconNeedleHolder: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg viewBox="0 0 64 64" width={22} height={22} {...p}>
    <path d="M16 12l16 20 16-20" stroke="currentColor" strokeWidth="4" fill="none" />
    <path d="M24 44h16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    <circle cx="20" cy="52" r="6" stroke="currentColor" strokeWidth="4" fill="none" />
    <circle cx="44" cy="52" r="6" stroke="currentColor" strokeWidth="4" fill="none" />
  </svg>
);
const IconGauze: React.FC<React.SVGProps<SVGSVGElement>> = (p) => (
  <svg viewBox="0 0 64 64" width={22} height={22} {...p}>
    <rect x="12" y="18" width="40" height="28" rx="4" fill="currentColor" opacity=".2" />
    <path d="M16 22h32M16 30h32M16 38h32" stroke="currentColor" strokeWidth="3" opacity=".8" />
  </svg>
);

/* ===== Utils ===== */
const stripAccents = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
const slugifyName = (s: string) =>
  stripAccents(s.trim().toLowerCase())
    .replace(/[°º]/g, "")
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
const normalizeCategory = (s: string): CategoryId => {
  const k = stripAccents(s).trim().toLowerCase();
  if (k.includes("dierese")) return "dierese";
  if (k.includes("preensao") || k.includes("preens")) return "preensao";
  if (k.includes("hemostasia")) return "hemostasia";
  if (k.includes("afastador")) return "afastadores";
  if (k.includes("especial")) return "especiais";
  if (k.includes("sintese")) return "sintese";
  return "especiais";
};
const iconFor = (category: CategoryId) =>
  category === "dierese"
    ? IconScalpel
    : category === "sintese"
    ? IconNeedleHolder
    : category === "hemostasia" || category === "preensao"
    ? IconForceps
    : category === "especiais"
    ? IconGauze
    : IconScissors;

const pointInRect = (p: { x: number; y: number }, r: Zone) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const shuffleArray = <T,>(arr: T[]) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/* ===== Balão do avaliador ===== */
const THOUGHTS: Record<Evaluator, string[]> = {
  otto: [
    "Essa é a disciplina que mais reprova.",
    "Vocês não estão vindo na monitoria.",
    "Seu sapato é de couro?",
  ],
  rafael: [
    "Se você tem dificuldade, pergunta.",
    "Vamos lá gente, o tempo tá correndo.",
    "Chegou de última hora, né...",
  ],
};
const DISPLAY_MS = 3800;

/* ===== Zonas ===== */
const GRID_W = TABLE_W - PADDING * 2;
const GRID_H = TABLE_H - PADDING * 3 - 8;
const CELL_W = (GRID_W - PADDING * 2) / 3;
const CELL_H = (GRID_H - PADDING) / 2;

const ZONES: Zone[] = [
  { id: "z1", label: "Afastadores", category: "afastadores", x: PADDING + 0 * (CELL_W + PADDING), y: PADDING, w: CELL_W, h: CELL_H },
  { id: "z2", label: "Especiais", category: "especiais", x: PADDING + 1 * (CELL_W + PADDING), y: PADDING, w: CELL_W, h: CELL_H },
  { id: "z3", label: "Síntese", category: "sintese", x: PADDING + 2 * (CELL_W + PADDING), y: PADDING, w: CELL_W, h: CELL_H },
  { id: "z4", label: "Preensão", category: "preensao", x: PADDING + 0 * (CELL_W + PADDING), y: PADDING + CELL_H + PADDING, w: CELL_W, h: CELL_H },
  { id: "z5", label: "Hemostasia", category: "hemostasia", x: PADDING + 1 * (CELL_W + PADDING), y: PADDING + CELL_H + PADDING, w: CELL_W, h: CELL_H },
  { id: "z6", label: "Diérese", category: "dierese", x: PADDING + 2 * (CELL_W + PADDING), y: PADDING + CELL_H + PADDING, w: CELL_W, h: CELL_H },
];

/* ===== Mapeamento de arquivos (case/acentos EXATOS) =====
   IMPORTANTÍSSIMO: os valores abaixo devem bater exatamente com o nome do arquivo em /public/instruments (sem extensão). */
const FILE_BASE_MAP: Record<string, string> = {
  // Já existentes
  "cabo-de-bisturi-n-3": "bisturi-3",
  "cabo-de-bisturi-n-4": "bisturi-4",
  "cuba-redonda": "Cuba redonda",
  "cuba-rim": "Cuba Rim",
  "fio-de-sutura-nylon": "Fio de sutura",
  "lamina-10": "Lamina 10",
  "lamina-20": "Lamina 20",
  "tesoura-mayo-curva": "Tesoura Mayo curva",
  "tesoura-mayo-reta": "Tesoura Mayo reta",
  "tesoura-metzembaum-curva": "Tesoura Metzembaum curva",
  "tesoura-metzembaum-reta": "Tesoura Metzembaum reta",
  "pinca-kelly-curva-1": "Pinça Kelly Curva (1)",
  "pinca-kelly-curva-2": "Pinça Kelly Curva (2)",
  "pinca-kelly-curva-3": "Pinça kelly Curva (3)",
  "pinca-dente-de-rato": "Pinça-dente-de-rato",
  "pinca-mixter-1": "Pinça Mixter (1)",
  "pinca-mixter-2": "Pinça Mixter (2)",

  // Novos — para casar com sua matriz:
  "pinca-backhous-1": "Pinça backhous (1)",
  "pinca-backhous-2": "Pinça backhous (2)",
  "pinca-backhous-3": "Pinça backhous (3)",
  "pinca-kocher-reta": "Pinça kocher reta",
  "pinca-kocher-curva-1": "Pinça kocher curva (1)",
  "pinca-kocher-curva-2": "Pinça kocher curva (2)",
  "afastador-farabeuf-medio-1": "Afastador farabeuf médio(1)",
  "afastador-farabeuf-pequeno-2": "Afastador farabeuf pequeno(2)",
};

/* ===== Lista corrigida ===== */
const RAW_LIST: Array<[string, string]> = [
  ["Pinça dente de rato", "Síntese"],
  ["Cuba redonda", "Especiais"],
  ["Pinça Mixter (1)", "Hemostasia"],
  ["Pinça Mixter (2)", "Hemostasia"],
  ["Cabo de bisturi n° 3", "Dierese"],
  ["Cabo de bisturi n° 4", "Dierese"],
  ["Tesoura Metzembaum reta", "Dierese"],
  ["Tesoura Metzembaum curva", "Dierese"],
  ["Tesoura Mayo Reta", "Dierese"],
  ["Tesoura Mayo Curva", "Dierese"],
  ["Lâmina 10", "Dierese"],
  ["Lâmina 20", "Dierese"],
  ["Pinça Kelly curva (1)", "Hemostasia"],
  ["Pinça Kelly curva (2)", "Hemostasia"],
  ["Pinça Kelly curva (3)", "Hemostasia"],
  ["Pinça Kelly reta (1)", "Hemostasia"],
  ["Pinça Kelly reta (2)", "Hemostasia"],
  ["Pinça Kelly reta (3)", "Hemostasia"],
  ["Pinça de Halsted curva (1)", "Hemostasia"],
  ["Pinça de Halsted curva (2)", "Hemostasia"],
  ["Pinça de Halsted curva (3)", "Hemostasia"],
  ["Cuba Rim", "Especiais"],
  ["Cureta", "Especiais"],
  ["Pinça Duval (1)", "Preensão"],
  ["Pinça Duval (2)", "Preensão"],
  ["Pinça Collin (1)", "Preensão"],
  ["Pinça Collin (2)", "Preensão"],
  ["Pinça Babcock (1)", "Preensão"],
  ["Pinça Babcock (2)", "Preensão"],
  ["Pinça Kocher reta", "Preensão"],
  ["Pinça Kocher curva (1)", "Preensão"],
  ["Pinça Kocher curva (2)", "Preensão"],
  ["Pinça Allis (1)", "Preensão"],
  ["Pinça Allis (2)", "Preensão"],
  ["Porta agulha Mayo", "Síntese"],
  ["Compressa de Gaze", "Especiais"],
  ["Pinça anatômica", "Síntese"],
  ["Pinça Cheron", "Especiais"],
  ["Pinça Backhous (1)", "Especiais"],
  ["Pinça Backhous (2)", "Especiais"],
  ["Pinça Backhous (3)", "Especiais"],
  ["Fio de sutura Nylon", "Síntese"],
  ["Afastador Farabeuf médio(1)", "Afastadores"],
  ["Afastador Farabeuf pequeno(2)", "Afastadores"],
];

/* ===== Constrói INSTRUMENTS ===== */
const INSTRUMENTS: Instrument[] = RAW_LIST.map(([labelPt, catPt]) => {
  const category = normalizeCategory(catPt);
  const id = slugifyName(labelPt);
  const base = FILE_BASE_MAP[id] || labelPt; // fallback: usa o label exato (case/acentos)
  return { id, label: labelPt, category, renderIcon: iconFor(category), imageBase: base };
});

/* ===== Imagem com fallback e URL escapada ===== */
function InstrumentImage({ base, alt, className, style }: { base: string; alt: string; className?: string; style?: React.CSSProperties }) {
  // Escapa espaços, acentos e parênteses
  const b = encodeURI(base);
  const sources = [`/instruments/${b}.png`, `/instruments/${b}.jpg`, `/instruments/${b}.jpeg`, `/instruments/${b}.webp`];
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`flex items-center justify-center ${className || ""}`} style={style}>
        <span className="text-slate-500 text-xs">sem imagem</span>
      </div>
    );
  }
  return (
    <img
      src={sources[idx]}
      alt={alt}
      className={className}
      style={style}
      onError={() => {
        if (idx < sources.length - 1) setIdx(idx + 1);
        else setFailed(true);
      }}
    />
  );
}

/* ===== Preview grande (tamanho controlado/responsivo) ===== */
function PreviewOverlay({ item, x, y }: { item: Instrument | null; x: number; y: number }) {
  if (!item) return null;
  // Responsivo: mínimo 160, máximo 260, ~22% da mesa
  const size = Math.min(260, Math.max(160, Math.round(TABLE_W * 0.22)));
  const iconSize = Math.round(size * 0.6);

  return (
    <div className="absolute pointer-events-none z-[220]" style={{ left: x + 16, top: y + 16 }}>
      <div className="rounded-xl border bg-white shadow-2xl p-3 flex items-center gap-3">
        {item.imageBase ? (
          <InstrumentImage
            base={item.imageBase}
            alt={item.label}
            className="object-contain"
            style={{ width: size, height: size }}
          />
        ) : (
          <div className="flex items-center justify-center text-slate-700" style={{ width: size, height: size }}>
            <item.renderIcon width={iconSize} height={iconSize} />
          </div>
        )}
        <div className="text-sm font-semibold max-w-[220px]">{item.label}</div>
      </div>
    </div>
  );
}

/* ===== Item da lista ===== */
function ListItem({ item, isPlaced, onStartDrag }: { item: Instrument; isPlaced: boolean; onStartDrag: (item: Instrument, e: React.PointerEvent<HTMLButtonElement>) => void }) {
  return (
    <button onPointerDown={(e) => onStartDrag(item, e)} className={`w-full text-left px-3 py-2 rounded-xl border flex items-center gap-2 mb-2 bg-white ${isPlaced ? "border-emerald-300" : "border-gray-300 hover:shadow-sm"}`} title={isPlaced ? "Este instrumento está na mesa" : "Arraste para a mesa"}>
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0">
        {item.imageBase ? <InstrumentImage base={item.imageBase} alt={item.label} className="w-full h-full object-contain" /> : <item.renderIcon />}
      </span>
      <span className="text-sm">{item.label}</span>
      {isPlaced && <span className="ml-auto text-emerald-600 text-xs font-semibold">colocado</span>}
    </button>
  );
}

/* ===== Painel do avaliador ===== */
function EvaluatorPanel({ evaluator, imageSrc }: { evaluator: Evaluator; imageSrc?: string }) {
  const messages = THOUGHTS[evaluator];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
    const t = setInterval(() => setIdx((i) => (i + 1) % messages.length), DISPLAY_MS);
    return () => clearInterval(t);
  }, [evaluator, messages.length]);

  const png = imageSrc || `/evaluators/${evaluator}.png`;
  const jpg = png.replace(".png", ".jpg");
  const AV_W = 144;
  const AV_H = 144;

  return (
    <div className="relative z-[120]" style={{ width: AV_W, height: AV_H }}>
      <div className="absolute top-0 left-[-14px] w-36 h-36 rounded-2xl overflow-hidden border bg-slate-100">
        <img
          src={png}
          alt={`${evaluator}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (!(img as any).dataset.fallback) {
              (img as any).dataset.fallback = "1";
              img.src = jpg;
            }
          }}
        />
      </div>

      <div className="absolute z-[130]" style={{ left: "calc(100% + 10px)", top: "8px" }}>
        <div className="absolute -left-4 top-6 flex flex-col items-center gap-1">
          <span className="w-2 h-2 bg-white border rounded-full shadow" />
          <span className="w-1.5 h-1.5 bg-white border rounded-full shadow" />
          <span className="w-1 h-1 bg-white border rounded-full shadow" />
        </div>
        <div className="max-w-[220px] bg-white border rounded-2xl shadow px-3 py-2">
          <div className="text-xs leading-snug text-slate-800">{messages[idx]}</div>
        </div>
      </div>
    </div>
  );
}

/* ===== Tutorial ===== */
const TUTORIAL_STEPS: Array<{ target: "list" | "zones" | "check"; text: string; offsetX?: number; offsetY?: number }> = [
  { target: "list", text: "Selecione os instrumentos adequados na lista ao lado.", offsetX: 8, offsetY: 0 },
  { target: "zones", text: "Arraste com mouse e coloque os instrumentos em cada tempo cirúrgico.", offsetX: 0, offsetY: 0 },
  { target: "check", text: "Após finalizar toda a montagem, clique em “Checar” para avaliar seu desempenho.", offsetX: 140, offsetY: 0 },
];

function TutorialOverlay({
  stepIndex,
  onNext,
  onSkip,
  refs,
}: {
  stepIndex: number;
  onNext: () => void;
  onSkip: () => void;
  refs: {
    listRef: React.RefObject<HTMLDivElement | null>;
    tableRef: React.RefObject<HTMLDivElement | null>;
    checkBtnRef: React.RefObject<HTMLButtonElement | null>;
  };
}) {
  const step = TUTORIAL_STEPS[stepIndex];
  const [pos, setPos] = useState<{ x: number; y: number; dir: "right" | "left" | "top" | "bottom" }>({ x: 40, y: 40, dir: "right" });

  useEffect(() => {
    const getRect = (el: HTMLElement | null) => (el ? el.getBoundingClientRect() : null);
    const calc = () => {
      let r: DOMRect | null = null;
      if (step.target === "list") r = getRect(refs.listRef.current);
      if (step.target === "zones") r = getRect(refs.tableRef.current);
      if (step.target === "check") r = getRect(refs.checkBtnRef.current);
      const margin = 12;
      const offX = step.offsetX ?? 0;
      const offY = step.offsetY ?? 0;
      if (r) {
        if (step.target === "list") setPos({ x: r.right + margin + offX, y: r.top + offY, dir: "left" });
        else if (step.target === "zones") setPos({ x: r.left + 16 + offX, y: r.top - 10 + offY, dir: "bottom" });
        else setPos({ x: r.right + margin + offX, y: r.top - 8 + offY, dir: "left" });
      }
    };
    calc();
    const onResize = () => calc();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [stepIndex, refs, step]);

  const isLast = stepIndex === TUTORIAL_STEPS.length - 1;
  const clampX = (x: number) => Math.min(Math.max(16, x), (typeof window !== "undefined" ? window.innerWidth : 1200) - 400);
  const clampY = (y: number) => Math.min(Math.max(16, y), (typeof window !== "undefined" ? window.innerHeight : 800) - 160);

  return (
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
      <div className="absolute max-w-[380px]" style={{ left: clampX(pos.x), top: clampY(pos.y) }}>
        <div className="relative bg-white rounded-2xl shadow-2xl border p-4">
          {pos.dir === "left" && <div className="absolute -left-2 top-6 w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-white drop-shadow" />}
          {pos.dir === "right" && <div className="absolute -right-2 top-6 w-0 h-0 border-y-8 border-y-transparent border-l-8 border-l-white drop-shadow" />}
          {pos.dir === "top" && <div className="absolute left-6 -top-2 w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-white drop-shadow" />}
          {pos.dir === "bottom" && <div className="absolute left-6 -bottom-2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-white drop-shadow" />}

          <div className="text-sm leading-snug text-slate-800">{step.text}</div>
          <div className="mt-3 flex items-center justify-between">
            <button onClick={onSkip} className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs">Pular tutorial</button>
            <button onClick={onNext} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm">
              {isLast ? "Começar" : "Avançar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Caixa de zona ===== */
function ZoneBox({ z, error }: { z: Zone; error: boolean }) {
  return (
    <div className={`absolute rounded-xl p-2 backdrop-blur-sm ${error ? "border-2 border-red-500/80 bg-white/60" : "border border-white/60 bg-white/35 hover:bg-white/45"}`} style={{ left: z.x, top: z.y, width: z.w, height: z.h }}>
      <div className={`text-[13px] font-semibold flex items-center gap-2 ${error ? "text-red-700" : "text-slate-700"}`}><span className={`inline-block w-2 h-2 rounded-full ${error ? "bg-red-500" : "bg-emerald-400"}`} />{z.label}{error && <span className="ml-2 text-xs font-semibold text-red-700">Contém erro</span>}</div>
    </div>
  );
}

/* ===== Principal ===== */
export default function SurgicalTableGame({ evaluator = "otto", evaluatorImageSrc }: { evaluator?: Evaluator; evaluatorImageSrc?: string }) {
  const tableRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const checkBtnRef = useRef<HTMLButtonElement | null>(null);

  const [placements, setPlacements] = useState<Record<string, string[]>>(() => Object.fromEntries(ZONES.map((z) => [z.id, [] as string[]])));
  const [previewItem, setPreviewItem] = useState<Instrument | null>(null);
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [checked, setChecked] = useState(false);
  const [zoneErrors, setZoneErrors] = useState<Record<string, boolean>>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [report, setReport] = useState<GameReport | null>(null);
  const [everWrong, setEverWrong] = useState<Record<string, boolean>>({});
  const [wrongZonesByItem, setWrongZonesByItem] = useState<Record<string, Set<string>>>({});
  const [instrumentList, setInstrumentList] = useState<Instrument[]>(() => INSTRUMENTS);
  const [showTutorial, setShowTutorial] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0);

  const placedSet = useMemo(() => new Set(Object.values(placements).flat()), [placements]);

  const findZoneByItem = (itemId: string) => Object.keys(placements).find((zid) => placements[zid].includes(itemId)) || null;
  const getClientPoint = (clientX: number, clientY: number) => {
    const rect = tableRef.current?.getBoundingClientRect();
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : null;
  };
  const getZoneAtClient = (clientX: number, clientY: number) => {
    const p = getClientPoint(clientX, clientY);
    return p ? ZONES.find((z) => pointInRect(p, z)) || null : null;
  };
  const getGridIndexInZone = (z: Zone, clientX: number, clientY: number) => {
    const p = getClientPoint(clientX, clientY);
    if (!p) return 0;
    const relX = Math.max(0, p.x - (z.x + GRID_GAP));
    const relY = Math.max(0, p.y - (z.y + 28));
    const col = Math.min(GRID_COLS - 1, Math.floor(relX / (PLACED_SIZE + GRID_GAP)));
    const row = Math.max(0, Math.floor(relY / (PLACED_SIZE + GRID_GAP)));
    return row * GRID_COLS + col;
  };

  const updatePreviewWithClient = (clientX: number, clientY: number) => {
    const rect = tableRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPreviewPos({ x: clientX - rect.left, y: clientY - rect.top });
  };

  const startDrag = (item: Instrument, clientX: number, clientY: number, source: "list" | "placed") => {
    if (showTutorial) return;
    setPreviewItem(item);
    setChecked(false);
    setZoneErrors({});
    updatePreviewWithClient(clientX, clientY);

    const onMove = (ev: PointerEvent) => updatePreviewWithClient(ev.clientX, ev.clientY);
    const onUp = (ev: PointerEvent) => {
      const targetZone = getZoneAtClient(ev.clientX, ev.clientY);
      if (!targetZone) {
        if (source === "placed") {
          setPlacements((prev) => {
            const copy = { ...prev };
            const fromId = findZoneByItem(item.id);
            if (fromId) copy[fromId] = copy[fromId].filter((id) => id !== item.id);
            return copy;
          });
        }
      } else {
        if (source === "list") {
          const alreadyInZone = findZoneByItem(item.id);
          if (alreadyInZone) {
            moveItemToZone(item, targetZone, ev.clientX, ev.clientY);
          } else {
            placeItemInZone(item, targetZone);
          }
        } else {
          moveItemToZone(item, targetZone, ev.clientX, ev.clientY);
        }
      }

      setPreviewItem(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const placeItemInZone = (item: Instrument, zone: Zone) => {
    if (!startedAt) setStartedAt(Date.now());
    setPlacements((prev) => {
      const next = { ...prev };
      const prevZoneId = findZoneByItem(item.id);
      if (prevZoneId) next[prevZoneId] = next[prevZoneId].filter((id) => id !== item.id);
      if (!next[zone.id].includes(item.id)) next[zone.id].push(item.id);
      return next;
    });
    if (zone.category !== item.category) markWrong(item.id, zone.id);
  };

  const moveItemToZone = (item: Instrument, zone: Zone, clientX: number, clientY: number) => {
    setPlacements((prev) => {
      const next = { ...prev };
      const fromZoneId = findZoneByItem(item.id);
      if (!fromZoneId) return next;

      if (fromZoneId === zone.id) {
        const targetIdx = Math.min(getGridIndexInZone(zone, clientX, clientY), next[zone.id].length - 1);
        const arr = [...next[zone.id]];
        const currentIdx = arr.indexOf(item.id);
        if (currentIdx !== -1 && targetIdx !== -1 && targetIdx < arr.length) {
          [arr[currentIdx], arr[targetIdx]] = [arr[targetIdx], arr[currentIdx]];
          next[zone.id] = arr;
        }
      } else {
        next[fromZoneId] = next[fromZoneId].filter((id) => id !== item.id);
        if (!next[zone.id].includes(item.id)) next[zone.id].push(item.id);
      }
      return next;
    });

    if (zone.category !== item.category) markWrong(item.id, zone.id);
    setChecked(false);
    setZoneErrors({});
  };

  const markWrong = (itemId: string, zoneId: string) => {
    setEverWrong((m) => ({ ...m, [itemId]: true }));
    setWrongZonesByItem((m) => {
      const s = new Set(m[itemId] ?? []);
      s.add(zoneId);
      return { ...m, [itemId]: s };
    });
  };

  const handleStartDragFromList = (item: Instrument, e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    startDrag(item, e.clientX, e.clientY, "list");
  };

  const startDragPlaced = (item: Instrument, e: PointerEvent) => {
    e.preventDefault();
    startDrag(item, e.clientX, e.clientY, "placed");
  };

  const checkBoard = () => {
    const errs: Record<string, boolean> = {};
    let hasWrongNow = false;
    ZONES.forEach((z) => {
      const wrong = placements[z.id].some((iid) => {
        const it = INSTRUMENTS.find((i) => i.id === iid)!;
        return it.category !== z.category;
      });
      errs[z.id] = wrong;
      if (wrong) hasWrongNow = true;
    });
    setZoneErrors(errs);
    setChecked(true);

    const allPlaced = INSTRUMENTS.every((it) => !!findZoneByItem(it.id));
    if (!hasWrongNow && allPlaced) {
      const end = Date.now();
      const seconds = startedAt != null ? Math.max(0, Math.round((end - startedAt) / 1000)) : 0;
      const perItem: ItemReport[] = INSTRUMENTS.map((it) => {
        const zid = findZoneByItem(it.id);
        const zone = ZONES.find((z) => z.id === (zid || "")) || null;
        const correct = !!zone && zone.category === it.category;
        const corrected = !!everWrong[it.id] && correct;
        const wrongTried = wrongZonesByItem[it.id]
          ? Array.from(wrongZonesByItem[it.id]).map((zid2) => ZONES.find((z) => z.id === zid2)?.label || zid2)
          : [];
        return { item: it.label, finalZone: zone ? zone.label : null, correct, corrected, wrongZonesTried: wrongTried };
      });
      const total = INSTRUMENTS.length;
      const correctCount = perItem.filter((r) => r.correct).length;
      const correctedCount = perItem.filter((r) => r.corrected).length;
      setReport({ finishedAtISO: new Date(end).toISOString(), timeSec: seconds, totalItems: total, correctItems: correctCount, correctedItems: correctedCount, perItem });
    } else {
      setReport(null);
    }
  };

  const resetGame = () => {
    setPlacements(Object.fromEntries(ZONES.map((z) => [z.id, [] as string[]])));
    setChecked(false);
    setZoneErrors({});
    setStartedAt(null);
    setReport(null);
    setEverWrong({});
    setWrongZonesByItem({});
    setInstrumentList(shuffleArray(INSTRUMENTS));
    setShowTutorial(true);
    setTutorialStep(0);
  };

  return (
    <div className="w-full min-h-[760px] bg-slate-50 flex items-start justify-center p-4">
      <div className="w-full max-w-[1440px] grid grid-cols-12 gap-4">
        <aside className="relative z-[110] col-span-12 md:col-span-3">
          <h1 className="text-2xl font-extrabold mb-2">Mesa Cirúrgica — Protótipo</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <button onClick={resetGame} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-100 text-sm">Reiniciar</button>
            <button ref={checkBtnRef} onClick={checkBoard} className="px-3 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-sm shadow">Checar</button>
          </div>
          <div className="mt-5">
            <EvaluatorPanel evaluator={evaluator} imageSrc={evaluatorImageSrc} />
          </div>
          <div className="mt-5">
            <div className="text-sm font-semibold mb-2">Instrumentos</div>
            <div ref={listRef} className="h-[540px] overflow-auto pr-1">
              {instrumentList.map((it) => (
                <ListItem key={it.id} item={it} isPlaced={placedSet.has(it.id)} onStartDrag={handleStartDragFromList} />
              ))}
            </div>
          </div>
        </aside>

        <main className="relative z-10 col-span-12 md:col-span-9">
          <div
            ref={tableRef}
            className="relative rounded-[24px] border border-slate-300/60 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,.6),inset_0_-40px_80px_rgba(0,0,0,.08)]"
            style={{ width: TABLE_W, height: TABLE_H }}
          >
            {/* Camadas da mesa em aço inox */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(165deg,#eef2f5 0%,#d9e0e5 28%,#bac2c9 55%,#dfe6eb 100%)",
              }}
            />
            {/* efeito escovado */}
            <div
              className="absolute inset-0 opacity-30 mix-blend-multiply"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(-12deg,rgba(255,255,255,.35) 0px, rgba(255,255,255,.35) 1px, rgba(0,0,0,.04) 1px, rgba(0,0,0,.04) 3px)",
              }}
            />
            {/* brilho lateral */}
            <div className="pointer-events-none absolute inset-0">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(1200px 380px at -10% 50%, rgba(255,255,255,.35), transparent 60%), radial-gradient(1200px 380px at 110% 50%, rgba(255,255,255,.35), transparent 60%)",
                }}
              />
            </div>
            {/* rebordo metálico */}
            <div className="absolute inset-0 rounded-[24px] ring-1 ring-black/10" />
            <div className="absolute inset-0 rounded-[24px] shadow-[inset_0_12px_20px_rgba(0,0,0,.12),inset_0_-8px_12px_rgba(0,0,0,.08)]" />

            {/* parafusos decorativos */}
            {[[14, 14], [TABLE_W - 28, 14], [14, TABLE_H - 28], [TABLE_W - 28, TABLE_H - 28]].map(([lx, ly], i) => (
              <span
                key={i}
                className="absolute w-4 h-4 rounded-full shadow-sm"
                style={{ left: lx, top: ly, background: "radial-gradient(circle at 30% 30%, #f7fafc, #a8b0b6 60%, #7b858e)" }}
              />
            ))}
            {ZONES.map((z) => (<ZoneBox key={z.id} z={z} error={checked && !!zoneErrors[z.id]} />))}
            <PreviewOverlay item={previewItem} x={previewPos.x} y={previewPos.y} />
            {ZONES.map((z) =>
              placements[z.id].map((itemId, idx) => {
                const item = INSTRUMENTS.find((i) => i.id === itemId)!;
                const row = Math.floor(idx / GRID_COLS);
                const col = idx % GRID_COLS;
                return (
                  <PlacedMini key={itemId} item={item} gridPos={{ row, col }} zone={z} onStartDrag={(it, e) => startDragPlaced(it, e)} />
                );
              })
            )}
          </div>

          {report && (
            <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60">
              <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
                <h2 className="text-3xl font-extrabold text-emerald-600 mb-4">Você foi aprovado!</h2>
                <button onClick={resetGame} className="mt-4 px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow">Reiniciar/Embaralhar</button>
              </div>
            </div>
          )}
        </main>
      </div>

      {showTutorial && (
        <TutorialOverlay
          stepIndex={tutorialStep}
          onNext={() => { if (tutorialStep < TUTORIAL_STEPS.length - 1) setTutorialStep((s) => s + 1); else setShowTutorial(false); }}
          onSkip={() => setShowTutorial(false)}
          refs={{ listRef, tableRef, checkBtnRef }}
        />
      )}
    </div>
  );
}

/* ===== Miniatura ===== */
function PlacedMini({ item, gridPos, zone, onStartDrag }: { item: Instrument; gridPos: { row: number; col: number }; zone: Zone; onStartDrag: (item: Instrument, e: PointerEvent) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const x = zone.x + GRID_GAP + gridPos.col * (PLACED_SIZE + GRID_GAP);
  const y = zone.y + 28 + gridPos.row * (PLACED_SIZE + GRID_GAP);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      onStartDrag(item, e);
    };
    el.addEventListener("pointerdown", onDown);
    return () => {
      el.removeEventListener("pointerdown", onDown);
    };
  }, [item, onStartDrag]);

  return (
    <div ref={ref} className="absolute z-30 cursor-grab active:cursor-grabbing" style={{ left: x, top: y, width: PLACED_SIZE, height: PLACED_SIZE }} title={item.label}>
      {item.imageBase ? (
        <InstrumentImage base={item.imageBase} alt={item.label} className="w-full h-full object-contain drop-shadow-sm" />
      ) : (
        <item.renderIcon width={PLACED_SIZE - 8} height={PLACED_SIZE - 8} />
      )}
    </div>
  );
}





