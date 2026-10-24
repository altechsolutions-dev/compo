import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Drawer } from "./Drawer";

function renderDrawer({ mounted = true, open = true } = {}) {
  const onClose = vi.fn();
  const { unmount } = render(
    <Drawer
      mounted={mounted}
      open={open}
      onClose={onClose}
      labelledBy="drawer-title"
      panelId="test-drawer"
      panelClassName="w-96"
      backdropClassName="z-50"
    >
      <h2 id="drawer-title">Panneau de test</h2>
      <button type="button">Action</button>
    </Drawer>,
  );
  return { onClose, unmount };
}

describe("Drawer", () => {
  it("ne rend rien lorsqu’il n’est pas monté", () => {
    renderDrawer({ mounted: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("rend un dialogue accessible et inerte tant qu’il est fermé", () => {
    renderDrawer({ open: false });

    const dialog = screen.getByRole("dialog", { hidden: true });
    const backdrop = dialog.parentElement;

    expect(dialog).toHaveAttribute("aria-labelledby", "drawer-title");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).not.toHaveClass("is-open");
    expect(backdrop).toHaveAttribute("aria-hidden", "true");
    expect(backdrop).toHaveAttribute("inert");
  });

  it("verrouille le scroll de fond puis restaure les styles à la fermeture", () => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPaddingRight = document.body.style.paddingRight;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "auto";
    document.body.style.paddingRight = "7px";
    document.documentElement.style.overflow = "scroll";

    const { unmount } = renderDrawer();

    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.paddingRight).toBe("7px");
    expect(document.documentElement.style.overflow).toBe("hidden");

    unmount();

    expect(document.body.style.overflow).toBe("auto");
    expect(document.body.style.paddingRight).toBe("7px");
    expect(document.documentElement.style.overflow).toBe("scroll");
    document.body.style.overflow = previousBodyOverflow;
    document.body.style.paddingRight = previousBodyPaddingRight;
    document.documentElement.style.overflow = previousRootOverflow;
  });

  it("ouvre le drawer et ferme uniquement au clic extérieur ou avec Échap", () => {
    const { onClose } = renderDrawer();
    const dialog = screen.getByRole("dialog", { name: "Panneau de test" });
    const backdrop = dialog.parentElement;

    expect(dialog).toHaveClass("match-drawer-panel", "w-96", "is-open");
    expect(backdrop).toHaveClass("match-drawer-backdrop", "z-50", "is-open");

    fireEvent.mouseDown(screen.getByRole("button", { name: "Action" }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(backdrop!);
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
