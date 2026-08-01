---
title: "Epic H. 테스트·회귀 검증·출시 관리"
source_message: 51
source_role: assistant
---

# Epic H. 테스트·회귀 검증·출시 관리

## H-01. 테스트 계층 확정

테스트를 네 계층으로 나눈다.

```text
1. Content validation
2. Build integration
3. Browser smoke test
4. Scheduled audit
```

## 1. Content validation

빠르고 결정적이어야 한다.

```text
schema
slug uniqueness
internal links
relations
publication policy
```

## 2. Build integration

실제 production 결과를 생성한다.

```text
Astro build
search index
Sitemap
RSS
generated assets
```

## 3. Browser smoke test

최종 `dist`를 브라우저에서 확인한다.

```text
홈
Topic Hub
대표 글
검색
404
모바일
```

## 4. Scheduled audit

외부 환경 때문에 느리거나 flaky할 수 있는 검사다.

```text
외부 링크
dependency 상태
콘텐츠 최신성
대형 이미지
중복 후보
```

## 완료 조건

- 각 검사가 어느 계층에 속하는지 명확함
- 느린 감사가 일반 글 수정을 막지 않음
- 배포 전에 반드시 필요한 검사가 별도 명령으로 실행됨

## 우선순위

```text
P0
```

---
