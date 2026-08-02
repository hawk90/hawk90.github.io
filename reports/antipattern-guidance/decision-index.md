# Original guidance decision index

원본 guidance 437개 중 canonical AP에 자동 연결되지 않은 34개 후보의 검토 상태를 합친 인덱스다.

| Priority | Reviewed | Decision |
| --- | ---: | --- |
| P0 | 1 | 1 new-candidate (canonical 발급 보류) |
| P1 | 7 | 2 linked-candidate, 5 related-only |
| P2 | 26 | 23 related-only, 3 guidance-only |
| **합계** | **34** | **미검토 0** |

## 의미

- `linked-candidate`: 기존 canonical AP와 범위가 일치하지만 원본 추적성을 보존하기 위해 별도 연결 검토를 남긴다.
- `related-only`: 기존 AP와 연관되지만 의미 범위가 다르므로 자동 병합하지 않는다.
- `new-candidate`: 기존 AP와 동일하지 않아 새 항목 후보로 보류한다.
- `guidance-only`: anti-pattern이 아닌 실행·검사·검색 지침이므로 AP 카탈로그에 넣지 않는다.

세부 결정은 [p0-review.md](p0-review.md), [p1-review.md](p1-review.md), [p2-review.md](p2-review.md)에 있다.
고신뢰·관련 항목의 additive 연결은 [traceability.json](traceability.json)에 있다.
