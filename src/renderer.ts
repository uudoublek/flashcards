import type { Card, CardTypeDef, Mode, Rating, TopicData } from "./types";
import { getTheme, setTheme, type Theme } from "./storage";

// ========== DOM 工具 ==========

export const $app = document.getElementById("app")!;

export function el<T extends HTMLElement>(
  tag: string,
  className = "",
  html = ""
): T {
  const e = document.createElement(tag) as T;
  if (className) e.className = className;
  if (html) e.innerHTML = html;
  return e;
}

export function clearApp(): void {
  $app.innerHTML = "";
}

// ========== 菜单页 ==========

export function renderMenu(topics: { id: string; name: string; file: string }[]): void {
  clearApp();
  const container = el("div", "menu-container");

  const currentTheme = getTheme();

  container.innerHTML = `
    <h1 class="app-title">📚 闪卡</h1>
    <button class="btn-theme" id="btn-theme">${currentTheme === "light" ? "🌙" : "☀️"}</button>
    <div class="menu-topics" id="topic-list"></div>
  `;
  $app.appendChild(container);

  // 主题切换
  document.getElementById("btn-theme")!.addEventListener("click", toggleTheme);

  const list = document.getElementById("topic-list")!;
  for (const t of topics) {
    const card = el("div", "topic-card");
    card.innerHTML = `<span>${t.name}</span><span class="arrow">→</span>`;
    card.addEventListener("click", () => {
      document.dispatchEvent(
        new CustomEvent("topic-select", { detail: t })
      );
    });
    list.appendChild(card);
  }
}

/** 主题切换：light ↔ dark */
function toggleTheme(): void {
  const next: Theme = getTheme() === "light" ? "dark" : "light";
  setTheme(next);
  document.dispatchEvent(new CustomEvent("theme-changed"));
}

// ========== 主题主页（学习/复习/浏览 入口 + 标签选择） ==========

export function renderTopicHome(
  topic: TopicData,
  _newCount: number,
  dueCount: number
): void {
  clearApp();
  const container = el("div", "topic-home");

  const tags = [...new Set(topic.cards.flatMap(c => c.tags))].sort();

  const currentTheme = getTheme();

  container.innerHTML = `
    <button class="btn-back" id="btn-back">← 主题列表</button>
    <button class="btn-theme" id="btn-theme">${currentTheme === "light" ? "🌙" : "☀️"}</button>
    <h1>${topic.meta.name}</h1>
    <p class="subtitle">${topic.cards.length} 张卡片 · ${topic.meta.cardTypes.length} 种题型</p>

    <div class="mode-buttons">
      <button class="mode-btn mode-learn" id="btn-learn-mode">
        <span class="mode-icon">🧠</span>
        <span class="mode-label">学习</span>
        <span class="mode-sub">新卡片</span>
      </button>
      <button class="mode-btn mode-review" id="btn-review-mode">
        <span class="mode-icon">🔄</span>
        <span class="mode-label">复习</span>
        <span class="mode-sub" id="review-count">${dueCount} 张待复习</span>
      </button>
      <button class="mode-btn mode-browse" id="btn-browse-mode">
        <span class="mode-icon">📖</span>
        <span class="mode-label">浏览</span>
        <span class="mode-sub">查看全部</span>
      </button>
    </div>

    ${tags.length > 0 ? `
    <div class="tag-list" id="tag-list">
      <div class="tag-header">
        <h3>标签</h3>
        <button class="btn-link" id="tag-toggle-all">全选</button>
      </div>
    </div>
    ` : `<p class="subtitle" style="margin-top:8px">📚 全部卡片</p>`}
  `;
  $app.appendChild(container);

  // 渲染标签 checkbox（全局存储选中的标签）
  const stored = getSelectedTags(topic.meta.id);
  let selectedTags = new Set(stored.length ? stored : tags);

  if (tags.length > 0) {
    const tagList = document.getElementById("tag-list")!;
    function renderTags(): void {
      const existing = tagList.querySelectorAll(".tag-item");
      existing.forEach(e => e.remove());

      for (const tag of tags) {
        const label = el("label", "tag-item");
        label.innerHTML = `
          <input type="checkbox" value="${tag}" ${selectedTags.has(tag) ? "checked" : ""}>
          <span>${tag}</span>
        `;
        const cb = label.querySelector("input")!;
        cb.addEventListener("change", () => {
          if (cb.checked) selectedTags.add(tag);
          else selectedTags.delete(tag);
          setSelectedTags(topic.meta.id, [...selectedTags]);
        });
        tagList.appendChild(label);
      }
    }
    renderTags();

    document.getElementById("tag-toggle-all")!.addEventListener("click", () => {
      if (selectedTags.size === tags.length) {
        selectedTags.clear();
      } else {
        selectedTags = new Set(tags);
      }
      setSelectedTags(topic.meta.id, [...selectedTags]);
      renderTags();
    });
  }

  // 按钮事件
  document.getElementById("btn-back")!.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("nav-menu"));
  });

  // 主题切换
  document.getElementById("btn-theme")!.addEventListener("click", toggleTheme);

  document.getElementById("btn-learn-mode")!.addEventListener("click", () => {
    document.dispatchEvent(
      new CustomEvent("start-learn", { detail: { tags: [...selectedTags] } })
    );
  });
  document.getElementById("btn-review-mode")!.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("start-review"));
  });
  document.getElementById("btn-browse-mode")!.addEventListener("click", () => {
    document.dispatchEvent(
      new CustomEvent("start-browse", { detail: { tags: [...selectedTags] } })
    );
  });
}

