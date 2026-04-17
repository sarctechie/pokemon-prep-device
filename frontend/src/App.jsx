import React, { useEffect, useMemo, useRef, useState } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

const TYPE_COLORS = {
  Normal: "#a8a77a",
  Fire: "#ee8130",
  Water: "#6390f0",
  Electric: "#f7d02c",
  Grass: "#7ac74c",
  Ice: "#96d9d6",
  Fighting: "#c22e28",
  Poison: "#a33ea1",
  Ground: "#e2bf65",
  Flying: "#a98ff3",
  Psychic: "#f95587",
  Bug: "#a6b91a",
  Rock: "#b6a136",
  Ghost: "#735797",
  Dragon: "#6f35fc",
  Dark: "#705746",
  Steel: "#b7b7ce",
  Fairy: "#d685ad",
};

const TYPE_CHART = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5, Ice: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
  Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
  Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5, Fairy: 0.5 },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Fairy: 2, Steel: 0.5 },
  Fairy: { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 },
};

const ALL_TYPES = Object.keys(TYPE_CHART);

const MOVE_BUCKETS = {
  "Entry Hazards": ["Spikes", "Stealth Rock", "Sticky Web", "Toxic Spikes", "Ceaseless Edge", "Stone Axe"],
  "Hazard Removal": ["Defog", "Rapid Spin", "Mortal Spin", "Tidy Up", "Court Change"],
  "Healing Moves": ["Recover", "Roost", "Slack Off", "Soft-Boiled", "Moonlight", "Synthesis", "Morning Sun", "Strength Sap", "Leech Seed", "Wish", "Shore Up", "Milk Drink", "Heal Bell", "Aromatherapy"],
  Momentum: ["U-turn", "Volt Switch", "Flip Turn", "Parting Shot", "Teleport", "Baton Pass", "Chilly Reception", "Shed Tail", "Memento"],
  "Item Removal": ["Knock Off", "Trick", "Switcheroo", "Corrosive Gas"],
  "Status Moves": ["Thunder Wave", "Will-O-Wisp", "Toxic", "Glare", "Spore", "Sleep Powder", "Stun Spore", "Yawn", "Encore", "Taunt", "Nuzzle", "Hypnosis"],
  "Priority Moves": ["Fake Out", "Extreme Speed", "Quick Attack", "Sucker Punch", "Mach Punch", "Vacuum Wave", "Bullet Punch", "Ice Shard", "Shadow Sneak", "Aqua Jet", "First Impression", "Grassy Glide", "Accelerock"],
  Disruption: ["Circle Throw", "Dragon Tail", "Whirlwind", "Roar", "Haze", "Clear Smog", "Encore", "Taunt", "Disable", "Torment"],
  "Screens Support": ["Reflect", "Light Screen", "Aurora Veil", "Brick Break"],
  "VGC Moves": ["Ally Switch", "Helping Hand", "Quick Guard", "Wide Guard", "Coaching", "Snarl", "Breaking Swipe", "Follow Me", "Rage Powder"],
  "Speed Control": ["Tailwind", "Icy Wind", "Electroweb", "Bulldoze", "Trick Room", "Scary Face", "String Shot"],
};

const ROLE_THRESHOLDS = {
  "Entry Hazards": { strong: 2, weak: 1 },
  "Hazard Removal": { strong: 2, weak: 1 },
  "Healing Moves": { strong: 3, weak: 1 },
  Momentum: { strong: 3, weak: 1 },
  "Item Removal": { strong: 2, weak: 1 },
  "Status Moves": { strong: 3, weak: 1 },
  "Priority Moves": { strong: 2, weak: 1 },
  Disruption: { strong: 2, weak: 1 },
  "Screens Support": { strong: 2, weak: 1 },
  "VGC Moves": { strong: 2, weak: 1 },
  "Speed Control": { strong: 2, weak: 1 },
};

const BUCKET_COLORS = {
  "Entry Hazards": "from-yellow-500/30 to-orange-500/20",
  "Hazard Removal": "from-cyan-500/30 to-blue-500/20",
  "Healing Moves": "from-lime-500/30 to-emerald-500/20",
  Momentum: "from-fuchsia-500/30 to-purple-500/20",
  "Item Removal": "from-pink-500/30 to-rose-500/20",
  "Status Moves": "from-amber-500/30 to-yellow-500/20",
  "Priority Moves": "from-slate-200/20 to-slate-400/10",
  Disruption: "from-red-500/30 to-rose-500/20",
  "Screens Support": "from-pink-400/30 to-fuchsia-500/20",
  "VGC Moves": "from-red-400/30 to-orange-500/20",
  "Speed Control": "from-sky-500/30 to-indigo-500/20",
};

const SPRITE_OVERRIDES = {
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
};

const DEFAULT_TEAM_SIZE = 12;
const LOCAL_STORAGE_KEY = "prep-device-state-v3";

