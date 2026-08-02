# Knowledge model audit

> Global contract for terminology, taxonomy, metadata, relations, and the editorial review queue.

- PASS — search terminology dictionary (306ms): `npm run test:search`
- PASS — canonical topic registry (281ms): `npm run test:topics`
- PASS — explicit classification contract (552ms): `npm run gate:classification`
- PASS — curated content relations (281ms): `npm run test:relations`
- PASS — content lifecycle inventory (463ms): `npm run audit:lifecycle`
- PASS — content governance queue (118ms): `npm run build:governance-queue`
