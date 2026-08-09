#!/usr/bin/env python3
"""
Extract Anki .apkg file into a topic JSON + media directory.

Usage:
  python3 scripts/extract_apkg.py resource/apkg/Ultimate_Geography_v53.apkg
  python3 scripts/extract_apkg.py input.apkg --out flashcards/public/data --media flashcards/media

Output:
  - {out_dir}/{topic-id}.json     — topic data
  - {media_dir}/{topic-id}/        — renamed media files
"""

import argparse
import json
import os
import shutil
import sqlite3
import sys
import tempfile
import zipfile


def extract_apkg(apkg_path: str, out_dir: str, media_dir: str):
    # ---------- 1. Unzip to temp ----------
    tmp = tempfile.mkdtemp(prefix="apkg_")
    with zipfile.ZipFile(apkg_path, "r") as zf:
        zf.extractall(tmp)

    # ---------- 2. Read SQLite ----------
    db_path = os.path.join(tmp, "collection.anki21")
    if not os.path.exists(db_path):
        db_path = os.path.join(tmp, "collection.anki2")
    if not os.path.exists(db_path):
        print("ERROR: no collection.anki21 or collection.anki2 found in apkg")
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Read col (models, decks, tags)
    cur.execute("SELECT models, decks, tags FROM col")
    row = cur.fetchone()
    if not row:
        print("ERROR: col table is empty")
        sys.exit(1)

    models_raw, decks_raw, tags_raw = row
    models = json.loads(models_raw)
    decks = json.loads(decks_raw) if decks_raw else {}
    # tags_raw is a string like " UG::Europe UG::Asia " — whitespace separated

    # Find the first non-default deck name for the topic name
    deck_name = "Topic"
    for did, deck in decks.items():
        name = deck.get("name", "")
        if name and name != "Default":
            deck_name = name
            break

    # Model: pick the main one (non-cloze, if possible)
    model = None
    for mid, m in models.items():
        model = m
        if m.get("type") == 0:  # Standard (not Cloze)
            break

    if model is None:
        print("ERROR: no note model found")
        sys.exit(1)

    field_names = [f["name"] for f in model["flds"]]

    # Parse card templates: extract which fields go on front/back
    import re

    def extract_fields(template_html: str) -> "list[str]":
        """Extract field names from Anki template HTML.
        Handles: {{Field}}, {{hint:Field}}, ignores {{#Field}} {{/Field}} {{^Field}}."""
        seen = []
        # Match {{...}} but NOT {{#..., {{/..., {{^...
        for m in re.finditer(r"\{\{(?![/#^])([^}:]+?)\}\}", template_html):
            name = m.group(1).strip()
            # Handle {{hint:FieldName}} → extract "FieldName"
            if ":" in name:
                name = name.split(":")[-1].strip()
            if name in field_names and name not in seen:
                seen.append(name)
        return seen

    card_types = []
    for tpl in model["tmpls"]:
        ct_id = tpl["name"].lower().replace(" ", "-").replace("→", "-")
        qfmt = tpl.get("qfmt", "")
        afmt = tpl.get("afmt", "")

        front_fields = extract_fields(qfmt)
        back_fields = extract_fields(afmt)

        card_types.append({
            "id": ct_id,
            "front": front_fields,
            "back": back_fields,
        })

    # ---------- 3. Read notes ----------
    cur.execute("SELECT id, guid, mid, tags, flds, sfld FROM notes")
    notes = cur.fetchall()

    # ---------- 4. Read media mapping ----------
    media_map = {}
    media_path = os.path.join(tmp, "media")
    if os.path.exists(media_path):
        with open(media_path, "r") as f:
            media_map = json.load(f)

    # ---------- 5. Build cards ----------
    topic_id = deck_name.lower().replace(" ", "-").replace("_", "-")
    topic_media_dir = os.path.join(media_dir, topic_id)
    os.makedirs(topic_media_dir, exist_ok=True)

    cards = []
    for note in notes:
        note_id, guid, mid, tags_str, flds_raw, sfld = note
        field_values = flds_raw.split("\x1f")

        # Build fields dict
        fields = {}
        for i, fname in enumerate(field_names):
            val = field_values[i] if i < len(field_values) else ""
            fields[fname] = val

        # Rewrite image refs: copy numbered files to real names.
        # media_map: {"31": "ug-map-suriname.png"} (number → real name)
        # img src in field: "ug-flag-england.svg" (already real name)
        # Need to reverse-lookup: find the number for each real name.
        name_to_num = {v: k for k, v in media_map.items()}

        for fname, val in fields.items():
            if "<img" in val:
                import re as re2
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
                fields[fname] = re2.sub(r'<img src="([^"]+)"', replace_img, val)

        # Tags
        tags = [t.strip() for t in tags_str.split() if t.strip()]

        cards.append({
            "id": note_id,
            "tags": tags,
            "fields": fields,
        })

    conn.close()

    # ---------- 6. Output JSON ----------
    os.makedirs(out_dir, exist_ok=True)

    output = {
        "meta": {
            "id": topic_id,
            "name": deck_name,
            "fields": field_names,
            "cardTypes": card_types,
        },
        "cards": cards,
    }

    out_path = os.path.join(out_dir, f"{topic_id}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # ---------- 7. Cleanup ----------
    shutil.rmtree(tmp)

    print(f"✅ Done!")
    print(f"   Topic: {deck_name} ({len(cards)} cards, {len(card_types)} card types)")
    print(f"   Fields: {field_names}")
    print(f"   Card types: {[ct['id'] for ct in card_types]}")
    print(f"   JSON: {out_path}")
    print(f"   Media: {topic_media_dir}/ ({len(media_map)} files mapped)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract Anki .apkg to flashcard JSON")
    parser.add_argument("apkg", help="Path to .apkg file")
    parser.add_argument("--out", default="public/data", help="Output JSON directory")
    parser.add_argument("--media", default="public/media", help="Output media directory (relative to project root)")
    args = parser.parse_args()

    extract_apkg(args.apkg, args.out, args.media)
