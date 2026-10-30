Status: ready-for-agent

# Team Builder v1

## Problem Statement

I'm playing **Soulgold**, an expanded-Johto ROM hack that is very different from vanilla SoulGold. It has Gen 1–9 Species, the Fairy type, custom Megas, always-on Innates, rewritten learnsets and its own trainer teams. The community wiki is a reference you browse one page at a time. It doesn't help me answer the question I actually have mid-playthrough: *"Given what I've caught, which six do I use, with which moves, so the Team has no glaring holes?"* Working out type weaknesses, coverage gaps and role balance by hand across six Pokémon is slow and error-prone. Vanilla team builders (PokeAPI-based) give wrong answers, because they don't know Soulgold's learnsets, Innates or forms.

## Solution

Build a local web app that holds my **Box** (what I've caught) and lets me assemble several named **Teams** from it. For each Team it produces a **Critique**:

- **Defensive Coverage**: Stacked Weaknesses, Unanswered Types and 4× weaknesses. It accounts for each Team Member's typing, Innates and chosen Ability.
- **Offensive Coverage**: which types the Team's chosen damaging moves can and can't hit well.
- **Stat Role** balance.

It then offers ranked **Suggestions**: Species, with specific moves, that fix specific Critique problems, each with its reason stated. **Box Mode** limits everything to my Box and its Planned Evolutions. **Dex Mode** opens up every Species for theorycrafting. All data comes from the hack's own generated wiki JSON (ADR 0001), so it's correct for Soulgold.

## User Stories

### Data
1. As a player, I want the app to use Soulgold's own data, so that typings, learnsets, Innates and forms match the game I'm playing.
2. As a player, I want the app to work fully offline once set up, so that I can use it without the wiki being reachable.
3. As a player, I want to see which hack version the data came from, so that I know whether it matches my ROM.
4. As a maintainer, I want one command to refresh the data snapshot from the wiki, so that I can update when the hack releases a new version.
5. As a player, I want regional forms (e.g. Alolan Vulpix) to be selectable as their own Species, so that I can use them like any other catch.

### Box
6. As a player, I want to add a Box Entry by searching for a Species by name, so that I can record what I've caught quickly.
7. As a player, I want to optionally set a Box Entry's current level, so that the app knows which level-up moves it already knows.
8. As a player, I want to edit a Box Entry's level or Species (e.g. after it evolves), so that the Box stays accurate as I play.
9. As a player, I want to remove a Box Entry, so that the Box reflects Pokémon I've released or traded.
10. As a player, I want to own duplicates of a Species as separate Box Entries, so that two Marill with different levels can both be tracked.
11. As a player, I want to set my playthrough's Difficulty (Normal or Hard, default Normal), so that future Boss Checks use the right Boss parties.

### Teams
12. As a player, I want to create several named Teams, so that I can compare options (e.g. "vs Clair" and "Elite Four").
13. As a player, I want to rename, duplicate and delete Teams, so that I can iterate on ideas.
14. As a player, I want to add up to six Team Members to a Team, so that it mirrors an in-game party.
15. As a player, I want the app to stop me adding a seventh Team Member, so that the Team stays legal.
16. As a player in Box Mode, I want to pick Team Members only from my Box Entries and their Planned Evolutions, so that I plan with what I can actually use.
17. As a player in Dex Mode, I want to pick any Species, legendaries included, so that I can theorycraft freely.
18. As a player, I want to switch between Box Mode and Dex Mode, so that I can move between planning and theorycrafting.
19. As a player, I want every evolution branch of a Box Entry offered as a Planned Evolution, labelled with its method (e.g. "Lv 36", "Water Stone"), so that I can plan around final forms, including branching lines like Eevee.
20. As a player, I want a Planned Evolution to be clearly marked as such on the Team, so that I remember it hasn't evolved yet.
21. As a player, I want to choose up to four moves for each Team Member, so that coverage reflects what it will actually use.
22. As a player, I want the move picker to list every move the Species can learn (level-up, TM/HM, tutor, egg), each labelled with its source, so that I know how to get it.
23. As a player, I want level-up moves above my Box Entry's current level flagged (not hidden), so that I can see what's coming soon.
24. As a player, I want to see each move's type, category, power and accuracy in the picker, so that I can choose sensibly.
25. As a player, I want to choose a Team Member's Ability from its regular and hidden abilities, so that ability effects are included in the Critique.
26. As a player, I want to see a Team Member's Innates, so that I know which always-on effects are being counted.
27. As a player, I want to toggle Mega on a Team Member whose Species has a Mega, so that the Critique uses the Mega's typing, stats and ability.
28. As a player, I want the app to allow at most one Mega toggled per Team, so that it matches the one-Mega-per-battle rule.
29. As a player, I want to remove or reorder Team Members, so that I can adjust the Team easily.

### Critique: Defensive Coverage
30. As a player, I want a per-attacking-type breakdown of how many Team Members are weak to it, resist it or are immune to it, so that I can see the Team's defensive shape at a glance.
31. As a player, I want Stacked Weaknesses (three or more members weak to a type) flagged, so that one attacking type can't sweep my Team.
32. As a player, I want Unanswered Types (someone is weak, nobody resists or is immune) flagged, so that I know where I have no safe switch-in.
33. As a player, I want 4× weaknesses shown prominently on their own, so that I notice especially fragile members, even though they count once in the other rules.
34. As a player, I want Innates and the chosen Ability included in Defensive Coverage (e.g. Levitate means Ground immunity, Thick Fat halves Fire and Ice), so that the analysis matches real battles.
35. As a player, I want abilities the app doesn't recognise to have no effect on type matchups, so that the app never overstates my defences.

### Critique: Offensive Coverage
36. As a player, I want to see, for each defending type, the best effectiveness my Team's moves achieve against it, so that I know what I can hit hard.
37. As a player, I want defending types I can't hit super-effectively flagged, so that I know my coverage gaps.
38. As a player, I want defending types I can only hit at reduced damage flagged, so that I know which matchups are hopeless.
39. As a player, I want only damaging moves with power above 0 counted, so that status, fixed-damage and OHKO moves don't distort coverage.
40. As a player, I want type-changing abilities (Pixilate, Refrigerate, Aerilate, Galvanize) applied to my Team Members' moves, so that a Pixilate Innate's Normal moves count as Fairy.
41. As a player, I want Scrappy and Tinted Lens reflected in Offensive Coverage, so that those effects aren't ignored.
42. As a player, I want each covered type traced back to the Team Member and move that covers it, so that I understand where my coverage comes from.

### Critique: Stat Roles
43. As a player, I want each Team Member labelled with its Stat Role(s), physical, special or mixed attacker, Fast, and Tank, derived from base stats, so that I can see the Team's makeup.
44. As a player, I want the Critique to flag a Team that is all physical or all special, so that a single defensive answer can't wall it.
45. As a player, I want the Critique to flag a Team with no Fast members, so that I'm warned about being outsped across the board.
46. As a player, I want Mega-toggled members' Stat Roles to use Mega stats, so that the roles are accurate.

### Suggestions
47. As a player, I want Suggestions ranked by how many Critique problems they fix, so that the most useful additions come first.
48. As a player, I want Suggestions that would add a new Stacked Weakness ranked down or excluded, so that fixing one hole doesn't open another.
49. As a player, I want each Suggestion to state which problems it fixes (e.g. "fixes: Ground Stacked Weakness, Dragon Unanswered Type"), so that I trust and understand it.
50. As a player, I want each Suggestion to name the specific moves that provide its offensive fixes, so that I know what to teach it.
51. As a player in Box Mode, I want Suggestions drawn only from my Box Entries and their Planned Evolutions, so that they're actionable now.
52. As a player in Dex Mode, I want Suggestions drawn from every Species, so that I can discover what to go catch.
53. As a player, I want to add a Suggestion to my Team in one action, so that trying it out is quick.
54. As a player, I want Suggestions to work when my Team has fewer than six members (fill an empty slot) and when it's full (replace a member), so that they're useful at every stage.

### Persistence
55. As a player, I want my Box, Teams, mode and Difficulty saved automatically, so that closing the browser loses nothing.
56. As a player, I want to export all my data to a JSON file, so that I have a backup if browser storage is cleared.
57. As a player, I want to import a previously exported JSON file, so that I can restore or move my data.
58. As a player, I want imported or saved data that references Species or moves missing from the current data snapshot flagged clearly, so that a hack update doesn't silently corrupt my Teams.
59. As a player, I want saved data to record the data version it was built on, so that mismatches can be detected.

## Implementation Decisions

- **Stack**: TypeScript single-page app built with Vite and React. No backend.
- **Data source (ADR 0001)**: the wiki's JSON files (species, species details, species meta, moves, abilities, machines, encounters, trainers) are vendored into the repo by a fetch script, which records the hack version (v1.2.1 currently). All identifiers are the hack's constants (`SPECIES_*`, `MOVE_*`, `ABILITY_*`, `TYPE_*`). Encounters and trainers are vendored now for v2, even though v1 doesn't use them.
- **Type chart**: the standard Gen 6+ 18-type chart, embedded in the app. It was checked against the hack's source and found unchanged. The `None`, `Mystery` and `Stellar` types are ignored.
- **Ability effects table**: a hand-curated table mapping ability constants to their type-matchup effects:
  - defensive immunity to a type (Levitate, Flash Fire, Water Absorb, Volt Absorb, Sap Sipper, Lightning Rod, Storm Drain, Motor Drive, Dry Skin, Earth Eater, Well-Baked Body, and so on),
  - defensive damage multiplier for a type (Thick Fat, Heatproof, Water Bubble, Purifying Salt, and so on),
  - offensive type conversion for Normal moves (Pixilate, Refrigerate, Aerilate, Galvanize),
  - offensive ability to hit Ghost (Scrappy),
  - resisted hits treated as neutral (Tinted Lens).
  
  Building the table includes one pass over Soulgold's ability list to catch hack-specific abilities that affect type matchups. Abilities not in the table have no effect. Innates and the chosen Ability are both applied.
- **Domain layer (the single seam)**: one module between the UI and everything else. Its responsibilities:
  - Load the data snapshot and expose lookups: Species search, learnable moves with source labels, Planned Evolution options with method labels, and Mega availability.
  - Manage the Box (Box Entries with optional level), Teams (named, up to six Team Members), Box Mode / Dex Mode, and Difficulty.
  - Enforce rules: six Team Members at most, four moves each, at most one Mega per Team, and in Box Mode only Box-derived Species.
  - `critique(team)` returns a Critique with these sections:
    - Defensive Coverage: per-type counts of weak, resist and immune members; Stacked Weaknesses; Unanswered Types; 4× weaknesses.
    - Offensive Coverage: per defending type, the best multiplier with the Team Member and move that achieves it; types with no super-effective hit; types hit only at reduced damage.
    - Stat Roles per member, plus balance flags (all physical, all special, no Fast member).
  - `suggest(team)` returns a ranked list of Suggestions. Each has a Species, proposed moves, the Critique problems it fixes, and whether it fills an empty slot or replaces a specific member.
  - Export and import of all saved data as versioned JSON, with checks for references the current data snapshot doesn't have.
  - Storage is passed in as an adapter (browser storage in the app, in-memory in tests).
- **Critique rules**:
  - Stacked Weakness means three or more members weak to a type.
  - Unanswered Type means one or more members weak, with zero resisting or immune.
  - A 4× weakness counts once towards both rules but is reported separately.
- **Offensive Coverage rules**: only moves with category physical or special and power above 0 count. Moves whose type varies (Hidden Power, Weather Ball) use their listed type.
- **Stat Role rules**, based on base stats:
  - Physical or special attacker when one of Attack and Special Attack is noticeably higher than the other; mixed when they're close.
  - Fast when Speed is 100 or more.
  - Tank when combined HP, Defense and Special Defense is high.
  
  The exact thresholds live in one place so they can be tuned.
- **Suggestion ranking**: the primary key is the number of Critique problems fixed. A candidate that adds a new Stacked Weakness is penalised. Ties are broken by fewest new weaknesses introduced. Moves are proposed from the candidate's learnable moves to cover the gaps it's credited with.
- **Megas**: a toggle on a Team Member whose Species has a Mega in the data. When on, the Mega's typing, base stats and ability replace the base Species' for the Critique.
- **Saved data shape**: one Box per app (the current playthrough), several Teams, the current mode, Difficulty, and the data version.
- **UI**: a thin layer over the domain layer, with these views: Box management, Team list, Team editor (member picker, move picker, Ability picker, Mega toggle), the Critique panel, the Suggestions panel, the mode toggle, and export/import.

## Testing Decisions

- **One seam**: all tests go through the domain layer's public interface. The type chart, ability effects table, Stat Role thresholds and data parsing are internals, tested only through their effect on Critiques, Suggestions and lookups.
- **Real data**: tests run against the actual vendored Soulgold snapshot, not hand-written fixtures, so data quirks (Innates, regional forms, Megas, constant naming) are tested.
- **Good tests check behaviour you can see**. Examples:
  - A Team containing several Rock-weak members reports Rock as a Stacked Weakness.
  - Marill's Thick Fat Innate counts as an Ice and Fire resistance.
  - Typhlosion is offered as a Planned Evolution of a Cyndaquil Box Entry, with its method label.
  - All of Eevee's branches are offered.
  - A seventh Team Member or a second Mega is rejected.
  - A Pixilate member's Normal move counts as Fairy coverage.
  - A Suggestion that fixes an Unanswered Type lists that problem as its reason.
  - Export followed by import round-trips.
  - An import referencing an unknown Species is flagged.
- **Storage**: tests use an in-memory storage adapter.
- **UI**: not unit-tested in v1.
- **Prior art**: none; this is a greenfield repo. These tests set the pattern.

## Out of Scope

- **Boss Checks (v2)**, designed ahead, not built:
  - Bosses are gym leaders including rematches and Title Defense, the Elite Four, Champion Lance, rivals, Team Rocket executives, and a short hand-maintained list of named specials.
  - Bosses are filtered by Difficulty, with Boss Versions grouped behind a picker that defaults to the version closest to the Box's highest level.
  - The per-Pokémon check uses the Boss's actual moves, Innates and Ability.
  
  v1 must not prevent this: vendor the trainer data, and keep the type chart and ability effects reusable for a Boss Check.
- Damage calculation (natures, EVs, IVs, items, weather, field effects).
- Tracking which TMs and tutors have been unlocked, and gating Species by story progress or location.
- Reading emulator save files to fill in the Box.
- Nuzlocke rules (first encounter only, dupes clause, deaths).
- Held items, natures, EVs and IVs on Team Members.
- Multiple playthroughs or Boxes.
- Fully automatic generation of a Team from scratch.
- Battle Frontier sets.

## Further Notes

- The domain vocabulary is in `GLOSSARY.md`; use it throughout code and UI (Box Entry, Team Member, Stacked Weakness, Unanswered Type, Box Mode, Dex Mode, and so on).
- The hack's dex numbering is a custom regional order (702 unique numbers, 959 species entries including forms and Megas). Don't assume National Dex numbers.
- Species details are one JSON file per Species. Vendor them all so the app works offline.
- The type chart was checked against `src/data/types_info.h` in `Eemeliri/soulgold`. Recheck it when refreshing the data for a new hack version.
