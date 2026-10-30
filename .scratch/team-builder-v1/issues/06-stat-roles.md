# 06: Stat Roles

**What to build:** Each Team Member is labelled with its Stat Roles from base stats: physical, special or mixed attacker; Fast; and Tank. The Critique flags a Team that is all physical, all special, or has no Fast member. The thresholds live in one place so they can be tuned.

**Blocked by:** 02 (Defensive Coverage from typings), which introduces the Critique panel.

**Status:** ready-for-agent

- [ ] Attacker role: physical or special when one of Attack and Special Attack is noticeably higher, mixed when they're close
- [ ] Fast when base Speed is 100 or more; Tank when combined HP, Defense and Special Defense is high
- [ ] Roles are shown on each Team Member
- [ ] The Critique flags all physical, all special, and no Fast member
- [ ] Thresholds are defined in one place
- [ ] Tests through the domain layer, e.g. a Team of only physical attackers is flagged; adding a Fast special attacker clears both flags
