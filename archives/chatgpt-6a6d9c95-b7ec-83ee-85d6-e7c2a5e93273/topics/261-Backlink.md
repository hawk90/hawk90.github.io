---
title: "Backlink"
source_message: 39
source_role: assistant
---

# Backlink

## K-31. Backlink Dump

### 현재 글을 참조하는 모든 문서를 나열

### 문제

많은 글에서 수십 개 링크가 생긴다.

### 개선

의미 있는 backlink만 노출한다.

```text
이 글을 선행 지식으로 사용하는 Guide
이 글을 구현한 Source Walkthrough
이 글을 반박·보완한 글
```

---

## K-32. Backlink Without Relation

### “이 글을 참조한 글”만 표시

### 문제

왜 참조했는지 모른다.

### 개선

참조 문맥이나 관계 유형을 표시한다.

---

## K-33. Self-Generated Backlink Noise

### 자동 생성된 관련 글 영역의 링크까지 backlink로 계산

### 문제

그래프가 인위적으로 밀집한다.

### 개선

본문 명시 링크와 자동 추천 링크를 구분한다.

---

## K-34. Navigation Links Counted as Knowledge Edges

### 헤더·푸터·태그 링크까지 지식 관계로 처리

### 문제

모든 페이지가 강하게 연결된 것처럼 보인다.

### 개선

UI 탐색 링크와 의미 관계 링크를 분리한다.

---

## K-35. Backlink as Popularity Score

### backlink 수가 많으면 중요한 글이라고 판단

### 문제

공통 용어 글은 링크가 많고, 희귀 핵심 글은 적을 수 있다.

### 개선

관계 유형과 위치에 가중치를 둔다.

---

## K-36. Missing Backlink for Renamed Pages

### slug 변경 후 링크는 redirect로 살아 있지만 그래프는 끊김

### 개선

canonical ID 기준으로 관계를 관리한다.

---

## K-37. Backlink Page Indexed as Thin Content

### backlink 목록만 별도 URL로 생성

### 문제

내용이 거의 없는 페이지가 늘어난다.

### 개선

backlink는 문서 UI의 보조 정보로 제공한다.

---
