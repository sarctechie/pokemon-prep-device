import json
import re
from pathlib import Path

INPUT = Path("national_dex_source.json")
OUTPUT = Path("../frontend/public/data/pokemon.json")

def slugify(name: str) -> str:
    slug = name.strip().lower()
    slug = slug.replace("’", "").replace("'", "")
    slug = slug.replace(".", "")
    slug = slug.replace(":", "")
    slug = slug.replace("%", "")
    slug = slug.replace("♀", "-f")
    slug = slug.replace("♂", "-m")
    slug = slug.replace(" ", "-")
    slug = re.sub(r"[^a-z0-9-]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug

def normalize_entry(entry):
    name = entry["name"]
    slug = entry.get("slug") or slugify(name)

    return {
        "dex": entry.get("dex"),
        "form": entry.get("form"),
        "name": name,
        "slug": slug,
        "sprite": f"/sprites/{slug}.png",
        "type1": entry.get("type1"),
        "type2": entry.get("type2"),
        "abilities": entry.get("abilities", []),
        "hp": entry.get("hp"),
        "atk": entry.get("atk"),
        "def": entry.get("def"),
        "spa": entry.get("spa"),
        "spd": entry.get("spd"),
        "spe": entry.get("spe"),
    }

def main():
    raw = json.loads(INPUT.read_text(encoding="utf-8"))
    cooked = [normalize_entry(entry) for entry in raw]
    OUTPUT.write_text(json.dumps(cooked, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(cooked)} Pokémon entries to {OUTPUT}")

if __name__ == "__main__":
    main()
