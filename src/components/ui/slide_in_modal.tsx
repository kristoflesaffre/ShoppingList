"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SlideInModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal should close (overlay click, close button, escape) */
  onClose: () => void;
  /** Modal title (rendered in header with close button) */
  title: string;
  /** Modal content (body) */
  children: React.ReactNode;
  /** Optional class for the panel */
  className?: string;
}

const SLIDE_DURATION_MS = 300;

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

/**
 * Slide-in modal from bottom with overlay. Figma 472:2235.
 * Animates in from bottom; overlay dims the background.
 */
export function SlideInModal({
  open,
  onClose,
  title,
  children,
  className,
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
    }, SLIDE_DURATION_MS);
    return () => clearTimeout(t);
  }, [onClose, isClosing]);

  React.useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, handleClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="slide-in-modal-title"
    >
      {/* Overlay – Figma: rgba(100,100,100,0.5) */}
      <button
        type="button"
        onClick={handleClose}
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity duration-300",
          isAnimatingIn && !isClosing ? "opacity-100" : "opacity-0"
        )}
        aria-label="Sluiten"
      />

      {/* Panel – Figma 472:2349: full width, rd-8 top corners, shadow */}
      <div
        className={cn(
          "relative z-10 w-full rounded-t-[var(--radius-md)] bg-[var(--white)] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.13)] transition-transform duration-300 ease-out",
          isAnimatingIn && !isClosing ? "translate-y-0" : "translate-y-full",
          className
        )}
        style={{
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <SlideInModalHeader title={title} onClose={handleClose} />
        <div className="px-4 pb-[45px] pt-6">{children}</div>
      </div>
    </div>
  );
}

/**
 * Header for SlideInModal: title (centered) + close button. Figma 472:2350.
 * h-64, px-4; title: font-medium 16px leading-24, secondary-900.
 */
export function SlideInModalHeader({
  title,
  onClose,
  titleId = "slide-in-modal-title",
}: {
  title: string;
  onClose: () => void;
  titleId?: string;
}) {
  return (
    <div className="relative flex h-16 items-center justify-end px-4">
      <h2
        id={titleId}
        className="pointer-events-none absolute left-0 right-0 text-center font-medium text-base leading-24 tracking-normal text-[var(--secondary-900)]"
      >
        {title}
      </h2>
      <Button
        type="button"
        variant="tertiary"
        onClick={onClose}
        aria-label="Sluiten"
        className="size-10 shrink-0 no-underline p-0 text-[var(--blue-500)] hover:bg-[var(--blue-25)] hover:text-[var(--blue-600)] [&_svg]:size-6"
      >
        <CloseIcon className="size-6 shrink-0" />
      </Button>
    </div>
  );
}
