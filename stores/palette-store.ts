import { create } from "zustand"

/** Which of the keyboard layers is open (§8.35): the command palette, the shortcut list or neither. */
export type PaletteLayer = "none" | "commands" | "shortcuts"

export const usePaletteStore = create<{
  layer: PaletteLayer
  setLayer: (layer: PaletteLayer) => void
}>()((set) => ({
  layer: "none",
  setLayer: (layer) => set({ layer }),
}))
