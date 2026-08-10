# Knowledge model audit

> Global contract for terminology, taxonomy, metadata, relations, and the editorial review queue.

- PASS — search terminology dictionary (296ms): `npm run test:search`
- PASS — canonical topic registry (247ms): `npm run test:topics`
- PASS — explicit classification contract (473ms): `npm run gate:classification`
- PASS — curated content relations (272ms): `npm run test:relations`
- PASS — content lifecycle inventory (503ms): `npm run audit:lifecycle`
- PASS — content governance queue (126ms): `npm run build:governance-queue`
