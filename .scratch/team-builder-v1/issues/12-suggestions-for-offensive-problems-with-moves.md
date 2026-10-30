# 12: Suggestions for offensive problems, with proposed moves

**What to build:** Suggestions also get credit for fixing Offensive Coverage gaps: types the Team can't hit super-effectively, or can only hit at reduced damage. Each Suggestion names the specific learnable moves that provide its offensive fixes, taking attack-changing abilities into account. Adding the Suggestion pre-fills those moves.

**Blocked by:** 05 (Attack-changing abilities in Offensive Coverage), 11 (Suggestions for defensive and role problems).

**Status:** ready-for-agent

- [ ] Offensive Coverage gaps count as problems in Suggestion ranking
- [ ] Each Suggestion lists proposed moves from its learnable moves, tied to the gaps they fix
- [ ] Attack-changing abilities (e.g. Pixilate) are considered when crediting moves
- [ ] Adding a Suggestion pre-fills its proposed moves on the new Team Member
- [ ] Tests through the domain layer, e.g. a Team with no answer to Dragon gets a Suggestion with a named Ice, Dragon or Fairy move, and the reason lists the Dragon gap
