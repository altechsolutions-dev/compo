import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDrawerTransition } from "./useDrawerTransition";

describe("useDrawerTransition", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("monte d’abord le drawer fermé, puis l’ouvre à la frame suivante", () => {
    let frameCallback: FrameRequestCallback | undefined;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frameCallback = callback;
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    const { result } = renderHook(() => useDrawerTransition(true));

    expect(result.current).toEqual({ mounted: true, open: false });
    expect(frameCallback).toBeDefined();

    act(() => frameCallback?.(0));

    expect(result.current).toEqual({ mounted: true, open: true });
  });

  it("garde le drawer monté pendant sa fermeture avant de le démonter", () => {
    vi.useFakeTimers();
    let frameCallback: FrameRequestCallback | undefined;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frameCallback = callback;
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    const { result, rerender } = renderHook(
      ({ requestedOpen }) => useDrawerTransition(requestedOpen),
      { initialProps: { requestedOpen: true } },
    );
    act(() => frameCallback?.(0));
    expect(result.current).toEqual({ mounted: true, open: true });

    rerender({ requestedOpen: false });
    expect(result.current).toEqual({ mounted: true, open: false });

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toEqual({ mounted: false, open: false });
  });
});
