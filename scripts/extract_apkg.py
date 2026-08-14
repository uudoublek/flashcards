#!/usr/bin/env python3
"""
Extract Anki .apkg file into a topic JSON + media directory.

Supports decks with MULTIPLE note models (e.g. AnkiX series),
cloze deletion preprocessing, and one-way Q&A.

Usage:
  python3 scripts/extract_apkg.py resource/apkg/AnkiX17Anki.apkg \
      --id organic-chemistry --name "化学::有机化学"

Output:
  - {out_dir}/{id}.json       — topic data
  - {media_dir}/{id}/          — renamed media files
"""

import argparse
import json
import os
import re
import shutil
import sqlite3
import sys
import tempfile
import zipfile


# ---------- Model type rules ----------
# Each rule maps a note-model (by name keyword) to a card type.
# front/back are the FIELD NAMES shown on each side.
# cloze_fields are fields whose {{cN::answer}} will be split into
#   <field>_正面 (blanks) and <field>_背面 (answers).

MODEL_RULES = [
    {
        "match": "填空",
        "card_type_id": "cloze",
        "front": ["知识_正面"],
        "back": ["知识_背面", "评论", "举例", "拓展"],
        "cloze_fields": ["知识"],
    },
    {
        "match": "看看就好",
        "card_type_id": "reading",
        "front": ["文本"],
        "back": ["文本"],
        "cloze_fields": [],
    },
    {
        "match": "例句法背单词",
        "card_type_id": "word",
        "front": ["单词"],
        "back": ["音标", "释义", "笔记", "例句"],
        "cloze_fields": [],
    },
    {
        "match": "古诗文",
        "card_type_id": "poem",
        "front": ["标题", "正文带标记"],
        "back": ["正文带标记", "备注"],
        "cloze_fields": [],
        "mark_fields": ["正文带标记"],
    },
    {
        # 问答 / 问答(和问答互换) — 一律单向（问题→答案）
        "match": "问答",
        "card_type_id": "qa",
        "front": ["问题"],
        "back": ["答案", "评论", "举例", "拓展"],
        "cloze_fields": [],
    },
]


def match_rule(model_name: str):
    for rule in MODEL_RULES:
        if rule["match"] in model_name:
            return rule
    return None


def is_dirty_tag(text: str) -> bool:
    """检测脏标签：某个 3~5 字符子串重复出现 >= 3 次（原始数据损坏特征）。"""
    if len(text) < 12:
        return False
    for sublen in (3, 4, 5):
        subs = set(text[i:i + sublen] for i in range(len(text) - sublen + 1))
        for sub in subs:
            if text.count(sub) >= 3:
                return True
    return False


def mark_brackets(text: str) -> str:
    """把 [关键句] 替换成高亮 span（古诗文背诵标记）。"""
    return re.sub(r"\[([^\]]+)\]", r'<span class="poem-mark">\1</span>', text)


def make_cloze_versions(text: str, target_cid: str):
    """Generate (blank_version, answer_version) for ONE cloze card.
    target_cid: only this cloze id is blanked; other ids show their answers.
    This mirrors Anki semantics — each {{cN::...}} is a separate card."""
    def repl_blank(m):
        if m.group(1) != target_cid:
            return f'<span class="cloze-answer">{m.group(2)}</span>'
        return '<span class="cloze-blank">＿＿</span>'

    def repl_answer(m):
        return f'<span class="cloze-answer">{m.group(2)}</span>'

    blank = re.sub(r"\{\{c(\d+)::(.*?)\}\}", repl_blank, text, flags=re.S)
    answer = re.sub(r"\{\{c(\d+)::(.*?)\}\}", repl_answer, text, flags=re.S)
    return blank, answer


