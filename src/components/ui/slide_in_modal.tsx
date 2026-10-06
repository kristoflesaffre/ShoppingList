"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";

export interface SlideInModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal should close (overlay click, close button, escape) */
  onClose: () => void;
  /** Modal title (rendered in header with close button) */
  title: string;
  /** Modal content (body) */
  children: React.ReactNode;
  /** Optional sticky footer, 24px from bottom */
  footer?: React.ReactNode;
  /** When provided, shows a back arrow on the left of the header */
  onBack?: () => void;
  /** Optional class for the panel */
  className?: string;
  /** Merged onto the fixed full-screen wrapper (e.g. z-[60] for nested modals) */
  containerClassName?: string;
  /** id for the title heading and aria-labelledby */
  titleId?: string;
  /** When true, Escape does not close this modal (e.g. when a child modal is open) */
  disableEscapeClose?: boolean;
  /**
   * When true, body children span the full width of the panel (no horizontal padding / max-width wrapper).
   * Use for full-bleed layouts (e.g. horizontal slides); add `px-4` + `max-w-[768px] mx-auto` inside your content.
   */
  bodyFullWidth?: boolean;
  /** Extra classes on the scrollable body (merged last; e.g. `pb-0` to control padding in children only). */
  bodyClassName?: string;
  /**
   * Breedte als gecentreerd venster vanaf tablet (md, ≥768px). Op mobiel is het altijd een blad van onderen.
   * `dialog` = 620px (standaard), `wide` = 956px voor brede/volle-hoogte bladen (items toevoegen, recept bewerken).
   */
  size?: "dialog" | "wide";
  /** Label van de secundaire annuleerknop die vanaf tablet links van de footer-actie staat. `null` = geen. */
  cancelLabel?: string | null;
}

/** Enter: drawer-curve (Emil: 380ms, snel decelererend). Exit is korter — de gebruiker wil weg. */
const SLIDE_IN_MS = 380;
const SLIDE_OUT_MS = 260;

/** Close icon – public/icons/cross.svg, 24×24, currentColor. */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20.254 19.547C20.449 19.742 20.449 20.059 20.254 20.254C20.156 20.352 20.028 20.4 19.9 20.4C19.772 20.4 19.644 20.351 19.546 20.254L12 12.707L4.45298 20.254C4.35598 20.352 4.22798 20.4 4.09998 20.4C3.97198 20.4 3.84398 20.351 3.74598 20.254C3.55098 20.059 3.55098 19.742 3.74598 19.547L11.293 12L3.74698 4.454C3.55198 4.259 3.55198 3.942 3.74698 3.747C3.94198 3.552 4.25898 3.552 4.45398 3.747L12 11.293L19.547 3.746C19.742 3.551 20.059 3.551 20.254 3.746C20.449 3.941 20.449 4.258 20.254 4.453L12.707 12L20.254 19.547Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Back arrow icon – public/icons/arrow.svg, 24×24, currentColor. */
function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3.59377 12.31C3.60777 12.329 3.61477 12.351 3.63177 12.368L9.23178 17.968C9.33378 18.069 9.46678 18.119 9.59978 18.119C9.73278 18.119 9.86678 18.068 9.96778 17.968C10.1698 17.765 10.1698 17.435 9.96778 17.232L5.25578 12.521L19.9998 12.521C20.2868 12.521 20.5198 12.288 20.5198 12.001C20.5198 11.714 20.2868 11.48 19.9998 11.48L5.25477 11.48L9.96678 6.768C10.1688 6.565 10.1688 6.236 9.96577 6.033C9.76477 5.83 9.43378 5.83 9.23078 6.033L3.63078 11.633C3.61378 11.65 3.60577 11.673 3.59177 11.692C3.56477 11.727 3.53678 11.76 3.51978 11.801C3.46678 11.929 3.46678 12.072 3.51978 12.2C3.53778 12.241 3.56677 12.275 3.59377 12.31Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Design system «Blad»: op mobiel een blad van onderen (greepje, hoeken 26),
 * vanaf tablet (md) een gecentreerd venster (radius 26) met de acties rechts onderaan.
 * Slide-in modal from bottom with overlay. Figma 472:2235.
 * Paneelhoogte volgt de inhoud tot max. `100dvh − 48px`; lange inhoud scrollt in het body-gedeelte.
 */
