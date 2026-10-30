# 07: Mega toggle

**What to build:** A Team Member whose Species has a Mega in the data can have Mega toggled on. While it's on, the Critique uses the Mega's typing, base stats and ability for Defensive Coverage, Offensive Coverage effects and Stat Roles. At most one Mega can be toggled per Team.

**Blocked by:** 03 (Innates and Abilities in Defensive Coverage), 06 (Stat Roles).

**Status:** ready-for-agent

- [ ] The Mega toggle appears only for Species that have a Mega in the data
- [ ] Toggling on swaps in the Mega's typing, base stats and ability for the Critique
- [ ] A second Mega on the same Team is rejected by the domain layer and prevented in the UI
- [ ] Tests through the domain layer, e.g. toggling a Mega that changes typing changes Defensive Coverage; a second Mega is rejected
