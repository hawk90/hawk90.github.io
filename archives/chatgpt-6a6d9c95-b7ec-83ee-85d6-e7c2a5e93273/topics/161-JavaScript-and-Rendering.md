---
title: "JavaScript and Rendering"
source_message: 29
source_role: assistant
---

# JavaScript and Rendering

## P-37. JavaScript for Static Metadata

### 날짜·읽기 시간·태그 표시를 클라이언트에서 계산

### 개선

빌드 시 HTML로 생성한다.

---

## P-38. Global Bundle for Page-Specific Features

### 검색, 댓글, 수식, 관리자 기능 JS가 모든 페이지에 포함

### 개선

페이지 유형별로 나누고 필요할 때만 로드한다.

---

## P-39. ClientRouter Tax on Every Page

### 부드러운 전환을 위해 모든 페이지가 라우터 비용 부담

### 문제

기능 자체보다 lifecycle 복잡성이 커질 수 있다.

### 개선

실제 사용자 가치와 성능을 측정하고 progressive enhancement로 유지한다.

---

## P-40. Duplicate Event Registration After Navigation

### 페이지 전환 때 이벤트가 계속 중복 등록

### 증상

- 클릭 한 번에 여러 번 실행
- 메모리 증가
- 검색 모달 중복
- 댓글 재생성

### 개선

명시적 dispose와 단일 lifecycle manager를 둔다.

---

## P-41. Third-Party Script Eager Loading

### Giscus·Analytics·AdSense·Newsletter를 즉시 로드

### 문제

초기 네트워크와 main thread를 점유한다.

### 개선

- 댓글: viewport 근처에서 로드
- 뉴스레터: 사용자 상호작용 후
- 광고: 콘텐츠 안정성 고려
- 분석: 최소 구성

---

## P-42. All Icons in One Library

### 아이콘 몇 개를 위해 전체 라이브러리 번들

### 개선

정적 SVG 또는 tree-shakable import를 사용한다.

---

## P-43. Runtime Theme Initialization Flash

### 테마가 JavaScript 실행 후 적용되어 화면이 번쩍임

### 개선

초기 HTML 전에 작은 inline script로 저장된 테마를 적용하거나 CSS media query를 기본으로 사용한다.

---

## P-44. Font Loading Cascade

### 여러 폰트와 weight가 순차 로딩

### 문제

- 텍스트 교체
- CLS
- 네트워크 증가

### 개선

본문·코드 폰트를 최소화하고 실제 사용하는 weight만 제공한다.

---

## P-45. Local Font Without Subsetting

### 한글·영문 전체 glyph를 큰 파일로 제공

### 개선

필요한 문자 범위를 분할하거나 시스템 폰트 fallback을 적극 활용한다.

---

## P-46. Preload Everything

### 모든 폰트·이미지·스크립트를 preload

### 문제

브라우저 우선순위를 오히려 망친다.

### 개선

LCP와 핵심 폰트처럼 정말 중요한 자원만 preload한다.

---

## P-47. Prefetch Every Link

### 글 목록의 모든 링크를 미리 요청

### 문제

콘텐츠가 많은 홈·태그 페이지에서 네트워크 낭비가 크다.

### 개선

hover·viewport·intent 기반으로 제한한다.

---

## P-48. No JavaScript Failure Fallback

### JS가 실패하면 검색·메뉴·탐색이 동작하지 않음

### 개선

기본 링크와 정적 페이지 구조를 유지한다.

---
