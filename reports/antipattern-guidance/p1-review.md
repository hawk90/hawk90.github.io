# P1 guidance review

P1 후보는 원문 지침과 canonical AP의 범위가 일치하는 경우에만 연결한다. 나머지는 관련 ID를 참고용으로만 기록하고 새 ID 발급은 보류한다.

| 원문 지침 | 결정 | 근거·관련 ID |
| --- | --- | --- |
| Build Stability by Increasing Heap > 추천 | `linked-candidate` | `AP-P-02 Heap Expansion as Optimization`과 문제 정의가 일치한다. 기존 AP에 원문 운영 예산 지침을 보조 근거로 연결한다. |
| 검색 실패 Fallback | `linked-candidate` | `AP-D-10-2 검색 실패 fallback`과 제목·범위가 일치한다. |
| Migration Avoidance > 권장 | `related-only` | `AP-M-12`, `AP-M-13`, `AP-M-14`, `AP-M-18`이 세부 실패 모드를 다루지만 상위 지침 전체와 동일하지 않다. |
| 작성일·수정일·검증일이 혼동됨 | `related-only` | `AP-C-04-2`, `AP-T-74`, `AP-R-38`과 연관되지만 원문은 표시·운영 모델 전체를 다룬다. |
| 모든 검증을 E2E 테스트로 해결 | `related-only` | `AP-T-01`, `AP-T-18`과 연관되지만 원문은 테스트 계층 설계 지침이다. |
| 최신 CSS 기능의 Fallback 미검토 | `related-only` | `AP-R-33`과 연관되지만 원문은 CSS 기능 호환성 범위다. |
| CSS Drift Under Utility Composition > 권장 | `related-only` | 기존 CSS 관련 AP와 직접 일치하지 않아 새 ID 발급을 보류한다. |
| 페이지 단위 디자인 > 권장 방향 | `related-only` | UI 구조·디자인 시스템 지침이며 단일 canonical AP로 축약하지 않는다. |
| Article 품질 검사 | `guidance-only` | 품질 검사 절차이지 그 자체가 anti-pattern은 아니다. |
| 정기 품질 검사 | `guidance-only` | 운영 통제 지침이다. |
| F-19 검색 색인 품질 검사 | `guidance-only` | 검색 회귀 검사 절차다. |
| 38. 문장 품질 자동 검사 | `guidance-only` | 자동 검사 절차다. |
| Sprint 2 대표 문서 선정과 검증 | `guidance-only` | 실행 로드맵이다. |
| 권장 계층 | `guidance-only` | 테스트 피라미드 설계 지침이다. |

## 적용 원칙

- `linked-candidate`도 기존 원문 보존을 위해 canonical 본문을 수정하지 않고 traceability만 추가한다.
- `related-only`는 중복·의미 손실 위험 때문에 자동 merge하지 않는다.
- `guidance-only`는 AP 개수에 포함하지 않는다.
