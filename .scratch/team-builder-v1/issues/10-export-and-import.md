# 10: Export and import

**What to build:** A player exports all their data (Box, Teams, mode, Difficulty and data version) to a JSON file and imports it again to restore or move it. Saved or imported data that refers to Species or moves missing from the current data snapshot is clearly flagged, so a hack update can't silently corrupt Teams.

**Blocked by:** 09 (Box, Box Mode and Planned Evolutions).

**Status:** ready-for-agent

- [ ] Export downloads all data as versioned JSON
- [ ] Import restores it, replacing current state after confirmation
- [ ] References to unknown Species or moves are flagged, with the affected Teams and Box Entries identified
- [ ] A data version mismatch is surfaced to the player
- [ ] Tests through the domain layer: export then import round-trips; an import with an unknown Species constant is flagged
