import { useEffect, useRef, useState } from "react";

export function useDrawerTransition(requestedOpen: boolean) {
  const [retainedMounted, setRetainedMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const mountedRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const mounted = requestedOpen || retainedMounted;
  const open = requestedOpen && entered;

  useEffect(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (requestedOpen) {
      frameRef.current = window.requestAnimationFrame(() => {
        mountedRef.current = true;
        setRetainedMounted(true);
        setEntered(true);
        frameRef.current = null;
      });
    } else {
      if (mountedRef.current) {
        closeTimerRef.current = window.setTimeout(() => {
          mountedRef.current = false;
          setRetainedMounted(false);
          setEntered(false);
          closeTimerRef.current = null;
        }, 300);
      }
    }

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [requestedOpen]);

  return { mounted, open };
}
