import React, { useMemo } from "react";

export interface QrCodeSvgProps {
  value: string;
  size?: number;
  centerLogo?: "vietqr" | "lab" | "shield";
  className?: string;
}

export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({
  value,
  size = 200,
  centerLogo = "lab",
  className = ""
}) => {
  // Generate a deterministic 25x25 QR matrix based on value hash
  const matrix = useMemo(() => {
    const N = 25;
    const grid: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));

    // Simple string hash
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }

    function pseudoRandom() {
      hash = Math.imul(hash, 1664525) + 1013904223;
      return (hash >>> 0) / 4294967296;
    }

    // Fill finder pattern at (r, c)
    function drawFinderPattern(startR: number, startC: number) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            grid[startR + r][startC + c] = true;
          } else {
            grid[startR + r][startC + c] = false;
          }
        }
      }
    }

    // Draw 3 finder patterns
    drawFinderPattern(0, 0);
    drawFinderPattern(0, N - 7);
    drawFinderPattern(N - 7, 0);

    // Separators (leave false around finder patterns)
    // Timing patterns
    for (let i = 8; i < N - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Alignment pattern near bottom right (16, 16)
    const alignR = 16;
    const alignC = 16;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
          grid[alignR + r][alignC + c] = true;
        } else {
          grid[alignR + r][alignC + c] = false;
        }
      }
    }

    // Fill data areas
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        // Skip finder areas
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c >= N - 8) ||
          (r >= N - 8 && c < 8) ||
          (r >= 14 && r <= 18 && c >= 14 && c <= 18) || // alignment
          (r >= 10 && r <= 14 && c >= 10 && c <= 14)    // center logo
        ) {
          continue;
        }

        // Deterministic bit
        grid[r][c] = pseudoRandom() > 0.48;
      }
    }

    return grid;
  }, [value]);

  const N = matrix.length;
  const cellSize = 8;
  const viewBoxSize = N * cellSize;

  return (
    <div className={`relative select-none ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className="w-full h-full rounded"
        style={{ shapeRendering: "crispEdges", backgroundColor: "#FFFFFF" }}
      >
        <rect width={viewBoxSize} height={viewBoxSize} fill="#FFFFFF" rx="6" />
        {matrix.map((row, r) =>
          row.map((isDark, c) =>
            isDark ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#0F172A"
              />
            ) : null
          )
        )}
      </svg>

      {/* Center Logo Overlay */}
      {centerLogo === "vietqr" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-9 h-9 bg-white border-2 border-[#0052CC] rounded-lg shadow-md flex items-center justify-center p-0.5">
            <span className="font-heading font-black text-[9px] text-[#0052CC] leading-none tracking-tighter text-center">
              MB
            </span>
          </div>
        </div>
      )}

      {centerLogo === "lab" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 bg-slate-900 border-2 border-cyan-400 rounded-lg shadow-md flex items-center justify-center">
            <span className="font-mono font-bold text-[10px] text-cyan-300">
              AI
            </span>
          </div>
        </div>
      )}

      {centerLogo === "shield" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 bg-slate-900 border-2 border-emerald-400 rounded-lg shadow-md flex items-center justify-center">
            <span className="font-mono font-bold text-[10px] text-emerald-300">
              OK
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
