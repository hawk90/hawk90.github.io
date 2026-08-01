---
title: "Phase 0. 시작 기준선"
source_message: 52
source_role: assistant
---

# Phase 0. 시작 기준선

기간보다 먼저 수행해야 하는 준비 단계다.

## 작업

```text
현재 production commit 기록
전체 URL manifest 생성
빌드 시간과 Peak RSS 측정
검색 인덱스 크기 측정
대표 검색어 20개 결과 기록
태그·시리즈·문서 수 집계
현재 Search Console 상태 기록
```

## 산출물

```text
reports/baseline-site.json
reports/baseline-search.md
reports/baseline-content.md
reports/baseline-build.json
```

반드시 이 경로를 사용할 필요는 없다. 핵심은 전후 비교 가능한 결과를 남기는 것이다.

## 완료 조건

- 현재 상태를 재현할 commit SHA가 있음
- 성능과 콘텐츠 구조의 최소 수치가 있음
- 개선 전 검색 결과 예시가 있음
- 대표 페이지 screenshot 또는 확인 기록이 있음

---