// ========== 学习模式 ==========

interface LearnSession {
  groups: Map<string, Card[]>;
  cardTypes: CardTypeDef[];
  currentGroupIdx: number;
  currentCardIdx: number;
  currentCardTypeIdx: number;
}

export function renderLearn(
  _session: LearnSession,
  card: Card,
  cardType: CardTypeDef,
  progress: { group: number; total: number; card: number }
): void {
  renderCard({
    card,
    cardType,
    mode: "learn",
    progress,
    onRate: (rating: Rating) => {
      document.dispatchEvent(
        new CustomEvent("learn-rate", { detail: { rating } })
      );
    },
    showFlip: true,
  });
}

// ========== 复习模式 ==========

export function renderReview(
  card: Card,
  cardType: CardTypeDef,
  progress: { done: number; total: number }
): void {
  renderCard({
    card,
    cardType,
    mode: "review",
    progress: { done: progress.done, total: progress.total },
    onRate: (rating: Rating) => {
      document.dispatchEvent(
        new CustomEvent("review-rate", { detail: { rating } })
      );
    },
    showFlip: true,
  });
}

// ========== 浏览模式 ==========

interface BrowseSession {
  cards: { card: Card; cardType: CardTypeDef }[];
  index: number;
}

export function renderBrowse(
  card: Card,
  cardType: CardTypeDef,
  session: BrowseSession
): void {
  renderCard({
    card,
    cardType,
    mode: "browse",
    offset: session.index,
    total: session.cards.length,
    onPrev: () => {
      document.dispatchEvent(new CustomEvent("browse-prev"));
    },
    onNext: () => {
      document.dispatchEvent(new CustomEvent("browse-next"));
    },
    showFlip: true,
  });
}

// ========== 通用卡片渲染 ==========

type CardOptions = {
  card: Card;
  cardType: CardTypeDef;
  mode: Mode;
  progress?: { done?: number; total: number; group?: number; card?: number };
  offset?: number;
  total?: number;
  showFlip?: boolean;
  onRate?: (r: Rating) => void;
  onPrev?: () => void;
  onNext?: () => void;
};

