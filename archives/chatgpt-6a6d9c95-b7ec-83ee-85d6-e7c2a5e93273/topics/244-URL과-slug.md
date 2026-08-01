---
title: "URL과 slug"
source_message: 38
source_role: assistant
---

# URL과 slug

## L-19. Korean Slug Everywhere

### 모든 URL을 한글로 생성

### 장점

- 제목과 직관적으로 대응

### 문제

- URL 인코딩 시 길어짐
- 공유할 때 읽기 어려움
- 일부 도구에서 처리 불편
- 제목 변경 시 slug 변경 유혹

### 개선

안정적이고 짧은 slug 정책을 정한다.

```text
/pcie-bar-sizing/
/cxl-hdm-decoder/
```

---

## L-20. English Slug Without Meaning

### 영문 slug가 지나치게 축약됨

```text
/cxl-init-2/
/mem-topo-v3/
```

### 문제

시간이 지나면 의미를 알기 어렵다.

### 개선

짧지만 검색 의도가 드러나는 slug를 사용한다.

---

## L-21. Translated Slug Drift

### 제목 번역이 바뀔 때 URL도 변경

### 문제

외부 링크와 색인이 깨진다.

### 개선

slug는 최초 확정 후 안정적으로 유지한다.

---

## L-22. Mixed Slug Policy

```text
/cpp-memory/
/리눅스-스케줄러/
/2026/cxl-init/
```

### 문제

URL 체계가 일관되지 않는다.

### 개선

신규 글부터 하나의 정책을 적용한다. 기존 URL은 무리하게 일괄 변경하지 않는다.

---

## L-23. Acronym-Only Slug

```text
/ats-pri-pasid/
```

### 문제

전문가에게는 명확하지만 일반 검색·공유에서는 의미가 약하다.

### 개선

필요하면 핵심 의미를 추가한다.

```text
/pcie-ats-pri-pasid-address-translation/
```

다만 너무 길게 만들지는 않는다.

---

## L-24. Locale Prefix Without Multilingual Content

```text
/ko/
/en/
```

를 도입했지만 실제로 한 언어만 운영한다.

### 문제

경로만 복잡해진다.

### 개선

실제 다국어 운영 계획이 있을 때만 locale prefix를 도입한다.

---

## L-25. Duplicate Language URLs

### 동일 콘텐츠를 `/ko/post`와 `/post`에서 모두 제공

### 문제

중복 URL이 생긴다.

### 개선

locale별 canonical과 redirect 정책을 명확히 한다.

---
