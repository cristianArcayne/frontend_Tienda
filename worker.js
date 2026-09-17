import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import manifestJSON from "__STATIC_CONTENT_MANIFEST";
const assetManifest = JSON.parse(manifestJSON);

const BACKEND_URL = "https://api.campusflow.store";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Redirigir /api/* al backend de Render
    if (url.pathname.startsWith("/api/")) {
      const headers = new Headers(request.headers);
      // Enviar el hostname original para que django-tenants identifique el tenant
      headers.set("X-Forwarded-Host", url.hostname);
      headers.set("Host", url.hostname);

      const backendRequest = new Request(
        `${BACKEND_URL}${url.pathname}${url.search}`,
        {
          method: request.method,
          headers: headers,
          body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
        }
      );
      return fetch(backendRequest);
    }

    // Servir archivos estáticos de Angular
    try {
      return await getAssetFromKV(
        { request, waitUntil: ctx.waitUntil.bind(ctx) },
        { ASSET_NAMESPACE: env.__STATIC_CONTENT, ASSET_MANIFEST: assetManifest }
      );
    } catch {
      return await getAssetFromKV(
        { request, waitUntil: ctx.waitUntil.bind(ctx) },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest,
          mapRequestToAsset: (req) =>
            new Request(`${new URL(req.url).origin}/index.html`, req),
        }
      );
    }
  },
};