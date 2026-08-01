---
title: "Release and Change Management"
source_message: 33
source_role: assistant
---

# Release and Change Management

## M-81. Content and Platform Changes Mixed

### 한 commit에서 글 50개와 UI 구조를 동시에 변경

### 문제

검토와 rollback이 어렵다.

### 개선

콘텐츠 migration, 플랫폼 변경, 디자인 변경을 가능한 한 분리한다.

---

## M-82. Giant Refactor Commit

### 수천 파일 변경을 한 commit으로 처리

### 문제

의미 있는 diff 검토가 불가능하다.

### 개선

기계적 변경과 수동 의미 변경을 별도 commit으로 나눈다.

---

## M-83. Formatting Noise in Semantic Change

### 내용 수정과 formatter 전체 적용이 섞임

### 개선

formatting-only commit을 먼저 분리한다.

---

## M-84. No Rollback Plan

### 배포 후 문제 발생 시 이전 사이트로 돌아가기 어려움

### 개선

배포 artifact 또는 이전 commit 기반 rollback 절차를 유지한다.

---

## M-85. Preview Not Representative

### preview에서는 Analytics·광고·base URL·asset 경로가 다름

### 문제

운영에서만 발생하는 오류를 놓친다.

### 개선

운영과 최대한 유사한 preview 설정을 사용한다.

---

## M-86. Feature Flag Cemetery

### 오래된 실험 flag가 계속 남음

```text
enableNewSearch
useNewCard
legacySeries
```

### 문제

코드 경로가 증가하고 실제 사용 상태를 모른다.

### 개선

flag에 만료일과 제거 조건을 둔다.

---

## M-87. Permanent Compatibility Layer

### 구형 URL·schema·컴포넌트 adapter가 계속 남음

### 개선

호환 계층마다 종료 조건을 정하고 migration 완료 후 제거한다.

---

## M-88. Release Notes Without User Impact

### 내부 파일 변경만 설명

### 개선

다음처럼 사용자와 운영 관점으로 작성한다.

```text
검색 결과 정확도 개선
기존 CXL 글 URL 유지
모바일 코드 블록 스크롤 수정
```

---

## M-89. No Baseline Before Refactor

### 구조를 바꿨지만 개선 여부를 비교할 수 없음

### 개선

리팩토링 전 다음을 기록한다.

- build time
- memory
- index size
- broken links
- Lighthouse
- 주요 페이지 screenshot

---

## M-90. Completion Defined as Code Merge

### 기능 구현이 끝나면 완료

### 문제

문서, migration, 운영 검증, 기존 콘텐츠 적용이 빠진다.

### 개선

완료 조건에 다음을 포함한다.

```text
code
tests
docs
migration
content adoption
production validation
```

---
