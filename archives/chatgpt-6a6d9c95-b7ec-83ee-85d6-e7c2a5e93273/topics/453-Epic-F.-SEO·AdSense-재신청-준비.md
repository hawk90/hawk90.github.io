---
title: "Epic F. SEO·AdSense 재신청 준비"
source_message: 49
source_role: assistant
---

# Epic F. SEO·AdSense 재신청 준비

## F-01. 현재 공개 URL 유형 전수 조사

### 문제

일반 글이 많더라도 다음 페이지가 함께 공개되고 색인된다면 사이트 전체 인상이 약해질 수 있다.

```text
빈 태그 페이지
글이 1개뿐인 카테고리
검색 결과 페이지
페이지네이션
Draft나 Placeholder
관리 기능
구판·중복 문서
단순 날짜 아카이브
```

### 작업

최종 배포 결과의 모든 URL을 유형별로 집계한다.

| 페이지 유형 | URL 수 | 색인 대상 | Sitemap | 광고 대상 |
|---|---:|---|---|---|
| Article |  | 예 | 예 | 조건부 |
| Topic Hub |  | 예 | 예 | 조건부 |
| Series Hub |  | 선별 | 선별 | 조건부 |
| Tag |  | 선별 | 선별 | 대체로 제외 |
| Archive |  | 선별 | 선별 | 제외 권장 |
| Search |  | 아니오 | 아니오 | 제외 |
| Admin |  | 아니오 | 아니오 | 제외 |
| Draft |  | 공개 제외 | 아니오 | 제외 |
| Superseded |  | 상황별 | 상황별 | 제외 권장 |
| 404 | 1 | 아니오 | 아니오 | 제외 |

### 구현 방법

공통 Content Manifest 외에 최종 생성 페이지 manifest를 만든다.

```ts
interface GeneratedPage {
  url: string;
  pageType:
    | "article"
    | "topic"
    | "series"
    | "tag"
    | "archive"
    | "search"
    | "admin"
    | "error";
  indexable: boolean;
  canonical: string;
  includeInSitemap: boolean;
  adsEligible: boolean;
}
```

### 완료 조건

- 최종 배포 URL 총수가 확인됨
- 페이지 유형별 색인 정책이 존재함
- 검색·관리·빈 결과 페이지가 Sitemap에 포함되지 않음
- 광고 가능 여부가 페이지 유형에 따라 결정됨

### 우선순위

```text
P0
```

---
