async function getCached(key, ttlMs, fetcher)
{
    const stored = await chrome.storage.local.get(key);
    const entry = stored[key];

    if (entry && Date.now() - entry.timestamp < ttlMs)
        return entry.data;

    const data = await fetcher();

    await chrome.storage.local.set({ [key]: { data, timestamp: Date.now() } });
    return data;
}

async function clearCache(prefix)
{
    const all = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(all).filter(key => key.startsWith(prefix));

    if (keysToRemove.length)
        await chrome.storage.local.remove(keysToRemove);
}
