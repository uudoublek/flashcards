/**
 * 加载主题 JSON（带缓存）。
 * 同一主题在内存中只加载一次。
 */
const cache = new Map();
export async function loadTopic(url) {
    if (cache.has(url))
        return cache.get(url);
    const resp = await fetch(url);
    if (!resp.ok)
        throw new Error(`加载主题失败: ${resp.status}`);
    const data = await resp.json();
    cache.set(url, data);
    return data;
}
/** 从卡片数组中提取所有标签 */
export function extractTags(cards) {
    const tagSet = new Set();
    for (const card of cards) {
        for (const t of card.tags) {
            tagSet.add(t);
        }
    }
    return [...tagSet].sort();
}
/** 按标签分组 */
export function groupByTags(cards) {
    const groups = new Map();
    for (const card of cards) {
        for (const tag of card.tags) {
            if (!groups.has(tag))
                groups.set(tag, []);
            groups.get(tag).push(card);
        }
    }
    return groups;
}
