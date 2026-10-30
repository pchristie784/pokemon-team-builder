# Architecture

Vite + React + TypeScript (strict). `npm run dev | build | typecheck | test | fetch-data`.
Vocabulary: `GLOSSARY.md`. Spec and tickets: `.scratch/team-builder-v1/`.

## Module map

```
data/soulgold/            vendored wiki JSON + version.json (refresh: npm run fetch-data; never hand-edit)
public/soulgold/sprites/  vendored species sprites, also written by npm run fetch-data
scripts/fetch-data.mjs    downloads the snapshot, scrapes the hack version from the wiki index
src/domain/               THE seam. UI and tests import only from src/domain/index.ts
  index.ts                public API: createTeamBuilder + type/helper re-exports (one line each)
  teamBuilder.ts          TeamBuilder facade: holds AppState, apply(action), save, notify subscribers
  state.ts                AppState (plain serialisable data) + initialState()
  team.ts                 Team / TeamMember model + pure rules (max 6 members) + updateTeam/updateTeamMember helpers
  teamView.ts             TeamView / TeamMemberView read models (Species, effective types, Innates resolved)
  persistence.ts          load/save AppState via StorageAdapter
  storage.ts              StorageAdapter, InMemoryStorage (tests), LocalStorageAdapter (app)
  errors.ts               DomainError with a typed `code` union
  pokemonTypes.ts         the 18 types (TYPE_* constants) + typeName()
  data/                   raw.ts (JSON shapes), model.ts (Species, Move, Ability), names.ts (form display names),
                          snapshot.ts (DataSnapshot lookups), load.ts (loadSnapshot(), cached),
                          sprites.ts (spriteUrl: local sprite path under public/soulgold/)
src/ui/                   thin React layer; one component per file; useTeamBuilder() hook re-renders on change
```

## Where each ticket goes (create new files; keep shared-file edits to a few lines)

| Ticket | Domain | UI |
|---|---|---|
| 02 Defensive Coverage | `typeChart.ts`, `critique/defensive.ts`, `critique/index.ts` (`critique(team)` assembles sections) | `CritiquePanel.tsx`, `DefensiveCoverage.tsx` |
| 03 Innates/Abilities | `abilityEffects.ts` (defensive part), `setTeamMemberAbility` in `team.ts` | `AbilityPicker.tsx` |
| 04 Moves/Offensive | `data/learnset.ts` (learnable moves + source labels), move rules in `team.ts`, `critique/offensive.ts` | `MovePicker.tsx`, `OffensiveCoverage.tsx` |
| 05 Attack-changing abilities | `abilityEffects.ts` (offensive part), `critique/offensive.ts` | — |
| 06 Stat Roles | `critique/statRoles.ts` (thresholds as named constants at top) | `StatRoles.tsx` |
| 07 Mega | `data/megas.ts` or `DataSnapshot.getMegaEvolutions`, toggle rule in `team.ts`, effective types/stats in `teamView.ts` | `MegaToggle.tsx` |
| 08 Saved Teams/settings | team CRUD in `teamList.ts`, `difficulty` + `dataVersion` in `state.ts`, migration in `persistence.ts` | `TeamList.tsx`, `SettingsBar.tsx` |
| 09 Box | `box.ts`, `data/evolutions.ts`, mode in `state.ts` | `BoxManager.tsx`, `ModeToggle.tsx` |
| 10 Export/import | `exportImport.ts` (reuses persistence.ts) | `ExportImport.tsx` |
| 11/12 Suggestions | `suggest.ts` (or `suggest/`) | `SuggestionsPanel.tsx` |

## Conventions

- **Pure functions + thin facade.** Rules are pure `(state, data, ...args) => AppState` functions that throw
  `DomainError` (add your code to the union in `errors.ts`). Expose each use case as a one-to-three-line
  `TeamBuilder` method that calls `this.apply(s => yourRule(s, this.data, ...))`; queries read
  `this.state`/`this.data`. Add your methods under a `// --- <Ticket topic> ---` section at the end of the class.
- **Growing AppState:** add a field with a default in `initialState()` and default it in `loadState()` for
  older saves. Never store derived data (views, critiques) in AppState.
- **Data lookups:** add methods to `DataSnapshot` only for small lookups; put sizeable logic in a new
  `data/*.ts` file taking a `DataSnapshot`. Identifiers are hack constants (`SPECIES_*`, `MOVE_*`, `ABILITY_*`, `TYPE_*`).
- **Species vs Mega:** `DataSnapshot.getSpecies` / search never return Megas (megaEvolutions targets plus the
  "mega" category). Mega forms come from `getMegaEvolutions(speciesId)`. Monotypes are deduplicated.
- **Tests:** one file per ticket area in `src/domain/__tests__/<area>.test.ts`, importing only `../index`.
  Use real data: `createTeamBuilder({ storage: new InMemoryStorage() })` (loads the vendored snapshot, cached
  per process, ~1 s). No fixtures, no mocking internals. Name tests in glossary terms.
- **UI:** components call `useTeamBuilder()` and read views from the facade; catch `DomainError` only where a
  user action could break a rule the UI doesn't already prevent. UI is not unit-tested in v1.
- **Before handing back:** `npm run typecheck && npm test && npm run build`.
