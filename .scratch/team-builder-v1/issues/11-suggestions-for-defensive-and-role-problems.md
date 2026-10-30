# 11: Suggestions for defensive and role problems

**What to build:** A Suggestions panel proposes Species that fix the current Team's Defensive Coverage problems (Stacked Weaknesses, Unanswered Types) and Stat Role imbalances. In Box Mode candidates come from Box Entries and their Planned Evolutions; in Dex Mode, from every Species. Suggestions either fill an empty slot or replace a specific Team Member. They are ranked by number of problems fixed; a candidate that adds a new Stacked Weakness is penalised, and ties go to the fewest new weaknesses introduced. Each Suggestion states which problems it fixes, and the player can add it to the Team in one action.

**Blocked by:** 03 (Innates and Abilities in Defensive Coverage), 06 (Stat Roles), 09 (Box, Box Mode and Planned Evolutions).

**Status:** ready-for-agent

- [ ] Candidate pool follows Box Mode / Dex Mode
- [ ] Suggestions work for Teams with fewer than six members (fill a slot) and full Teams (replace a named member)
- [ ] Ranking follows the spec: problems fixed, penalty for a new Stacked Weakness, tie-break on new weaknesses
- [ ] Each Suggestion lists the problems it fixes (e.g. "fixes: Ground Stacked Weakness, Dragon Unanswered Type")
- [ ] One-action add or replace from a Suggestion
- [ ] Tests through the domain layer, e.g. a Team with an Unanswered Type gets a top Suggestion that resists that type and lists it as a reason; in Box Mode no Suggestion comes from outside the Box
