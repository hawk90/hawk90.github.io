---
title: "Core Web Vitals와 성능"
source_message: 36
source_role: assistant
---

# Core Web Vitals와 성능

## O-21. Lab Data as Reality

### Lighthouse 결과만으로 실제 사용자 경험을 판단

### 문제

테스트 환경과 실제 기기·네트워크는 다르다.

### 개선

lab data와 field data를 함께 본다.

---

## O-22. Field Data Without Page Type

### 사이트 전체 Core Web Vitals만 확인

### 문제

홈·일반 글·코드가 많은 글·검색 페이지의 병목이 다르다.

### 개선

페이지 유형별로 측정한다.

---

## O-23. Lighthouse 100 Theater

### 100점이 아니면 실패

### 문제

사용자가 체감하지 못하는 미세 최적화에 시간을 쓴다.

### 개선

임계값을 넘은 뒤에는 콘텐츠와 탐색 문제를 우선한다.

---

## O-24. Synthetic Benchmark Drift

### 테스트 환경이 계속 바뀜

### 문제

이전 결과와 비교할 수 없다.

### 개선

- 기기
- 네트워크
- 브라우저
- 페이지
- 캐시 상태

를 고정한다.

---

## O-25. Homepage-Only Performance

### 홈만 측정

### 문제

실제 검색 유입은 긴 글 페이지로 들어올 가능성이 높다.

### 개선

대표 페이지 세트를 둔다.

```text
홈
일반 글
코드 많은 글
수식·다이어그램 글
검색
Topic Hub
```

---

## O-26. Best-Case Page Benchmark

### 이미지와 코드가 거의 없는 가벼운 글만 테스트

### 개선

최악 또는 상위 95% 복잡도 페이지를 포함한다.

---

## O-27. No Performance Regression Baseline

### 최적화 전 수치가 없음

### 문제

변경이 실제로 좋아졌는지 알 수 없다.

### 개선

배포별 주요 수치를 보존한다.

---

## O-28. Single Run Performance Test

### 한 번의 Lighthouse 결과로 판단

### 문제

네트워크·CPU 노이즈가 크다.

### 개선

여러 번 측정하고 중앙값을 사용한다.

---

## O-29. Bundle Size Without Execution Cost

### JS 파일 크기만 확인

### 문제

작은 파일도 실행 비용이 클 수 있고, 큰 파일도 거의 실행되지 않을 수 있다.

### 개선

- 다운로드
- parse
- compile
- execution
- main-thread blocking

을 함께 본다.

---

## O-30. Performance Dashboard Without Ownership

### 지표는 있지만 누가 어떤 조건에서 고칠지 없음

### 개선

예산 초과 시 대응 규칙을 정한다.

---
