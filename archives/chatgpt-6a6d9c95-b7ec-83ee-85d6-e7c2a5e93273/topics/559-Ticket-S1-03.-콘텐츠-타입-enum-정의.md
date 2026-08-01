---
title: "Ticket S1-03. 콘텐츠 타입 enum 정의"
source_message: 53
source_role: assistant
---

# Ticket S1-03. 콘텐츠 타입 enum 정의

## 목적

모든 글을 동일한 일반 게시물로 취급하지 않게 한다.

## 타입

```ts
export const CONTENT_TYPES = [
  "guide",
  "concept",
  "debug-note",
  "experiment",
  "source-walkthrough",
  "reference",
] as const;

export type ContentType =
  (typeof CONTENT_TYPES)[number];
```

## 타입 판단 질문

### Guide

```text
전체 흐름과 학습 경로를 설명하는가?
```

### Concept

```text
특정 원리나 메커니즘 하나를 설명하는가?
```

### Debug Note

```text
실제 증상과 원인 추적 과정이 중심인가?
```

### Experiment

```text
가설·환경·방법·결과가 중심인가?
```

### Source Walkthrough

```text
특정 소스코드의 호출·자료구조 흐름이 중심인가?
```

### Reference

```text
빠르게 다시 찾기 위한 표·명령·필드 정리인가?
```

## 피해야 할 기본 타입

```text
article
post
note
```

이들은 너무 넓어서 구조 개선에 거의 도움이 되지 않는다.

## 완료 조건

```text
[ ] 타입 enum 구현
[ ] 타입별 한 문장 정의
[ ] 대표 글 분류에 실제 적용 가능
[ ] 모든 기존 글에 즉시 강제하지 않음
```

## 예상 작업량

```text
1시간
```

---
