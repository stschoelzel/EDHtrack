import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LS_KEY = "edhtrack.config.v2";

export function loadConfig() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) {
            return { url: "", key: "", owner: "" };
        }
        const parsed = JSON.parse(raw);
        return {
            url: String(parsed?.url ?? "").trim(),
            key: String(parsed?.key ?? "").trim(),
            owner: String(parsed?.owner ?? "").trim(),
        };
    } catch {
        return { url: "", key: "", owner: "" };
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
