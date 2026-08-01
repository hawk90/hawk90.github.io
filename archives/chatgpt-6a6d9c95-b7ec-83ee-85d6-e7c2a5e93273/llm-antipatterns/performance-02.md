---
title: "Performance and build efficiency (20 anti-patterns)"
category: performance
item_count: 20
---
# Performance and build efficiency
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-P-61 — Build Artifact Recompression
- Category: Performance and build efficiency
- Original IDs: P-61
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 각 단계에서 같은 파일을 반복 압축·해제

### 개선

artifact 전달 방식을 단순화하고 압축 횟수를 줄인다.

---
## AP-P-62 — Deploy Before Smoke Test
- Category: Performance and build efficiency
- Original IDs: P-62
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 생성된 정적 결과를 확인하지 않고 바로 배포

### 개선

최소한 다음을 검사한다.

- 홈 200
- 대표 글 200
- Sitemap 존재
- 검색 인덱스 파싱
- 주요 asset 존재
- 내부 링크 샘플

---
## AP-P-63 — No Preview Deployment
- Category: Performance and build efficiency
- Original IDs: P-63
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 운영 배포 전 실제 결과 확인 불가

### 개선

큰 구조 변경에는 preview 환경이나 artifact 확인 단계를 둔다.

---
## AP-P-64 — CI Logs as Profiling
- Category: Performance and build efficiency
- Original IDs: P-64
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 단순 시작·종료 시간만 보고 병목 추정

### 개선

빌드 내부 단계별 timing을 별도 출력한다.

---
## AP-P-65 — Heavy Homepage
- Category: Performance and build efficiency
- Original IDs: P-65
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 홈에 너무 많은 카드·이미지·통계·애니메이션

### 문제

가장 많이 방문하는 페이지가 가장 무거워진다.

### 개선

홈은 핵심 Topic과 대표 글 중심으로 제한한다.

---
## AP-P-66 — Render Every Archive Item
- Category: Performance and build efficiency
- Original IDs: P-66
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 수백 개 글을 한 페이지 DOM에 출력

### 개선

페이지네이션이나 정적 분할을 사용한다.

---
## AP-P-67 — Huge In-Page TOC
- Category: Performance and build efficiency
- Original IDs: P-67
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 긴 글의 모든 heading을 한 번에 렌더링

### 문제

목차 자체가 복잡하고 모바일에서 부담스럽다.

### 개선

H2 중심, 필요한 H3만 포함한다.

---
## AP-P-68 — Sticky Everything
- Category: Performance and build efficiency
- Original IDs: P-68
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 헤더·TOC·공유·광고가 모두 sticky

### 문제

화면 공간을 줄이고 scroll 성능을 악화시킨다.

### 개선

한 화면에 하나의 주요 sticky 요소만 둔다.

---
## AP-P-69 — Code Block Width Breakout
- Category: Performance and build efficiency
- Original IDs: P-69
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 긴 코드가 viewport를 넓혀 전체 레이아웃을 흔듦

### 개선

코드 컨테이너의 overflow를 명확히 관리하고 모바일에서 wrap 정책을 구분한다.

---
## AP-P-70 — Math Layout Shift
- Category: Performance and build efficiency
- Original IDs: P-70
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### KaTeX 스타일이나 폰트가 늦게 적용되어 수식 크기가 바뀜

### 개선

필수 CSS를 초기 렌더에 포함하고 수식 영역 크기 변화를 줄인다.

---
## AP-P-71 — Comments in Critical Rendering Path
- Category: Performance and build efficiency
- Original IDs: P-71
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 댓글 영역이 본문 초기 렌더를 지연

### 개선

본문과 독립적으로 지연 로드한다.

---
## AP-P-72 — Ads Before Content Stability
- Category: Performance and build efficiency
- Original IDs: P-72
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 광고가 자리 예약 없이 삽입

### 문제

CLS와 읽기 흐름 저하.

### 개선

광고 슬롯 크기를 예약하고 기술 문서의 논리적 경계를 침범하지 않게 한다.

---
## AP-P-73 — Analytics Overcollection
- Category: Performance and build efficiency
- Original IDs: P-73
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 여러 분석 도구를 동시에 사용

### 문제

성능·개인정보·운영 복잡성이 증가한다.

### 개선

실제 의사결정에 사용하는 지표만 수집한다.

---
## AP-P-74 — Performance Score Theater
- Category: Performance and build efficiency
- Original IDs: P-74
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
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
## AP-P-75 — Non-Deterministic Build
- Category: Performance and build efficiency
- Original IDs: P-75
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
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
## AP-P-76 — Network-Dependent Build
- Category: Performance and build efficiency
- Original IDs: P-76
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 배포 중 외부 문서나 이미지 다운로드

### 문제

외부 장애가 블로그 배포를 막는다.

### 개선

필요한 자산은 사전에 관리하거나 실패 시 명확한 fallback을 둔다.

---
## AP-P-77 — Locale-Dependent Sorting
- Category: Performance and build efficiency
- Original IDs: P-77
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 실행 환경에 따라 한글·영문 정렬 순서가 달라짐

### 개선

정렬 locale과 비교 함수를 명시한다.

---
## AP-P-78 — Timezone-Dependent Dates
- Category: Performance and build efficiency
- Original IDs: P-78
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### CI timezone에 따라 게시일이 달라짐

### 개선

날짜 파싱과 출력 timezone을 고정한다.

---
## AP-P-79 — Silent Partial Generation
- Category: Performance and build efficiency
- Original IDs: P-79
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 일부 OG·SVG 생성이 실패해도 빌드는 성공

### 문제

배포 후 깨진 자산이 발견된다.

### 개선

필수 자산 실패는 명시적으로 오류 처리하고, 선택 자산은 warning으로 남긴다.

---
## AP-P-80 — Output Growth Without Alarm
- Category: Performance and build efficiency
- Original IDs: P-80
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
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
