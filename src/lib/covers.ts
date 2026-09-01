/**
 * Capas reais via libretro-thumbnails (mesma fonte do RetroArch), servidas pelo jsDelivr.
 * Ex: https://cdn.jsdelivr.net/gh/libretro-thumbnails/Nintendo_-_Game_Boy@master/Named_Boxarts/Tetris_(World).png
 */
const REPOS: Record<string, string> = {
  nes: "Nintendo_-_Nintendo_Entertainment_System",
  snes: "Nintendo_-_Super_Nintendo_Entertainment_System",
  gb: "Nintendo_-_Game_Boy",
  gbc: "Nintendo_-_Game_Boy_Color",
  gba: "Nintendo_-_Game_Boy_Advance",
  n64: "Nintendo_-_Nintendo_64",
  segaMD: "Sega_-_Mega_Drive_-_Genesis",
  segaMS: "Sega_-_Master_System_-_Mark_III",
  psx: "Sony_-_PlayStation",
  atari2600: "Atari_-_2600",
  arcade: "MAME",
};

/** libretro troca caracteres inválidos de nome de arquivo por _ . */
function sanitize(name: string) {
  return name.replace(/[&*/:`<>?\\|]/g, "_").trim();
}

function baseName(name: string) {
  // remove extensão e tags entre parênteses/colchetes do nome do arquivo
  return name
    .replace(/\.[a-z0-9]{2,4}$/i, "")
    .replace(/\s*[[(][^)\]]*[)\]]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lista de URLs candidatas (tentadas em ordem, com fallback no <img onError>). */
export function coverCandidates(system: string, name: string, fileName?: string): string[] {
  const repo = REPOS[system];
  if (!repo) return [];
  const clean = baseName(name);
  const variants = new Set<string>();
  const add = (v: string) => {
    const t = sanitize(v);
    if (t) variants.add(t);
  };
  add(name);
  add(clean);
  add(`${clean} (USA)`);
  add(`${clean} (USA, Europe)`);
  add(`${clean} (Europe)`);
  add(`${clean} (Japan)`);
  add(`${clean} (World)`);
  if (fileName) add(baseName(fileName));

  return Array.from(variants).map(
    (v) =>
      `https://cdn.jsdelivr.net/gh/libretro-thumbnails/${repo}@master/Named_Boxarts/${encodeURIComponent(v)}.png`,
  );
}
