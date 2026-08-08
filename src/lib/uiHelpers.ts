import { useEffect } from "react";

/**
 * Ported unchanged from original/frontend/src/utils/helpers.ts (pure
 * DOM/browser APIs, portable as-is).
 */

export function autoResize(textarea: HTMLTextAreaElement): void {
  textarea.style.height = "auto";

  const newHeight = textarea.scrollHeight;
  textarea.style.height = `${newHeight}px`;

  const maxHeight = 500;
  if (newHeight > maxHeight) {
    textarea.style.height = `${maxHeight}px`;
    textarea.style.overflowY = "scroll";
  } else {
    textarea.style.overflowY = "hidden";
  }
}

export function useAutoResizeTextarea(): void {
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    const applyAutoResizeToAllTextareas = () => {
      const textareas = document.querySelectorAll("textarea");
      textareas.forEach((textarea) => {
        const handleInput = () => autoResize(textarea);
        textarea.addEventListener("input", handleInput);
        autoResize(textarea);
        cleanups.push(() => textarea.removeEventListener("input", handleInput));
      });
    };

    applyAutoResizeToAllTextareas();
    const observer = new MutationObserver(applyAutoResizeToAllTextareas);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanups.forEach((cleanup) => {
        cleanup();
      });
    };
  }, []);
}

export function confirmDelete(message = "削除を続行するには「はい」と入力してください"): boolean {
  return prompt(message) === "はい";
}
