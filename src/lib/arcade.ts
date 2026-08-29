import { supabase } from "@/integrations/supabase/client";

export type GameSystem = {
  id: string;
  label: string;
  core: string;
  extensions: string[];
  accent: string;
};

export const SYSTEMS: GameSystem[] = [
  { id: "nes", label: "NES", core: "nes", extensions: [".nes", ".fds"], accent: "text-neon-pink" },
  { id: "snes", label: "Super Nintendo", core: "snes", extensions: [".smc", ".sfc", ".snes"], accent: "text-neon-cyan" },
  { id: "gb", label: "Game Boy / Color", core: "gb", extensions: [".gb", ".gbc"], accent: "text-neon-lime" },
  { id: "gba", label: "Game Boy Advance", core: "gba", extensions: [".gba"], accent: "text-neon-amber" },
  { id: "n64", label: "Nintendo 64", core: "n64", extensions: [".n64", ".z64", ".v64"], accent: "text-neon-pink" },
  { id: "segaMD", label: "Mega Drive / Genesis", core: "segaMD", extensions: [".md", ".gen", ".bin"], accent: "text-neon-cyan" },
  { id: "segaMS", label: "Master System", core: "segaMS", extensions: [".sms"], accent: "text-neon-lime" },
  { id: "psx", label: "PlayStation", core: "psx", extensions: [".cue", ".iso", ".pbp", ".chd"], accent: "text-neon-amber" },
  { id: "arcade", label: "Arcade (MAME)", core: "arcade", extensions: [".zip"], accent: "text-neon-pink" },
];

export const ACCEPTED_EXTENSIONS = Array.from(
  new Set([...SYSTEMS.flatMap((s) => s.extensions), ".zip", ".7z"]),
);

export function systemById(id: string): GameSystem | undefined {
  return SYSTEMS.find((s) => s.id === id);
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
