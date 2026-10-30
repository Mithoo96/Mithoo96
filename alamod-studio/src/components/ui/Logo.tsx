import Image from "next/image";

/**
 * ALAMOD wordmark from the official logo file.
 * /public/brand/alamod-logo.png        original (navy + red) for light backgrounds
 * /public/brand/alamod-logo-light.png  navy letters swapped to white for dark backgrounds
 */
type Props = {
  /** "light" = white letters for dark backgrounds, "dark" = original navy letters. */
  tone?: "light" | "dark";
  className?: string;
  title?: string;
  priority?: boolean;
  sizes?: string;
};

export function Logo({ tone = "light", className, title = "ALAMOD", priority, sizes = "100vw" }: Props) {
  return (
    <Image
      src={tone === "light" ? "/brand/alamod-logo-light.png" : "/brand/alamod-logo.png"}
      alt={title}
      width={951}
      height={344}
      priority={priority}
      className={className}
      sizes={sizes}
    />
  );
}
