/**
 * Registro do service worker do modo offline.
 *
 * Só registra no app publicado: em desenvolvimento, dentro de iframe ou nos
 * domínios de preview da Lovable ele desregistra qualquer worker antigo para
 * não servir HTML/chunks velhos. `?sw=off` funciona como chave de desligamento.
 */
const SW_URL = "/sw.js";

function isPreviewHost(hostname: string) {
  const previewSuffixes = [
    "lovableproject.com",
    "lovableproject-dev.com",
    "beta.lovable.dev",
  ];
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    previewSuffixes.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`))
  );
}

async function unregisterAppWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((reg) => {
        const url = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL;
        return Boolean(url && new URL(url, location.href).pathname === SW_URL);
      })
      .map((reg) => reg.unregister()),
  );
}

export async function registerOfflineWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const inIframe = window.self !== window.top;
  const swOff = new URLSearchParams(window.location.search).get("sw") === "off";
  const refuse =
    !import.meta.env.PROD || inIframe || swOff || isPreviewHost(window.location.hostname);

  if (refuse) {
    await unregisterAppWorkers();
    return;
  }

  try {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });
  } catch {
    /* plugin indisponível — segue sem offline */
  }
}
