# 02: Defensive Coverage from typings

**What to build:** For the current Team, a Critique panel shows Defensive Coverage: for each of the 18 attacking types, how many Team Members are weak to it, resist it or are immune to it. It flags Stacked Weaknesses, Unanswered Types and 4× weaknesses. This ticket uses typings only, with the standard Gen 6+ type chart embedded in the app (checked unchanged against the hack's source; ignore the None, Mystery and Stellar types). Abilities come in ticket 03.

**Blocked by:** 01 (Data snapshot and Dex Mode Team).

**Status:** ready-for-agent

- [ ] The Critique includes a per-attacking-type breakdown of weak, resist and immune member counts
- [ ] Stacked Weakness is flagged when three or more Team Members are weak to a type
- [ ] Unanswered Type is flagged when one or more Team Members are weak to a type and none resists it or is immune
- [ ] 4× weaknesses are reported separately and count once towards the two rules above
- [ ] The Critique panel updates as Team Members are added or removed
- [ ] Tests through the domain layer, e.g. a Team with several Rock-weak members reports a Rock Stacked Weakness; a Ground/Flying member is immune to Ground; a 4× weakness is reported
