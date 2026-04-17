import json
import time
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

DATA_FILE = Path("../frontend/public/data/pokemon.json")
SPRITES_DIR = Path("../frontend/public/sprites")
FAILED_FILE = Path("missing_sprites.txt")

SPRITES_DIR.mkdir(parents=True, exist_ok=True)

BASES = [
    "https://play.pokemonshowdown.com/sprites/gen5/",
    "https://play.pokemonshowdown.com/sprites/gen5ani/",
]

SPRITE_OVERRIDES = {
    "nidoran-f": "nidoranf",
    "nidoran-m": "nidoranm",
    "mr-mime": "mrmime",
    "mr-mime-galar": "mrmimegalar",
    "mime-jr": "mimejr",
    "mr-rime": "mrrime",
    "porygon-z": "porygonz",
    "ho-oh": "hooh",
    "jangmo-o": "jangmoo",
    "hakamo-o": "hakamoo",
    "kommo-o": "kommoo",
    "kommo-o-totem": "kommoototem",
    "tapu-koko": "tapukoko",
    "tapu-lele": "tapulele",
    "tapu-bulu": "tapubulu",
    "tapu-fini": "tapufini",
    "wo-chien": "wochien",
    "chien-pao": "chienpao",
    "ting-lu": "tinglu",
    "chi-yu": "chiyu",
    "type-null": "typenull",
    "wormadam-plant": "wormadam",
    "shaymin-land": "shaymin",
    "deoxys-normal": "deoxys",
    "keldeo-ordinary": "keldeo",
    "meloetta-aria": "meloetta",
    "aegislash-shield": "aegislash",
    "basculin-red-striped": "basculin",
    "basculin-blue-striped": "basculinbluestriped",
    "basculin-white-striped": "basculinwhitestriped",
    "darmanitan-standard": "darmanitan",
    "darmanitan-galar-standard": "darmanitangalar",
    "darmanitan-galar-zen": "darmanitangalarzen",
    "frillish-male": "frillish",
    "jellicent-male": "jellicent",
    "pyroar-male": "pyroar",
    "meowstic-male": "meowstic",
    "meowstic-female": "meowsticf",
    "tornadus-incarnate": "tornadus",
    "thundurus-incarnate": "thundurus",
    "landorus-incarnate": "landorus",
    "enamorus-incarnate": "enamorus",
    "oricorio-baile": "oricorio",
    "oricorio-pom-pom": "oricoriopompom",
    "lycanroc-midday": "lycanroc",
    "wishiwashi-solo": "wishiwashi",
    "mimikyu-disguised": "mimikyu",
    "mimikyu-totem-disguised": "mimikyutotem",
    "mimikyu-totem-busted": "mimikyutotembusted",
    "minior-red-meteor": "miniormeteor",
    "minior-orange-meteor": "miniororangemeteor",
    "minior-yellow-meteor": "minioryellowmeteor",
    "minior-green-meteor": "miniorgreenmeteor",
    "minior-blue-meteor": "miniorbluemeteor",
    "minior-indigo-meteor": "miniorindigometeor",
    "minior-violet-meteor": "miniorvioletmeteor",
    "minior-red": "minior",
    "necrozma-dawn": "necrozmadawnwings",
    "necrozma-dusk": "necrozmaduskmane",
    "toxtricity-amped": "toxtricity",
    "toxtricity-amped-gmax": "toxtricitygmax",
    "toxtricity-low-key": "toxtricitylowkey",
    "toxtricity-low-key-gmax": "toxtricitylowkeygmax",
    "eiscue-ice": "eiscue",
    "indeedee-male": "indeedee",
    "indeedee-female": "indeedeef",
    "morpeko-full-belly": "morpeko",
    "urshifu-single-strike": "urshifu",
    "urshifu-single-strike-gmax": "urshifugmax",
    "urshifu-rapid-strike": "urshifurapidstrike",
    "urshifu-rapid-strike-gmax": "urshifurapidstrikegmax",
    "basculegion-male": "basculegion",
    "basculegion-female": "basculegionf",
    "oinkologne-male": "oinkologne",
    "oinkologne-female": "oinkolognef",
    "maushold-family-of-three": "mausholdthree",
    "maushold-family-of-four": "maushold",
    "squawkabilly-green-plumage": "squawkabilly",
    "squawkabilly-blue-plumage": "squawkabillyblue",
    "squawkabilly-white-plumage": "squawkabillywhite",
    "squawkabilly-yellow-plumage": "squawkabillyyellow",
    "palafin-zero": "palafin",
    "tatsugiri-curly": "tatsugiri",
    "dudunsparce-two-segment": "dudunsparce",
    "dudunsparce-three-segment": "dudunsparcethreesegment",
    "great-tusk": "greattusk",
    "scream-tail": "screamtail",
    "brute-bonnet": "brutebonnet",
    "flutter-mane": "fluttermane",
    "slither-wing": "slitherwing",
    "sandy-shocks": "sandyshocks",
    "iron-treads": "irontreads",
    "iron-bundle": "ironbundle",
    "iron-hands": "ironhands",
    "iron-jugulis": "ironjugulis",
    "iron-moth": "ironmoth",
    "iron-thorns": "ironthorns",
    "iron-valiant": "ironvaliant",
    "walking-wake": "walkingwake",
    "iron-leaves": "ironleaves",
    "gouging-fire": "gougingfire",
    "raging-bolt": "ragingbolt",
    "iron-boulder": "ironboulder",
    "iron-crown": "ironcrown",
    "tauros-paldea-combat-breed": "taurospaldeacombat",
    "tauros-paldea-blaze-breed": "taurospaldeablaze",
    "tauros-paldea-aqua-breed": "taurospaldeaaqua",
    "koraidon-limited-build": "koraidon",
    "koraidon-sprinting-build": "koraidonsprinting",
    "koraidon-swimming-build": "koraidonswimming",
    "koraidon-gliding-build": "koraidongliding",
    "miraidon-low-power-mode": "miraidon",
    "miraidon-drive-mode": "miraidondrive",
    "miraidon-aquatic-mode": "miraidonaquatic",
    "miraidon-glide-mode": "miraidonglide",
    "ogerpon-cornerstone-mask": "ogerponcornerstone",
    "ogerpon-hearthflame-mask": "ogerponhearthflame",
    "ogerpon-wellspring-mask": "ogerponwellspring",
    "charizard-mega-x": "charizardmegax",
    "charizard-mega-y": "charizardmegay",
    "mewtwo-mega-x": "mewtwomegax",
    "mewtwo-mega-y": "mewtwomegay",
}

def remap_slug(slug: str) -> str:
    return SPRITE_OVERRIDES.get(slug, slug)

def try_download(url: str, out_path: Path) -> bool:
    req = Request(url, headers={"User-Agent": "pokemon-prep-app/1.0"})
    try:
        with urlopen(req, timeout=20) as resp:
            data = resp.read()
        out_path.write_bytes(data)
        return True
    except (HTTPError, URLError):
        return False

def main():
    pokemon = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    failed = []

    for i, entry in enumerate(pokemon, start=1):
        original_slug = entry["slug"]
        mapped_slug = remap_slug(original_slug)
        out_path = SPRITES_DIR / f"{mapped_slug}.png"

        if out_path.exists():
            continue

        ok = False
        for base in BASES:
            url = f"{base}{mapped_slug}.png"
            if try_download(url, out_path):
                ok = True
                break

        if not ok:
            failed.append(original_slug)

        if i % 50 == 0:
            print(f"Processed {i}/{len(pokemon)}")

        time.sleep(0.03)

    FAILED_FILE.write_text("\n".join(failed), encoding="utf-8")
    print(f"Done. Missing sprites: {len(failed)}")
    print(f"See {FAILED_FILE.resolve()}")

if __name__ == "__main__":
    main()
