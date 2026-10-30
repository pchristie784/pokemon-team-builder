# 04: Moves and Offensive Coverage

**What to build:** A player picks up to four moves for each Team Member from a picker listing every move the Species can learn (level-up, TM/HM, tutor, egg), each labelled with its source and showing type, category, power and accuracy. The Critique gains an Offensive Coverage section: for each defending type, the best multiplier the Team's moves achieve and the Team Member and move behind it, with flags for types the Team can't hit super-effectively and types it can only hit at reduced damage. Only physical or special moves with power above 0 count; moves whose type varies use their listed type.

**Blocked by:** 02 (Defensive Coverage from typings), which introduces the Critique panel.

**Status:** ready-for-agent

- [ ] Move picker lists all learnable moves for the Species with source labels (level-up with level, TM/HM, tutor, egg)
- [ ] Each move shows type, category, power and accuracy
- [ ] At most four moves per Team Member; a fifth is rejected
- [ ] Offensive Coverage shows the best multiplier per defending type, traced to the Team Member and move
- [ ] Types without a super-effective hit, and types hit only at reduced damage, are flagged
- [ ] Status moves and moves with no power (Seismic Toss, OHKO moves) are ignored
- [ ] Tests through the domain layer, e.g. a Team with only Normal moves flags Rock, Ghost and Steel; adding Earthquake covers Rock and Steel super-effectively
