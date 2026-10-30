# 08: Saved Teams and settings

**What to build:** A player can keep several named Teams and create, rename, duplicate and delete them. Everything is saved automatically to browser storage and survives a page reload. The playthrough's Difficulty (Normal or Hard, default Normal) is stored for the future Boss Check. Saved data records the data version it was built on.

**Blocked by:** 01 (Data snapshot and Dex Mode Team).

**Status:** ready-for-agent

- [ ] Create, rename, duplicate and delete named Teams
- [ ] All state saves automatically through the storage adapter (browser storage in the app) and is restored on reload
- [ ] Difficulty setting, defaulting to Normal, is stored
- [ ] Saved data includes the data version
- [ ] Tests through the domain layer with the in-memory adapter: state survives a reload of the domain layer from the same store; duplicate creates an independent copy
