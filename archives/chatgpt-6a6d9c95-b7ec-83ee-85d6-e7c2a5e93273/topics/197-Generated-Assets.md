---
title: "Generated Assets"
source_message: 33
source_role: assistant
---

# Generated Assets

## M-61. Source–Artifact Ambiguity

### 어떤 파일이 원본이고 생성물인지 불명확

### 문제

생성된 SVG나 OG 이미지를 직접 수정하게 된다.

### 개선

디렉터리와 파일 헤더로 source와 generated를 구분한다.

---

## M-62. Generated File Modified Manually

### 생성물을 직접 수정해 임시 해결

### 문제

다음 빌드에서 덮어씌워진다.

### 개선

원본 또는 generator를 수정한다.

---

## M-63. Artifact Naming by Display Title

### 제목 변경 시 파일명도 변경

### 문제

불필요한 삭제·생성과 링크 변화가 발생한다.

### 개선

안정적인 content ID나 slug를 사용한다.

---

## M-64. No Artifact Manifest

### 어떤 글이 어떤 OG·SVG·검색 레코드를 생성했는지 모름

### 개선

입력과 출력 관계를 manifest로 관리한다.

---

## M-65. Stale Artifact Preservation

### 원본 글이 삭제돼도 생성물이 남음

### 개선

manifest 기준 prune을 사용한다.

---

## M-66. Over-Aggressive Prune

### 현재 build에서 참조되지 않는다는 이유로 공유 자산 삭제

### 개선

공유 자산과 문서 전용 자산을 구분한다.

---

## M-67. Generator Version Not Recorded

### 어떤 버전으로 OG·SVG를 만들었는지 모름

### 문제

결과 차이를 추적하기 어렵다.

### 개선

manifest나 build metadata에 generator version을 기록한다.

---

## M-68. Non-Deterministic Asset Generation

### 폰트·시스템·random 값에 따라 이미지 결과가 달라짐

### 개선

폰트와 locale, seed, tool version을 고정한다.

---

## M-69. Generated Asset Review Blind Spot

### 코드 diff에는 이미지 결과가 보이지 않음

### 개선

큰 시각 변경에는 preview artifact나 screenshot diff를 제공한다.

---

## M-70. Asset Pipeline Owns Publishing

### 이미지 생성 실패 때문에 텍스트 수정도 배포 불가

### 개선

필수 자산과 선택 자산을 구분하고 fallback을 제공한다.

---
