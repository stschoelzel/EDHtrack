const LS_KEY = "edhtrack.config.v3";

const DISCOVERY_DOCS = [
    "https://sheets.googleapis.com/$discovery/rest?version=v4",
    "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
];
const SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file";

export function loadConfig() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return { clientId: "", apiKey: "" };
        const parsed = JSON.parse(raw);
        return {
            clientId: String(parsed?.clientId ?? "").trim(),
            apiKey: String(parsed?.apiKey ?? "").trim(),
        };
    } catch {
        return { clientId: "", apiKey: "" };
    }
}

export function saveConfig(config) {
    const nextConfig = {
        clientId: String(config?.clientId ?? "").trim(),
        apiKey: String(config?.apiKey ?? "").trim(),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(nextConfig));
    return nextConfig;
}

export function clearConfig() {
    localStorage.removeItem(LS_KEY);
}

export function resolveAppUrl(path) {
    return new URL(path, window.location.href).href;
}

let tokenClient;
let gapiInited = false;
let gisInited = false;
let sessionContext = null;
let spreadsheetId = null;

// Initialize the Google client library and Google Identity Services
export async function initGoogle(clientId, apiKey) {
    if (!clientId || !apiKey) throw new Error("Missing clientId or apiKey");

    // Initialize gapi client
    await new Promise((resolve, reject) => {
        if (typeof gapi === 'undefined') return reject(new Error("gapi not loaded"));
        gapi.load('client', { callback: resolve, onerror: reject });
    });

    await gapi.client.init({
        apiKey: apiKey,
        discoveryDocs: DISCOVERY_DOCS,
    });
    gapiInited = true;

    // Initialize GIS token client
    if (typeof google === 'undefined') throw new Error("google not loaded");
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: '', // Will be overridden in login()
    });
    gisInited = true;
}

export function isReady() {
    return gapiInited && gisInited;
}

export async function login() {
    return new Promise((resolve, reject) => {
        tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                reject(resp);
                return;
            }
            try {
                await checkAndInitializeSpreadsheet();
                sessionContext = { role: 'admin', user: { id: 'google-user' } };
                resolve(sessionContext);
            } catch(e) {
                reject(e);
            }
        };

        if (gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    });
}

export async function logout() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
    }
    sessionContext = null;
    spreadsheetId = null;
}

export async function getSessionContext() {
    return sessionContext ? { session: sessionContext.user, allowed: { role: 'admin', display_name: 'Admin' } } : null;
}

export async function checkSession({ redirectTo = resolveAppUrl("index.html") } = {}) {
    if (!sessionContext) {
        window.location.replace(redirectTo);
        return null;
    }
    return { session: sessionContext.user, allowed: { role: 'admin', display_name: 'Admin' } };
}

async function checkAndInitializeSpreadsheet() {
    let response;
    try {
        response = await gapi.client.drive.files.list({
            q: "name='EDHtrack_Data' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
            fields: 'files(id, name)',
            spaces: 'drive',
        });
    } catch (err) {
        throw new Error("Failed to search for spreadsheet: " + err.message);
    }

    const files = response.result.files;
    if (files && files.length > 0) {
        spreadsheetId = files[0].id;
    } else {
        // Create the spreadsheet
        const createResponse = await gapi.client.sheets.spreadsheets.create({
            resource: {
                properties: { title: 'EDHtrack_Data' },
                sheets: [
                    { properties: { title: 'Matches' } },
                    { properties: { title: 'Players' } },
                    { properties: { title: 'Decks' } },
                    { properties: { title: 'Game_Types' } },
                    { properties: { title: 'Win_Conditions' } }
                ]
            }
        });
        spreadsheetId = createResponse.result.spreadsheetId;

        // Initialize headers
        const headers = {
            'Matches': ['id', 'played_at', 'participants', 'winner', 'is_draw', 'turn', 'win_condition', 'game_type', 'created_at'],
            'Players': ['id', 'name', 'created_at'],
            'Decks': ['id', 'name', 'created_at'],
            'Game_Types': ['id', 'name'],
            'Win_Conditions': ['id', 'name']
        };

        const data = Object.keys(headers).map(sheetName => ({
            range: `${sheetName}!A1`,
            values: [headers[sheetName]]
        }));

        await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: spreadsheetId,
            resource: {
                valueInputOption: 'RAW',
                data: data
            }
        });
    }
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export async function fetchData(sheetName) {
    if (!spreadsheetId) throw new Error("Spreadsheet not initialized");
    const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: sheetName,
    });

    const rows = response.result.values;
    if (!rows || rows.length < 2) return [];

    const headers = rows[0];
    return rows.slice(1).map((row, rowIndex) => {
        const obj = { _rowIndex: rowIndex + 2 }; // 1-based, +1 for header
        headers.forEach((header, index) => {
            let val = row[index] !== undefined ? row[index] : null;
            if (val !== null && (val.startsWith('{') || val.startsWith('['))) {
                try { val = JSON.parse(val); } catch(e) {}
            } else if (val === 'TRUE') {
                val = true;
            } else if (val === 'FALSE') {
                val = false;
            } else if (header === 'turn' && val) {
                val = parseInt(val, 10);
            }
            obj[header] = val;
        });
        return obj;
    });
}

export async function insertRow(sheetName, obj) {
    if (!spreadsheetId) throw new Error("Spreadsheet not initialized");
    const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!1:1`,
    });
    const headers = response.result.values ? response.result.values[0] : [];

    if (!obj.id) obj.id = uuidv4();
    if (!obj.created_at && headers.includes('created_at')) obj.created_at = new Date().toISOString();

    const rowData = headers.map(header => {
        let val = obj[header];
        if (val === undefined || val === null) return "";
        if (typeof val === 'object') return JSON.stringify(val);
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        return val.toString();
    });

    await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: sheetName,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [rowData] }
    });
    return obj;
}

export async function upsertData(sheetName, objs, conflictKey = 'name') {
    if (!objs || objs.length === 0) return;

    const existingData = await fetchData(sheetName);
    const existingMap = new Map();
    existingData.forEach(item => existingMap.set(item[conflictKey], item));

    for (const obj of objs) {
        if (!existingMap.has(obj[conflictKey])) {
            await insertRow(sheetName, obj);
        }
    }
}

export async function deleteRow(sheetName, id) {
    if (!spreadsheetId) throw new Error("Spreadsheet not initialized");
    const existingData = await fetchData(sheetName);
    const item = existingData.find(x => x.id === id);
    if (!item) return;

    const sheetInfo = await gapi.client.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
    });
    const sheet = sheetInfo.result.sheets.find(s => s.properties.title === sheetName);
    if (!sheet) return;

    const sheetId = sheet.properties.sheetId;
    const rowIndex = item._rowIndex - 1; // 0-based index for API

    await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: {
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: "ROWS",
                            startIndex: rowIndex,
                            endIndex: rowIndex + 1
                        }
                    }
                }
            ]
        }
    });
}
