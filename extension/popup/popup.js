const CACHE_PREFIX = "static:";

async function refreshStatus()
{
    const data = await chrome.storage.local.get(["access_token", "token_expiry"]);
    const statusEl = document.getElementById("status");
    const connectBtn = document.getElementById("connectBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const isConnected = data.access_token && data.token_expiry > Date.now();

    statusEl.textContent = isConnected ? "Connecté" : "Non connecté";
    statusEl.className = isConnected ? "ok" : "ko";
    connectBtn.style.display = isConnected ? "none" : "block";
    logoutBtn.style.display = isConnected ? "block" : "none";
}

async function handleConnect()
{
    const response = await chrome.runtime.sendMessage({ type: "LOGIN" });

    if (response?.success)
        refreshStatus();
    else
        alert(`Connexion échouée: ${response?.error}`);
}

async function handleLogout()
{
    await chrome.runtime.sendMessage({ type: "LOGOUT" });
    refreshStatus();
}

async function handleClearCache()
{
    const all = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(all).filter(key =>
        key.startsWith(CACHE_PREFIX) || key.startsWith("cursus_user:") || key.startsWith("projects_users:")
    );

    if (keysToRemove.length)
        await chrome.storage.local.remove(keysToRemove);
    alert(`Cache vidé (${keysToRemove.length} entrées)`);
}

document.getElementById("connectBtn").addEventListener("click", handleConnect);
document.getElementById("logoutBtn").addEventListener("click", handleLogout);
document.getElementById("clearCacheBtn").addEventListener("click", handleClearCache);

refreshStatus();
