---
title: "Ticket S1-06. Featured 불변조건 검사"
source_message: 53
source_role: assistant
---

# Ticket S1-06. Featured 불변조건 검사

## 목적

구판이나 미검증 문서가 홈 대표 글로 노출되는 것을 막는다.

## 규칙

```text
Featured 문서는 반드시:
status=current
topic 존재
type 존재
description 존재
실제 URL 존재
```

## 예시 검사

```ts
function validateFeaturedArticle(article: Article): string[] {
  const errors: string[] = [];

  if (article.status !== "current") {
    errors.push("Featured article must have status=current.");
  }

  if (!article.topic) {
    errors.push("Featured article must define a primary topic.");
  }

  if (!article.type) {
    errors.push("Featured article must define a content type.");
  }

  if (!article.description?.trim()) {
    errors.push("Featured article must have a description.");
  }

  return errors;
}
```

## 완료 조건

```text
[ ] needs-review Featured 차단
[ ] historical Featured 차단
[ ] superseded Featured 차단
[ ] metadata 누락 시 명확한 오류
```

## 예상 작업량

```text
1~2시간
```

---
