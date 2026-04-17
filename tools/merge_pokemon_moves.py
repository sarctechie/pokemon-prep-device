import json
import re
from pathlib import Path

POKEMON_FILE = Path("../frontend/public/data/pokemon.json")
MOVES_FILE = Path("pokemon_moves.json")
OUTPUT_FILE = Path("../frontend/public/data/pokemon_with_moves.json")


def norm(text: str) -> str:
    text = str(text or "").strip().lower()
    text = text.replace("’", "'")
    text = text.replace(".", "")
    text = text.replace("'", "")
    text = text.replace(":", "")
    text = text.replace("%", "")
    text = text.replace("♀", "f")
    text = text.replace("♂", "m")
    text = text.replace("_", "-")
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text


def build_aliases(name: str) -> set[str]:
    """
    Build likely aliases for matching move-sheet names to pokedex names.
    """
    aliases = set()
    n = norm(name)
    aliases.add(n)

    # Hyphen/space variants
    aliases.add(n.replace("-", " "))
    aliases.add(n.replace(" ", "-"))

    # Regional forms
    if n.startswith("hisuian-"):
        base = n.replace("hisuian-", "", 1)
        aliases.add(f"{base}-hisui")
        aliases.add(f"hisui-{base}")
    if n.endswith("-hisui"):
        base = n[: -len("-hisui")]
        aliases.add(f"hisuian-{base}")
        aliases.add(f"hisui-{base}")

    if n.startswith("paldean-"):
        base = n.replace("paldean-", "", 1)
        aliases.add(f"{base}-paldea")
        aliases.add(f"paldea-{base}")
    if n.endswith("-paldea"):
        base = n[: -len("-paldea")]
        aliases.add(f"paldean-{base}")
        aliases.add(f"paldea-{base}")

    if n.startswith("alolan-"):
        base = n.replace("alolan-", "", 1)
        aliases.add(f"{base}-alola")
        aliases.add(f"alola-{base}")
    if n.endswith("-alola"):
        base = n[: -len("-alola")]
        aliases.add(f"alolan-{base}")
        aliases.add(f"alola-{base}")

    if n.startswith("galarian-"):
        base = n.replace("galarian-", "", 1)
        aliases.add(f"{base}-galar")
        aliases.add(f"galar-{base}")
    if n.endswith("-galar"):
        base = n[: -len("-galar")]
        aliases.add(f"galarian-{base}")
        aliases.add(f"galar-{base}")

    # Common punctuation simplifications
    aliases.add(n.replace("-mime", "mime"))
    aliases.add(n.replace("-oh", "oh"))

    return {a for a in aliases if a}


def main():
    pokemon = json.loads(POKEMON_FILE.read_text(encoding="utf-8"))
    moves_map = json.loads(MOVES_FILE.read_text(encoding="utf-8"))

    # Build lookup from many aliases -> move list
    move_lookup = {}
    for raw_name, moves in moves_map.items():
        aliases = build_aliases(raw_name)
        for alias in aliases:
            move_lookup[alias] = sorted(set(moves))

    matched = 0
    unmatched = []
    merged = []

    for p in pokemon:
        candidates = set()

        name = p.get("name", "")
        slug = p.get("slug", "")
        form = p.get("form", "")

        candidates |= build_aliases(name)
        candidates |= build_aliases(slug)
        if form:
            candidates |= build_aliases(f"{name}-{form}")
            candidates |= build_aliases(f"{slug}-{form}")

        moves = []
        found = False

        for candidate in candidates:
            if candidate in move_lookup:
                moves = move_lookup[candidate]
                found = True
                matched += 1
                break

        if not found:
            unmatched.append(name or slug or "UNKNOWN")

        merged.append({
            **p,
            "moves": moves
        })

    OUTPUT_FILE.write_text(
        json.dumps(merged, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    print(f"Matched Pokémon: {matched}")
    print(f"Unmatched Pokémon: {len(unmatched)}")
    print(f"Wrote merged file to: {OUTPUT_FILE}")

    if unmatched:
        print("\nFirst 50 unmatched:")
        for name in unmatched[:50]:
            print("-", name)


if __name__ == "__main__":
    main()
