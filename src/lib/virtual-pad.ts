import type { HudPosition } from "./player-settings";

/**
 * Utilitários para editar o overlay de controles virtuais desenhado pelo próprio
 * EmulatorJS (D-pad, A/B/X/Y, Start/Select, gatilhos, FPS e menu ☰).
 *
 * Em vez de recriar o overlay, marcamos cada elemento com um id estável e
 * aplicamos um deslocamento via CSS `translate`, que não conflita com o
 * `transform` usado pelo emulador.
 */

export const PAD_ROOT_SELECTOR = ".ejs_virtualGamepad_parent";
export const PAD_PREFIX = "vpad:";

/** Elementos arrastáveis dentro do overlay virtual. */
export function padElements(root: HTMLElement): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>("*")).filter((el) => {
    if (el.children.length && !el.className.includes("ejs_dpad")) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 12 && rect.height > 12;
  });
  // Deduplica: mantém apenas o elemento mais externo de cada grupo.
  return nodes.filter((el) => !nodes.some((other) => other !== el && other.contains(el)));
}

/** Garante um id estável para cada elemento do overlay. */
export function ensurePadIds(root: HTMLElement) {
  padElements(root).forEach((el, index) => {
    if (el.dataset["vpadId"]) return;
    const label =
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      (el.textContent ?? "").trim().slice(0, 12) ||
      el.className.split(" ").find((c) => c.startsWith("ejs_")) ||
      "";
    el.dataset["vpadId"] = `${PAD_PREFIX}${label || "el"}-${index}`;
  });
}

/** Aplica os deslocamentos salvos aos elementos do overlay. */
export function applyPadOffsets(root: HTMLElement, positions: Record<string, HudPosition>) {
  ensurePadIds(root);
  padElements(root).forEach((el) => {
    const id = el.dataset["vpadId"];
    if (!id) return;
    const pos = positions[id];
    el.style.translate = pos ? `${pos.x}px ${pos.y}px` : "";
  });
}

/** Limpa os deslocamentos aplicados (usado ao restaurar o padrão). */
export function clearPadOffsets(root: HTMLElement) {
  padElements(root).forEach((el) => {
    el.style.translate = "";
  });
}

type DragState = {
  el: HTMLElement;
  id: string;
  px: number;
  py: number;
  x: number;
  y: number;
};

/**
 * Liga o modo de edição: cada elemento do overlay pode ser arrastado com mouse
 * ou toque. Devolve a função de limpeza.
 */
export function enablePadEditing(
  root: HTMLElement,
  getPositions: () => Record<string, HudPosition>,
  onMove: (id: string, pos: HudPosition) => void,
) {
  ensurePadIds(root);
  let drag: DragState | null = null;
  const tracked = padElements(root);
  tracked.forEach((el) => {
    el.dataset["vpadEditing"] = "1";
    el.style.outline = "1px dashed currentColor";
  });

  const down = (e: PointerEvent) => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-vpad-id]");
    if (!target || !tracked.includes(target)) return;
    e.preventDefault();
    e.stopPropagation();
    const id = target.dataset["vpadId"]!;
    const pos = getPositions()[id];
    drag = { el: target, id, px: e.clientX, py: e.clientY, x: pos?.x ?? 0, y: pos?.y ?? 0 };
    root.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!drag) return;
    e.preventDefault();
    const next = { x: drag.x + (e.clientX - drag.px), y: drag.y + (e.clientY - drag.py) };
    drag.el.style.translate = `${next.x}px ${next.y}px`;
    onMove(drag.id, next);
  };
  const up = () => {
    drag = null;
  };

  root.addEventListener("pointerdown", down, true);
  root.addEventListener("pointermove", move, true);
  root.addEventListener("pointerup", up, true);
  root.addEventListener("pointercancel", up, true);

  return () => {
    root.removeEventListener("pointerdown", down, true);
    root.removeEventListener("pointermove", move, true);
    root.removeEventListener("pointerup", up, true);
    root.removeEventListener("pointercancel", up, true);
    tracked.forEach((el) => {
      delete el.dataset["vpadEditing"];
      el.style.outline = "";
    });
  };
}
