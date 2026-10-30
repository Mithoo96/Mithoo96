/**
 * Vector recreation of the ALAMOD wordmark (serif A + red guitar-headstock
 * mark + geometric MOD). If you have the original vector/PNG logo, drop it in
 * /public/brand/ and swap this component's markup for an <Image>.
 */
type Props = {
  /** "light" = white letters for dark backgrounds, "dark" = navy letters. */
  tone?: "light" | "dark";
  className?: string;
  title?: string;
};

export function Logo({ tone = "light", className, title = "ALAMOD" }: Props) {
  const ink = tone === "light" ? "#FFFFFF" : "#001235";
  const red = "#F5363C";
  return (
    <svg
      viewBox="158 205 962 355"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      {/* Serif A */}
      <g fill={ink}>
        <polygon points="226,423 232,427 188,527 182,527" />
        <path d="M163 534h48l-2-5c-8-2-15-3-22-3s-14 1-22 4z" />
        <rect x="203" y="478" width="50" height="5" />
        <path d="M251 356h12l70 166c3 6 7 8 12 9v3h-46v-3c-8-3-14-9-17-16l-48-112z" />
      </g>
      {/* Guitar headstock mark */}
      <g fill={red}>
        <path d="M530 553C430 532 342 500 336 442c-2-24 14-40 44-66l80-64c24-20 22-46 60-66 40-17 90-17 135-9-55 1-108 18-130 46-15 20-25 34-55 59l-80 66c-20 18-19 44 8 71 40 33 88 52 132 74z" />
        <ellipse cx="486" cy="253" rx="11" ry="8" transform="rotate(-20 486 253)" />
        <ellipse cx="522" cy="236" rx="11" ry="8" transform="rotate(-20 522 236)" />
        <ellipse cx="561" cy="220" rx="11" ry="8" transform="rotate(-20 561 220)" />
        <ellipse cx="596" cy="269" rx="11" ry="8" transform="rotate(-20 596 269)" />
        <ellipse cx="559" cy="292" rx="11" ry="8" transform="rotate(-20 559 292)" />
        <polygon points="405,466 556,338 586,354 428,484" />
        <polygon points="541,412 581,381 555,538 549,524" />
      </g>
      <path d="M422 412c58 18 108 68 131 125" fill="none" stroke={red} strokeWidth="3" />
      {/* MOD */}
      <g fill={ink}>
        <polygon points="620,360 660,360 701,442 741,360 781,360 781,528 746,528 746,422 711,489 689,489 655,422 655,537 620,537" />
        <circle cx="875" cy="446" r="70" fill="none" stroke={ink} strokeWidth="35" />
        <path
          fillRule="evenodd"
          d="M970 362h60a85 85 0 0 1 0 170h-60zM1005 396h25a51 51 0 0 1 0 102h-25z"
        />
      </g>
    </svg>
  );
}