function getSpriteUrl(pokemon) {
  if (!pokemon) return "";
  const slug = SPRITE_OVERRIDES[pokemon.slug] || pokemon.slug;
  return `${import.meta.env.BASE_URL}sprites/${slug}.png`;
}

function getMatchupMultiplier(moveType, defenderTypes) {
  return defenderTypes.reduce((mult, defenderType) => {
    if (!defenderType) return mult;
    const chart = TYPE_CHART[moveType] || {};
    return mult * (chart[defenderType] ?? 1);
  }, 1);
}

function calculateStat({ base, iv = 31, ev = 0, level = 100, nature = 1 }) {
  const intermediate = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);
  return Math.floor((intermediate + 5) * nature);
}

function speedTier(base, level = 100, nature = "neutral") {
  const natureMod = nature === "plus" ? 1.1 : nature === "minus" ? 0.9 : 1;
  return calculateStat({ base, iv: 31, ev: 252, level, nature: natureMod });
}

function baseSpeedAtLevel(base, level = 100) {
  return calculateStat({ base, iv: 31, ev: 0, level, nature: 1 });
}


const MOVE_ALIASES = {
  "will o wisp": "Will-O-Wisp",
  "will-o-wisp": "Will-O-Wisp",
  "u turn": "U-turn",
  "u-turn": "U-turn",
  "volt switch": "Volt Switch",
  "flip turn": "Flip Turn",
  "parting shot": "Parting Shot",
  "rapid spin": "Rapid Spin",
  "mortal spin": "Mortal Spin",
  "tidy up": "Tidy Up",
  "court change": "Court Change",
  "stealth rock": "Stealth Rock",
  "sticky web": "Sticky Web",
  "toxic spikes": "Toxic Spikes",
  "ceaseless edge": "Ceaseless Edge",
  "stone axe": "Stone Axe",
  "strength sap": "Strength Sap",
  "soft boiled": "Soft-Boiled",
  "soft-boiled": "Soft-Boiled",
  "heal bell": "Heal Bell",
  "light screen": "Light Screen",
  "aurora veil": "Aurora Veil",
  "fake out": "Fake Out",
  "extreme speed": "Extreme Speed",
  "quick attack": "Quick Attack",
  "sucker punch": "Sucker Punch",
  "mach punch": "Mach Punch",
  "vacuum wave": "Vacuum Wave",
  "bullet punch": "Bullet Punch",
  "ice shard": "Ice Shard",
  "shadow sneak": "Shadow Sneak",
  "aqua jet": "Aqua Jet",
  "first impression": "First Impression",
  "grassy glide": "Grassy Glide",
  "circle throw": "Circle Throw",
  "dragon tail": "Dragon Tail",
  "clear smog": "Clear Smog",
  "thunder wave": "Thunder Wave",
  "sleep powder": "Sleep Powder",
  "stun spore": "Stun Spore",
  "icy wind": "Icy Wind",
  "trick room": "Trick Room",
  "scary face": "Scary Face",
  "string shot": "String Shot",
  "ally switch": "Ally Switch",
  "helping hand": "Helping Hand",
  "quick guard": "Quick Guard",
  "wide guard": "Wide Guard",
  "breaking swipe": "Breaking Swipe",
  "follow me": "Follow Me",
  "rage powder": "Rage Powder",
};

function normalizeMoveName(name) {
  const cleaned = String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[_]+/g, " ")
    .toLowerCase();

  if (MOVE_ALIASES[cleaned]) return MOVE_ALIASES[cleaned];

  return cleaned
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getDefensiveProfile(pokemon) {
  if (!pokemon) return { weak: [], resist: [], immune: [] };
  const defenderTypes = [pokemon.type1, pokemon.type2].filter(Boolean);
  const profile = { weak: [], resist: [], immune: [] };

  ALL_TYPES.forEach((attackType) => {
    const mult = getMatchupMultiplier(attackType, defenderTypes);
    if (mult === 0) profile.immune.push(attackType);
    else if (mult > 1) profile.weak.push({ type: attackType, mult });
    else if (mult < 1) profile.resist.push({ type: attackType, mult });
  });

  profile.weak.sort((a, b) => b.mult - a.mult || a.type.localeCompare(b.type));
  return profile;
}

function getCoverageScore(team, type) {
  return team.reduce((score, pokemon) => {
    if (!pokemon) return score;
    const stabTypes = [pokemon.type1, pokemon.type2].filter(Boolean);
    const best = Math.max(...stabTypes.map((moveType) => getMatchupMultiplier(moveType, [type])), 0);
    return score + (best > 1 ? 1 : 0);
  }, 0);
}


