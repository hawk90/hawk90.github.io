---
title: "Images and Generated Assets"
source_message: 29
source_role: assistant
---

# Images and Generated Assets

## P-26. Original PNG Everywhere

### 고해상도 PNG를 그대로 배포

### 문제

기술 다이어그램과 스크린샷이 많으면 페이지 용량이 커진다.

### 개선

- 사진: AVIF/WebP
- 선형 다이어그램: SVG
- 스크린샷: WebP/PNG 선택
- 원본 크기 제한

---

## P-27. SVG Without Optimization

### 생성된 SVG에 편집기 metadata와 불필요한 path가 남음

### 개선

SVGO 계열 최적화를 적용하되 수식·텍스트가 깨지지 않는지 확인한다.

---

## P-28. Rasterized Technical Diagram

### 벡터로 가능한 구조도를 PNG로 저장

### 문제

- 확대 시 흐림
- 다크모드 대응 어려움
- 텍스트 검색 불가
- 파일 크기 증가

### 개선

가능하면 SVG를 사용한다.

---

## P-29. No Intrinsic Image Dimensions

### `width`와 `height` 없이 이미지 삽입

### 문제

이미지 로딩 중 CLS가 발생한다.

### 개선

빌드 시 실제 크기를 추출해 속성을 넣는다.

---

## P-30. Lazy Loading the LCP Image

### 첫 화면 핵심 이미지까지 lazy load

### 문제

LCP가 늦어진다.

### 개선

첫 화면 대표 이미지는 eager 또는 preload하고, 아래 이미지만 lazy 처리한다.

---

## P-31. Eager Loading Every Image

### 홈 카드 이미지와 본문 이미지를 모두 즉시 로드

### 개선

viewport 아래 자산은 lazy load한다.

---

## P-32. One Image Size for Every Viewport

### 모바일과 데스크톱에 동일한 대형 이미지

### 개선

`srcset`과 `sizes`를 제공한다.

---

## P-33. Generated Asset Staleness

### 제목 변경 후 OG 이미지가 갱신되지 않음

### 개선

입력 hash를 기준으로 파생 자산을 재생성한다.

---

## P-34. Generated Assets Committed Indefinitely

### 파생 파일을 Git에 계속 축적

### 문제

- 저장소 비대화
- merge conflict
- stale 파일 잔존
- 원본과 생성물 혼동

### 개선

배포에서 재생성 가능하면 Git 추적을 피한다.

---

## P-35. Prune by Filename Only

### 파생 자산 정리를 파일명 규칙에만 의존

### 문제

slug 변경, alias, redirect에서 잘못 삭제할 수 있다.

### 개선

현재 content manifest를 기준으로 유효 자산 목록을 만든다.

---

## P-36. Diagram Toolchain in Critical Path

### TikZ·LaTeX 같은 무거운 도구가 모든 배포 빌드에 포함

### 문제

환경 설치가 복잡하고 작은 글 수정도 다이어그램 도구에 의존한다.

### 개선

변경된 다이어그램만 생성하고 결과를 캐시한다.

---
