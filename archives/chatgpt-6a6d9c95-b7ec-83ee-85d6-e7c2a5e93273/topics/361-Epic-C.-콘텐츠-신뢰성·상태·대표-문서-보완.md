---
title: "Epic C. 콘텐츠 신뢰성·상태·대표 문서 보완"
source_message: 45
source_role: assistant
---

# Epic C. 콘텐츠 신뢰성·상태·대표 문서 보완

## C-01. 콘텐츠 상태 모델 확정

모든 글을 무조건 `current`와 `old`로만 나누면 부족하다.

추천 상태는 다섯 개다.

```text
current
needs-review
historical
superseded
archived
```

## 상태 정의

### `current`

현재도 유효하며 대표 문서나 일반 탐색에서 적극적으로 노출해도 되는 글.

### `needs-review`

내용 일부가 낡았을 가능성이 있거나 환경·출처·결론을 다시 확인해야 하는 글.

### `historical`

특정 과거 버전이나 당시 환경을 설명하는 데 가치가 있는 글.

예:

```text
Linux 5.x 기준 동작
CUDA 11.8 기준 실험
XRT 2.13.466 환경의 U250 문제
```

### `superseded`

더 나은 신판이나 통합 문서가 존재하는 글.

### `archived`

사이트 구조상 적극적으로 노출하지 않지만 기록 보존 목적은 있는 글.

---

## 피해야 할 상태

```text
active
legacy
deprecated
old
obsolete
outdated
```

이런 표현은 기준이 모호하거나 서로 겹치기 쉽다.

## 완료 조건

- 상태 종류가 5개 이하
- 각 상태의 노출·검색·추천 규칙이 정의됨
- 상태 변경 기준이 문서화됨
- `updated`와 `lastVerified`가 상태와 분리됨

## 우선순위

```text
P0
```

---
