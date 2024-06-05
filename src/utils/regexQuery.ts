export const regexQuery = (query : string) : string => {
    const escapedQuery = query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regexQuery = `%${escapedQuery}%`;
    return regexQuery;
}