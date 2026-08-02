# P0 guidance review

## Audit Without Remediation Workflow

- Source: `conversation.full.md:6975` / `original-guidance.md` section 211
- Disposition: `new-candidate`
- Canonical ID: none assigned
- Related canonical IDs: `AP-P-04`, `AP-D-63`, `AP-D-85`

### Decision

이 항목은 감사 결과를 출력하지만 `severity`, `confidence`, `owner`, `suggested fix`, `automatic fixability`, `affected pages`, `priority score`를 갖는 수정 흐름이 없다는 문제를 다룬다.

기존 관련 항목과는 다음처럼 다르다.

- `AP-P-04`는 모든 감사를 release blocker로 만드는 문제다.
- `AP-D-63`은 자동 수정이 기본값인 문제다.
- `AP-D-85`는 owner가 없는 문제다.

따라서 기존 ID로 병합하면 원문의 범위가 손실된다. 새 canonical ID를 즉시 발급하지 않고, 원본 추가 후보로 유지한다.

### Required remediation contract

감사 결과는 최소한 다음 필드를 가져야 한다.

```text
severity
confidence
owner
suggestedFix
automaticFixability
affectedPages
priority
disposition
verification
```

`ERROR`만 release blocker로 취급하고, `WARNING`과 `INFO`는 owner와 다음 조치를 가진 큐로 남긴다. 자동 수정은 dry-run과 명시적 승인을 거친 경우에만 허용한다.

### Verification

- audit 결과에 위 필드가 누락되지 않는가
- 결과마다 owner 또는 명시적 deferred 사유가 있는가
- release blocker가 severity 정책과 일치하는가
- 동일 결과를 재실행해도 중복 큐가 생성되지 않는가
- `suggestedFix`와 실제 수정 커밋을 추적할 수 있는가