function getTeamMoveBuckets(team) {
  const bucketMap = {};
  const normalizedBuckets = {};

  Object.entries(MOVE_BUCKETS).forEach(([bucket, moves]) => {
    bucketMap[bucket] = {};
    normalizedBuckets[bucket] = new Set(moves.map(normalizeMoveName));
  });

  team.forEach((pokemon) => {
    const moves = Array.isArray(pokemon?.moves)
      ? pokemon.moves.map(normalizeMoveName)
      : [];

    moves.forEach((move) => {
      Object.keys(normalizedBuckets).forEach((bucket) => {
        if (normalizedBuckets[bucket].has(move)) {
          if (!bucketMap[bucket][move]) bucketMap[bucket][move] = [];
          bucketMap[bucket][move].push(pokemon.name);
        }
      });
    });
  });

  return bucketMap;
}

function getRoleSummary(team) {
  const bucketMap = getTeamMoveBuckets(team);

  const strong = [];
  const weak = [];
  const missing = [];

  Object.entries(MOVE_BUCKETS).forEach(([bucket]) => {
    const mons = new Set();
    Object.values(bucketMap[bucket]).forEach((arr) => arr.forEach((name) => mons.add(name)));
    const count = mons.size;
    const thresholds = ROLE_THRESHOLDS[bucket] || { strong: 2, weak: 1 };

    if (count >= thresholds.strong) strong.push({ bucket, count });
    else if (count >= thresholds.weak) weak.push({ bucket, count });
    else missing.push({ bucket, count: 0 });
  });

  return { strong, weak, missing, bucketMap };
}

function buildPrepState({ yourNames, oppNames, teamSize, level, tab }) {
  return {
    yourNames,
    oppNames,
    teamSize,
    level,
    tab,
    updatedAt: Date.now(),
  };
}

