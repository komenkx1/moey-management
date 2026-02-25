import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from "react";

interface UseSwipeToDeleteOptions {
  onDelete: () => void;
  deleteThreshold?: number;
  enabled?: boolean;
}

interface SwipeToDeleteHandleProps {
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

interface UseSwipeToDeleteResult {
  swipeX: number;
  isRevealed: boolean;
  isSwiping: boolean;
  isSnapping: boolean;
  reset: () => void;
  swipeHandleProps: SwipeToDeleteHandleProps;
}

export function useSwipeToDelete({
  onDelete,
  deleteThreshold = 80,
  enabled = true
}: UseSwipeToDeleteOptions): UseSwipeToDeleteResult {
  const [swipeX, setSwipeX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const swipeXRef = useRef(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const reset = useCallback(() => {
    pointerIdRef.current = null;
    startXRef.current = null;
    startYRef.current = null;
    swipeXRef.current = 0;
    isHorizontalSwipeRef.current = null;
    setIsSwiping(false);
    setIsSnapping(false);
    setSwipeX(0);
    setIsRevealed(false);
  }, []);

  const updateSwipe = useCallback((clientX: number) => {
    if (startXRef.current === null) {
      return 0;
    }

    // Swipe left = negative value, we want to show delete button
    const delta = clientX - startXRef.current;
    // Clamp between -deleteThreshold and 0 (only allow left swipe)
    const nextSwipe = Math.max(-deleteThreshold, Math.min(0, delta));
    swipeXRef.current = nextSwipe;
    setSwipeX(nextSwipe);
    return nextSwipe;
  }, [deleteThreshold]);

  const finishByPointerId = useCallback(
    (pointerId: number) => {
      if (pointerIdRef.current !== pointerId) {
        return;
      }

      const finalSwipe = swipeXRef.current;
      const shouldReveal = finalSwipe <= -deleteThreshold * 0.5; // 50% threshold to reveal

      pointerIdRef.current = null;
      startXRef.current = null;
      startYRef.current = null;
      isHorizontalSwipeRef.current = null;
      setIsSwiping(false);
      setIsSnapping(true);

      if (shouldReveal) {
        // Snap to revealed state
        setSwipeX(-deleteThreshold);
        setIsRevealed(true);
        swipeXRef.current = -deleteThreshold;
      } else {
        // Snap back to closed
        setSwipeX(0);
        setIsRevealed(false);
        swipeXRef.current = 0;
      }

      // Remove snapping flag after transition
      setTimeout(() => {
        setIsSnapping(false);
      }, 300);
    },
    [deleteThreshold]
  );

  // Close revealed state when clicking outside
  useEffect(() => {
    if (!isRevealed) {
      return;
    }

    const handleClickOutside = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest("[data-swipe-delete-action='true']")) {
        return;
      }
      reset();
    };

    // Small delay to avoid immediate close on release
    const timeoutId = setTimeout(() => {
      document.addEventListener("pointerdown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [isRevealed, reset]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) {
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      pointerIdRef.current = event.pointerId;
      startXRef.current = event.clientX;
      startYRef.current = event.clientY;
      swipeXRef.current = isRevealed ? -deleteThreshold : 0;
      isHorizontalSwipeRef.current = null;
      setIsSwiping(true);

      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        // Some synthetic/test pointer events do not support capture.
      }
    },
    [enabled, isRevealed, deleteThreshold]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId || startXRef.current === null || startYRef.current === null) {
        return;
      }

      // Determine if this is horizontal or vertical swipe
      if (isHorizontalSwipeRef.current === null) {
        const deltaX = Math.abs(event.clientX - startXRef.current);
        const deltaY = Math.abs(event.clientY - startYRef.current);

        // Need at least 5px movement to determine direction
        if (deltaX > 5 || deltaY > 5) {
          isHorizontalSwipeRef.current = deltaX > deltaY;
        }
      }

      // Only handle horizontal swipes
      if (isHorizontalSwipeRef.current === true) {
        const nextSwipe = updateSwipe(event.clientX);

        // Prevent default to stop scrolling when swiping horizontally
        if (Math.abs(nextSwipe) > 5 && event.cancelable) {
          event.preventDefault();
        }
      }
    },
    [updateSwipe]
  );

  const finishSwipe = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }

      try {
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Pointer capture may not be active for synthetic/test events.
      }

      finishByPointerId(event.pointerId);
    },
    [finishByPointerId]
  );

  useEffect(() => {
    if (!isSwiping) {
      return;
    }

    const onGlobalPointerMove = (event: globalThis.PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId || startXRef.current === null || startYRef.current === null) {
        return;
      }

      // Determine direction if not yet determined
      if (isHorizontalSwipeRef.current === null) {
        const deltaX = Math.abs(event.clientX - startXRef.current);
        const deltaY = Math.abs(event.clientY - startYRef.current);

        if (deltaX > 5 || deltaY > 5) {
          isHorizontalSwipeRef.current = deltaX > deltaY;
        }
      }

      // Only handle horizontal swipes
      if (isHorizontalSwipeRef.current === true) {
        const nextSwipe = updateSwipe(event.clientX);

        if (Math.abs(nextSwipe) > 5 && event.cancelable) {
          event.preventDefault();
        }
      }
    };

    const onGlobalPointerFinish = (event: globalThis.PointerEvent) => {
      finishByPointerId(event.pointerId);
    };

    window.addEventListener("pointermove", onGlobalPointerMove, { passive: false });
    window.addEventListener("pointerup", onGlobalPointerFinish);
    window.addEventListener("pointercancel", onGlobalPointerFinish);

    return () => {
      window.removeEventListener("pointermove", onGlobalPointerMove);
      window.removeEventListener("pointerup", onGlobalPointerFinish);
      window.removeEventListener("pointercancel", onGlobalPointerFinish);
    };
  }, [finishByPointerId, isSwiping, updateSwipe]);

  return {
    swipeX,
    isRevealed,
    isSwiping,
    isSnapping,
    reset,
    swipeHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishSwipe,
      onPointerCancel: finishSwipe
    }
  };
}
