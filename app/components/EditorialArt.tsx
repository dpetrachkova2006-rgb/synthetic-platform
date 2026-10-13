import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`synth-brand${compact ? " synth-brand--small" : ""}`}>
      <strong>
        SYNTH<span>*</span>
      </strong>
      <small>RESPONDENTS</small>
    </span>
  );
}
export function InkArrow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`ink-arrow ${className}`}
      viewBox="0 0 140 85"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M131 10C147 44 89 75 28 54L8 44m0 0 10 26M8 44l29-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M127 13c16 28-31 56-77 48"
        stroke="currentColor"
        strokeWidth=".6"
      />
    </svg>
  );
}
export function Scribble({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`ink-scribble ${className}`}
      viewBox="0 0 180 50"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m8 27 146-20L24 38 170 15M9 39l156-15M40 24l90-19"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function MethodArt({
  type,
}: {
  type: "quantitative" | "qualitative" | "mixed";
}) {
  return (
    <svg className="method-art" viewBox="0 0 330 160" aria-hidden="true">
      <defs>
        <pattern
          id={`grid-${type}`}
          width="27"
          height="27"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M27 0H0V27"
            fill="none"
            stroke="#111"
            strokeOpacity=".23"
            strokeWidth=".7"
          />
        </pattern>
        <pattern
          id={`grain-${type}`}
          width="13"
          height="17"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M1 2h2m8 10h1M6 8h1M3 15h2"
            stroke="#f4f2eb"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      {type === "quantitative" ? (
        <>
          <rect
            x="10"
            y="19"
            width="270"
            height="134"
            fill={`url(#grid-${type})`}
          />
          {[52, 80, 117, 94, 139, 71, 103].map((h, i) => (
            <g key={i}>
              <rect
                x={31 + i * 33}
                y={150 - h}
                width="24"
                height={h}
                fill={i % 3 === 0 ? "#888" : "#080808"}
              />
              <rect
                x={31 + i * 33}
                y={150 - h}
                width="24"
                height={h}
                fill={`url(#grain-${type})`}
              />
            </g>
          ))}
          <path
            d="m225 101 68-21-13 16m13-16-17-1M35 11v145"
            fill="none"
            stroke="#111"
            strokeWidth="1.5"
          />
        </>
      ) : type === "qualitative" ? (
        <>
          <path d="m31 26 168-18 7 92-98 13-33 27-3-25-35 3Z" fill="#0a0a0a" />
          <path
            d="m31 26 168-18 7 92-98 13-33 27-3-25-35 3Z"
            fill={`url(#grain-${type})`}
          />
          <path
            d="M254 51c62 12 65 74 4 80l-5 29-23-29c-48 1-78-18-76-42s36-48 100-38"
            fill="#0825ff"
          />
          <path
            d="M254 51c62 12 65 74 4 80l-5 29-23-29c-48 1-78-18-76-42s36-48 100-38"
            fill={`url(#grain-${type})`}
          />
        </>
      ) : (
        <>
          <circle cx="130" cy="77" r="65" fill="#0825ff" />
          <circle
            cx="216"
            cy="91"
            r="60"
            fill="#a0a09b"
            fillOpacity=".65"
            stroke="#555"
            strokeWidth=".7"
          />
          <circle cx="130" cy="77" r="65" fill={`url(#grain-${type})`} />
          <path
            d="M263 45C62 29-1 146 122 135c114-9 184-38 134-86M114 11c-21 55-24 88 10 130M217 29c70 59 62 98-27 116"
            stroke="#111"
            strokeWidth="1.2"
            fill="none"
          />
        </>
      )}
    </svg>
  );
}
export function ReportBooklets() {
  return (
    <div
      className="report-booklets"
      aria-label="Иллюстрация структуры отчёта, без результатов исследования"
    >
      <div className="booklet booklet--cover">
        <Brand compact />
        <h3>
          ОТЧЁТ
          <br />
          ОБ
          <br />
          <span>ИССЛЕДОВАНИИ</span>
        </h3>
        <p>
          Выводы
          <br />
          Цитаты
          <br />
          Результаты
        </p>
        <Image
          src="/design/earth-collage.webp"
          alt=""
          width={280}
          height={186}
        />
      </div>
      <div className="booklet booklet--findings">
        <b>01</b>
        <h3>
          КЛЮЧЕВЫЕ
          <br />
          ВЫВОДЫ
        </h3>
        <div className="booklet-lines" aria-hidden="true" />
        <div className="booklet-color" aria-hidden="true" />
        <span>
          От наблюдений
          <br />к объяснениям
        </span>
      </div>
      <div className="booklet booklet--results">
        <b>02</b>
        <h3>РЕЗУЛЬТАТЫ</h3>
        <div className="booklet-lines" aria-hidden="true" />
        <svg viewBox="0 0 110 85" aria-hidden="true">
          <path d="M8 5v70h98" stroke="#555" fill="none" />
          {[45, 24, 60, 35, 52].map((h, i) => (
            <rect
              key={i}
              x={17 + i * 17}
              y={75 - h}
              width="10"
              height={h}
              fill={i % 2 ? "#999" : "#0825ff"}
            />
          ))}
        </svg>
        <span>Диаграммы и ответы</span>
      </div>
      <div className="booklet booklet--method">
        <b>03</b>
        <h3>
          МЕТОД
          <br />И ИСТОЧНИКИ
        </h3>
        <div className="booklet-lines" aria-hidden="true" />
        <Image
          src="/design/crowd-collage.webp"
          alt=""
          width={140}
          height={175}
        />
      </div>
    </div>
  );
}
