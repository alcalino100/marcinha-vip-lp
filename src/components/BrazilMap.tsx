"use client";

import { useState } from "react";
import { BRAZIL_STATES } from "@/lib/geo";

interface BrazilMapProps {
  stateData: Record<string, { visits: number; clicks: number }>;
  onSelectState?: (uf: string) => void;
  selectedUf?: string;
}

// Coordenadas e posições relativas dos estados brasileiros em grid/mapa SVG estilizado
export const BRAZIL_STATE_COORDS: Record<
  string,
  { name: string; x: number; y: number; w: number; h: number; region: string }
> = {
  // Norte
  RR: { name: "Roraima", x: 180, y: 30, w: 55, h: 48, region: "Norte" },
  AP: { name: "Amapá", x: 310, y: 40, w: 48, h: 48, region: "Norte" },
  AM: { name: "Amazonas", x: 80, y: 80, w: 105, h: 80, region: "Norte" },
  PA: { name: "Pará", x: 235, y: 85, w: 90, h: 85, region: "Norte" },
  AC: { name: "Acre", x: 20, y: 155, w: 55, h: 42, region: "Norte" },
  RO: { name: "Rondônia", x: 110, y: 175, w: 60, h: 50, region: "Norte" },
  TO: { name: "Tocantins", x: 285, y: 175, w: 52, h: 70, region: "Norte" },

  // Nordeste
  MA: { name: "Maranhão", x: 340, y: 110, w: 60, h: 65, region: "Nordeste" },
  PI: { name: "Piauí", x: 380, y: 155, w: 48, h: 65, region: "Nordeste" },
  CE: { name: "Ceará", x: 425, y: 115, w: 50, h: 50, region: "Nordeste" },
  RN: { name: "Rio G. do Norte", x: 475, y: 125, w: 45, h: 36, region: "Nordeste" },
  PB: { name: "Paraíba", x: 475, y: 155, w: 45, h: 32, region: "Nordeste" },
  PE: { name: "Pernambuco", x: 460, y: 185, w: 60, h: 34, region: "Nordeste" },
  AL: { name: "Alagoas", x: 495, y: 215, w: 42, h: 28, region: "Nordeste" },
  SE: { name: "Sergipe", x: 485, y: 240, w: 38, h: 26, region: "Nordeste" },
  BA: { name: "Bahia", x: 375, y: 215, w: 90, h: 85, region: "Nordeste" },

  // Centro-Oeste
  MT: { name: "Mato Grosso", x: 185, y: 180, w: 85, h: 85, region: "Centro-Oeste" },
  GO: { name: "Goiás", x: 280, y: 255, w: 65, h: 65, region: "Centro-Oeste" },
  DF: { name: "Distrito Federal", x: 342, y: 265, w: 26, h: 24, region: "Centro-Oeste" },
  MS: { name: "Mato Grosso do Sul", x: 195, y: 275, w: 75, h: 70, region: "Centro-Oeste" },

  // Sudeste
  MG: { name: "Minas Gerais", x: 345, y: 295, w: 85, h: 75, region: "Sudeste" },
  ES: { name: "Espírito Santo", x: 435, y: 315, w: 40, h: 38, region: "Sudeste" },
  RJ: { name: "Rio de Janeiro", x: 405, y: 365, w: 48, h: 35, region: "Sudeste" },
  SP: { name: "São Paulo", x: 280, y: 345, w: 80, h: 65, region: "Sudeste" },

  // Sul
  PR: { name: "Paraná", x: 265, y: 415, w: 75, h: 50, region: "Sul" },
  SC: { name: "Santa Catarina", x: 275, y: 465, w: 70, h: 42, region: "Sul" },
  RS: { name: "Rio Grande do Sul", x: 255, y: 505, w: 80, h: 60, region: "Sul" },
};

