import { getSrsRecord, setSrsRecord } from "./storage";
/** 今天的日期 ISO 字符串 "YYYY-MM-DD" */
export function today() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}
/** 日期加 days 天 */
function addDays(date, days) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}
/** SM-2 默认参数 */
const DEFAULTS = {
    easeFactor: 2.5,
    interval: 0,
    reviews: 0,
    lapses: 0,
};
/** 创建初始 SRS 记录 */
function initRecord(cardId, cardTypeId) {
    return {
        cardId,
        cardTypeId,
        ...DEFAULTS,
        nextReview: today(),
        lastReview: "",
    };
}
/** 根据评分计算新的 SRS 记录 */
export function rateCard(topicId, cardId, cardTypeId, rating) {
    const existing = getSrsRecord(topicId, cardId, cardTypeId);
    const rec = existing ?? initRecord(cardId, cardTypeId);
    const now = today();
    let { easeFactor, interval, reviews, lapses } = rec;
    switch (rating) {
        case "again":
            // 完全忘了 → 重置
            lapses += 1;
            interval = 1;
            easeFactor = Math.max(1.3, easeFactor - 0.20);
            reviews = 0;
            break;
        case "hard":
            // 勉强想起
            if (reviews === 0) {
                interval = 1;
            }
            else {
                interval = Math.max(1, Math.round(interval * 1.2));
            }
            easeFactor = Math.max(1.3, easeFactor - 0.15);
            reviews += 1;
            break;
        case "good":
            // 顺利想起
            if (reviews === 0) {
                interval = 1;
            }
            else if (reviews === 1) {
                interval = 3;
            }
            else {
                interval = Math.round(interval * easeFactor);
            }
            reviews += 1;
            break;
        case "easy":
            // 秒答
            if (reviews === 0) {
                interval = 3;
            }
            else {
                interval = Math.round(interval * easeFactor * 1.3);
            }
            easeFactor += 0.15;
            reviews += 1;
            break;
    }
    const updated = {
        ...rec,
        easeFactor: Math.round(easeFactor * 100) / 100,
        interval,
        reviews,
        lapses,
        lastReview: now,
        nextReview: addDays(now, interval),
    };
    setSrsRecord(topicId, updated);
    return updated;
}
