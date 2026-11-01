import { brandGlyphs } from "@/lib/brand-glyphs";

// HighLevel isn't in Simple Icons; this is a simplified mark (three rising arrows).
const extra = { highlevel: { title: "HighLevel", hex: "#188BF6" } } as const;
export type BrandKey = keyof typeof brandGlyphs | keyof typeof extra;

const colorOverride: Partial<Record<BrandKey, string>> = { openai: "#0D0D0D", tiktok: "#111111" };

export function BrandGlyph({ brand, size = 18 }: { brand: BrandKey; size?: number }) {
  if (brand === "highlevel") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="HighLevel">
        <path d="M3 21v-9H1l4-5 4 5H7v9z" fill="#FFBC00" />
        <path d="M10 21V9H8l4-6 4 6h-2v12z" fill="#188BF6" />
        <path d="M17 21v-7h-2l4-5 4 5h-2v7z" fill="#37CA37" />
      </svg>
    );
  }
  const g = brandGlyphs[brand];
  const fill = brand === "instagram" ? "url(#ig-grad)" : colorOverride[brand] ?? g.hex;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={g.title}>
      {brand === "instagram" && (
        <defs>
          <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
            <stop offset="0" stopColor="#FDF497" /><stop offset=".05" stopColor="#FDF497" />
            <stop offset=".45" stopColor="#FD5949" /><stop offset=".6" stopColor="#D6249F" /><stop offset=".9" stopColor="#285AEB" />
          </radialGradient>
        </defs>
      )}
      <path d={g.path} fill={fill} />
    </svg>
  );
}

const tileSize = { "2xs": "h-[18px] w-[18px] rounded-[6px]", xs: "h-6 w-6 rounded-[8px]", sm: "h-8 w-8 rounded-[10px]", md: "h-10 w-10 rounded-[13px]", lg: "h-14 w-14 rounded-[18px]" } as const;
const glyphSize = { "2xs": 10, xs: 12, sm: 15, md: 19, lg: 26 } as const;

/** Brand glyph inside the white glass tile used everywhere a service appears. */
export function BrandIcon({ brand, size = "md", className = "" }: { brand: BrandKey; size?: keyof typeof tileSize; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center bg-white ring-1 ring-hair shadow-[0_1px_2px_rgba(16,16,40,0.04),0_4px_12px_-6px_rgba(30,30,80,0.12)] ${tileSize[size]} ${className}`}>
      <BrandGlyph brand={brand} size={glyphSize[size]} />
    </span>
  );
}

export function BrandStack({ brands, size = "xs" }: { brands: BrandKey[]; size?: keyof typeof tileSize }) {
  return (
    <span className="inline-flex items-center -space-x-1.5">
      {brands.map((b) => <BrandIcon key={b} brand={b} size={size} className="ring-2 ring-white" />)}
    </span>
  );
}

export const brandName = (b: BrandKey) => (b === "highlevel" ? "HighLevel" : brandGlyphs[b].title);
