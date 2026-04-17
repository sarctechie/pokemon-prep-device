import pandas as pd
import json
from pathlib import Path

EXCEL_FILE = Path("New Prep doc.xlsx")  # make sure file is here
OUTPUT_FILE = Path("pokemon_moves.json")

pokemon_moves = {}

def add(mon, move):
    if pd.isna(mon) or pd.isna(move):
        return
    mon = str(mon).strip()
    move = str(move).strip()
    if not mon or not move:
        return
    pokemon_moves.setdefault(mon, set()).add(move)

# Load ALL sheets
xls = pd.ExcelFile(EXCEL_FILE)

for sheet_name in xls.sheet_names:
    df = xls.parse(sheet_name, header=None)

    for _, row in df.iterrows():
        row = list(row)

        # walk across row in pairs
        for i in range(0, len(row) - 1, 2):
            mon = row[i]
            move = row[i + 1]
            add(mon, move)

# convert sets → lists
pokemon_moves = {k: sorted(v) for k, v in pokemon_moves.items()}

with open(OUTPUT_FILE, "w") as f:
    json.dump(pokemon_moves, f, indent=2)

print("done")
print("total pokemon:", len(pokemon_moves))
