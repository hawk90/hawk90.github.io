---
title: "Ticket S1-02. 콘텐츠 상태 enum 정의"
source_message: 53
source_role: assistant
---

# Ticket S1-02. 콘텐츠 상태 enum 정의

## 목적

오래된 글과 대표 글을 같은 방식으로 노출하지 않게 한다.

## 상태

```ts
export const CONTENT_STATUS = [
  "current",
  "needs-review",
  "historical",
  "superseded",
  "archived",
] as const;

export type ContentStatus =
  (typeof CONTENT_STATUS)[number];
```

## 의미

```text
current
현재도 유효하며 적극적으로 노출할 수 있음

needs-review
내용이나 환경을 다시 확인해야 함

historical
특정 과거 버전이나 당시 기록으로 가치가 있음

superseded
더 나은 신판 또는 통합 문서가 존재함

archived
보존하지만 일반 탐색에서는 제외함
```

## 기본값

기존 모든 글을 자동으로 `current`로 지정하면 안 된다.

초기 migration에서는 다음 중 하나를 선택한다.

### 안전한 방법

```text
기존 글의 기본 상태는 needs-review
대표 문서만 수동으로 current 전환
```

### 호환성 중심 방법

```text
상태가 없는 기존 글은 legacy-default로 처리
UI에서는 일반 글처럼 표시
Featured와 Hub에는 명시적으로 current인 글만 허용
```

두 번째 방식이 기존 사이트를 덜 깨뜨린다.

## 완료 조건

```text
[ ] 상태 enum 구현
[ ] 각 상태 정의 문서화
[ ] Featured는 current만 허용
[ ] 상태 없는 기존 글의 처리 규칙 확정
```

## 예상 작업량

```text
1~2시간
```

---
