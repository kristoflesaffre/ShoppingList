import { cn } from "@/lib/utils";

/** Hoekbadge op geselecteerde winkeltegel (slide-ins te kopen + nieuw supermarktlijstje). */
export function StoreTileSelectionBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute right-0 top-0 size-[36px]",
        className,
      )}
      aria-hidden
    >
      <span
        className="absolute inset-0 bg-action-primary"
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }}
      />
      <svg
        className="absolute right-[7px] top-[7px]"
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        aria-hidden
      >
        <path
          d="M1 5.80002L3.3999 8.1999L9 1"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
