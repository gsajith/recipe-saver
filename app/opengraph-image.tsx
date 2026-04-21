import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  const [playfairRegular, playfairItalic] = await Promise.all([
    readFile(join(process.cwd(), "assets/PlayfairDisplay-ExtraBold.ttf")),
    readFile(join(process.cwd(), "assets/PlayfairDisplay-ExtraBoldItalic.ttf")),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#234b39",
        position: "relative",
        overflow: "hidden",
      }}>
      {/* Dot grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          backgroundImage:
            "radial-gradient(circle, rgba(250,247,239,0.07) 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Nav bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "28px 64px",
          borderBottom: "1px solid rgba(250,247,239,0.08)",
          position: "relative",
          zIndex: 1,
        }}>
        <span
          style={{
            fontFamily: "Playfair Display",
            fontSize: 36,
            fontWeight: 700,
            color: "#FAF7EF",
            letterSpacing: "-0.01em",
          }}>
          RecipeBox
        </span>
      </div>

      {/* Hero */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
        }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: 720,
            padding: "0 48px",
          }}>
          {/* Title */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: 40,
            }}>
            <span
              style={{
                fontFamily: "Playfair Display",
                fontSize: 72,
                fontWeight: 800,
                color: "#FAF7EF",
                lineHeight: 1.1,
                letterSpacing: "-0.025em",
                whiteSpace: "nowrap",
              }}>
              Every recipe you love,
            </span>
            <span
              style={{
                fontFamily: "Playfair Display",
                fontSize: 72,
                fontWeight: 800,
                fontStyle: "italic",
                color: "#F5C73A",
                lineHeight: 1.1,
                letterSpacing: "-0.025em",
              }}>
              beautifully saved.
            </span>
          </div>

          {/* CTA button */}
          <div
            style={{
              display: "flex",
              background: "#C86C44",
              color: "white",
              padding: "18px 44px",
              borderRadius: 9999,
              fontSize: 36,
              fontWeight: 700,
            }}>
            Start saving recipes
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Playfair Display",
          data: playfairRegular,
          style: "normal",
          weight: 800,
        },
        {
          name: "Playfair Display",
          data: playfairItalic,
          style: "italic",
          weight: 800,
        },
      ],
    },
  );
}
