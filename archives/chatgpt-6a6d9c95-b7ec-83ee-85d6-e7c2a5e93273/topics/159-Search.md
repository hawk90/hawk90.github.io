---
title: "Search"
source_message: 29
source_role: assistant
---

# Search

## P-19. Full Body Search Index

### 모든 본문 텍스트를 검색 JSON에 포함

### 문제

- 인덱스 크기 폭증
- 코드·로그 노이즈
- 파싱 시간 증가
- 모바일 메모리 증가

### 개선

제목, 설명, 소제목, 키워드, 핵심 excerpt 중심으로 구성한다.

---

## P-20. Eager Search Index Loading

### 검색을 사용하지 않아도 인덱스를 다운로드

### 개선

검색 모달을 열 때 지연 로드한다.

---

## P-21. Single Giant Search Index

### 모든 분야를 하나의 거대한 파일로 제공

### 개선

필요하면 Topic이나 콘텐츠 타입별 shard로 나눈다.

```text
search-core.json
search-cpp.json
search-systems.json
```

---

## P-22. Search Index Includes HTML

### 렌더링된 HTML 전체 저장

### 문제

태그 제거와 entity 처리 비용이 크고 불필요한 UI 텍스트가 섞인다.

### 개선

렌더링 전의 정제된 검색 문서를 생성한다.

---

## P-23. Search Snippet Generated at Runtime

### 브라우저에서 전체 본문을 탐색해 snippet 생성

### 문제

검색할 때마다 문자열 처리 비용이 크다.

### 개선

빌드 시 heading별 짧은 excerpt를 준비한다.

---

## P-24. Search Ranking on Main Thread

### 큰 인덱스의 ranking을 UI thread에서 동기 처리

### 문제

입력 중 끊김이 발생한다.

### 개선

- 작은 인덱스 유지
- debounce
- 필요하면 Web Worker 사용
- 결과 개수 제한

---

## P-25. Index Invalidated by Any Change

### 글 하나 수정해도 전체 검색 인덱스 재생성

### 개선

문서별 검색 레코드를 생성하고 마지막 병합만 수행하는 증분 방식을 고려한다.

---
