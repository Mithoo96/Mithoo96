import Image from "next/image";
import type { StudioImage as StudioImageType } from "@/content/images";

type Props = {
  image: StudioImageType;
  sizes: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  /** Override the configured focal point (e.g. a different crop on mobile). */
  position?: string;
};

/**
 * Cropped, art-directed photo. Fills its parent (parent sets the aspect/size).
 * `zoom` from the image config turns a wide photo into a detail crop.
 */
export function StudioImage({ image, sizes, priority, className = "", imgClassName = "", position }: Props) {
  const pos = position ?? image.position ?? "50% 50%";
  const zoom = image.zoom ?? 1;
  // Callers usually pass "absolute inset-0"; only default to relative otherwise.
  const positioning = /\b(absolute|fixed)\b/.test(className) ? "" : "relative";
  return (
    <div className={`${positioning} overflow-hidden bg-navy-800 ${className}`}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={80}
        className={`object-cover ${imgClassName}`}
        style={{
          objectPosition: pos,
          transform: zoom !== 1 ? `scale(${zoom})` : undefined,
          transformOrigin: pos,
        }}
      />
    </div>
  );
}
