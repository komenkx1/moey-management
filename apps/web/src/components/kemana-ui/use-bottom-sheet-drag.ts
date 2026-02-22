import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from "react";

interface UseBottomSheetDragOptions {
  isOpen: boolean;
  onClose: () => void;
  closeThreshold?: number;
}

interface BottomSheetDragHandleProps {
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

interface UseBottomSheetDragResult {
  dragY: number;
  dragHandleProps: BottomSheetDragHandleProps;
}

export function useBottomSheetDrag({
  isOpen,
  onClose,
  closeThreshold = 96
}: UseBottomSheetDragOptions): UseBottomSheetDragResult {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const dragYRef = useRef(0);

  const reset = useCallback(() => {
    pointerIdRef.current = null;
    startYRef.current = null;
    dragYRef.current = 0;
    setIsDragging(false);
    setDragY(0);
  }, []);

  const updateDrag = useCallback((clientY: number) => {
    if (startYRef.current === null) {
      return 0;
    }

    const nextDrag = Math.max(0, clientY - startYRef.current);
    dragYRef.current = nextDrag;
    setDragY(nextDrag);
    return nextDrag;
  }, []);

  const finishByPointerId = useCallback(
    (pointerId: number) => {
      if (pointerIdRef.current !== pointerId) {
        return;
      }

      const shouldClose = dragYRef.current >= closeThreshold;
      reset();
      if (shouldClose) {
        onClose();
      }
    },
    [closeThreshold, onClose, reset]
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isOpen) {
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      pointerIdRef.current = event.pointerId;
      startYRef.current = event.clientY;
      dragYRef.current = 0;
      setIsDragging(true);
      setDragY(0);
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        // Some synthetic/test pointer events do not support capture.
      }
    },
    [isOpen]
  );

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId || startYRef.current === null) {
      return;
    }

    const nextDrag = updateDrag(event.clientY);

    if (nextDrag > 0 && event.cancelable) {
      event.preventDefault();
    }
  }, [updateDrag]);

  const finishDrag = useCallback(
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
    if (!isDragging) {
      return;
    }

    const onGlobalPointerMove = (event: globalThis.PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId || startYRef.current === null) {
        return;
      }

      const nextDrag = updateDrag(event.clientY);
      if (nextDrag > 0 && event.cancelable) {
        event.preventDefault();
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
  }, [finishByPointerId, isDragging, updateDrag]);

  return {
    dragY,
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag
    }
  };
}
