---
title: "Search Console"
source_message: 36
source_role: assistant
---

# Search Console

## O-11. Impression Obsession

### 노출 수 증가만 성공으로 판단

### 문제

관련성이 낮은 검색어에 많이 노출될 수도 있다.

### 함께 볼 것

```text
검색어 의도
평균 순위
클릭률
실제 페이지 만족도
내부 이동
```

---

## O-12. CTR Without Position Context

### CTR이 낮다고 제목을 즉시 변경

### 문제

평균 순위 20위의 CTR과 2위의 CTR은 비교할 수 없다.

### 개선

순위 구간과 검색어 의도를 함께 본다.

---

## O-13. Average Position Worship

### 평균 순위 한 숫자에 집중

### 문제

서로 다른 검색어·국가·기기·페이지가 섞인다.

### 개선

핵심 검색어군과 대표 페이지 단위로 추적한다.

---

## O-14. Query Chasing

### Search Console에 새 검색어가 보이면 곧바로 새 글 작성

### 문제

비슷한 글이 계속 늘고 Topic Cannibalization이 발생한다.

### 개선

먼저 판단한다.

```text
기존 글 보완?
FAQ 추가?
소제목 추가?
새 독립 글?
```

---

## O-15. Zero-Click Misdiagnosis

### 노출은 많은데 클릭이 적으면 무조건 실패

### 가능성

- 검색 결과에서 답이 이미 보임
- 제목이 검색 의도와 다름
- 순위가 낮음
- 다른 페이지가 더 대표적임

원인을 구분해야 한다.

---

## O-16. Index Coverage as a Score

### 색인된 페이지 수가 많을수록 좋다고 생각

### 문제

얕은 태그·아카이브 페이지까지 색인될 수 있다.

### 개선

색인 수보다 **색인할 가치가 있는 페이지가 제대로 색인됐는가**를 본다.

---

## O-17. “Crawled, Not Indexed” Mass Fix

### 해당 상태의 모든 페이지를 억지로 색인시키려 함

### 문제

일부 페이지는 실제로 색인 가치가 낮을 수 있다.

### 개선

다음으로 분류한다.

```text
핵심 글
중복 글
얕은 목록
구판
Draft/실험 페이지
```

---

## O-18. URL Inspection as a Workflow

### 페이지마다 수동 색인 요청

### 문제

구조적 문제를 수동 요청으로 가린다.

### 개선

내부 링크·Sitemap·canonical·콘텐츠 품질을 먼저 수정한다.

---

## O-19. Search Console Without Change Log

### 제목·구조·canonical 변경 후 기록 없음

### 문제

몇 주 뒤 지표 변화의 원인을 찾기 어렵다.

### 개선

SEO 변경 로그를 유지한다.

---

## O-20. Short Evaluation Window

### 변경 후 며칠만 보고 성공·실패 판단

검색 반영에는 시간이 걸릴 수 있다.

### 개선

변경 규모에 따라 관찰 기간을 정하고 성급한 재변경을 피한다.

---
