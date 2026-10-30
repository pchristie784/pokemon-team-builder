# 09: Box, Box Mode and Planned Evolutions

**What to build:** A player records their catches as Box Entries: search a Species, optionally set a current level, edit or remove entries, with duplicates allowed. In Box Mode, Team Members can only be chosen from Box Entries and their Planned Evolutions. Dex Mode keeps the current behaviour of allowing any Species. Every evolution branch of a Box Entry is offered as a Planned Evolution labelled with its method (e.g. "Lv 36", "Water Stone"), and Planned Evolutions are marked as such on the Team. In the move picker, level-up moves above the Box Entry's current level are flagged, not hidden.

**Blocked by:** 04 (Moves and Offensive Coverage), 08 (Saved Teams and settings).

**Status:** ready-for-agent

- [ ] Add, edit (Species and level) and remove Box Entries; duplicates of a Species are separate entries
- [ ] Box Mode / Dex Mode toggle, saved with other state
- [ ] In Box Mode, only Box Entries and their Planned Evolutions can become Team Members
- [ ] All evolution branches are offered with method labels (e.g. every Eevee branch)
- [ ] Planned Evolutions are visibly marked on the Team
- [ ] Level-up moves above the Box Entry's level are flagged in the move picker
- [ ] Tests through the domain layer, e.g. a Cyndaquil Box Entry offers Typhlosion with its method; Eevee offers all branches; in Box Mode a Species not in the Box is rejected