function renderCard(opts: CardOptions): void {
  const { card, cardType, mode, progress, offset, total, onRate, onPrev, onNext } = opts;
  clearApp();

  const container = el("div", "card-screen");

  // 顶部栏
  let topBar = "";
  if (mode === "learn" && progress) {
    topBar = `
      <div class="top-bar">
        <button class="btn-close-card" id="btn-close-card">✕</button>
        <span class="progress-text">第 ${progress.group ?? "?"} 组 · ${progress.card ?? "?"}/${progress.total} 卡</span>
        <span></span>
      </div>`;
  } else if (mode === "review" && progress) {
    topBar = `
      <div class="top-bar">
        <button class="btn-close-card" id="btn-close-card">✕</button>
        <span class="progress-text">复习 ${(progress.done ?? 0) + 1}/${progress.total}</span>
        <span></span>
      </div>`;
  } else if (mode === "browse" && offset !== undefined && total !== undefined) {
    topBar = `
      <div class="top-bar">
        <button class="btn-close-card" id="btn-close-card">✕</button>
        <span class="progress-text">${offset + 1}/${total}</span>
        <span></span>
      </div>`;
  }

  const frontHtml = cardType.front.map(f => card.fields[f] ?? "").join("");
  const backHtml = cardType.back.map(f => card.fields[f] ?? "").join("");

  container.innerHTML = `
    ${topBar}
    <div class="card-deck" id="card-deck">
      <div class="card-face card-front" id="card-front">
        <div class="card-type-label">${mode === "learn" ? "学习" : mode === "review" ? "复习" : "浏览"}</div>
        <div class="card-tags">${card.tags.join(" · ")}</div>
        <div class="card-content">${frontHtml}</div>
        <div class="tap-hint">👆 点击翻转</div>
      </div>
      <div class="card-face card-back" id="card-back">
        <div class="card-content">${backHtml}</div>
      </div>
    </div>

    <div class="card-actions" id="card-actions" style="display:none">
      ${onRate ? `
        <button class="rate-btn rate-again" data-rating="again">😰<br>忘了</button>
        <button class="rate-btn rate-hard"  data-rating="hard">🤔<br>困难</button>
        <button class="rate-btn rate-good"  data-rating="good">😊<br>顺利</button>
        <button class="rate-btn rate-easy"  data-rating="easy">😎<br>简单</button>
      ` : ""}
      ${mode !== "browse" && onPrev ? `<button class="browse-nav" id="browse-prev">← 上一张</button>` : ""}
      ${mode !== "browse" && onNext ? `<button class="browse-nav" id="browse-next">下一张 →</button>` : ""}
    </div>

    ${mode !== "browse" ? `
      <div class="learn-actions" id="learn-actions">
        <button class="btn btn-show" id="btn-show">显示答案</button>
      </div>` : `
      <div class="browse-nav-bar" id="browse-nav-bar">
        ${onPrev ? `<button class="browse-nav" id="browse-prev">← 上一张</button>` : ""}
        ${onNext ? `<button class="browse-nav" id="browse-next">下一张 →</button>` : ""}
      </div>`}
  `;

  $app.appendChild(container);

  // 翻转逻辑
  const deck = document.getElementById("card-deck")!;
  const actions = document.getElementById("card-actions")!;
  const learnActions = document.getElementById("learn-actions");
  const btnShow = document.getElementById("btn-show");

  let flipped = false;

  function flip(): void {
    flipped = !flipped;
    deck.classList.toggle("flipped", flipped);
    if (flipped) {
      actions.style.display = "flex";
      if (learnActions) learnActions.style.display = "none";
    }
  }

  deck.addEventListener("click", flip);

  // 关闭按钮 → 返回主题主页
  const btnClose = document.getElementById("btn-close-card");
  if (btnClose) {
    btnClose.addEventListener("click", (e) => {
      e.stopPropagation();
      document.dispatchEvent(new CustomEvent("nav-topic-home"));
    });
  }

  if (btnShow) {
    btnShow.addEventListener("click", (e) => {
      e.stopPropagation();
      flip();
    });
  }

  // 评分按钮
  if (onRate) {
    actions.querySelectorAll(".rate-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const rating = (btn as HTMLElement).dataset.rating as Rating;
        onRate(rating);
      });
    });
  }

  // 浏览导航
  if (onPrev) {
    document.getElementById("browse-prev")!.addEventListener("click", (e) => {
      e.stopPropagation();
      onPrev();
    });
  }
  if (onNext) {
    document.getElementById("browse-next")!.addEventListener("click", (e) => {
      e.stopPropagation();
      onNext();
    });
  }
}

