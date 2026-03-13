import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background:
            "radial-gradient(circle at top left, rgba(37,99,235,0.18), transparent 28%), radial-gradient(circle at 82% 18%, rgba(219,234,254,0.56), transparent 24%), linear-gradient(180deg, #f7f8fa 0%, #eef4ff 100%)",
          color: "#111827",
          fontFamily: "Georgia, serif"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            fontFamily: '"Avenir Next", "Segoe UI", sans-serif'
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "32px",
              background: "linear-gradient(135deg, #1d4ed8, #2563eb)"
            }}
          >
            K
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "28px", fontWeight: 700 }}>KeMana</span>
            <span style={{ fontSize: "20px", color: "#51616a" }}>Biar tau uangmu ke mana</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "820px" }}>
          <div style={{ fontSize: "74px", lineHeight: 0.95, letterSpacing: "-0.06em" }}>
            Catat pengeluaran secepat kamu mengingatnya.
          </div>
          <div
            style={{
              fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
              fontSize: "26px",
              lineHeight: 1.5,
              color: "#51616a"
            }}
          >
            Local-first, quick add natural language, insight yang tenang, smart recall,
            dan Night Close untuk ritme mencatat harian.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "16px",
            fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
            fontSize: "22px",
            color: "#1d4ed8"
          }}
        >
          <span
            style={{
              padding: "12px 18px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.74)",
              border: "1px solid rgba(255,255,255,0.85)"
            }}
          >
            Quick Add
          </span>
          <span
            style={{
              padding: "12px 18px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.74)",
              border: "1px solid rgba(255,255,255,0.85)"
            }}
          >
            Local-first
          </span>
          <span
            style={{
              padding: "12px 18px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.74)",
              border: "1px solid rgba(255,255,255,0.85)"
            }}
          >
            Night Close
          </span>
        </div>
      </div>
    ),
    size
  );
}