async function listPrepBoards(uid) {
  const snap = await getDocs(collection(db, "users", uid, "prepBoards"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

async function createPrepBoard(uid, state, title = "Untitled Prep") {
  const docRef = await addDoc(collection(db, "users", uid, "prepBoards"), {
    title,
    ...state,
  });
  return docRef.id;
}

async function savePrepBoard(uid, boardId, state, title = "Untitled Prep") {
  await setDoc(
    doc(db, "users", uid, "prepBoards", boardId),
    {
      title,
      ...state,
    },
    { merge: true }
  );
}

async function loadPrepBoard(uid, boardId) {
  const snap = await getDoc(doc(db, "users", uid, "prepBoards", boardId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function removePrepBoard(uid, boardId) {
  await deleteDoc(doc(db, "users", uid, "prepBoards", boardId));
}

function TypeBadge({ type }) {
  if (!type) return null;
  return (
    <span
      style={{ backgroundColor: TYPE_COLORS[type] || "#64748b" }}
      className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold text-white shadow"
    >
      {type}
    </span>
  );
}

function PokemonSprite({ pokemon, size = 40 }) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [pokemon?.slug]);

  if (!pokemon) {
    return <div className="rounded-xl border border-dashed border-white/10 bg-black/20" style={{ width: size, height: size }} />;
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-black/20 text-xs text-slate-400 ring-1 ring-white/10"
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-xl bg-black/20 ring-1 ring-white/10"
      style={{ width: size, height: size }}
    >
      <img
        src={getSpriteUrl(pokemon)}
        alt={pokemon.name}
        style={{ width: size - 4, height: size - 4, objectFit: "contain" }}
        loading="lazy"
        onError={() => setError(true)}
      />
    </div>
  );
}

function SearchDropdown({ results, onPick }) {
  return (
    <div className="absolute top-full z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl">
      {results.length ? (
        results.map((p) => (
          <button
            key={p.slug}
            onClick={() => onPick(p.name)}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <PokemonSprite pokemon={p} size={34} />
              <div>
                <div>{p.name}</div>
                <div className="text-xs text-slate-400">#{p.dex}</div>
              </div>
            </div>
            <div className="flex gap-1">
              <TypeBadge type={p.type1} />
              {p.type2 && <TypeBadge type={p.type2} />}
            </div>
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-slate-400">No matches found.</div>
      )}
    </div>
  );
}

function TeamPicker({ title, team, setTeam, accentClass, pokemonDb, maxSize, setMaxSize }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return pokemonDb
      .filter((p) => p.name.toLowerCase().includes(q) || p.slug.includes(q))
      .slice(0, 15);
  }, [query, pokemonDb]);

  const setSlot = (index, name) => {
    const next = [...team];
    next[index] = name;
    setTeam(next);
  };

  const addPokemon = (name) => {
    const emptyIndex = team.findIndex((slot) => !slot);
    if (emptyIndex !== -1) {
      setSlot(emptyIndex, name);
    }
    setQuery("");
  };

  const moveSlot = (from, to) => {
    const next = [...team];
    [next[from], next[to]] = [next[to], next[from]];
    setTeam(next);
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <div className="flex items-center gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-300">Team Size</label>
            <input
              type="number"
              min={1}
              max={24}
              value={maxSize}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isNaN(value)) return;
                setMaxSize(Math.max(1, Math.min(24, value)));
              }}
              className="w-24 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
            />
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${accentClass}`}>{team.length} slots</span>
        </div>
      </div>

      <div className="relative mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any Pokémon or form..."
          className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-400"
        />
        {query && <SearchDropdown results={filtered} onPick={addPokemon} />}
      </div>

      <div className="grid gap-3">
        {team.map((name, idx) => {
          const pokemon = pokemonDb.find((p) => p.name === name);
          return (
            <div key={idx} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
              <div className="flex items-center gap-3">
                <PokemonSprite pokemon={pokemon} />
                <div>
                  <div className="font-medium text-white">{pokemon?.name || `Slot ${idx + 1}`}</div>
                  <div className="mt-1 flex gap-1">
                    {pokemon ? (
                      <>
                        <TypeBadge type={pokemon.type1} />
                        {pokemon.type2 && <TypeBadge type={pokemon.type2} />}
                      </>
                    ) : (
                      <span className="text-xs text-slate-500">Empty</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => idx > 0 && moveSlot(idx, idx - 1)} className="rounded-xl bg-white/10 px-3 py-2 text-white transition hover:bg-white/20">↑</button>
                <button onClick={() => idx < team.length - 1 && moveSlot(idx, idx + 1)} className="rounded-xl bg-white/10 px-3 py-2 text-white transition hover:bg-white/20">↓</button>
                <button onClick={() => setSlot(idx, "")} className="rounded-xl bg-red-500/80 px-3 py-2 text-white transition hover:bg-red-500">×</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TeamTable({ title, team, tone }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
      <h2 className="mb-4 text-xl font-bold text-white">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <div className={`grid grid-cols-[1.6fr_1fr_1.5fr_1.2fr_1.5fr] gap-3 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-white ${tone}`}>
          <div>Name</div>
          <div>Types</div>
          <div>Abilities</div>
          <div>Speed</div>
          <div>Weak to</div>
        </div>
        <div className="divide-y divide-white/10 bg-black/20">
          {team.length ? (
            team.map((pokemon) => {
              const profile = getDefensiveProfile(pokemon);
              return (
                <div key={pokemon.slug} className="grid grid-cols-[1.6fr_1fr_1.5fr_1.2fr_1.5fr] gap-3 px-3 py-3 text-sm text-slate-200">
                  <div className="flex items-center gap-3 font-medium text-white">
                    <PokemonSprite pokemon={pokemon} />
                    <span>{pokemon.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <TypeBadge type={pokemon.type1} />
                    {pokemon.type2 && <TypeBadge type={pokemon.type2} />}
                  </div>
                  <div className="text-xs leading-5 text-slate-300">{pokemon.abilities.join(" • ")}</div>
                  <div className="text-xs leading-5 text-slate-300">Base {pokemon.spe}</div>
                  <div className="text-xs leading-5 text-slate-300">
                    {profile.weak.slice(0, 4).map((w) => `${w.type} ${w.mult}x`).join(", ") || "None"}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-3 py-6 text-sm text-slate-400">No Pokémon selected yet.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function SpeedBoard({ yourTeam, oppTeam, level, setLevel }) {
  const yourSorted = [...yourTeam].sort((a, b) => b.spe - a.spe);
  const oppSorted = [...oppTeam].sort((a, b) => b.spe - a.spe);

  const blocks = [
    { label: "Your Team", data: yourSorted, tone: "from-cyan-500/20 to-blue-500/20" },
    { label: "Opponent", data: oppSorted, tone: "from-rose-500/20 to-red-500/20" },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">⚡ Speed Control</h2>
          <p className="mt-1 text-sm text-slate-300">Change level and speed values update live.</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Pokémon Level</label>
            <input
              type="number"
              min={1}
              max={100}
              value={level}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isNaN(value)) return;
                setLevel(Math.max(1, Math.min(100, value)));
              }}
              className="w-28 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
            />
          </div>
          <div className="max-w-md rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-slate-400">
            Formula: ⌊((⌊((2×Base + IV + ⌊EV/4⌋)×Level)/100⌋)+5)×Nature⌋
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {blocks.map((section) => (
          <div key={section.label} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${section.tone} p-4`}>
            <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-200">{section.label}</div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
              <div className="grid grid-cols-[1.7fr_1fr_1fr_1fr] bg-black/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                <div>Pokémon</div>
                <div>Base</div>
                <div>252</div>
                <div>252+</div>
              </div>
              <div className="divide-y divide-white/10">
                {section.data.length ? (
                  section.data.map((p) => (
                    <div key={p.slug} className="grid grid-cols-[1.7fr_1fr_1fr_1fr] px-3 py-3 text-sm text-slate-100">
                      <div className="flex items-center gap-3 font-medium">
                        <PokemonSprite pokemon={p} />
                        <span>{p.name}</span>
                      </div>
                      <div>{baseSpeedAtLevel(p.spe, level)}</div>
                      <div>{speedTier(p.spe, level, "neutral")}</div>
                      <div>{speedTier(p.spe, level, "plus")}</div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-sm text-slate-400">No speed data yet.</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CoveragePanel({ yourTeam, oppTeam }) {
  const buildCoverage = (team) =>
    ALL_TYPES.map((type) => ({
      type,
      score: getCoverageScore(team, type),
    }));

  const sections = [
    { title: "Your offensive pressure", data: buildCoverage(yourTeam) },
    { title: "Opponent offensive pressure", data: buildCoverage(oppTeam) },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
      <h2 className="mb-4 text-xl font-bold text-white">🗡️ Quick Coverage Read</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-200">{section.title}</div>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
              {section.data.map((item) => {
                const active = item.score > 0;
                return (
                  <div
                    key={item.type}
                    className={`rounded-xl border px-2 py-3 text-center text-xs font-medium ${active ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100" : "border-white/10 bg-black/20 text-slate-400"}`}
                  >
                    <div>{item.type}</div>
                    <div className="mt-1">{active ? `${item.score} STAB user${item.score > 1 ? "s" : ""}` : "No STAB pressure"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RoleSummaryCard({ title, entries, colorClass, emptyText }) {
  return (
    <div className={`rounded-2xl border border-white/10 ${colorClass} p-4`}>
      <div className="mb-3 text-sm font-bold text-white">{title}</div>
      {entries.length ? (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.bucket} className="rounded-xl bg-black/20 px-3 py-2 text-sm text-slate-100">
              <div className="font-semibold">{entry.bucket}</div>
              <div className="text-xs text-slate-300">{entry.count} supporting mon{entry.count === 1 ? "" : "s"}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-slate-300">{emptyText}</div>
      )}
    </div>
  );
}

function MovesBoard({ team, title }) {
  const summary = useMemo(() => getRoleSummary(team), [team]);
  const { strong, weak, missing, bucketMap } = summary;
  const hasAnyMoves = Object.values(bucketMap).some((bucket) => Object.keys(bucket).length > 0);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white">🧠 {title}</h2>
        <p className="mt-1 text-sm text-slate-300">Track support tools, disruption, hazards, and role coverage across the team.</p>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <RoleSummaryCard title="Strong Roles" entries={strong} colorClass="bg-emerald-500/15" emptyText="No roles are strongly covered yet." />
        <RoleSummaryCard title="Weak Roles" entries={weak} colorClass="bg-yellow-500/15" emptyText="No weak single-point roles right now." />
        <RoleSummaryCard title="Missing Roles" entries={missing} colorClass="bg-rose-500/15" emptyText="Nothing missing." />
      </div>

      {hasAnyMoves ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
          {Object.entries(bucketMap).map(([bucket, moves]) => {
            const entries = Object.entries(moves).sort((a, b) => a[0].localeCompare(b[0]));
            return (
              <div key={bucket} className={`rounded-2xl border border-white/10 bg-gradient-to-b ${BUCKET_COLORS[bucket] || "from-white/10 to-white/5"} p-3`}>
                <div className="mb-3 text-sm font-bold text-white">{bucket}</div>
                <div className="space-y-2">
                  {entries.length ? (
                    entries.map(([move, mons]) => (
                      <div key={move} className="rounded-xl bg-black/25 px-3 py-2">
                        <div className="text-sm font-semibold text-white">{move}</div>
                        <div className="mt-1 text-xs text-slate-200">{mons.join(", ")}</div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl bg-black/20 px-3 py-2 text-xs text-slate-400">None on current team</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
          No move data is loaded yet for the selected team.
        </div>
      )}
    </section>
  );
}

function PrepNotes({ yourTeam, oppTeam }) {
  const notes = useMemo(() => {
    const insights = [];
    const yourFastest = [...yourTeam].sort((a, b) => b.spe - a.spe)[0];
    const oppFastest = [...oppTeam].sort((a, b) => b.spe - a.spe)[0];
    const yourSlowest = [...yourTeam].sort((a, b) => a.spe - b.spe)[0];
    const oppSlowest = [...oppTeam].sort((a, b) => a.spe - b.spe)[0];

    if (yourFastest && oppFastest) {
      insights.push(`${yourFastest.name} is your fastest visible piece. ${oppFastest.name} is the opponent's fastest visible piece.`);
    }

    if (yourSlowest && oppSlowest) {
      insights.push(`${yourSlowest.name} and ${oppSlowest.name} look like the natural slow-mode or Trick Room style anchors.`);
    }

    const dangerousOpp = oppTeam
      .map((p) => ({
        name: p.name,
        score: yourTeam.filter((y) => getMatchupMultiplier(p.type1, [y.type1, y.type2]) > 1).length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter((x) => x.score > 0);

    if (dangerousOpp.length) {
      insights.push(`Biggest immediate pressure pieces: ${dangerousOpp.map((d) => d.name).join(", ")}.`);
    }

    const yourWeakCount = {};
    yourTeam.forEach((p) => {
      getDefensiveProfile(p).weak.forEach((w) => {
        yourWeakCount[w.type] = (yourWeakCount[w.type] || 0) + 1;
      });
    });
    const worstSharedWeakness = Object.entries(yourWeakCount).sort((a, b) => b[1] - a[1])[0];
    if (worstSharedWeakness && worstSharedWeakness[1] >= 2) {
      insights.push(`You stack ${worstSharedWeakness[0]} weakness across ${worstSharedWeakness[1]} slots, so keep that in mind during prep.`);
    }

    const yourRoles = getRoleSummary(yourTeam);
    if (yourRoles.missing.some((x) => x.bucket === "Hazard Removal")) {
      insights.push("You currently do not have hazard removal loaded on your side.");
    }
    if (yourRoles.missing.some((x) => x.bucket === "Speed Control")) {
      insights.push("You currently do not have speed control loaded on your side.");
    }
    if (yourRoles.weak.some((x) => x.bucket === "Momentum")) {
      insights.push("Your momentum game looks a little thin, so preserving pivot options may matter a lot.");
    }

    return insights;
  }, [yourTeam, oppTeam]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
      <h2 className="mb-4 text-xl font-bold text-white">✨ Prep Notes</h2>
      <div className="space-y-3">
        {notes.length ? (
          notes.map((note, idx) => (
            <div key={idx} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
              {note}
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-400">Add teams to start generating quick notes.</div>
        )}
      </div>
    </section>
  );
}

function ThreatSnapshot({ yourTeam, oppTeam }) {
  const threats = oppTeam
    .map((p) => ({
      ...p,
      pressure: yourTeam.filter((y) => getMatchupMultiplier(p.type1, [y.type1, y.type2]) > 1).length,
    }))
    .sort((a, b) => b.pressure - a.pressure)
    .slice(0, 6);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
      <h2 className="mb-4 text-xl font-bold text-white">💀 Threat Snapshot</h2>
      <div className="space-y-3 text-sm text-slate-200">
        {threats.length ? (
          threats.map((p) => (
            <div key={p.slug} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 font-medium text-white">
                  <PokemonSprite pokemon={p} />
                  <span>{p.name}</span>
                </div>
                <div className="text-slate-400">Pressure score: {p.pressure}</div>
              </div>
              <div className="mt-2 flex gap-1">
                <TypeBadge type={p.type1} />
                {p.type2 && <TypeBadge type={p.type2} />}
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-400">No opponent team yet.</div>
        )}
      </div>
    </section>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-white text-slate-950" : "bg-transparent text-slate-300 hover:bg-white/10"}`}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [pokemonDb, setPokemonDb] = useState([]);
  const [dataMode, setDataMode] = useState("loading");
  const [tab, setTab] = useState("overview");
  const [teamSize, setTeamSize] = useState(DEFAULT_TEAM_SIZE);
  const [yourNames, setYourNames] = useState(["Wiglett", "Blitzle", "Hisuian Zorua", "Fidough", "Pawniard", "Tyrunt", "Sewaddle", "Timburr", "Solosis", "Paldean Wooper", "Mareanie", "Mienfoo"]);
  const [oppNames, setOppNames] = useState(["Ponyta", "Drifloon", "Grookey", "Pawniard", "Horsea", "Baltoy", "Croagunk", "Tadbulb", "Pidove", "Rolycoly", "Magnemite", "Gligar"]);
  const [level, setLevel] = useState(100);

  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [boards, setBoards] = useState([]);
  const [currentBoardId, setCurrentBoardId] = useState("");
  const [boardTitle, setBoardTitle] = useState("Untitled Prep");
  const [cloudStatus, setCloudStatus] = useState("Not signed in");

  const cloudLoadedRef = useRef(false);

  function applyPrepState(state) {
    if (Array.isArray(state.yourNames)) setYourNames(state.yourNames);
    if (Array.isArray(state.oppNames)) setOppNames(state.oppNames);
    if (typeof state.teamSize === "number") setTeamSize(state.teamSize);
    if (typeof state.level === "number") setLevel(state.level);
    if (typeof state.tab === "string") setTab(state.tab);
    if (typeof state.title === "string") setBoardTitle(state.title);
  }

  async function refreshBoards() {
    if (!user) return;
    const boardList = await listPrepBoards(user.uid);
    setBoards(boardList);
  }

  async function handleCreateBoard() {
    if (!user) {
      setCloudStatus("Sign in first");
      return;
    }

    try {
      const blankYour = Array(teamSize).fill("");
      const blankOpp = Array(teamSize).fill("");
      const newTitle = "New Prep";
      const state = buildPrepState({
        yourNames: blankYour,
        oppNames: blankOpp,
        teamSize,
        level,
        tab,
      });

      const newId = await createPrepBoard(user.uid, state, newTitle);

      setCurrentBoardId(newId);
      setBoardTitle(newTitle);
      setYourNames(blankYour);
      setOppNames(blankOpp);

      await refreshBoards();
      setCloudStatus("Created new board");
    } catch (err) {
      console.error(err);
      setCloudStatus("Create failed");
    }
  }

  async function handleSaveBoard() {
    if (!user) {
      setCloudStatus("Sign in first");
      return;
    }

    try {
      const title = boardTitle?.trim() || "Untitled Prep";
      const state = buildPrepState({ yourNames, oppNames, teamSize, level, tab });

      if (!currentBoardId) {
        const newId = await createPrepBoard(user.uid, state, title);
        setCurrentBoardId(newId);
        setCloudStatus("Created and saved board");
      } else {
        await savePrepBoard(user.uid, currentBoardId, state, title);
        setCloudStatus("Saved board");
      }

      await refreshBoards();
    } catch (err) {
      console.error(err);
      setCloudStatus("Save failed");
    }
  }

  async function handleLoadBoard(boardId) {
    if (!user || !boardId) return;

    try {
      const board = await loadPrepBoard(user.uid, boardId);
      if (!board) {
        setCloudStatus("Board not found");
        return;
      }

      setCurrentBoardId(board.id);
      applyPrepState(board);
      setCloudStatus("Loaded board");
    } catch (err) {
      console.error(err);
      setCloudStatus("Load failed");
    }
  }

  async function handleDeleteBoard() {
    if (!user || !currentBoardId) {
      setCloudStatus("No board selected");
      return;
    }

    try {
      await removePrepBoard(user.uid, currentBoardId);
      await refreshBoards();

      setCurrentBoardId("");
      setBoardTitle("Untitled Prep");
      setCloudStatus("Deleted board");
    } catch (err) {
      console.error(err);
      setCloudStatus("Delete failed");
    }
  }

  async function handleGoogleLogin() {
    try {
      setCloudStatus("Signing in...");
      await signInWithPopup(auth, googleProvider);
      setCloudStatus("Signed in");
    } catch (err) {
      console.error(err);
      setCloudStatus("Sign in failed");
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      cloudLoadedRef.current = false;
      setBoards([]);
      setCurrentBoardId("");
      setCloudStatus("Signed out");
    } catch (err) {
      console.error(err);
      setCloudStatus("Sign out failed");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPokemon() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/pokemon_with_moves.json`);
        if (!response.ok) throw new Error("failed to load dataset");
        const data = await response.json();
        if (!cancelled) {
          const merged = data.map((p) => ({
            ...p,
            moves: Array.isArray(p.moves) ? p.moves.map(normalizeMoveName) : [],
          }));
          setPokemonDb(merged);
          setDataMode("full");
        }
      } catch {
        if (!cancelled) {
          setPokemonDb([]);
          setDataMode("error");
        }
      }
    }

    loadPokemon();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw);
      if (Array.isArray(saved.yourNames)) setYourNames(saved.yourNames);
      if (Array.isArray(saved.oppNames)) setOppNames(saved.oppNames);
      if (typeof saved.teamSize === "number") setTeamSize(saved.teamSize);
      if (typeof saved.level === "number") setLevel(saved.level);
      if (typeof saved.tab === "string") setTab(saved.tab);
      if (typeof saved.boardTitle === "string") setBoardTitle(saved.boardTitle);
    } catch (err) {
      console.error("Failed to restore local state", err);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setCloudStatus("Not signed in");
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    async function loadBoardsFromCloud() {
      if (!authReady || !user || cloudLoadedRef.current) return;

      try {
        setCloudStatus("Loading boards...");
        const boardList = await listPrepBoards(user.uid);
        setBoards(boardList);

        if (boardList.length > 0) {
          const first = boardList[0];
          setCurrentBoardId(first.id);
          applyPrepState(first);
          setCloudStatus("Loaded boards");
        } else {
          setCurrentBoardId("");
          setCloudStatus("No cloud boards yet");
        }
      } catch (err) {
        console.error(err);
        setCloudStatus("Cloud load failed");
      } finally {
        cloudLoadedRef.current = true;
      }
    }

    loadBoardsFromCloud();
  }, [authReady, user]);

  useEffect(() => {
    setYourNames((prev) => {
      if (prev.length === teamSize) return prev;
      if (prev.length > teamSize) return prev.slice(0, teamSize);
      return [...prev, ...Array(teamSize - prev.length).fill("")];
    });

    setOppNames((prev) => {
      if (prev.length === teamSize) return prev;
      if (prev.length > teamSize) return prev.slice(0, teamSize);
      return [...prev, ...Array(teamSize - prev.length).fill("")];
    });
  }, [teamSize]);

  useEffect(() => {
    const state = {
      yourNames,
      oppNames,
      teamSize,
      level,
      tab,
      boardTitle,
      updatedAt: Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [yourNames, oppNames, teamSize, level, tab, boardTitle]);

  const yourTeam = useMemo(() => yourNames.map((name) => pokemonDb.find((p) => p.name === name)).filter(Boolean), [yourNames, pokemonDb]);
  const oppTeam = useMemo(() => oppNames.map((name) => pokemonDb.find((p) => p.name === name)).filter(Boolean), [oppNames, pokemonDb]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#16213e,_#020617_55%)] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 md:px-10">
        <header className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
              Match Prep Device
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {user ? (
                <>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                    Signed in as <span className="font-semibold text-white">{user.displayName || user.email}</span>
                  </div>
                  <button onClick={handleCreateBoard} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400">
                    New Board
                  </button>
                  <button onClick={handleSaveBoard} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400">
                    Save Board
                  </button>
                  <button onClick={handleDeleteBoard} className="rounded-xl bg-red-500/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500">
                    Delete Board
                  </button>
                  <button onClick={handleLogout} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
                    Sign Out
                  </button>
                </>
              ) : (
                <button onClick={handleGoogleLogin} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">
                  Sign in with Google
                </button>
              )}
            </div>
          </div>

          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            A cleaner, meaner, web-based <span className="bg-gradient-to-r from-cyan-300 via-emerald-300 to-fuchsia-300 bg-clip-text text-transparent">prep app</span>
          </h1>

          <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">
            Built to feel less like a spreadsheet and more like a real scouting tool. Pick both teams, compare speed control, spot coverage holes, check move roles, and keep your prep through refreshes.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
              Dataset: <span className="font-semibold text-white">{dataMode === "full" ? `${pokemonDb.length} entries loaded` : dataMode === "loading" ? "Loading..." : "Could not load data"}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
              Local save: <span className="font-semibold text-white">Active</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
              Cloud: <span className="font-semibold text-white">{cloudStatus}</span>
            </div>
          </div>
        </header>

        {user && (
          <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_auto]">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-300">Board Name</label>
                <input
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  placeholder="Name this prep board..."
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-300">Select Saved Board</label>
                <select
                  value={currentBoardId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setCurrentBoardId(id);
                    if (id) handleLoadBoard(id);
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                >
                  <option value="">Unsaved / New Board</option>
                  {boards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.title || "Untitled Prep"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-slate-300">
                  Boards: <span className="font-semibold text-white">{boards.length}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="mb-8 grid gap-6 xl:grid-cols-2">
          <TeamPicker title="Your Team" team={yourNames} setTeam={setYourNames} accentClass="bg-cyan-500" pokemonDb={pokemonDb} maxSize={teamSize} setMaxSize={setTeamSize} />
          <TeamPicker title="Opponent Team" team={oppNames} setTeam={setOppNames} accentClass="bg-rose-500" pokemonDb={pokemonDb} maxSize={teamSize} setMaxSize={setTeamSize} />
        </div>

        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl bg-white/5 p-1">
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>Overview</TabButton>
          <TabButton active={tab === "tables"} onClick={() => setTab("tables")}>Detailed Tables</TabButton>
          <TabButton active={tab === "speed"} onClick={() => setTab("speed")}>Speed</TabButton>
          <TabButton active={tab === "coverage"} onClick={() => setTab("coverage")}>Coverage</TabButton>
          <TabButton active={tab === "moves"} onClick={() => setTab("moves")}>Moves</TabButton>
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <PrepNotes yourTeam={yourTeam} oppTeam={oppTeam} />
              </div>
              <ThreatSnapshot yourTeam={yourTeam} oppTeam={oppTeam} />
            </div>
            <SpeedBoard yourTeam={yourTeam} oppTeam={oppTeam} level={level} setLevel={setLevel} />
          </div>
        )}

        {tab === "tables" && (
          <div className="space-y-6">
            <TeamTable title="Your roster board" team={yourTeam} tone="bg-gradient-to-r from-cyan-500 to-blue-500" />
            <TeamTable title="Opponent roster board" team={oppTeam} tone="bg-gradient-to-r from-rose-500 to-red-500" />
          </div>
        )}

        {tab === "speed" && <SpeedBoard yourTeam={yourTeam} oppTeam={oppTeam} level={level} setLevel={setLevel} />}
        {tab === "coverage" && <CoveragePanel yourTeam={yourTeam} oppTeam={oppTeam} />}
        {tab === "moves" && (
          <div className="space-y-6">
            <MovesBoard team={yourTeam} title="Your Team Move Board" />
            <MovesBoard team={oppTeam} title="Opponent Team Move Board" />
          </div>
        )}
      </div>
    </div>
  );
}
