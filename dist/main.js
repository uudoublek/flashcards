import "./style.css";
import { loadTopic, groupByTags } from "./topic";
import { getAllSrsRecords, getTheme, applyTheme } from "./storage";
import { today, rateCard } from "./srs";
import { renderMenu, renderTopicHome, renderLearn, renderLearnDone, renderReview, renderReviewDone, renderBrowse, } from "./renderer";
// TODO: 新增主题时在这里注册
const TOPICS = [
    { id: "ultimate-geography", name: "Ultimate Geography", file: "./data/ultimate-geography.json" },
];
// ========== 全局状态 ==========
let currentTopic = null;
// ========== 入口 ==========
function init() {
    // 应用主题（默认浅色）
    applyTheme(getTheme());
    // 路由：检查 hash
    const hash = window.location.hash;
    if (hash.startsWith("#topic=")) {
        const topicId = hash.slice(7);
        const topic = TOPICS.find(t => t.id === topicId);
        if (topic) {
            selectTopic(topic);
            return;
        }
    }
    showMenu();
}
function updateHash(topicId) {
    window.location.hash = `topic=${topicId}`;
}
function clearHash() {
    history.replaceState(null, "", window.location.pathname);
}
// ========== 菜单 ==========
function showMenu() {
    clearHash();
    currentTopic = null;
    renderMenu(TOPICS);
}
// ========== 主题主页 ==========
async function selectTopic(entry) {
    updateHash(entry.id);
    currentTopic = await loadTopic(entry.file);
    showTopicHome();
}
function showTopicHome() {
    if (!currentTopic)
        return showMenu();
    const records = getAllSrsRecords(currentTopic.meta.id);
    const now = today();
    const dueCount = records.filter(r => r.nextReview <= now).length;
    const knownCardIds = new Set(records.map(r => r.cardId));
    const newCount = currentTopic.cards.filter(c => !knownCardIds.has(c.id)).length;
    renderTopicHome(currentTopic, newCount, dueCount);
}
// ========== 事件监听 ==========
document.addEventListener("topic-select", (e) => {
    const detail = e.detail;
    selectTopic(detail);
});
document.addEventListener("nav-menu", () => showMenu());
document.addEventListener("theme-changed", () => {
    // 主题切换后重渲染当前页面以更新图标
    if (currentTopic) {
        showTopicHome();
    }
    else {
        showMenu();
    }
});
document.addEventListener("nav-topic-home", () => {
    learnState = null;
    reviewState = null;
    browseState = null;
    showTopicHome();
});
// ---------- 学习 ----------
document.addEventListener("start-learn", (e) => {
    if (!currentTopic)
        return;
    const detail = e.detail;
    startLearn(detail.tags);
});
let learnState = null;
function startLearn(selectedTags) {
    if (!currentTopic)
        return;
    const allGroups = groupByTags(currentTopic.cards);
    const groupOrder = selectedTags.filter(t => (allGroups.get(t)?.length ?? 0) > 0);
    if (groupOrder.length === 0) {
        showTopicHome();
        return;
    }
    const cardTypes = currentTopic.meta.cardTypes;
    learnState = {
        topicId: currentTopic.meta.id,
        tags: selectedTags,
        cardTypes,
        groups: allGroups,
        groupOrder,
        currentGroupIdx: 0,
        currentCards: [],
        currentCardIdx: 0,
        currentCardTypeIdx: 0,
    };
    startLearnGroup();
}
function startLearnGroup() {
    if (!learnState)
        return;
    const { groupOrder, currentGroupIdx, groups } = learnState;
    const tag = groupOrder[currentGroupIdx];
    const allCards = groups.get(tag);
    // 过滤出新卡片（无 SRS 记录）
    const records = getAllSrsRecords(learnState.topicId);
    const knownIds = new Set(records.map(r => r.cardId));
    const newCards = shuffle(allCards.filter(c => !knownIds.has(c.id)));
    if (newCards.length === 0) {
        // 本组没有新卡，跳到下一组
        advanceGroup();
        return;
    }
    learnState.currentCards = newCards;
    learnState.currentCardIdx = 0;
    learnState.currentCardTypeIdx = 0;
    showLearnCard();
}
function showLearnCard() {
    if (!learnState || !currentTopic)
        return;
    const { currentCards, currentCardIdx, currentCardTypeIdx, cardTypes, currentGroupIdx } = learnState;
    if (currentCardIdx >= currentCards.length) {
        advanceGroup();
        return;
    }
    const card = currentCards[currentCardIdx];
    const cardType = cardTypes[currentCardTypeIdx];
    renderLearn({
        groups: learnState.groups,
        cardTypes: learnState.cardTypes,
        currentGroupIdx,
        currentCardIdx,
        currentCardTypeIdx,
    }, card, cardType, {
        group: currentGroupIdx + 1,
        total: currentCards.length,
        card: currentCardIdx + 1,
    });
}
document.addEventListener("learn-rate", (e) => {
    if (!learnState)
        return;
    const detail = e.detail;
    const { topicId, currentCards, currentCardIdx, currentCardTypeIdx, cardTypes } = learnState;
    const card = currentCards[currentCardIdx];
    const ct = cardTypes[currentCardTypeIdx];
    // 评分 & 存 SRS
    rateCard(topicId, card.id, ct.id, detail.rating);
    // 前进：同一张卡的所有 cardType 练完 → 下一张卡
    const nextTypeIdx = currentCardTypeIdx + 1;
    if (nextTypeIdx < cardTypes.length) {
        learnState.currentCardTypeIdx = nextTypeIdx;
    }
    else {
        learnState.currentCardTypeIdx = 0;
        learnState.currentCardIdx++;
    }
    showLearnCard();
});
function advanceGroup() {
    if (!learnState)
        return;
    const { groupOrder, currentGroupIdx } = learnState;
    const currentTag = groupOrder[currentGroupIdx];
    const nextIdx = currentGroupIdx + 1;
    // 先展示完成提示
    renderLearnDone(currentTag, groupOrder.length - nextIdx);
    learnState.currentGroupIdx = nextIdx;
}
document.addEventListener("learn-group-done", () => {
    if (!learnState)
        return;
    if (learnState.currentGroupIdx >= learnState.groupOrder.length) {
        // 全部完成
        learnState = null;
        showTopicHome();
        return;
    }
    startLearnGroup();
});
let reviewState = null;
document.addEventListener("start-review", () => {
    if (!currentTopic)
        return;
    const records = getAllSrsRecords(currentTopic.meta.id);
    const now = today();
    const dueRecords = records.filter(r => r.nextReview <= now);
    // 构建待复习队列：每张卡 × 到期的 cardType
    const cardMap = new Map();
    for (const c of currentTopic.cards)
        cardMap.set(c.id, c);
    const ctMap = new Map(currentTopic.meta.cardTypes.map(ct => [ct.id, ct]));
    const dueCards = [];
    for (const r of dueRecords) {
        const card = cardMap.get(r.cardId);
        const ct = ctMap.get(r.cardTypeId);
        if (card && ct) {
            dueCards.push({ card, cardType: ct });
        }
    }
    if (dueCards.length === 0) {
        renderReviewDone();
        return;
    }
    // 按 nextReview 升序
    dueCards.sort((a, b) => {
        const ra = dueRecords.find(r => r.cardId === a.card.id && r.cardTypeId === a.cardType.id);
        const rb = dueRecords.find(r => r.cardId === b.card.id && r.cardTypeId === b.cardType.id);
        return ra.nextReview.localeCompare(rb.nextReview);
    });
    reviewState = {
        topicId: currentTopic.meta.id,
        cards: dueCards,
        index: 0,
    };
    showReviewCard();
});
function showReviewCard() {
    if (!reviewState)
        return;
    const { cards, index } = reviewState;
    if (index >= cards.length) {
        reviewState = null;
        renderReviewDone();
        return;
    }
    const { card, cardType } = cards[index];
    renderReview(card, cardType, { done: index, total: cards.length });
}
document.addEventListener("review-rate", (e) => {
    if (!reviewState)
        return;
    const detail = e.detail;
    const { topicId, cards, index } = reviewState;
    const { card, cardType } = cards[index];
    rateCard(topicId, card.id, cardType.id, detail.rating);
    reviewState.index++;
    showReviewCard();
});
let browseState = null;
document.addEventListener("start-browse", (e) => {
    if (!currentTopic)
        return;
    const detail = e.detail;
    // 构建浏览列表：卡片 × 所有 cardType，按标签筛选
    const tagSet = new Set(detail.tags.length > 0 ? detail.tags : currentTopic.cards.flatMap(c => c.tags));
    const filtered = currentTopic.cards.filter(c => c.tags.some(t => tagSet.has(t)));
    const allItems = [];
    for (const card of filtered) {
        for (const ct of currentTopic.meta.cardTypes) {
            allItems.push({ card, cardType: ct });
        }
    }
    if (allItems.length === 0) {
        showTopicHome();
        return;
    }
    browseState = { cards: allItems, index: 0 };
    showBrowseCard();
});
function showBrowseCard() {
    if (!browseState)
        return;
    const { cards, index } = browseState;
    if (index >= cards.length) {
        browseState = null;
        showTopicHome();
        return;
    }
    const { card, cardType } = cards[index];
    renderBrowse(card, cardType, browseState);
}
document.addEventListener("browse-prev", () => {
    if (!browseState)
        return;
    if (browseState.index > 0) {
        browseState.index--;
        showBrowseCard();
    }
});
document.addEventListener("browse-next", () => {
    if (!browseState)
        return;
    if (browseState.index < browseState.cards.length - 1) {
        browseState.index++;
        showBrowseCard();
    }
    else {
        browseState = null;
        showTopicHome();
    }
});
// ========== 工具 ==========
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
// ========== 启动 ==========
init();
