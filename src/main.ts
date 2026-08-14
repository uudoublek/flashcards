import "./style.css";
import type { Card, CardTypeDef, TopicData } from "./types";
import { loadTopic, groupByTags } from "./topic";
import { getAllSrsRecords, getTheme, applyTheme } from "./storage";
import { today, rateCard } from "./srs";
import {
  renderMenu,
  renderTopicHome,
  renderLearn,
  renderLearnDone,
  renderReview,
  renderReviewDone,
  renderBrowse,
} from "./renderer";

// ========== 主题清单 ==========

interface TopicEntry {
  id: string;
  name: string;
  file: string;
}

// TODO: 新增主题时在这里注册
const TOPICS: TopicEntry[] = [
  { id: "ultimate-geography", name: "Ultimate Geography", file: "./data/ultimate-geography.json" },
  { id: "multiplication-table", name: "大九九乘法表", file: "./data/multiplication-table.json" },
  { id: "wubi86root", name: "五笔单字根（全）", file: "./data/wubi86root.json" },
  { id: "organic-chemistry", name: "化学::有机化学", file: "./data/organic-chemistry.json" },
  { id: "chemical-elements", name: "化学::化学元素", file: "./data/chemical-elements.json" },
  { id: "chemical-equations", name: "化学::化学方程式", file: "./data/chemical-equations.json" },
  { id: "classical-chinese-patterns", name: "语文::文言句式", file: "./data/classical-chinese-patterns.json" },
  { id: "reaction-principles", name: "化学::反应原理", file: "./data/reaction-principles.json" },
  { id: "structure-properties", name: "化学::物质结构与性质", file: "./data/structure-properties.json" },
  { id: "chemistry-life", name: "化学::化学与生活", file: "./data/chemistry-life.json" },
  { id: "modern-biotechnology", name: "生物::现代生物科技", file: "./data/modern-biotechnology.json" },
  { id: "biotechnology-practice", name: "生物::生物技术实践", file: "./data/biotechnology-practice.json" },
  { id: "genetics-evolution", name: "生物::遗传与进化", file: "./data/genetics-evolution.json" },
  { id: "homeostasis-environment", name: "生物::稳态与环境", file: "./data/homeostasis-environment.json" },
];

// ========== 全局状态 ==========

let currentTopic: TopicData | null = null;

// ========== 入口 ==========

