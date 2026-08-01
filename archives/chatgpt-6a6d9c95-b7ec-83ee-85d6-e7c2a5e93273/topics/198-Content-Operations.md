---
title: "Content Operations"
source_message: 33
source_role: assistant
---

# Content Operations

## M-71. Publish-and-Forget

### 글을 발행한 뒤 다시 보지 않음

### 문제

오래된 정보와 깨진 링크가 누적된다.

### 개선

업데이트·검증·폐기 주기를 운영 프로세스에 포함한다.

---

## M-72. Date-Based Review Only

### 오래된 글이면 모두 검토 대상으로 지정

### 문제

안정적인 개념 글까지 불필요하게 검토한다.

### 개선

변화 가능성에 따라 주기를 다르게 둔다.

```text
specification
toolchain
API
benchmark
historical note
```

---

## M-73. No Content Ownership

### 어느 주제를 우선 관리할지 기준이 없음

개인 블로그에서도 주제가 많으면 사실상 같은 문제가 생긴다.

### 개선

핵심 Topic별 대표 허브와 유지 우선순위를 둔다.

---

## M-74. New Content Before Existing Debt

### 기존 글 정리보다 새 글 작성이 항상 우선

### 문제

사이트 전체 품질은 개선되지 않는다.

### 개선

콘텐츠 작업 시간을 예를 들어 다음처럼 나눈다.

```text
신규 50%
업데이트 30%
통합·폐기 20%
```

비율은 조정할 수 있다.

---

## M-75. No Merge Policy for Similar Articles

### 비슷한 글을 언제 합칠지 기준이 없음

### 개선

다음을 동시에 만족하면 통합 후보로 본다.

- 동일 검색 의도
- 설명 중복
- 독립 실험 없음
- 내부 링크 관계가 약함

---

## M-76. Deletion Aversion

### 작성한 글을 절대 삭제하거나 통합하지 않음

### 문제

구판·중복·낮은 품질 글이 계속 남는다.

### 개선

redirect와 superseded 상태를 활용해 지식을 보존하면서 구조는 정리한다.

---

## M-77. Update Without Revalidation

### 문장만 수정하고 환경 검증일도 최신으로 변경

### 문제

실제로 테스트하지 않았는데 최신 글처럼 보인다.

### 개선

`updated`와 `lastVerified`를 분리한다.

---

## M-78. Bulk AI Refresh

### 오래된 글 전체를 AI로 일괄 재작성

### 문제

- 고유 경험 손실
- 문체 획일화
- 새로운 오류
- 사실 검증 부족

### 개선

AI는 후보와 구조 개선에 사용하고, 핵심 기술 주장과 경험은 직접 검증한다.

---

## M-79. Editorial Template Lock-In

### 모든 글이 같은 템플릿을 강제

### 문제

글 유형과 주제 특성이 사라진다.

### 개선

콘텐츠 타입별 최소 구조만 제공하고 설명 방식은 유연하게 둔다.

---

## M-80. No Content Retirement Workflow

### 폐기 상태만 있고 실제 처리 절차가 없음

### 개선

```text
identify
review
redirect or mark historical
update internal links
remove from hubs
retain or remove from sitemap
```

절차를 정한다.

---
