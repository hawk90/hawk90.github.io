# Anti-pattern guidance bundle

원본 HTML에 있던 “어떻게 할지” 지침과 anti-pattern traceability를 LLM이 안전하게 읽기 위한 번들이다.

## 읽기 순서

1. [`decision-index.md`](decision-index.md) — 전체 검토 상태와 disposition
2. [`traceability.json`](traceability.json) — canonical AP와 원본 지침의 additive 연결
3. [`latest.md`](latest.md) — 437개 guidance 섹션의 자동 라우팅 결과
4. [`p0-review.md`](p0-review.md), [`p1-review.md`](p1-review.md), [`p2-review.md`](p2-review.md) — 우선순위별 의미 검토
5. [`original-guidance.md`](../../archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/original-guidance.md) — 원문 지침
6. [`page.html`](../../archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/page.html) — 손실 없는 원본

## LLM 처리 규칙

- 원본 HTML과 전체 대화가 최우선이다.
- `linked-candidate`는 기존 AP와의 연결 후보이지 본문 병합 승인이 아니다.
- `related-only`는 참고 링크로만 사용하고 자동 merge하지 않는다.
- `guidance-only`는 anti-pattern 개수에 포함하지 않는다.
- 사실·기술 의미·시각 품질·콘텐츠 문장은 구조 검사만으로 확정하지 않는다.
- 모든 실제 변경은 `진단 → 근거 → 조치 → 검증 → 잔여 위험`을 기록한다.

## 재생성·감사

```bash
npm run restore:antipattern-guidance
npm run audit:antipattern-guidance-links
```

생성기는 원본 HTML과 전체 대화의 SHA-256을 기록하며, 원본과 사이트 콘텐츠를 수정하지 않는다.