function init(): void {
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

function updateHash(topicId: string): void {
  window.location.hash = `topic=${topicId}`;
}

function clearHash(): void {
  history.replaceState(null, "", window.location.pathname);
}

// ========== 菜单 ==========

function showMenu(): void {
  clearHash();
  currentTopic = null;
  renderMenu(TOPICS);
}

// ========== 主题主页 ==========

async function selectTopic(entry: TopicEntry): Promise<void> {
  updateHash(entry.id);
  currentTopic = await loadTopic(entry.file);
  showTopicHome();
}

function showTopicHome(): void {
  if (!currentTopic) return showMenu();

  const records = getAllSrsRecords(currentTopic.meta.id);
  const now = today();
  const dueCount = records.filter(r => r.nextReview <= now).length;
  const knownCardIds = new Set(records.map(r => r.cardId));
  const newCount = currentTopic.cards.filter(c => !knownCardIds.has(c.id)).length;

  renderTopicHome(currentTopic, newCount, dueCount);
}

// ========== 事件监听 ==========

document.addEventListener("topic-select", (e) => {
  const detail = (e as CustomEvent).detail as TopicEntry;
  selectTopic(detail);
});

document.addEventListener("nav-menu", () => showMenu());

document.addEventListener("theme-changed", () => {
  // 主题切换后重渲染当前页面以更新图标
  if (currentTopic) {
    showTopicHome();
  } else {
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
  if (!currentTopic) return;
  const detail = (e as CustomEvent).detail as { tags: string[] };
  startLearn(detail.tags);
});

interface LearnState {
  topicId: string;
  tags: string[];
  cardTypes: CardTypeDef[];
  groups: Map<string, Card[]>;
  groupOrder: string[];
  currentGroupIdx: number;
  /** 当前组内的新卡（无 SRS 记录的卡片） */
  currentCards: Card[];
  currentCardIdx: number;
  currentCardTypeIdx: number;
}

let learnState: LearnState | null = null;

function startLearn(selectedTags: string[]): void {
  if (!currentTopic) return;

  const allGroups = groupByTags(currentTopic.cards);
  // 如果没选标签，默认选所有组
  const effectiveTags = selectedTags.length > 0 ? selectedTags : [...allGroups.keys()];
  const groupOrder = effectiveTags.filter(t => (allGroups.get(t)?.length ?? 0) > 0);
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

function startLearnGroup(): void {
  if (!learnState) return;

  const { groupOrder, currentGroupIdx, groups } = learnState;
  const tag = groupOrder[currentGroupIdx];
  const allCards = groups.get(tag)!;

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

function showLearnCard(): void {
  if (!learnState || !currentTopic) return;

  const { currentCards, currentCardIdx, currentCardTypeIdx, currentGroupIdx } = learnState;
  if (currentCardIdx >= currentCards.length) {
    advanceGroup();
    return;
  }

  const card = currentCards[currentCardIdx];
  const cardTypes = getCardTypes(card, currentTopic);
  const cardType = cardTypes[currentCardTypeIdx];

  renderLearn(
    {
      groups: learnState.groups,
      cardTypes,
      currentGroupIdx,
      currentCardIdx,
      currentCardTypeIdx,
    },
    card,
    cardType,
    {
      group: currentGroupIdx + 1,
      total: currentCards.length,
      card: currentCardIdx + 1,
    }
  );
}

document.addEventListener("learn-rate", (e) => {
  if (!learnState || !currentTopic) return;
  const detail = (e as CustomEvent).detail as { rating: Parameters<typeof rateCard>[3] };
  const { topicId, currentCards, currentCardIdx, currentCardTypeIdx } = learnState;
  const card = currentCards[currentCardIdx];
  const cardTypes = getCardTypes(card, currentTopic);
  const ct = cardTypes[currentCardTypeIdx];

  // 评分 & 存 SRS
  rateCard(topicId, card.id, ct.id, detail.rating);

  // 前进：同一张卡的所有 cardType 练完 → 下一张卡
  const nextTypeIdx = currentCardTypeIdx + 1;
  if (nextTypeIdx < cardTypes.length) {
    learnState.currentCardTypeIdx = nextTypeIdx;
  } else {
    learnState.currentCardTypeIdx = 0;
    learnState.currentCardIdx++;
  }

  showLearnCard();
});

function advanceGroup(): void {
  if (!learnState) return;

  const { groupOrder, currentGroupIdx } = learnState;
  const currentTag = groupOrder[currentGroupIdx];
  const nextIdx = currentGroupIdx + 1;

  // 先展示完成提示
  renderLearnDone(currentTag, groupOrder.length - nextIdx);

  learnState.currentGroupIdx = nextIdx;
}

document.addEventListener("learn-group-done", () => {
  if (!learnState) return;
  if (learnState.currentGroupIdx >= learnState.groupOrder.length) {
    // 全部完成
    learnState = null;
    showTopicHome();
    return;
  }
  startLearnGroup();
});

// ---------- 复习 ----------

interface ReviewState {
  topicId: string;
  cards: { card: Card; cardType: CardTypeDef }[];
  index: number;
}

let reviewState: ReviewState | null = null;

document.addEventListener("start-review", () => {
  if (!currentTopic) return;

  const records = getAllSrsRecords(currentTopic.meta.id);
  const now = today();
  const dueRecords = records.filter(r => r.nextReview <= now);

  // 构建待复习队列：每张卡 × 到期的 cardType
  const cardMap = new Map<number, Card>();
  for (const c of currentTopic.cards) cardMap.set(c.id, c);
  const ctMap = new Map(currentTopic.meta.cardTypes.map(ct => [ct.id, ct]));

  const dueCards: { card: Card; cardType: CardTypeDef }[] = [];
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
    const ra = dueRecords.find(r => r.cardId === a.card.id && r.cardTypeId === a.cardType.id)!;
    const rb = dueRecords.find(r => r.cardId === b.card.id && r.cardTypeId === b.cardType.id)!;
    return ra.nextReview.localeCompare(rb.nextReview);
  });

  reviewState = {
    topicId: currentTopic.meta.id,
    cards: dueCards,
    index: 0,
  };

  showReviewCard();
});

function showReviewCard(): void {
  if (!reviewState) return;

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
  if (!reviewState) return;
  const detail = (e as CustomEvent).detail as { rating: Parameters<typeof rateCard>[3] };
  const { topicId, cards, index } = reviewState;
  const { card, cardType } = cards[index];

  rateCard(topicId, card.id, cardType.id, detail.rating);

  reviewState.index++;
  showReviewCard();
});

// ---------- 浏览 ----------

interface BrowseState {
  cards: { card: Card; cardType: CardTypeDef }[];
  index: number;
}

let browseState: BrowseState | null = null;

document.addEventListener("start-browse", (e) => {
  if (!currentTopic) return;
  const detail = (e as CustomEvent).detail as { tags: string[] };

  // 构建浏览列表：卡片 × 所有 cardType
  // 未选标签 → 显示全部；选了标签 → 按标签筛选
  const filtered = detail.tags.length === 0
    ? currentTopic.cards
    : currentTopic.cards.filter(c => c.tags.some(t => (detail.tags as string[]).includes(t)));
  const allItems: { card: Card; cardType: CardTypeDef }[] = [];
  for (const card of filtered) {
    for (const ct of getCardTypes(card, currentTopic)) {
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

function showBrowseCard(): void {
  if (!browseState) return;
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
  if (!browseState) return;
  if (browseState.index > 0) {
    browseState.index--;
    showBrowseCard();
  }
});

document.addEventListener("browse-next", () => {
  if (!browseState) return;
  if (browseState.index < browseState.cards.length - 1) {
    browseState.index++;
    showBrowseCard();
  } else {
    browseState = null;
    showTopicHome();
  }
});

// ========== 工具 ==========

/** 取一张卡适用的题型。有 cardTypeIds 用它；否则回退到主题全部题型（兼容旧数据）。 */
function getCardTypes(card: Card, topic: TopicData): CardTypeDef[] {
  if (card.cardTypeIds && card.cardTypeIds.length > 0) {
    const ctMap = new Map(topic.meta.cardTypes.map(ct => [ct.id, ct]));
    return card.cardTypeIds
      .map(id => ctMap.get(id))
      .filter((ct): ct is CardTypeDef => ct !== undefined);
  }
  return topic.meta.cardTypes;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ========== 启动 ==========

init();
