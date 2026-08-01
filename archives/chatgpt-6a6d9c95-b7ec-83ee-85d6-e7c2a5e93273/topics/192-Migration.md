---
title: "Migration"
source_message: 33
source_role: assistant
---

# Migration

## M-11. Forever Backward Compatibility

### 모든 과거 형식을 영원히 지원

### 증상

```ts
post.data.date ?? post.data.published ?? post.data.pubDate
```

### 문제

렌더링 코드가 데이터 역사 전체를 책임진다.

### 개선

한 번 migration하고 오래된 필드 지원을 제거한다.

---

## M-12. Big-Bang Migration

### 수백 개 글을 한 번에 완벽히 바꾸려 함

### 문제

- 변경량이 지나치게 큼
- 검토 불가능
- 중간 상태가 없음
- 실패 시 되돌리기 어려움

### 개선

대표 글, 유입 상위 글, 현재 Topic 순으로 단계적으로 진행한다.

---

## M-13. Migration Without Dry Run

### migration 실행 즉시 파일 수정

### 문제

예상치 못한 대량 변경이 발생한다.

### 개선

```text
analyze
dry-run
report
apply
validate
```

단계를 분리한다.

---

## M-14. Migration Without Idempotency

### 같은 migration을 두 번 실행하면 결과가 달라짐

### 문제

CI나 로컬에서 반복 실행하기 어렵다.

### 개선

migration은 여러 번 실행해도 동일 결과가 나오게 만든다.

---

## M-15. Migration Without Backup Boundary

### 자동 수정 전에 변경 범위를 보존하지 않음

### 개선

Git branch 또는 명확한 commit boundary에서 실행하고 한 migration당 한 commit을 유지한다.

---

## M-16. Semantic Migration by Regex

### 정규식만으로 Markdown 의미 구조 변경

### 문제

코드 블록, front matter, 링크, 수식 안의 문자열까지 잘못 수정할 수 있다.

### 개선

구조 변경은 parser 기반으로 처리하고 regex는 단순한 안전한 변경에만 사용한다.

---

## M-17. Path Migration Without Redirects

### 파일과 URL을 이동했지만 redirect 없음

### 문제

외부 링크와 검색 유입이 깨진다.

### 개선

이전 slug map을 유지하고 최종 URL로 직접 redirect한다.

---

## M-18. Migration Without Validation

### 수정 후 build만 성공하면 완료로 간주

### 문제

의미가 잘못됐지만 문법상 정상일 수 있다.

### 개선

- 스키마 검사
- 링크 검사
- diff 통계
- 샘플 렌더링
- 이전/이후 manifest 비교

를 수행한다.

---
