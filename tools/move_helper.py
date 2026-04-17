import json
import re

input_file = "moves.txt"   # your pasted file
output_file = "pokemon_moves.json"

pokemon_moves = {}

current_category = None

with open(input_file, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue

        parts = re.split(r"\t+", line)

        # Detect category row
        if len(parts) > 5:
            current_category = parts
            continue

        if len(parts) < 2:
            continue

        pokemon = parts[0].strip()
        move = parts[1].strip()

        if pokemon not in pokemon_moves:
            pokemon_moves[pokemon] = set()

        pokemon_moves[pokemon].add(move)

# Convert sets → lists
pokemon_moves = {k: list(v) for k, v in pokemon_moves.items()}

with open(output_file, "w") as f:
    json.dump(pokemon_moves, f, indent=2)

print("done")
