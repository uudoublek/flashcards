// ========== 主题 / 卡片数据 ==========

/** 一个卡片类型定义（来自 meta.cardTypes） */
export interface CardTypeDef {
  id: string;
  front: string[]; // 正面展示哪些字段名
  back: string[];  // 背面展示哪些字段名
}

/** 主题 meta */
export interface TopicMeta {
  id: string;
  name: string;
  fields: string[];
  cardTypes: CardTypeDef[];
}

/** 单张卡片 */
export interface Card {
  id: number;
  tags: string[];
  fields: Record<string, string>; // 字段名 → HTML 内容
  /** 这张卡适用哪些 cardType（缺省 = 主题全部题型，兼容旧数据） */
  cardTypeIds?: string[];
}

/** 完整主题数据 */
export interface TopicData {
  meta: TopicMeta;
  cards: Card[];
}

// ========== SRS 数据（per-card-type） ==========

/** 单条 SRS 记录（per card + per cardType） */
export interface SrsRecord {
  cardId: number;
  cardTypeId: string;
  easeFactor: number;
  interval: number;     // 天数
  reviews: number;
  nextReview: string;   // ISO date "YYYY-MM-DD"
  lastReview: string;   // ISO date
  lapses: number;
}

/** 评分级别 */
export type Rating = "again" | "hard" | "good" | "easy";

// ========== 应用状态 ==========

export type Mode = "menu" | "learn" | "review" | "browse";

export interface AppState {
  topic: TopicData | null;
  topicId: string | null;
  mode: Mode;
}
