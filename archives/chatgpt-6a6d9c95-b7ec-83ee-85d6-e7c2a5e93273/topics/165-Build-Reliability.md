---
title: "Build Reliability"
source_message: 29
source_role: assistant
---

# Build Reliability

## P-75. Non-Deterministic Build

### 같은 입력인데 결과가 달라짐

### 원인

- 현재 시각 사용
- 랜덤 OG 배치
- 외부 API 의존
- 정렬되지 않은 파일 순회
- 로컬 환경별 폰트 차이

### 개선

빌드 입력을 고정하고 정렬과 locale을 명시한다.

---

## P-76. Network-Dependent Build

### 배포 중 외부 문서나 이미지 다운로드

### 문제

외부 장애가 블로그 배포를 막는다.

### 개선

필요한 자산은 사전에 관리하거나 실패 시 명확한 fallback을 둔다.

---

## P-77. Locale-Dependent Sorting

### 실행 환경에 따라 한글·영문 정렬 순서가 달라짐

### 개선

정렬 locale과 비교 함수를 명시한다.

---

## P-78. Timezone-Dependent Dates

### CI timezone에 따라 게시일이 달라짐

### 개선

날짜 파싱과 출력 timezone을 고정한다.

---

## P-79. Silent Partial Generation

### 일부 OG·SVG 생성이 실패해도 빌드는 성공

### 문제

배포 후 깨진 자산이 발견된다.

### 개선

필수 자산 실패는 명시적으로 오류 처리하고, 선택 자산은 warning으로 남긴다.

---

## P-80. Output Growth Without Alarm

### 정적 결과물이 계속 커지지만 감시하지 않음

### 개선

다음을 기록한다.

```text
전체 dist 크기
HTML 크기
검색 인덱스
이미지
JS
CSS
```

급격한 증가를 경고한다.

---
