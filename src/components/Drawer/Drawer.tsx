import { useEffect, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import "./Drawer.css";

export type DrawerProps = {
  mounted: boolean;
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  panelClassName: string;
  backdropClassName?: string;
  panelId?: string;
  panelRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
};

export function Drawer({
  mounted,
  open,
  onClose,
  labelledBy,
  panelClassName,
  backdropClassName = "z-20",
  panelId,
  panelRef,
  children,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  useEffect(() => {
    if (!mounted) return;

    const body = document.body;
    const root = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousRootOverflow = root.style.overflow;

    body.style.overflow = "hidden";
    root.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      root.style.overflow = previousRootOverflow;
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-hidden={!open}
      className={`match-drawer-backdrop fixed inset-0 flex justify-end ${backdropClassName} ${open ? "is-open" : "pointer-events-none"}`}
      inert={!open}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <aside
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={`match-drawer-panel ${panelClassName} ${open ? "is-open" : ""}`}
        id={panelId}
        onMouseDown={(event) => event.stopPropagation()}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        {children}
      </aside>
    </div>,
    document.body,
  );
}
