---
title: "Canonical Guide와 중복"
source_message: 39
source_role: assistant
---

# Canonical Guide와 중복

## K-73. No Canonical Node

### 같은 주제의 대표 글이 없음

### 문제

추천 알고리즘이 여러 유사 글을 동등하게 노출한다.

### 개선

Topic마다 대표 Guide·Concept를 지정한다.

---

## K-74. Canonical Guide Dominates Everything

### 모든 관련 검색과 추천이 대표 Guide로만 감

### 문제

구체적인 Debug Note나 Reference가 묻힌다.

### 개선

사용자 의도에 따라 대표 문서와 세부 문서를 구분한다.

---

## K-75. Duplicate Articles Linked as Related

### 사실상 같은 검색 의도의 글을 서로 추천

### 문제

중복을 유지하고 사용자 이동만 늘린다.

### 개선

통합 또는 역할 분리를 먼저 검토한다.

---

## K-76. Superseded Article Recommended

### 구판이 관련 글에 계속 등장

### 개선

상태를 추천 점수와 필터에 반영한다.

---

## K-77. Related Content Competes with Canonical

### 하위 글이 대표 문서보다 검색·추천에서 강함

### 개선

상위 Guide를 구조적 진입점으로 boost하되, 정확한 문제 검색에는 하위 글을 우선한다.

---
