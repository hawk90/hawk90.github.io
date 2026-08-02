# Knowledge model audit

> Global contract for terminology, taxonomy, metadata, relations, and the editorial review queue.

- PASS — search terminology dictionary (303ms): `npm run test:search`
- PASS — canonical topic registry (279ms): `npm run test:topics`
- PASS — explicit classification contract (580ms): `npm run gate:classification`
- PASS — curated content relations (286ms): `npm run test:relations`
- PASS — content lifecycle inventory (523ms): `npm run audit:lifecycle`
- PASS — content governance queue (120ms): `npm run build:governance-queue`