def extract_apkg(apkg_path: str, out_dir: str, media_dir: str, topic_id: str, topic_name: str):
    # ---------- 1. Unzip ----------
    tmp = tempfile.mkdtemp(prefix="apkg_")
    with zipfile.ZipFile(apkg_path, "r") as zf:
        zf.extractall(tmp)

    # ---------- 2. Read SQLite ----------
    db_path = os.path.join(tmp, "collection.anki21")
    if not os.path.exists(db_path):
        db_path = os.path.join(tmp, "collection.anki2")
    if not os.path.exists(db_path):
        print("ERROR: no collection.anki21 / collection.anki2 found")
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("SELECT models FROM col")
    row = cur.fetchone()
    if not row:
        print("ERROR: col table empty")
        sys.exit(1)
    models = json.loads(row[0])

    # ---------- 3. Build card types from models ----------
    # model_mid -> (rule, field_names)
    model_info = {}
    card_types = []       # deduped card type defs
    seen_ct = {}          # card_type_id -> def

    for mid, m in models.items():
        rule = match_rule(m.get("name", ""))
        if rule is None:
            print(f"  ⚠️  unknown model \"{m['name']}\" — skipped")
            continue
        field_names = [f["name"] for f in m["flds"]]
        model_info[mid] = {"rule": rule, "field_names": field_names}

        ct_id = rule["card_type_id"]
        ct_def = {"id": ct_id, "front": rule["front"], "back": rule["back"]}
        if ct_id not in seen_ct:
            seen_ct[ct_id] = ct_def
            card_types.append(ct_def)

    if not card_types:
        print("ERROR: no recognized models")
        sys.exit(1)

    # ---------- 4. Media mapping ----------
    media_map = {}
    media_path = os.path.join(tmp, "media")
    if os.path.exists(media_path):
        with open(media_path, "r") as f:
            media_map = json.load(f)
    name_to_num = {v: k for k, v in media_map.items()}

    topic_media_dir = os.path.join(media_dir, topic_id)
    os.makedirs(topic_media_dir, exist_ok=True)

    # ---------- 5. Build cards ----------
    cur.execute("SELECT id, mid, tags, flds FROM notes")
    notes = cur.fetchall()

    cards = []
    for note_id, mid, tags_str, flds_raw in notes:
        mid_key = str(mid)
        if mid_key not in model_info:
            continue
        info = model_info[mid_key]
        rule = info["rule"]
        field_names = info["field_names"]

        values = flds_raw.split("\x1f")
        fields = {}
        for i, fname in enumerate(field_names):
            fields[fname] = values[i] if i < len(values) else ""

        # rewrite image refs（先做，cloze 拆分会继承重写后的内容）
        for fname, val in fields.items():
            if "<img" in val:
                def replace_img(m):
                    real_name = m.group(1)
                    if real_name in name_to_num:
                        num = name_to_num[real_name]
                        src_path = os.path.join(tmp, num)
                        dst_path = os.path.join(topic_media_dir, real_name)
                        if os.path.exists(src_path):
                            shutil.copy2(src_path, dst_path)
                        return f'<img src="media/{topic_id}/{real_name}"'
                    return m.group(0)
                fields[fname] = re.sub(r'<img src="([^"]+)"', replace_img, val)

        # 方括号标记（古诗文背诵：把 [关键句] 替换为高亮）
        for mf in rule.get("mark_fields", []):
            if mf in fields and "[" in fields[mf]:
                fields[mf] = mark_brackets(fields[mf])

        tags = [
            t.strip()
            for t in tags_str.split()
            if t.strip() and not is_dirty_tag(t.strip())
        ]
        # 《》字段是章节标记，合并进标签（过滤脏值）
        if "《》" in fields and fields["《》"].strip():
            chapter = fields["《》"].strip()
            if chapter not in tags and not is_dirty_tag(chapter):
                tags.append(chapter)

        # cloze 拆分：每个 {{cN::...}} 编号生成一张独立卡片
        if rule["cloze_fields"]:
            cf = rule["cloze_fields"][0]
            zhishi = fields.get(cf, "")
            cloze_ids = sorted(set(re.findall(r"\{\{c(\d+)::", zhishi)))
            if cloze_ids:
                for idx, cid in enumerate(cloze_ids):
                    blank_v, ans_v = make_cloze_versions(zhishi, cid)
                    card_fields = dict(fields)
                    card_fields[f"{cf}_正面"] = blank_v
                    card_fields[f"{cf}_背面"] = ans_v
                    cards.append({
                        "id": note_id * 100 + idx,
                        "tags": tags,
                        "cardTypeIds": [rule["card_type_id"]],
                        "fields": card_fields,
                    })
            else:
                # 无 cloze 的填空：正面=背面=原文
                card_fields = dict(fields)
                card_fields[f"{cf}_正面"] = zhishi
                card_fields[f"{cf}_背面"] = zhishi
                cards.append({
                    "id": note_id,
                    "tags": tags,
                    "cardTypeIds": [rule["card_type_id"]],
                    "fields": card_fields,
                })
        else:
            cards.append({
                "id": note_id,
                "tags": tags,
                "cardTypeIds": [rule["card_type_id"]],
                "fields": fields,
            })

    conn.close()

    # ---------- 6. Output ----------
    os.makedirs(out_dir, exist_ok=True)

    # meta.fields = union of all raw field names
    all_fields = []
    for mid, info in model_info.items():
        for fname in info["field_names"]:
            if fname not in all_fields:
                all_fields.append(fname)

    output = {
        "meta": {
            "id": topic_id,
            "name": topic_name,
            "fields": all_fields,
            "cardTypes": card_types,
        },
        "cards": cards,
    }

    out_path = os.path.join(out_dir, f"{topic_id}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    shutil.rmtree(tmp)

    print(f"✅ {topic_name} ({topic_id})")
    print(f"   cards: {len(cards)}, cardTypes: {[ct['id'] for ct in card_types]}")
    print(f"   media: {len(media_map)} mapped")
    return out_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract Anki .apkg to flashcard JSON")
    parser.add_argument("apkg", help="Path to .apkg file")
    parser.add_argument("--id", required=True, help="Topic id (English slug)")
    parser.add_argument("--name", required=True, help="Topic display name (Chinese)")
    parser.add_argument("--out", default="public/data", help="Output JSON directory")
    parser.add_argument("--media", default="public/media", help="Output media directory")
    args = parser.parse_args()

    extract_apkg(args.apkg, args.out, args.media, args.id, args.name)
