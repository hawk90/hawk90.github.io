# P1 guidance review

현재 P1 후보 7개에 대한 최종 triage다. 원문 본문은 변경하지 않는다.

| 원문 지침 | 결정 | 근거·관련 ID |
| --- | --- | --- |
| Build Stability by Increasing Heap > 추천 | `linked-candidate` | `AP-P-02 Heap Expansion as Optimization`과 문제 정의가 일치한다. |
| 검색 실패 Fallback | `linked-candidate` | `AP-D-10-2 검색 실패 fallback`과 제목·범위가 일치한다. |
| 최신 CSS 기능의 Fallback 미검토 | `related-only` | `AP-R-33 Custom Directive Without Fallback`과 연관되지만 CSS 호환성 범위가 더 넓다. |
| Migration Avoidance > 권장 | `related-only` | `AP-M-12`, `AP-M-13`, `AP-M-14`, `AP-M-18`이 세부 실패 모드를 다루지만 상위 지침 전체와 동일하지 않다. |
| 모든 검증을 E2E 테스트로 해결 | `related-only` | `AP-T-01 Build Success Equals Correctness`, `AP-T-18 Full Build Only Test`와 연관되지만 테스트 계층 설계 지침이다. |
| 작성일·수정일·검증일이 혼동됨 | `related-only` | `AP-C-04-2`, `AP-T-74`, `AP-R-38`과 연관되지만 날짜 운영 모델 전체를 다룬다. |
| CSS Drift Under Utility Composition > 권장 | `related-only` | 기존 CSS 관련 AP와 직접 동일하지 않아 새 ID 발급을 보류한다. |

## 적용 원칙

- `linked-candidate`는 기존 canonical 본문을 수정하지 않고 traceability만 추가한다.
- `related-only`는 의미 손실 위험 때문에 자동 merge하지 않는다.
- 검사·회귀 절차는 AP 개수에 포함하지 않고 `guidance-only`로 유지한다.
