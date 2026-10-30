# Pokémon Team Builder

A local tool for assembling and critiquing a well-balanced team for the Soulgold ROM hack, using the hack's own data.

## Language

### The game

**Soulgold**:
The specific expanded-Johto ROM hack (by Eemeliri) whose data this app uses. Not vanilla Pokémon SoulGold.
_Avoid_: SoulGold (vanilla), HGSS, the game

**Species**:
One selectable Pokémon entry from the hack's data, including regional forms (e.g. Alolan Vulpix is its own Species). Mega forms are not Species.
_Avoid_: Pokémon (ambiguous), mon, dex entry

**Innate**:
An always-active ability every Species has in Soulgold, in addition to its chosen Ability.
_Avoid_: passive, extra ability

**Ability**:
The one regular or hidden ability chosen for a Team Member; distinct from Innates.

**Mega**:
A battle-time transformation of a Species, modelled as a toggle on a Team Member rather than a Species of its own.
_Avoid_: Mega form, Mega species

### Teams

**Team**:
Up to six Team Members assembled for evaluation.
_Avoid_: party, roster, lineup

**Team Member**:
A Species plus up to four chosen moves, an optional Ability and an optional Mega toggle.
_Avoid_: slot, pick

**Box**:
The set of Species the player actually owns in their current playthrough; the pool Team Members are normally drawn from.
_Avoid_: collection, PC, owned list

**Box Entry**:
One owned Species in the Box, with an optional current level.
_Avoid_: caught Pokémon, owned mon

**Box Mode**:
Working mode where Team Members and Suggestions are drawn only from the Box (and their Planned Evolutions).
_Avoid_: filter on, playthrough mode

**Dex Mode**:
Working mode where any Species may be a Team Member or Suggestion.
_Avoid_: filter off, theorycraft mode, free mode

**Difficulty**:
The playthrough's Soulgold difficulty setting (Normal or Hard), which determines which Boss parties apply.

**Planned Evolution**:
A Team Member whose Species is a later evolution of a Box Entry, not yet evolved in-game.
_Avoid_: future form, target evolution

### Evaluation

**Defensive Coverage**:
How the Team as a whole takes hits from each attacking type, accounting for typings, Innates and chosen Abilities.
_Avoid_: resistances, weakness chart

**Stacked Weakness**:
An attacking type that three or more Team Members are weak to.
_Avoid_: shared weakness, team weakness

**Unanswered Type**:
An attacking type at least one Team Member is weak to, which no Team Member resists or is immune to.
_Avoid_: uncovered type, hole

**Offensive Coverage**:
Which defending types the Team's chosen damaging moves can hit for super-effective or neutral damage.
_Avoid_: type coverage (ambiguous), move coverage

**Stat Role**:
A Team Member's battle function derived from its base stats (e.g. physical attacker, special attacker, tank, fast sweeper).
_Avoid_: archetype, class

**Critique**:
The app's evaluation of a Team: its coverage gaps, stacked weaknesses and role imbalances.
_Avoid_: score (when meaning the whole report), analysis

**Suggestion**:
A candidate Species (and moves) proposed to fill a specific gap identified in a Critique.
_Avoid_: recommendation, auto-team

**Boss**:
A notable trainer whose party a Team can be checked against: gym leaders, Elite Four, Champion, rivals, Team Rocket executives, and a short list of named specials.
_Avoid_: opponent, enemy trainer

**Boss Version**:
One concrete party a Boss can field, for a given Difficulty and point in the game (e.g. Jasmine's first fight has three).
_Avoid_: variant, rematch (unless it is one)

**Boss Check**:
A per-Pokémon comparison of a Team against one Boss Version, using type matchups and the Boss's actual moves. Not a damage calculation.
_Avoid_: matchup sim, battle prediction
