---
title: "Runtime Page Performance"
source_message: 29
source_role: assistant
---

# Runtime Page Performance

## P-65. Heavy Homepage

### 홈에 너무 많은 카드·이미지·통계·애니메이션

### 문제

가장 많이 방문하는 페이지가 가장 무거워진다.

### 개선

홈은 핵심 Topic과 대표 글 중심으로 제한한다.

---

## P-66. Render Every Archive Item

### 수백 개 글을 한 페이지 DOM에 출력

### 개선

페이지네이션이나 정적 분할을 사용한다.

---

## P-67. Huge In-Page TOC

### 긴 글의 모든 heading을 한 번에 렌더링

### 문제

목차 자체가 복잡하고 모바일에서 부담스럽다.

### 개선

H2 중심, 필요한 H3만 포함한다.

---

## P-68. Sticky Everything

### 헤더·TOC·공유·광고가 모두 sticky

### 문제

화면 공간을 줄이고 scroll 성능을 악화시킨다.

### 개선

한 화면에 하나의 주요 sticky 요소만 둔다.

---

## P-69. Code Block Width Breakout

### 긴 코드가 viewport를 넓혀 전체 레이아웃을 흔듦

### 개선

코드 컨테이너의 overflow를 명확히 관리하고 모바일에서 wrap 정책을 구분한다.

---

## P-70. Math Layout Shift

### KaTeX 스타일이나 폰트가 늦게 적용되어 수식 크기가 바뀜

### 개선

필수 CSS를 초기 렌더에 포함하고 수식 영역 크기 변화를 줄인다.

---

## P-71. Comments in Critical Rendering Path

### 댓글 영역이 본문 초기 렌더를 지연

### 개선

본문과 독립적으로 지연 로드한다.

---

## P-72. Ads Before Content Stability

### 광고가 자리 예약 없이 삽입

### 문제

CLS와 읽기 흐름 저하.

### 개선

광고 슬롯 크기를 예약하고 기술 문서의 논리적 경계를 침범하지 않게 한다.

---

## P-73. Analytics Overcollection

### 여러 분석 도구를 동시에 사용

### 문제

성능·개인정보·운영 복잡성이 증가한다.

### 개선

실제 의사결정에 사용하는 지표만 수집한다.

---

## P-74. Performance Score Theater

### Lighthouse 100 자체가 목표

### 문제

실사용 문제보다 점수 최적화에 집중한다.

### 개선

다음 사용자 행동을 측정한다.

- 글이 빠르게 보이는가
- 검색이 즉시 반응하는가
- 코드 스크롤이 부드러운가
- 페이지 이동 후 상태가 정상인가

---
