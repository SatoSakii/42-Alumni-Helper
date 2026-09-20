function getPreciseLevel(experience, sortedLevels)
{
    if (experience <= sortedLevels[0].experience)
        return sortedLevels[0].level;

    for (let i = 0; i < sortedLevels.length - 1; i++)
    {
        const curr = sortedLevels[i], next = sortedLevels[i + 1];

        if (experience >= curr.experience && experience < next.experience)
            return curr.level + (experience - curr.experience) / (next.experience - curr.experience);
    }
    return sortedLevels[sortedLevels.length - 1].level;
}

function getExperienceForLevel(level, sortedLevels)
{
    const lvlInt = Math.floor(level);
    const curr = sortedLevels.find(l => l.level === lvlInt);
    const next = sortedLevels.find(l => l.level === lvlInt + 1);

    if (!curr)
        return 0;
    if (!next)
        return curr.experience;

    const progress = level - lvlInt;
    return curr.experience + progress * (next.experience - curr.experience);
}

function computeGainedExperience(projectsUsers, difficultyById, alumnizedAt, cursusId)
{
    let gainedXp = 0;
    const countedProjects = [];

    for (const pu of projectsUsers)
    {
        if (!pu["validated?"] || !pu.cursus_ids?.includes(cursusId))
            continue;

        const markedAt = new Date(pu.marked_at || pu.updated_at);

        if (markedAt <= alumnizedAt)
            continue;

        const difficulty = difficultyById[pu.project.id];

        if (!difficulty)
            continue;

        const projectXp = difficulty * (pu.final_mark / 100);

        gainedXp += projectXp;
        countedProjects.push({ name: pu.project.name, mark: pu.final_mark, xp: Math.round(projectXp) });
    }
    return { gainedXp, countedProjects };
}
