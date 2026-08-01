---
title: "CSS and DOM"
source_message: 29
source_role: assistant
---

# CSS and DOM

## P-49. Utility Class Duplication

### 같은 긴 Tailwind 조합이 여러 파일에 반복

### 문제

빌드 성능보다 유지보수성과 일관성 비용이 커진다.

### 개선

반복되는 의미 단위를 컴포넌트나 semantic class로 추출한다.

---

## P-50. DOM Inflation by Decorative Wrappers

### 스타일을 위해 중첩 `<div>`가 많음

### 문제

장문 글과 많은 카드에서 DOM 크기가 커진다.

### 개선

의미 없는 wrapper를 줄이고 CSS layout을 단순화한다.

---

## P-51. Heading Anchor DOM Bloat

### 모든 heading에 복잡한 anchor wrapper와 icon 추가

### 개선

필요한 최소 markup만 사용하고 hover 시 시각화한다.

---

## P-52. Table Wrapper Everywhere

### 모든 표에 복잡한 스크롤·복사·caption UI

### 문제

간단한 표에도 많은 DOM과 JS가 추가된다.

### 개선

큰 표나 overflow 가능성이 있는 표에만 강화 기능을 쓴다.

---

## P-53. Permanent Offscreen UI

### 검색 모달·메뉴·패널을 항상 DOM에 유지

### 개선

필요할 때 렌더링하거나 최소 markup으로 유지한다.

---
