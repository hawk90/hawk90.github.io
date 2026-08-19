# Knowledge model audit

> Global contract for terminology, taxonomy, metadata, relations, and the editorial review queue.

- PASS — search terminology dictionary (315ms): `npm run test:search`
- PASS — canonical topic registry (272ms): `npm run test:topics`
- PASS — explicit classification contract (558ms): `npm run gate:classification`
- PASS — curated content relations (296ms): `npm run test:relations`
- PASS — content lifecycle inventory (548ms): `npm run audit:lifecycle`
- PASS — content governance queue (137ms): `npm run build:governance-queue`
