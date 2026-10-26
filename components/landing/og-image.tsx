import type { Lang } from "@/lib/domain/types"

export const OG_SIZE = { width: 1200, height: 630 }

export const OG_ALT =
  "Kirjanpito – toiminimen yhdenkertainen kirjanpito, ALV-laskelma lokakuulta 2026"

/**
 * The social card's file name and URL.
 *
 * It is served by the route handler at app/og/[file], not by Next's
 * `opengraph-image` file convention, because that convention emits an
 * extensionless file and GitHub Pages types a response from its extension —
 * see the note in that route. The `.png` here is what makes the deployed file
 * serve as image/png, so the name and the metadata must stay in step; both
 * read it from here.
 */
export const OG_FILE = "opengraph-image.png"
export const OG_PATH = `/og/${OG_FILE}`

const COPY = {
  fi: {
    title: "Toiminimen kirjanpito, joka mahtuu yhteen tiedostoon.",
    lead: "Arvonlisävero ja tuloslaskelma valmiina veroilmoitusta varten.",
    vat: "ALV-LASKELMA",
    month: "Lokakuu 2026",
    sales: "Myynnin vero",
    purchases: "Ostojen vero",
    due: "Maksettava",
  },
  en: {
    title: "Sole trader bookkeeping that fits in a single file.",
    lead: "VAT and income statement, ready for your tax return.",
    vat: "VAT RETURN",
    month: "October 2026",
    sales: "VAT on sales",
    purchases: "VAT on purchases",
    due: "Payable",
  },
} as const

/**
 * The social preview card.
 *
 * Satori (behind ImageResponse) supports flexbox and a subset of CSS only —
 * no grid, no CSS variables — so this is written with explicit colours and
 * plain flex layout rather than the app's tokens.
 */
export function OgImage({ lang }: { lang: Lang }) {
  const copy = COPY[lang]

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#f5f7fa",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px",
          width: "660px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "#1d4f91",
              color: "#ffffff",
              fontSize: "24px",
              fontWeight: 600,
            }}
          >
            K
          </div>
          <div style={{ fontSize: "26px", fontWeight: 600, color: "#142033" }}>
            Kirjanpito
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: "52px",
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "#142033",
            marginTop: "36px",
          }}
        >
          {copy.title}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: "24px",
            color: "#5a6678",
            marginTop: "22px",
          }}
        >
          {copy.lead}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          background: "#ecf0f5",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "320px",
            background: "#fffdf8",
            border: "1px solid #e9e3d6",
            borderRadius: "10px",
            padding: "28px",
            transform: "rotate(3deg)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "15px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: "#5a6678",
            }}
          >
            {copy.vat}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "16px",
              color: "#5a6678",
              marginTop: "4px",
            }}
          >
            {copy.month}
          </div>

          <div
            style={{
              display: "flex",
              borderTop: "1px dashed #e9e3d6",
              marginTop: "18px",
              paddingTop: "16px",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <Row label={copy.sales} value="637,50 €" />
            <Row label={copy.purchases} value="−20,32 €" />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              borderTop: "1px solid #e9e3d6",
              marginTop: "16px",
              paddingTop: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "18px",
                fontWeight: 600,
                color: "#142033",
              }}
            >
              {copy.due}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "30px",
                fontWeight: 700,
                color: "#142033",
              }}
            >
              617,18 €
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: "18px",
      }}
    >
      <div style={{ display: "flex", color: "#5a6678" }}>{label}</div>
      <div style={{ display: "flex", color: "#142033" }}>{value}</div>
    </div>
  )
}
