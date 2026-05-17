import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LS_KEY = "edhtrack.config.v2";

// ---------------------------------------------------------------------------
// DEFAULT CONFIG
// ---------------------------------------------------------------------------
// Diese Werte zeigen auf das zentrale Supabase-Projekt von stschoelzel.
// Neue Nutzer bekommen die App sofort vorkonfiguriert — kein Setup nötig.
// Der Anon Key ist public-by-design (wie ein Restaurant-Türknauf):
//   er öffnet die Verbindung, aber Row Level Security (RLS) entscheidet,
//   wer Daten lesen oder schreiben darf. Ohne Eintrag in `allowed_users`
//   kommt man nicht rein.
//
// TODO (für Forker): Wenn du EDHtrack für deine eigene Gruppe hostest,
//   ersetze die drei Werte unten mit deiner eigenen Supabase-URL,
//   deinem eigenen Anon Key und deinem GitHub-Nutzernamen.
//   Anleitung: siehe README.md → Setup → Schritt 2–3.
// ---------------------------------------------------------------------------
const DEFAULT_CONFIG = {
    url: "https://wfcwppbkuuwvwtueodtk.supabase.co", // Supabase Project URL
    key: "sb_publishable_mduIOtE0VumkhxpkiYr1nw_Kdbe8PBi", // Anon/Publishable Key (public-by-design)
    owner: "stschoelzel", // GitHub-Username des Repo-Owners (für Admin-Bootstrap)
};

export function loadConfig() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) {
            return { ...DEFAULT_CONFIG };
        }
        const parsed = JSON.parse(raw);
        return {
            url: String(parsed?.url ?? DEFAULT_CONFIG.url).trim(),
            key: String(parsed?.key ?? DEFAULT_CONFIG.key).trim(),
            owner: String(parsed?.owner ?? DEFAULT_CONFIG.owner).trim(),
        };
    } catch {
        return { ...DEFAULT_CONFIG };
    }
}

export function saveConfig(config) {
    const nextConfig = {
        url: String(config?.url ?? "").trim(),
        key: String(config?.key ?? "").trim(),
        owner: String(config?.owner ?? "").trim(),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(nextConfig));
    return nextConfig;
}

export function clearConfig() {
    localStorage.removeItem(LS_KEY);
}

export function createSupabaseClient(url, key) {
    return createClient(String(url ?? "").trim(), String(key ?? "").trim());
}

export function getConfiguredClient() {
    const config = loadConfig();
    if (!config.url || !config.key) {
        return null;
    }
    return createSupabaseClient(config.url, config.key);
}

export function resolveAppUrl(path) {
    return new URL(path, window.location.href).href;
}

async function loadAllowedProfile(client, userId) {
    let { data: allowed, error } = await client
        .from("allowed_users")
        .select("display_name, is_admin")
        .eq("user_id", userId)
        .single();

    if (error || !allowed) {
        const { data: bootstrapSuccess } = await client.rpc("bootstrap_admin");
        if (bootstrapSuccess) {
            const retry = await client
                .from("allowed_users")
                .select("display_name, is_admin")
                .eq("user_id", userId)
                .single();
            allowed = retry.data;
            error = retry.error;
        }
    }

    if (error || !allowed) {
        return null;
    }

    return allowed;
}

export async function getSessionContext() {
    const client = getConfiguredClient();
    if (!client) {
        return null;
    }

    const { data: { session } } = await client.auth.getSession();
    if (!session) {
        return null;
    }

    const allowed = await loadAllowedProfile(client, session.user.id);
    if (!allowed) {
        return null;
    }

    return {
        supabase: client,
        session,
        allowed,
        config: loadConfig(),
    };
}

export async function checkSession({ redirectTo = resolveAppUrl("index.html") } = {}) {
    const context = await getSessionContext();
    if (!context) {
        window.location.replace(redirectTo);
        return null;
    }
    return context;
}

export function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>\"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}
