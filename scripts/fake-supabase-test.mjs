/**
 * Server di test che emula gli endpoint REST Supabase usati dall'app
 * (tabelle app_state + app_presence via PostgREST). Serve SOLO per
 * sviluppo/test locale: non fa parte del sito pubblicato.
 *
 * Uso:  node scripts/fake-supabase-test.mjs   (porta 3001)
 */
import http from "node:http";

const state = new Map(); // id -> { id, data, updated_at }
const presence = new Map(); // user_id -> { user_id, online, last_seen }

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, prefer",
};

function sendJson(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    ...CORS,
    ...extraHeaders,
  });
  response.end(body ? JSON.stringify(body) : "");
}

const server = http.createServer((request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, CORS);
    response.end();

    return;
  }

  const url = new URL(request.url, "http://localhost");

  // /rest/v1/app_state?id=eq.app_state&select=data
  if (url.pathname.startsWith("/rest/v1/app_state")) {
    if (request.method === "GET") {
      const id = (url.searchParams.get("id") ?? "").replace("eq.", "");
      const row = state.get(id);

      return sendJson(response, 200, row ? [row] : []);
    }

    if (request.method === "POST") {
      let raw = "";

      request.on("data", (chunk) => {
        raw += chunk;
      });

      request.on("end", () => {
        const body = JSON.parse(raw || "{}");
        const id = body.id ?? "app_state";

        state.set(id, {
          id,
          data: body.data ?? {},
          updated_at: body.updated_at ?? new Date().toISOString(),
        });

        return sendJson(response, 201, null, { "Preference-Applied": "return=minimal" });
      });

      return;
    }
  }

  // /rest/v1/app_presence?select=*
  if (url.pathname.startsWith("/rest/v1/app_presence")) {
    if (request.method === "GET") {
      return sendJson(response, 200, [...presence.values()]);
    }

    if (request.method === "POST") {
      let raw = "";

      request.on("data", (chunk) => {
        raw += chunk;
      });

      request.on("end", () => {
        const body = JSON.parse(raw || "{}");

        presence.set(body.user_id, {
          user_id: body.user_id,
          online: Boolean(body.online),
          last_seen: body.last_seen ?? new Date().toISOString(),
        });

        return sendJson(response, 201, null, { "Preference-Applied": "return=minimal" });
      });

      return;
    }
  }

  return sendJson(response, 404, { message: "not found" });
});

server.listen(3001, () => {
  console.log("Fake Supabase (test) in ascolto su http://localhost:3001");
});
