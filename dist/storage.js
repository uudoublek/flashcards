const STORAGE_PREFIX = "fc";
function key(topicId, cardId, cardTypeId) {
    return `${STORAGE_PREFIX}/${topicId}/${cardId}/${cardTypeId}`;
}
/** 获取某卡片的 SRS 记录 */
export function getSrsRecord(topicId, cardId, cardTypeId) {
    const raw = localStorage.getItem(key(topicId, cardId, cardTypeId));
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
/** 保存 SRS 记录 */
export function setSrsRecord(topicId, record) {
    localStorage.setItem(key(topicId, record.cardId, record.cardTypeId), JSON.stringify(record));
}
/** 获取某个主题下所有 SRS 记录 */
export function getAllSrsRecords(topicId) {
    const prefix = `${STORAGE_PREFIX}/${topicId}/`;
    const records = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
            const raw = localStorage.getItem(k);
            if (raw) {
                try {
                    records.push(JSON.parse(raw));
                }
                catch { /* skip corrupted */ }
            }
        }
    }
    return records;
}
// ========== 主题偏好 ==========
const THEME_KEY = `${STORAGE_PREFIX}-theme`;
export function getTheme() {
    try {
        const v = localStorage.getItem(THEME_KEY);
        if (v === "light" || v === "dark")
            return v;
    }
    catch { /* fall through */ }
    return "light"; // 默认浅色
}
export function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
}
export function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
}
/** 清除某个主题的所有 SRS 数据 */
export function clearTopicSrs(topicId) {
    const prefix = `${STORAGE_PREFIX}/${topicId}/`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix))
            keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
}
