import { supabase } from "@/integrations/supabase/client";

export type GameSystem = {
  id: string;
  label: string;
  short: string;
  core: string;
  extensions: string[];
  accent: string;
  layout: "dpad2" | "dpad4" | "dpad6" | "arcade";
};

export const SYSTEMS: GameSystem[] = [
  {
    id: "nes",
    label: "NES / Famicom",
    short: "NES",
    core: "nes",
    extensions: [".nes", ".fds", ".unf"],
    accent: "text-neon-pink",
    layout: "dpad2",
  },
  {
    id: "snes",
    label: "Super Nintendo",
    short: "SNES",
    core: "snes",
    extensions: [".smc", ".sfc", ".snes"],
    accent: "text-neon-cyan",
    layout: "dpad6",
  },
  {
    id: "gb",
    label: "Game Boy",
    short: "GB",
    core: "gb",
    extensions: [".gb"],
    accent: "text-neon-lime",
    layout: "dpad2",
  },
  {
    id: "gbc",
    label: "Game Boy Color",
    short: "GBC",
    core: "gb",
    extensions: [".gbc"],
    accent: "text-neon-lime",
    layout: "dpad2",
  },
  {
    id: "gba",
    label: "Game Boy Advance",
    short: "GBA",
    core: "gba",
    extensions: [".gba"],
    accent: "text-neon-amber",
    layout: "dpad4",
  },
  {
    id: "n64",
    label: "Nintendo 64",
    short: "N64",
    core: "n64",
    extensions: [".n64", ".z64", ".v64"],
    accent: "text-neon-pink",
    layout: "dpad6",
  },
  {
    id: "segaMD",
    label: "Mega Drive / Genesis",
    short: "MD",
    core: "segaMD",
    extensions: [".md", ".gen", ".smd", ".bin"],
    accent: "text-neon-cyan",
    layout: "dpad6",
  },
  {
    id: "segaMS",
    label: "Master System",
    short: "SMS",
    core: "segaMS",
    extensions: [".sms"],
    accent: "text-neon-lime",
    layout: "dpad2",
  },
  {
    id: "psx",
    label: "PlayStation",
    short: "PS1",
    core: "psx",
    extensions: [".cue", ".iso", ".pbp", ".chd", ".img"],
    accent: "text-neon-amber",
    layout: "dpad6",
  },
  {
    id: "atari2600",
    label: "Atari 2600",
    short: "2600",
    core: "atari2600",
    extensions: [".a26"],
    accent: "text-neon-amber",
    layout: "dpad2",
  },
  {
    id: "arcade",
    label: "Arcade (MAME)",
    short: "MAME",
    core: "arcade",
    extensions: [".zip"],
    accent: "text-neon-pink",
    layout: "arcade",
  },
];

export const ACCEPTED_EXTENSIONS = Array.from(
  new Set([...SYSTEMS.flatMap((s) => s.extensions), ".zip", ".7z"]),
);

export function systemById(id: string): GameSystem | undefined {
  return SYSTEMS.find((s) => s.id === id);
}

export function systemLabel(id: string): string {
  return systemById(id)?.label ?? id;
}

export function guessSystem(fileName: string): GameSystem | undefined {
  const lower = fileName.toLowerCase();
  const ext = lower.slice(lower.lastIndexOf("."));
  if (ext === ".zip" || ext === ".7z") return undefined;
  return SYSTEMS.find((s) => s.extensions.includes(ext));
}

export type Game = {
  id: string;
  name: string;
  system: string;
  file_path: string;
  file_name: string;
  cover_url: string | null;
  is_favorite: boolean;
  last_played_at: string | null;
  play_count: number;
  created_at: string;
};

export const ROM_BUCKET = "roms";

export async function fetchGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Game[];
}

export async function fetchGame(id: string): Promise<Game> {
  const { data, error } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Jogo não encontrado");
  return data as Game;
}

export async function getRomUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(ROM_BUCKET)
    .createSignedUrl(filePath, 60 * 60 * 4);
  if (error || !data) throw error ?? new Error("Não foi possível carregar a ROM");
  return data.signedUrl;
}

export async function deleteGame(game: Game) {
  await supabase.storage.from(ROM_BUCKET).remove([game.file_path]);
  const { error } = await supabase.from("games").delete().eq("id", game.id);
  if (error) throw error;
}

export async function toggleFavorite(game: Game): Promise<Game> {
  const { data, error } = await supabase
    .from("games")
    .update({ is_favorite: !game.is_favorite })
    .eq("id", game.id)
    .select()
    .single();
  if (error) throw error;
  return data as Game;
}

export async function markPlayed(game: Game) {
  const { error } = await supabase
    .from("games")
    .update({ last_played_at: new Date().toISOString(), play_count: (game.play_count ?? 0) + 1 })
    .eq("id", game.id);
  if (error) throw error;
}

export async function uploadGame(input: { name: string; system: string; file: File }) {
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(ROM_BUCKET)
    .upload(filePath, input.file, { upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("games")
    .insert({
      name: input.name.trim(),
      system: input.system,
      file_path: filePath,
      file_name: input.file.name,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from(ROM_BUCKET).remove([filePath]);
    throw error;
  }
  return data as Game;
}

/** Deterministic placeholder cover palette derived from the game name. */
export function coverPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 360;
  return {
    from: `oklch(0.5 0.2 ${hash})`,
    to: `oklch(0.35 0.18 ${(hash + 60) % 360})`,
  };
}

export function gameInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0]!.charAt(0)}${words[1]!.charAt(0)}`.toUpperCase();
  return name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "??";
}

export const COVER_BUCKET = "covers";

/** Envia uma capa própria e grava o caminho no jogo. */
export async function uploadCover(game: Game, file: File): Promise<Game> {
  const ext = file.name.slice(file.name.lastIndexOf(".")) || ".png";
  const path = `${game.id}-${Date.now()}${ext}`;
  const { error: upErr } = await supabase.storage
    .from(COVER_BUCKET)
    .upload(path, file, { upsert: true });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("games")
    .update({ cover_url: `storage:${path}` })
    .eq("id", game.id)
    .select()
    .single();
  if (error) throw error;
  return data as Game;
}

/** Resolve o cover_url salvo (URL absoluta ou caminho no storage privado). */
export async function resolveCoverUrl(coverUrl: string): Promise<string | null> {
  if (!coverUrl) return null;
  if (!coverUrl.startsWith("storage:")) return coverUrl;
  const path = coverUrl.slice("storage:".length);
  const { data, error } = await supabase.storage
    .from(COVER_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function clearCover(game: Game): Promise<Game> {
  if (game.cover_url?.startsWith("storage:")) {
    await supabase.storage.from(COVER_BUCKET).remove([game.cover_url.slice(8)]);
  }
  const { data, error } = await supabase
    .from("games")
    .update({ cover_url: null })
    .eq("id", game.id)
    .select()
    .single();
  if (error) throw error;
  return data as Game;
}
