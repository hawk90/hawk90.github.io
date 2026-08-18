# Knowledge model audit

> Global contract for terminology, taxonomy, metadata, relations, and the editorial review queue.

- PASS — search terminology dictionary (308ms): `npm run test:search`
- PASS — canonical topic registry (275ms): `npm run test:topics`
- PASS — explicit classification contract (530ms): `npm run gate:classification`
- PASS — curated content relations (285ms): `npm run test:relations`
- PASS — content lifecycle inventory (532ms): `npm run audit:lifecycle`
- PASS — content governance queue (136ms): `npm run build:governance-queue`
