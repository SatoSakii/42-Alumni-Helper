async function getToken()
{
    const data = await chrome.storage.local.get(["access_token", "token_expiry"]);

    if (data.access_token && data.token_expiry > Date.now())
        return data.access_token;
    return null;
}

async function apiFetch(path, token)
{
    const res = await fetch(`https://api.intra.42.fr${path}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401)
        throw new Error("token expired, reconnect via popup");
    if (!res.ok)
        throw new Error(`API error ${res.status}: ${res.statusText}`);
    return res.json();
}

async function fetchLevelEngineData()
{
    const levels = await getCached("static:levels_21", CACHE_TTL_STATIC_MS, async () =>
    {
        const res = await fetch(LEVELS_URL);
        const json = await res.json();
        return json.levels;
    });

    const projects = await getCached("static:projects_21", CACHE_TTL_STATIC_MS, async () =>
    {
        const res = await fetch(PROJECTS_URL);
        const json = await res.json();
        return json.projects;
    });

    const sortedLevels = [...levels].sort((a, b) => a.level - b.level);
    const difficultyById = Object.fromEntries(projects.map(p => [p.id, p.difficulty]));

    return { sortedLevels, difficultyById };
}

async function fetchCursusUser(login, token)
{
    return getCached(`cursus_user:${login}`, CACHE_TTL_CURSUS_USER_MS, async () =>
    {
        const cursusUsers = await apiFetch(`/v2/users/${login}/cursus_users`, token);
        const cursusUser = cursusUsers.find(cu => cu.cursus_id === CURSUS_ID);

        if (!cursusUser)
            throw new Error("42cursus not found for this user");
        return cursusUser;
    });
}

async function fetchAllProjectsUsers(userId, token)
{
    return getCached(`projects_users:${userId}`, CACHE_TTL_PROJECTS_USERS_MS, async () =>
    {
        let all = [], page = 1;

        while (true)
        {
            const data = await apiFetch(
                `/v2/users/${userId}/projects_users?page[size]=100&page[number]=${page}`,
                token
            );

            if (!data.length)
                break;

            all = all.concat(data);
            page++;
        }
        return all;
    });
}

function findExpBarContainer()
{
    return document.querySelector('.progress-container[data-cursus="42cursus"]');
}

function updateExpBar(level)
{
    const container = findExpBarContainer();

    if (!container)
        return console.warn(WIDGET_LOG_PREFIX, "progress bar not found in DOM");

    const bar = container.querySelector(".progress-bar");
    const label = container.querySelector(".on-progress");
    const levelInt = Math.floor(level);
    const percent = Math.round((level - levelInt) * 100);

    bar.style.width = `${percent}%`;
    label.textContent = `level ${levelInt} - ${percent}%`;
    container.title = `level post-alumni (${WIDGET_LOG_PREFIX})`;
}

async function computeRealLevel(login, token)
{
    const { sortedLevels, difficultyById } = await fetchLevelEngineData();
    const cursusUser = await fetchCursusUser(login, token);
    const userId = cursusUser.user.id;
    const alumnizedAt = cursusUser.user.alumnized_at ? new Date(cursusUser.user.alumnized_at) : null;

    if (!alumnizedAt)
        return cursusUser.level;

    const baselineXp = getExperienceForLevel(cursusUser.level, sortedLevels);
    const projectsUsers = await fetchAllProjectsUsers(userId, token);
    const { gainedXp } = computeGainedExperience(projectsUsers, difficultyById, alumnizedAt, CURSUS_ID);

    return getPreciseLevel(baselineXp + gainedXp, sortedLevels);
}

function showLoadingState(container)
{
    const label = container.querySelector(".on-progress");

    if (!label)
        return;

    label.dataset.originalText = label.textContent;
    label.textContent = "Loading...";
}

function restoreLabelOnError(container)
{
    const label = container.querySelector(".on-progress");

    if (label && label.dataset.originalText)
        label.textContent = label.dataset.originalText;
}

async function fetchOwnLogin(token)
{
    const me = await getCached("me", CACHE_TTL_CURSUS_USER_MS, () => apiFetch("/v2/me", token));
    return me.login;
}

async function resolveLogin(token)
{
    const match = window.location.pathname.match(/^\/users\/([^/?#]+)/);

    if (match)
        return decodeURIComponent(match[1]);

    if (window.location.pathname === "/" || window.location.pathname === "")
        return fetchOwnLogin(token);

    return null;
}

async function run()
{
    const token = await getToken();

    if (!token)
        return;

    const container = findExpBarContainer();

    if (container)
        showLoadingState(container);

    try
    {
        const login = await resolveLogin(token);

        if (!login)
            return;

        const realLevel = await computeRealLevel(login, token);
        updateExpBar(realLevel);
    }
    catch (err)
    {
        console.error(WIDGET_LOG_PREFIX, err.message);
        if (container)
            restoreLabelOnError(container);
    }
}

run();
document.addEventListener("turbolinks:load", run);
document.addEventListener("turbo:load", run);