export default function BrazilMap({ stateData = {}, onSelectState, selectedUf }: BrazilMapProps) {
  const [hoveredUf, setHoveredUf] = useState<string | null>(null);

  // Calcula o valor máximo de acessos para calibrar a escala de calor
  const visitCounts = Object.values(stateData).map((s) => s.visits);
  const maxVisits = Math.max(...visitCounts, 1);

  // Retorna a cor de calor do estado baseado na quantidade de acessos
  const getStateColor = (uf: string) => {
    const data = stateData[uf];
    if (!data || data.visits === 0) {
      return uf === selectedUf ? "#3b82f6" : "#27272a"; // Zinc 800
    }

    const ratio = data.visits / maxVisits;

    if (ratio > 0.6) {
      return "#3b82f6"; // Azul forte de alto tráfego
    } else if (ratio > 0.25) {
      return "#6366f1"; // Indigo médio
    } else {
      return "#4f46e5"; // Indigo suave
    }
  };

  const activeUf = hoveredUf || selectedUf;
  const activeStateInfo = activeUf ? BRAZIL_STATE_COORDS[activeUf] : null;
  const activeData = activeUf ? stateData[activeUf] : null;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Tooltip Dinâmico Superior */}
      <div className="w-full min-h-[46px] mb-2 px-3 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between text-xs">
        {activeStateInfo ? (
          <>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
              <span className="font-bold text-white text-sm">
                {activeStateInfo.name} ({activeUf})
              </span>
              <span className="text-[11px] text-zinc-400">Região {activeStateInfo.region}</span>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <span className="text-zinc-300">
                <b className="text-white text-sm">{activeData?.visits || 0}</b> acessos
              </span>
              <span className="text-emerald-400">
                <b className="text-sm">{activeData?.clicks || 0}</b> cliques
              </span>
              <span className="text-purple-400 font-bold">
                {activeData && activeData.visits > 0
                  ? ((activeData.clicks / activeData.visits) * 100).toFixed(1)
                  : "0.0"}
                % CR
              </span>
            </div>
          </>
        ) : (
          <span className="text-zinc-400 text-xs italic">
            Passe o mouse ou toque nos estados do mapa para ver o detalhamento de acessos e cliques.
          </span>
        )}
      </div>

      {/* Mapa Vetorial SVG Interativo do Brasil */}
      <div className="relative w-full max-w-[560px] aspect-[560/580] bg-zinc-950/40 rounded-3xl p-2 border border-zinc-800/60 shadow-inner">
        <svg viewBox="0 0 560 580" className="w-full h-full select-none">
          {/* Definição de gradientes e filtros */}
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#3b82f6" floodOpacity="0.6" />
            </filter>
            <linearGradient id="selectedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>

          {/* Renderização de cada estado brasileiro */}
          {Object.entries(BRAZIL_STATE_COORDS).map(([uf, state]) => {
            const data = stateData[uf];
            const visits = data?.visits || 0;
            const clicks = data?.clicks || 0;
            const isHovered = hoveredUf === uf;
            const isSelected = selectedUf === uf;
            const fillColor = getStateColor(uf);

            return (
              <g
                key={uf}
                onClick={() => onSelectState && onSelectState(uf)}
                onMouseEnter={() => setHoveredUf(uf)}
                onMouseLeave={() => setHoveredUf(null)}
                className="cursor-pointer transition-all duration-150"
              >
                {/* Bloco representativo do Estado com cantos suaves */}
                <rect
                  x={state.x}
                  y={state.y}
                  width={state.w}
                  height={state.h}
                  rx="10"
                  ry="10"
                  fill={isSelected ? "url(#selectedGrad)" : fillColor}
                  stroke={isHovered || isSelected ? "#60a5fa" : "#3f3f46"}
                  strokeWidth={isHovered || isSelected ? 2.5 : 1}
                  filter={isHovered || isSelected ? "url(#glow)" : undefined}
                  className="transition-all duration-150"
                  style={{
                    transformOrigin: `${state.x + state.w / 2}px ${state.y + state.h / 2}px`,
                    transform: isHovered ? "scale(1.06)" : "scale(1)",
                  }}
                />

                {/* Sigla da UF */}
                <text
                  x={state.x + state.w / 2}
                  y={state.y + state.h / 2 - (visits > 0 ? 4 : 0)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#ffffff"
                  fontSize={state.w < 45 ? "10" : "12"}
                  fontWeight="bold"
                  className="pointer-events-none drop-shadow"
                >
                  {uf}
                </text>

                {/* Badge numérica se tiver acessos */}
                {visits > 0 && (
                  <text
                    x={state.x + state.w / 2}
                    y={state.y + state.h / 2 + 10}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={clicks > 0 ? "#34d399" : "#93c5fd"}
                    fontSize={state.w < 45 ? "8" : "10"}
                    fontWeight="bold"
                    className="pointer-events-none font-mono"
                  >
                    {visits}{clicks > 0 ? ` (${clicks})` : ""}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legenda de calor */}
        <div className="absolute bottom-3 left-4 flex items-center gap-3 text-[10px] text-zinc-400 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800">
          <span className="font-semibold text-zinc-300">Intensidade:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-zinc-800 border border-zinc-700" />
            <span>0</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-indigo-600" />
            <span>Baixo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-blue-500 shadow-[0_0_6px_#3b82f6]" />
            <span>Alto Tráfego</span>
          </div>
        </div>
      </div>
    </div>
  );
}
