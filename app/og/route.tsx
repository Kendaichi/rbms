import { ImageResponse } from "next/og";

// Stable social image endpoint at /og (referenced by the home page metadata).
// A route handler is used instead of the opengraph-image file convention,
// which does not attach to a route group's index route (/) in this setup.
export const contentType = "image/png";

// The reversed grain seal (cream disc) reads on the forest-green brand ground.
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <circle cx="128" cy="128" r="124" fill="#FAF8EF"/>
  <circle cx="128" cy="128" r="110" fill="none" stroke="#EBB21F" stroke-width="6"/>
  <path d="M128 74 C 157 110, 157 170, 128 192 C 99 170, 99 110, 128 74 Z" fill="#2D4320"/>
  <path d="M128 96 L128 178" stroke="#FAF8EF" stroke-width="7" stroke-linecap="round"/>
  <path d="M128 74 C 128 58, 134 50, 146 46" fill="none" stroke="#EBB21F" stroke-width="7" stroke-linecap="round"/>
  <path d="M146 46 C 139 45, 133 47, 130 53 C 137 55, 143 53, 146 46 Z" fill="#EBB21F"/>
</svg>`;

export function GET() {
  const mark = `data:image/svg+xml;utf8,${encodeURIComponent(MARK)}`;
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#2D4320",
          color: "#FAF8EF",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: "640px" }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
            }}
          >
            Freshly Milled Rice
          </div>
          <div style={{ fontSize: 34, marginTop: 24, color: "rgba(250,248,239,0.82)" }}>
            Milled fresh. Delivered to your barangay.
          </div>
          <div style={{ fontSize: 27, marginTop: 30, color: "#EBB21F", fontWeight: 600 }}>
            NSIC Rc 160 · order by the kilo
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mark} width={360} height={360} alt="" />
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
