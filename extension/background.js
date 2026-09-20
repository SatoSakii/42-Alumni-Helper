const CLIENT_ID = "u-s4t2ud-ca0da0a9eb3d89c8b5ed2735416e7731c46c443b4309f3956ea4f1b0b72048e3";
const PROXY_URL = "https://42-alumni-helper.vercel.app/api/token";
const REDIRECT_URI = chrome.identity.getRedirectURL();

async function exchangeCodeForToken(code)
{
    const tokenRes = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri: REDIRECT_URI })
    });

    if (!tokenRes.ok)
        throw new Error(`token exchange failed (${tokenRes.status})`);

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token)
        throw new Error(`no access_token in response: ${JSON.stringify(tokenData)}`);

    return tokenData;
}

async function doOAuthLogin()
{
    const authUrl =
        `https://api.intra.42.fr/oauth/authorize?` +
        `client_id=${CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `response_type=code&scope=public`;

    const responseUrl = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true });
    const code = new URL(responseUrl).searchParams.get("code");

    if (!code)
        throw new Error("no code in redirect URL");

    const tokenData = await exchangeCodeForToken(code);
    const expiresIn = tokenData.expires_in || 7200;
    const expiry = Date.now() + expiresIn * 1000 - 60000;

    await chrome.storage.local.set({
        access_token: tokenData.access_token,
        token_expiry: expiry
    });
}

async function doLogout()
{
    await chrome.storage.local.remove(["access_token", "token_expiry"]);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) =>
{
    if (msg.type === "LOGIN")
    {
        doOAuthLogin()
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (msg.type === "LOGOUT")
    {
        doLogout().then(() => sendResponse({ success: true }));
        return true;
    }
});
