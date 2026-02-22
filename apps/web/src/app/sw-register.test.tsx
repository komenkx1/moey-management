import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SWRegister from "./sw-register";

const UPDATE_BANNER_DISMISSED_SESSION_KEY = "kemana.updateBanner.dismissedSession.v1";

function flushAsync(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

describe("SWRegister update banner", () => {
  let root: Root | null = null;
  let container: HTMLDivElement;
  let originalServiceWorkerDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    window.sessionStorage.clear();
    originalServiceWorkerDescriptor = Object.getOwnPropertyDescriptor(window.navigator, "serviceWorker");
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    root = null;

    if (originalServiceWorkerDescriptor) {
      Object.defineProperty(window.navigator, "serviceWorker", originalServiceWorkerDescriptor);
    } else {
      Reflect.deleteProperty(window.navigator, "serviceWorker");
    }

    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  async function renderWithWaitingUpdate(params?: { dismissedSession?: boolean }) {
    const waitingWorker = {
      postMessage: vi.fn()
    };
    const registration = {
      waiting: waitingWorker,
      installing: null,
      addEventListener: vi.fn()
    };
    const serviceWorker = {
      register: vi.fn().mockResolvedValue(registration),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      controller: {}
    };

    if (params?.dismissedSession) {
      window.sessionStorage.setItem(UPDATE_BANNER_DISMISSED_SESSION_KEY, "1");
    }

    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: serviceWorker
    });

    root = createRoot(container);
    await act(async () => {
      root?.render(<SWRegister />);
      await flushAsync();
      await flushAsync();
    });

    return {
      waitingWorker,
      serviceWorker
    };
  }

  it("menampilkan update banner saat SW waiting tersedia dan bisa apply update", async () => {
    const { waitingWorker } = await renderWithWaitingUpdate();

    expect(container.textContent).toContain("Versi baru siap dipakai");
    const applyButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Muat ulang"
    );
    expect(applyButton).toBeTruthy();

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushAsync();
    });

    expect(waitingWorker.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });

  it("aksi Nanti menyembunyikan banner dan tersimpan per sesi", async () => {
    await renderWithWaitingUpdate();

    const dismissButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Nanti"
    );
    expect(dismissButton).toBeTruthy();

    await act(async () => {
      dismissButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushAsync();
    });

    expect(window.sessionStorage.getItem(UPDATE_BANNER_DISMISSED_SESSION_KEY)).toBe("1");
    expect(container.textContent).not.toContain("Versi baru siap dipakai");
  });

  it("banner tidak muncul lagi dalam sesi yang sama setelah dismissed", async () => {
    await renderWithWaitingUpdate({ dismissedSession: true });
    expect(window.sessionStorage.getItem(UPDATE_BANNER_DISMISSED_SESSION_KEY)).toBe("1");
    expect(container.textContent).not.toContain("Versi baru siap dipakai");
  });
});
