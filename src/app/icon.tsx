import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 54%, #2dd4bf 100%)",
          borderRadius: 10,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 30% 22%, rgba(255,255,255,0.34), transparent 32%), radial-gradient(circle at 72% 74%, rgba(255,255,255,0.12), transparent 26%)",
          }}
        />
        <div
          style={{
            color: "#ffffff",
            fontFamily: "Arial, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 1.2,
            lineHeight: 1,
            textShadow: "0 1px 1px rgba(2,6,23,0.18)",
          }}
        >
          ON
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
