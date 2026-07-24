## 3. 글 구조

### 시리즈 글의 표준 흐름

```
H1 (frontmatter title)
└ 도입 1~2문단 — 이 글이 무엇을 다루는지, 왜 필요한지

## 본 섹션들 (보통 3~6개)
  ├ 도입 1문단 — 이 절이 다루는 것
  ├ 본문 (코드/표/산문 조합)
  └ 작은 예시 또는 정리

## 작은 예시 — 전체 적용 (선택)
   현실적인 코드 한 장으로 묶기

## 정리
   - 불릿 5~8개 — 한 글의 핵심을 한눈에

## 다음 장 예고
   다음 글이 무엇을 다룰지 1~2문장

## 관련 항목
   - 이전/다음 글 링크
   - 다른 시리즈와의 교차 링크
   - 원문 링크 (책 요약일 때)
```

### Tone A 시리즈의 추가 패턴

다음 헤더를 자주 씁니다.

- `## 한 줄 요약`
- `## 어떤 문제를 푸는가`
- `## 언제 쓰면 좋은가`
- `## 언제 쓰면 안 되나`
- `## 한눈에 보는 구조`

### 헤더 깊이

`H1`은 frontmatter `title`이 자동으로 들어가므로 본문에서는 `##`(H2)부터 시작합니다. `####`(H4)까지가 보통 한계입니다.

---

## 4. Frontmatter

### 필수 필드

```yaml
---
title: "Ch 1: Header Files"             # 시리즈면 "Ch N:" 또는 "Item N:" 접두사
date: 2025-05-13T10:00:00               # 시리즈는 같은 날짜 + 시간으로 정렬
description: "한 문장으로 글의 요점 — 검색·SEO용"
series: "Series Name"                    # 시리즈에 속하면 필수
seriesOrder: 1                           # 시리즈 안 순서
tags: [tag1, tag2, tag3]                 # 5개 이하 권장
draft: false                             # true면 빌드에서 제외
---
```

### Book-review 시리즈의 추가 필드

```yaml
type: book-review
bookTitle: "Working Effectively with Legacy Code"
bookAuthor: "Michael Feathers"
```

### draft 플래그

- 작성 중이거나 확신이 안 서면 `draft: true`.
- 사용자가 "발행해" / "draft 풀어"라고 한 글만 `draft: false`.
- 모르겠으면 `draft: true`가 안전.

---

