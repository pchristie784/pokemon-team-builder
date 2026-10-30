# 01: Data snapshot and Dex Mode Team

**What to build:** A player opens the local app, searches for a Species by name (including regional forms like Alolan Vulpix), and adds up to six Team Members to a single Team, seeing each one's typing and Innates. The app shows which Soulgold data version it is using. This is the tracer bullet: project setup (Vite, React and TypeScript, plus a test runner), a fetch script that stores the wiki's JSON in the repo (species, species details, species meta, moves, abilities, machines, encounters, trainers), tagged with the hack version (see ADR 0001), and the domain layer that every later ticket extends, with storage passed in as an adapter (in-memory for tests). See spec: `.scratch/team-builder-v1/spec.md`.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] One command fetches the Soulgold JSON into the repo and records the hack version (v1.2.1); the app then runs fully offline
- [ ] All per-Species detail files are stored in the repo
- [ ] Species search by name returns matching Species, including regional forms as separate Species; Megas are not returned as Species
- [ ] A Team accepts up to six Team Members; adding a seventh is rejected by the domain layer and prevented in the UI
- [ ] Each Team Member shows its typing and Innates
- [ ] The data version is visible in the UI
- [ ] Domain-layer tests run against the real stored data with an in-memory storage adapter (search, regional form present, seventh-member rejection)
