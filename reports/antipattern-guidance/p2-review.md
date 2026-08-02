# P2 guidance review

현재 P2 후보 26개는 원문 상위 경로를 기준으로 triage했다.

| 분류 | 수 | 처리 |
| --- | ---: | --- |
| `related-only` | 23 | 상위 핵심 안티패턴의 실행 지침으로 보존. canonical ID를 새로 만들거나 자동 merge하지 않음. |
| `guidance-only` | 3 | anti-pattern이 아닌 일반 운영·검색·품질 지침으로 AP 카탈로그에서 제외. |

## Related-only 범위

다음 상위 anti-pattern의 `권장`, `추천`, `권장 모델` 섹션은 해당 parent의 실행 지침으로 취급한다.

- 테마·관리자·통합 경계
- Content Model Drift
- Client-Side Full-Text Index / Search Index as a Dump
- Internal Link Underuse / Tag Vocabulary Drift / Date Ambiguity
- Dependency Residue / Documentation and Implementation Divergence
- Content Processing Pipeline / Tailwind Semantic Loss / Component Proliferation
- Structured Data Without Content Model / Heavy Article Tail

이 섹션들은 독립 anti-pattern으로 중복 등록하지 않고, 원문 guidance 문서에서 parent 경로로 추적한다.

## Guidance-only 범위

- `19.2 콘텐츠 감사 자동화`
- `14. 중복 콘텐츠 사전 검사`
- `“어떻게” 질문`

이 세 항목은 실행·검색·검사 절차이며 anti-pattern 자체가 아니다.

## 결정

P2에서는 새 canonical ID를 발급하지 않는다. 콘텐츠 본문과 기존 AP 문서는 변경하지 않고, 원본 guidance와 traceability report만 유지한다.
