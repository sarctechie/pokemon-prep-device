import json
import re
import time
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

BASE_LIST_URL = "https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0"
OUTPUT = Path("national_dex_source.json")
CACHE_DIR = Path(".pokeapi_cache")
SLEEP_SECONDS = 0.05  # be polite

CACHE_DIR.mkdir(exist_ok=True)


def get_json(url: str) -> dict:
    safe_name = re.sub(r"[^a-zA-Z0-9._-]+", "_", url)
    cache_file = CACHE_DIR / f"{safe_name}.json"

    if cache_file.exists():
        return json.loads(cache_file.read_text(encoding="utf-8"))

    req = Request(
        url,
        headers={
            "User-Agent": "pokemon-prep-app/1.0",
            "Accept": "application/json",
        },
    )

    try:
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            cache_file.write_text(json.dumps(data), encoding="utf-8")
            time.sleep(SLEEP_SECONDS)
            return data
    except HTTPError as e:
        raise RuntimeError(f"HTTP error {e.code} for {url}") from e
    except URLError as e:
        raise RuntimeError(f"URL error for {url}: {e}") from e


def titleize_ability(name: str) -> str:
    return name.replace("-", " ").title()


def titleize_pokemon_name(api_name: str) -> str:
    """
    Turn pokeapi names like:
      mr-mime -> Mr Mime
      wooper-paldea -> Wooper-Paldea
      deoxys-speed -> Deoxys-Speed
    """
    parts = api_name.split("-")
    return "-".join(part.capitalize() for part in parts)


def build_slug(api_name: str) -> str:
    return api_name.lower()


def extract_dex(details: dict) -> int:
    species_url = details["species"]["url"].rstrip("/")
    return int(species_url.split("/")[-1])


def normalize_entry(details: dict) -> dict:
    api_name = details["name"]
    slug = build_slug(api_name)
    types = sorted(details["types"], key=lambda x: x["slot"])
    abilities = sorted(details["abilities"], key=lambda x: (x["slot"], x["ability"]["name"]))
    stats_map = {s["stat"]["name"]: s["base_stat"] for s in details["stats"]}

    form = None
    name_parts = api_name.split("-")
    if len(name_parts) > 1:
        form = "-".join(part.capitalize() for part in name_parts[1:])

    return {
        "dex": extract_dex(details),
        "form": form,
        "name": titleize_pokemon_name(api_name),
        "slug": slug,
        "type1": types[0]["type"]["name"].capitalize() if len(types) > 0 else None,
        "type2": types[1]["type"]["name"].capitalize() if len(types) > 1 else None,
        "abilities": [titleize_ability(a["ability"]["name"]) for a in abilities],
        "hp": stats_map.get("hp"),
        "atk": stats_map.get("attack"),
        "def": stats_map.get("defense"),
        "spa": stats_map.get("special-attack"),
        "spd": stats_map.get("special-defense"),
        "spe": stats_map.get("speed"),
    }


def main():
    listing = get_json(BASE_LIST_URL)
    results = listing.get("results", [])
    print(f"Found {len(results)} pokemon endpoints")

    cooked = []
    seen_names = set()

    for idx, item in enumerate(results, start=1):
        details = get_json(item["url"])
        entry = normalize_entry(details)

        # Deduplicate exact duplicate names just in case
        if entry["name"] in seen_names:
            continue

        seen_names.add(entry["name"])
        cooked.append(entry)

        if idx % 50 == 0:
            print(f"Processed {idx}/{len(results)}")

    cooked.sort(key=lambda x: (x["dex"], x["name"]))
    OUTPUT.write_text(json.dumps(cooked, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(cooked)} entries to {OUTPUT.resolve()}")


if __name__ == "__main__":
    main()
