import type { AppIconSpec } from "@/lib/pwa"

/**
 * The app icon: the letter K on the primary green of §11, the same mark the
 * social card carries.
 *
 * Satori (behind ImageResponse) has no CSS variables, so the colours are
 * explicit. A `maskable` icon keeps the letter inside the middle 80 % that
 * every platform mask leaves visible.
 */
export function AppIcon({
  size,
  purpose,
}: Pick<AppIconSpec, "size" | "purpose">) {
  const bleed = purpose !== "any"

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#145a3c",
        borderRadius: bleed ? 0 : size * 0.22,
        color: "#ffffff",
        fontFamily: "sans-serif",
        fontSize: size * (bleed ? 0.46 : 0.56),
        fontWeight: 600,
      }}
    >
      K
    </div>
  )
}
