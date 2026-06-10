# Task Templates

Templates used to auto-populate project task groups. Each template defines groups and tasks for a specific scope of work.

---

## Category: SOW — Lift Installation

### Template 1: Partial Modernisation

#### Machine Room
1. Replace traction machine (gearless)
2. Replace main switch
3. Replace machine beam
4. Replace controller
5. Replace drive
6. Rewire machine room (controller related)
7. Replace governor
8. Replace UPS
9. Replace ARD

#### Car Cage
10. Replace car door operator
11. Install load weighting device
12. Replace ventilation fans
13. Replace COP faceplate
14. Replace car indicator
15. Replace car call button
16. Replace intercom (car & machine room)
17. Install CCTV cabling (car to motor room)
18. Replace door sensor / detector
19. Replace car top junction box

#### Landing
20. Replace landing indicator
21. Replace landing call button
22. Replace landing hall faceplate
23. Install firemen switch (firemen lift only)

#### Hoistway
24. Replace travelling cables
25. Replace main traction ropes
26. Replace governor rope
27. Rewire shaft wiring
28. Replace pit lighting
29. Replace shaft information / inductor switches

---

### Template 2: New Installation

> Tasks to be defined.

---

### Template 3: Total Replacement

> Tasks to be defined.

---

## Adding New Templates

To add a new template:
1. Add a `### Template N: <Name>` section under the relevant category
2. Define groups with `#### <Group Name>` headings
3. List tasks as numbered items under each group
4. Update the frontend template data in `frontend/src/data/taskTemplates.js`
