# Soulgold's generated wiki JSON is the sole data source

All game data (species, moves, learnsets, abilities, encounters, trainers) comes from the JSON files the Soulgold wiki publishes at `https://eemeliri.github.io/soulgold/data/`. The files are vendored into the repo by a fetch script and tagged with the hack version they came from (v1.2.1 at the time of writing). Soulgold diverges heavily from vanilla: it has Gen 1–9 species, custom Megas, Innates, rewritten learnsets and its own trainer teams. Vanilla sources would therefore be quietly wrong, and this JSON is generated straight from the hack's C source (`tools/soulgold_docs/` in `Eemeliri/soulgold`).

## Considered Options

- **PokeAPI**: rejected. It has vanilla data, with no Innates, custom Megas or Soulgold learnsets.
- **Scraping the wiki's HTML**: rejected. The HTML is a client-rendered shell, so the JSON underneath it is the actual source.
- **Parsing the hack's C source directly**: rejected for now. It would duplicate the wiki's own build tooling.

## Consequences

- Identifiers throughout the app are the hack's constants (`SPECIES_X`, `MOVE_X`, `ABILITY_X`), so saved Teams are tied to a data version.
- The type chart is not in the JSON. It is the standard Gen 6+ chart, which was confirmed unchanged against `src/data/types_info.h` in the hack's source.
- Ability effects on type matchups are not machine-readable, so they come from a hand-curated table.