export function SlideInModal({
  open,
  onClose,
  title,
  children,
  footer,
  onBack,
  className,
  containerClassName,
  titleId = "slide-in-modal-title",
  disableEscapeClose = false,
  bodyFullWidth = false,
  bodyClassName,
  size = "dialog",
  cancelLabel = "Annuleer",
}: SlideInModalProps) {
  const [isAnimatingIn, setIsAnimatingIn] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setIsClosing(false);
      const raf = requestAnimationFrame(() => {
        setIsAnimatingIn(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setIsAnimatingIn(false);
    }
  }, [open]);

  const handleClose = React.useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    const t = setTimeout(() => {
      onClose();
    }, SLIDE_OUT_MS);
    return () => clearTimeout(t);
  }, [onClose, isClosing]);

  React.useEffect(() => {
    if (!open || disableEscapeClose) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, handleClose, disableEscapeClose]);

  if (!open) return null;

  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6", containerClassName)}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Overlay – Figma: rgba(100,100,100,0.5) */}
      <button
        type="button"
        onClick={handleClose}
        className={cn(
          "absolute inset-0 bg-black/50 motion-safe:backdrop-blur-[2px] transition-[opacity,backdrop-filter] ease-out",
          isAnimatingIn && !isClosing ? "opacity-100" : "opacity-0"
        )}
        style={{ transitionDuration: `${isClosing ? SLIDE_OUT_MS : SLIDE_IN_MS}ms` }}
        aria-label="Sluiten"
      />

      {/* Panel: hoogte tot inhoud, max. viewport minus 48px; body scrollt bij overflow */}
      <div
        className={cn(
          "relative z-10 flex max-h-[calc(100dvh-48px)] w-full max-w-[956px] flex-col overflow-hidden rounded-t-[26px] bg-[var(--white)] shadow-raised transition-[transform,opacity] will-change-transform",
          "md:rounded-[26px] md:shadow-[0_30px_60px_-20px_rgba(16,17,48,0.45)]",
          size === "dialog" ? "md:max-w-[620px]" : "md:max-w-[956px]",
          isAnimatingIn && !isClosing
            ? "translate-y-0 md:scale-100 md:opacity-100"
            : "translate-y-full md:translate-y-3 md:scale-[0.98] md:opacity-0",
          isClosing ? "ease-in-out-strong" : "ease-drawer",
          className
        )}
        style={{ transitionDuration: `${isClosing ? SLIDE_OUT_MS : SLIDE_IN_MS}ms` }}
      >
        {/* Design system «Blad»: greepje bovenaan, hoeken 26px. */}
        <span aria-hidden className="mx-auto mt-2 block h-1 w-[38px] shrink-0 rounded-full bg-[var(--gray-100)] md:hidden" />
        <SlideInModalHeader
          title={title}
          onClose={handleClose}
          onBack={onBack}
          titleId={titleId}
        />
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pb-4 pt-6",
            footer
              ? "max-h-[calc(100dvh-48px-4.25rem-5.5rem)]"
              : "max-h-[calc(100dvh-48px-4.25rem)]",
            bodyFullWidth
              ? "w-full min-w-0 items-stretch px-0"
              : "items-center px-4 md:px-6",
            bodyClassName,
          )}
        >
          {/* Inhoud komt iets ná het paneel binnen (gestaggerd) — geeft diepte zonder te vertragen */}
          {bodyFullWidth ? (
            <div className="w-full min-w-0 motion-safe:animate-fade-up motion-safe:[animation-delay:90ms] [&>*]:w-full">
              {children}
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[768px] motion-safe:animate-fade-up motion-safe:[animation-delay:90ms] [&>*]:w-full">
              {children}
            </div>
          )}
        </div>
        {footer ? (
          <div className="shrink-0 px-4 pb-[24px] pt-4 md:border-t md:border-[var(--border-subtle)] md:px-6 md:pb-5">
            {/* Mobiel: brede knop(pen) gecentreerd. Tablet+: annuleer + actie rechts, maat md (42). */}
            <div className="mx-auto flex w-full max-w-[320px] flex-col items-center gap-3 [&_button]:w-full [&_button]:max-w-full md:mx-0 md:max-w-none md:flex-row md:justify-end md:gap-2.5 md:[&_button]:h-[42px] md:[&_button]:w-auto md:[&_button]:min-w-[120px] md:[&_button]:px-6">
              {cancelLabel ? (
                <Button type="button" variant="secondary" onClick={handleClose} className="hidden md:inline-flex">
                  {cancelLabel}
                </Button>
              ) : null}
              {footer}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Header for SlideInModal: title links + ronde grijze sluitknop (design system).
 */
export function SlideInModalHeader({
  title,
  onClose,
  onBack,
  titleId = "slide-in-modal-title",
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
  titleId?: string;
}) {
  /* Design system: titel links, ronde grijze sluitknop rechts (RoundIconButton neutral 36). */
  return (
    <div className="flex h-14 shrink-0 items-center justify-center px-4 md:h-16 md:px-6 md:pt-2">
      <div className="flex h-full w-full max-w-[768px] items-center gap-3">
        {onBack ? (
          <RoundIconButton tone="neutral" size={36} onClick={onBack} aria-label="Terug">
            {RoundIcons.back}
          </RoundIconButton>
        ) : null}
        <h2 id={titleId} className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight text-[var(--text-primary)]">
          {title}
        </h2>
        <RoundIconButton tone="neutral" size={36} onClick={onClose} aria-label="Sluiten">
          {RoundIcons.close}
        </RoundIconButton>
      </div>
    </div>
  );
}
