---
title: "Documentation Drift"
source_message: 33
source_role: assistant
---

# Documentation Drift

## M-51. README as Marketing Copy

### 실제 상태보다 기능을 크게 설명

### 문제

구현과 문서가 어긋난다.

### 개선

현재 지원, 실험, 계획을 구분한다.

---

## M-52. Feature List Without Ownership

### 기능은 나열되지만 어디서 구현되는지 모름

### 개선

핵심 기능에 source location과 책임 모듈을 연결한다.

---

## M-53. Stale Setup Guide

### 설치 명령이 현재 버전과 맞지 않음

### 문제

새 환경에서 시작부터 실패한다.

### 개선

CI에서 setup 문서의 핵심 명령을 실제 실행해 검증할 수 있다.

---

## M-54. Architecture in Comments Only

### 중요한 판단이 config 주석에만 남음

### 문제

파일을 바꾸거나 삭제하면 맥락이 사라진다.

### 개선

중요한 결정은 짧은 ADR로 남긴다.

---

## M-55. ADR Without Consequences

### 결정만 기록

```text
Astro를 사용한다.
```

### 문제

왜 선택했고 무엇을 포기했는지 모른다.

### 개선

Context, Decision, Consequences를 기록한다.

---

## M-56. ADR as Immutable Law

### 과거 결정을 절대 변경하지 않음

### 개선

결정 상태를 표시한다.

```text
accepted
superseded
deprecated
```

---

## M-57. Documentation Duplication

### README, Wiki, 코드 주석에 같은 설명 반복

### 문제

한 곳만 갱신되어 충돌한다.

### 개선

한 곳을 source of truth로 두고 다른 곳에서는 링크한다.

---

## M-58. No Operational Runbook

### 배포 실패·검색 인덱스 오류·OG 실패 대응법 없음

### 개선

자주 발생하는 운영 문제의 진단과 복구 절차를 짧게 정리한다.

---

## M-59. No Content Authoring Guide

### 글 작성 규칙이 암묵적

### 문제

미래의 본인도 예전 규칙을 잊는다.

### 개선

- 제목
- description
- 코드 블록 언어
- 이미지 경로
- 콘텐츠 타입
- 검증 정보

에 대한 최소 가이드를 둔다.

---

## M-60. Documentation Without Deletion

### 제거된 기능 문서가 계속 남음

### 개선

기능 삭제 시 문서 검색과 정리를 checklist에 포함한다.

---