// ========== 完成提示 ==========

export function renderLearnDone(groupName: string, remainingGroups: number): void {
  clearApp();
  const container = el("div", "done-screen");
  container.innerHTML = `
    <div class="done-icon">✅</div>
    <h2>${groupName} 学习完成</h2>
    ${remainingGroups > 0
      ? `<p>还有 ${remainingGroups} 组</p>
         <button class="btn btn-primary" id="btn-next-group">下一组 →</button>`
      : `<p>🎉 所有标签学习完毕！</p>
         <button class="btn btn-primary" id="btn-back-home">返回</button>`}
  `;
  $app.appendChild(container);

  document.getElementById(remainingGroups > 0 ? "btn-next-group" : "btn-back-home")!
    .addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("learn-group-done"));
    });
}

export function renderReviewDone(): void {
  clearApp();
  const container = el("div", "done-screen");
  container.innerHTML = `
    <div class="done-icon">🎉</div>
    <h2>复习完毕</h2>
    <p>今天没有需要复习的卡片了</p>
    <button class="btn btn-primary" id="btn-back-home">返回</button>
  `;
  $app.appendChild(container);
  document.getElementById("btn-back-home")!.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("nav-topic-home"));
  });
}

// ========== 浏览列表 ==========

export function renderBrowseList(
  topic: TopicData,
  selectedTags: string[],
  selectedTypeIds: string[]
): void {
  clearApp();
  const container = el("div", "browse-list");
  const tagSet = new Set(selectedTags);

  const filtered = topic.cards.filter(c =>
    c.tags.some(t => tagSet.has(t))
  );

  container.innerHTML = `
    <button class="btn-back" id="btn-back">← 返回</button>
    <h1>浏览模式</h1>
    <p>${filtered.length} 张卡片</p>
    <div class="browse-cards" id="browse-cards"></div>
  `;
  $app.appendChild(container);

  const list = document.getElementById("browse-cards")!;
  const cardTypes = topic.meta.cardTypes.filter(ct =>
    selectedTypeIds.includes(ct.id)
  );

  for (const card of filtered) {
    for (const ct of cardTypes) {
      const item = el("div", "browse-item");
      const front = ct.front.map(f => card.fields[f] ?? "").join(" ");
      // strip HTML for preview
      const strip = (s: string) => s.replace(/<[^>]*>/g, "").slice(0, 60);
      item.innerHTML = `
        <div class="browse-item-tags">${card.tags.join(" · ")}</div>
        <div class="browse-item-front">${strip(front)}</div>
        <div class="browse-item-type">${ct.id}</div>
      `;
      item.addEventListener("click", () => {
        document.dispatchEvent(
          new CustomEvent("browse-card", {
            detail: { card, cardType: ct, index: 0 },
          })
        );
      });
      list.appendChild(item);
    }
  }

  document.getElementById("btn-back")!.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("nav-topic-home"));
  });
}

// ========== 标签选择缓存 ==========

function getSelectedTags(topicId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`fc-tags-${topicId}`) ?? "[]");
  } catch {
    return [];
  }
}

function setSelectedTags(topicId: string, tags: string[]): void {
  localStorage.setItem(`fc-tags-${topicId}`, JSON.stringify(tags));
}
