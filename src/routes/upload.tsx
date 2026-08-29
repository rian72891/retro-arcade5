import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { ArcadeShell } from "@/components/arcade/ArcadeFrame";
import { ACCEPTED_EXTENSIONS, SYSTEMS, guessSystem, uploadGame } from "@/lib/arcade";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Enviar ROM — Fliperama Digital" },
      {
        name: "description",
        content:
          "Envie os arquivos de ROM dos jogos que você possui e adicione novos cartuchos ao seu fliperama.",
      },
      { property: "og:title", content: "Enviar ROM — Fliperama Digital" },
      { property: "og:description", content: "Adicione novos cartuchos ao seu fliperama digital." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [system, setSystem] = useState("");

  const upload = useMutation({
    mutationFn: uploadGame,
    onSuccess: () => {
      toast.success("Cartucho adicionado!");
      queryClient.invalidateQueries({ queryKey: ["games"] });
      navigate({ to: "/jogos" });
    },
    onError: (err: Error) => toast.error(err.message || "Falha no upload"),
  });

  function handleFile(selected: File | null) {
    setFile(selected);
    if (!selected) return;
    if (!name) setName(selected.name.replace(/\.[^.]+$/, "").replace(/[._-]+/g, " "));
    const guessed = guessSystem(selected.name);
    if (guessed) setSystem(guessed.id);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return toast.error("Selecione um arquivo de ROM");
    if (!system) return toast.error("Escolha o console");
    if (!name.trim()) return toast.error("Dê um nome ao jogo");
    upload.mutate({ name, system, file });
  }

  return (
    <ArcadeShell title="Subir ROM" subtitle="Adicione um novo cartucho à sua estante.">
      <div className="mb-8 flex items-start gap-3 rounded-lg border border-accent/50 bg-accent/10 p-4">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-accent" />
        <p className="text-sm text-muted-foreground">
          Envie <strong className="text-foreground">apenas ROMs de jogos que você possui</strong>{" "}
          legalmente. Você é responsável pelos arquivos que subir.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-xl space-y-6 rounded-lg border border-border bg-card/70 p-6 shadow-cabinet"
      >
        <div className="space-y-2">
          <label className="font-pixel block text-[10px] uppercase text-neon" htmlFor="rom">
            Arquivo da ROM
          </label>
          <input
            id="rom"
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(",")}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-md border border-border bg-input px-3 py-3 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary/20 file:px-3 file:py-1.5 file:text-xs file:text-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Aceita {ACCEPTED_EXTENSIONS.join(" ")} — até 200MB.
          </p>
        </div>

        <div className="space-y-2">
          <label className="font-pixel block text-[10px] uppercase text-neon" htmlFor="name">
            Nome do jogo
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Super Mario World"
            className="w-full rounded-md border border-border bg-input px-3 py-3 text-sm outline-none focus:border-accent"
          />
        </div>

        <div className="space-y-2">
          <label className="font-pixel block text-[10px] uppercase text-neon" htmlFor="system">
            Console
          </label>
          <select
            id="system"
            value={system}
            onChange={(e) => setSystem(e.target.value)}
            className="w-full rounded-md border border-border bg-input px-3 py-3 text-sm outline-none focus:border-accent"
          >
            <option value="">Selecione…</option>
            {SYSTEMS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={upload.isPending}
          className="font-pixel w-full rounded-md border border-primary bg-primary/20 px-5 py-4 text-[11px] uppercase text-neon-pink shadow-neon transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {upload.isPending ? "Enviando…" : "Inserir cartucho"}
        </button>
      </form>
    </ArcadeShell>
  );
}
