---
title: "Performance and build efficiency (60 anti-patterns)"
category: performance
item_count: 60
---
# Performance and build efficiency
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-P-01 — Full Corpus Rebuild
- Category: Performance and build efficiency
- Original IDs: P-01
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 글 하나를 수정해도 전체 사이트 재생성

### 증상

- 작은 오탈자 수정에도 모든 Markdown 처리
- 모든 코드 블록 재하이라이팅
- 전체 검색 인덱스 재생성
- 모든 OG 이미지 검사
- 전체 Sitemap·RSS 재생성

### 왜 문제인가

콘텐츠가 적을 때는 단순하지만, 수백 개 글과 수만 개 코드 블록에서는 로컬 개발과 CI 모두 느려진다.

### 개선 방향

```text
개발 빌드
배포 빌드
정기 감사
```

를 분리한다.

---
## AP-P-02 — Heap Expansion as Optimization
- Category: Performance and build efficiency
- Original IDs: P-02
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 빌드 실패를 메모리 증가로 해결

```text
--max-old-space-size=8192
```

### 증상

- 메모리 부족 때마다 heap 상향
- CI runner 사양에 의존
- GC 시간이 계속 증가
- 근본 병목은 측정하지 않음

### 왜 문제인가

메모리 증가는 임시 안전망이지 확장 전략이 아니다.

### 개선 방향

- peak RSS 측정
- 단계별 메모리 사용 측정
- 대형 객체 생명주기 단축
- 콘텐츠 chunk 처리
- 불필요한 AST 유지 제거

---
## AP-P-03 — Build Pipeline Monolith
- Category: Performance and build efficiency
- Original IDs: P-03
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 모든 생성·검사를 하나의 build에 묶음

```text
OG
Search
RSS
Sitemap
Links
Series
Images
Freshness
Style
```

를 한 명령에서 처리한다.

### 문제

- 실패 원인 파악이 어려움
- 빠른 로컬 확인이 불가능
- 경고성 감사도 배포를 막음
- 작은 수정도 전체 파이프라인 실행

### 개선

```text
build:fast
build:release
audit:content
audit:links
generate:assets
```

로 역할을 분리한다.

---
## AP-P-04 — Every Audit Is a Release Blocker
- Category: Performance and build efficiency
- Original IDs: P-04
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 모든 품질 검사가 배포를 차단

### 문제

이미지 없음, 오래된 글, 문체 문제까지 모두 오류로 취급하면 결국 검사 자체를 끄게 된다.

### 개선

```text
ERROR
WARNING
INFO
```

등급을 나눈다.

배포 차단은 깨진 링크, 스키마 오류, 생성 실패처럼 명확한 문제로 제한한다.

---
## AP-P-05 — Parse the Same Content Repeatedly
- Category: Performance and build efficiency
- Original IDs: P-05
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 도구마다 Markdown을 다시 읽음

링크 감사, 시리즈 검사, 검색 생성, 중복 검사, 신선도 검사가 각각 파일을 파싱한다.

### 문제

- I/O와 파싱 비용 중복
- parser 설정 불일치
- front matter 해석 차이
- 규칙 간 결과 충돌

### 개선

한 번 파싱한 공통 content manifest를 모든 도구가 사용한다.

---
## AP-P-06 — AST Retention Explosion
- Category: Performance and build efficiency
- Original IDs: P-06
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 모든 문서 AST를 빌드 끝까지 보관

### 문제

대형 콘텐츠에서 메모리를 급격히 소비한다.

### 개선

- 문서 단위 처리
- 필요한 metadata만 추출
- 처리 후 AST 해제
- 전역 배열에 전체 tree 저장 금지

---
## AP-P-07 — Build-Time Everything
- Category: Performance and build efficiency
- Original IDs: P-07
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 모든 작업을 빌드 시점에 수행

### 증상

- 읽기 시간 계산
- OG 생성
- 링크 그래프
- 검색 인덱스
- 중복 분석
- 이미지 분석
- 모든 변환

### 문제

배포 빌드가 너무 많은 책임을 가진다.

### 개선

변경 빈도에 따라 나눈다.

```text
매 빌드
변경 파일만
주간 배치
수동 감사
```

---
## AP-P-08 — No Build Budget
- Category: Performance and build efficiency
- Original IDs: P-08
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 빌드 시간·메모리 목표가 없음

### 문제

느려져도 “원래 콘텐츠가 많아서”라고 받아들이게 된다.

### 개선

예산을 정한다.

```text
로컬 빠른 검증: 10초 이내
배포 빌드: 5분 이내
peak memory: 4GB 이하
```

환경에 맞게 수치는 조정하되 추세를 기록한다.

---
## AP-P-09 — No Build Regression Tracking
- Category: Performance and build efficiency
- Original IDs: P-09
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 빌드가 느려져도 언제부터인지 모름

### 개선

CI에서 다음을 기록한다.

- 총 시간
- 페이지 수
- 코드 블록 수
- peak memory
- 출력 크기
- 검색 인덱스 크기

변화율이 임계치를 넘으면 경고한다.

---
## AP-P-10 — Content Count as the Only Scale Metric
- Category: Performance and build efficiency
- Original IDs: P-10
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 글 개수만 규모로 봄

### 문제

성능 비용은 글 수보다 다음에 더 크게 좌우될 수 있다.

- 코드 블록 수
- 코드 길이
- 수식 수
- 이미지 수
- 다이어그램 수
- heading 수
- 생성 페이지 수

### 개선

콘텐츠 complexity metric을 별도로 관리한다.

---
## AP-P-11 — Highlight Everything
- Category: Performance and build efficiency
- Original IDs: P-11
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 모든 `<pre>`를 syntax highlighting

로그, 출력, 디렉터리 구조, 레지스터 덤프까지 Shiki로 처리한다.

### 문제

불필요한 토큰화와 HTML 증가가 발생한다.

### 개선

```text
source code
shell command
plain output
log
dump
```

역할을 구분한다.

---
## AP-P-12 — Load Every Language Grammar
- Category: Performance and build efficiency
- Original IDs: P-12
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 사용하지 않는 언어까지 모두 로드

### 문제

초기화 시간과 메모리 사용량이 증가한다.

### 개선

실제 사용하는 언어만 allowlist로 관리한다.

새 언어가 필요할 때 명시적으로 추가한다.

---
## AP-P-13 — Grammar Alias Duplication
- Category: Performance and build efficiency
- Original IDs: P-13
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 같은 언어가 여러 alias로 중복 로드

```text
cpp
c++
cxx
cplusplus
```

### 개선

canonical language id를 정하고 alias는 입력 정규화로 처리한다.

---
## AP-P-14 — Unknown Language Fallback to Heavy Parser
- Category: Performance and build efficiency
- Original IDs: P-14
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 미등록 언어를 무거운 자동 감지로 처리

### 문제

오타 하나가 예측하지 못한 parser 비용을 만든다.

### 개선

알 수 없는 언어는 `text`로 fallback하고 감사에서 경고한다.

---
## AP-P-15 — Dual-Theme HTML Duplication
- Category: Performance and build efficiency
- Original IDs: P-15
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 다크·라이트 테마 토큰을 모두 HTML에 포함

### 문제

코드 블록이 많으면 출력 HTML이 크게 증가한다.

### 개선

현재 방식의 실제 출력 크기를 측정하고, 필요하면 CSS variable 기반 또는 단일 기본 테마를 검토한다.

---
## AP-P-16 — Runtime Highlighting
- Category: Performance and build efficiency
- Original IDs: P-16
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 브라우저에서 코드 하이라이팅

### 문제

- 긴 글에서 main thread 점유
- 첫 렌더 후 layout 변화
- 모바일 성능 저하
- JavaScript 의존

### 개선

기술 블로그는 기본적으로 빌드 타임 highlighting이 적합하다.

---
## AP-P-17 — Line-Level Feature Everywhere
- Category: Performance and build efficiency
- Original IDs: P-17
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 모든 코드 블록에 line number·copy·wrap·mark 기능 적용

### 문제

작은 코드 블록에도 DOM과 CSS가 과도해진다.

### 개선

기능을 코드 블록 길이와 metadata에 따라 선택한다.

---
## AP-P-18 — Full Source in Article
- Category: Performance and build efficiency
- Original IDs: P-18
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 긴 전체 소스를 본문에 포함

### 성능 문제

- 하이라이팅 시간 증가
- HTML 용량 증가
- DOM 노드 증가
- 검색 인덱스 오염

### 개선

본문은 핵심 부분만, 전체 코드는 별도 파일로 제공한다.

---
## AP-P-19 — Full Body Search Index
- Category: Performance and build efficiency
- Original IDs: P-19
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 모든 본문 텍스트를 검색 JSON에 포함

### 문제

- 인덱스 크기 폭증
- 코드·로그 노이즈
- 파싱 시간 증가
- 모바일 메모리 증가

### 개선

제목, 설명, 소제목, 키워드, 핵심 excerpt 중심으로 구성한다.

---
## AP-P-20 — Eager Search Index Loading
- Category: Performance and build efficiency
- Original IDs: P-20
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 검색을 사용하지 않아도 인덱스를 다운로드

### 개선

검색 모달을 열 때 지연 로드한다.

---
## AP-P-21 — Single Giant Search Index
- Category: Performance and build efficiency
- Original IDs: P-21
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 모든 분야를 하나의 거대한 파일로 제공

### 개선

필요하면 Topic이나 콘텐츠 타입별 shard로 나눈다.

```text
search-core.json
search-cpp.json
search-systems.json
```

---
## AP-P-22 — Search Index Includes HTML
- Category: Performance and build efficiency
- Original IDs: P-22
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 렌더링된 HTML 전체 저장

### 문제

태그 제거와 entity 처리 비용이 크고 불필요한 UI 텍스트가 섞인다.

### 개선

렌더링 전의 정제된 검색 문서를 생성한다.

---
## AP-P-23 — Search Snippet Generated at Runtime
- Category: Performance and build efficiency
- Original IDs: P-23
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 브라우저에서 전체 본문을 탐색해 snippet 생성

### 문제

검색할 때마다 문자열 처리 비용이 크다.

### 개선

빌드 시 heading별 짧은 excerpt를 준비한다.

---
## AP-P-24 — Search Ranking on Main Thread
- Category: Performance and build efficiency
- Original IDs: P-24
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 큰 인덱스의 ranking을 UI thread에서 동기 처리

### 문제

입력 중 끊김이 발생한다.

### 개선

- 작은 인덱스 유지
- debounce
- 필요하면 Web Worker 사용
- 결과 개수 제한

---
## AP-P-25 — Index Invalidated by Any Change
- Category: Performance and build efficiency
- Original IDs: P-25
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 글 하나 수정해도 전체 검색 인덱스 재생성

### 개선

문서별 검색 레코드를 생성하고 마지막 병합만 수행하는 증분 방식을 고려한다.

---
## AP-P-26 — Original PNG Everywhere
- Category: Performance and build efficiency
- Original IDs: P-26
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 고해상도 PNG를 그대로 배포

### 문제

기술 다이어그램과 스크린샷이 많으면 페이지 용량이 커진다.

### 개선

- 사진: AVIF/WebP
- 선형 다이어그램: SVG
- 스크린샷: WebP/PNG 선택
- 원본 크기 제한

---
## AP-P-27 — SVG Without Optimization
- Category: Performance and build efficiency
- Original IDs: P-27
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 생성된 SVG에 편집기 metadata와 불필요한 path가 남음

### 개선

SVGO 계열 최적화를 적용하되 수식·텍스트가 깨지지 않는지 확인한다.

---
## AP-P-28 — Rasterized Technical Diagram
- Category: Performance and build efficiency
- Original IDs: P-28
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 벡터로 가능한 구조도를 PNG로 저장

### 문제

- 확대 시 흐림
- 다크모드 대응 어려움
- 텍스트 검색 불가
- 파일 크기 증가

### 개선

가능하면 SVG를 사용한다.

---
## AP-P-29 — No Intrinsic Image Dimensions
- Category: Performance and build efficiency
- Original IDs: P-29
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### `width`와 `height` 없이 이미지 삽입

### 문제

이미지 로딩 중 CLS가 발생한다.

### 개선

빌드 시 실제 크기를 추출해 속성을 넣는다.

---
## AP-P-30 — Lazy Loading the LCP Image
- Category: Performance and build efficiency
- Original IDs: P-30
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 첫 화면 핵심 이미지까지 lazy load

### 문제

LCP가 늦어진다.

### 개선

첫 화면 대표 이미지는 eager 또는 preload하고, 아래 이미지만 lazy 처리한다.

---
## AP-P-31 — Eager Loading Every Image
- Category: Performance and build efficiency
- Original IDs: P-31
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 홈 카드 이미지와 본문 이미지를 모두 즉시 로드

### 개선

viewport 아래 자산은 lazy load한다.

---
## AP-P-32 — One Image Size for Every Viewport
- Category: Performance and build efficiency
- Original IDs: P-32
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 모바일과 데스크톱에 동일한 대형 이미지

### 개선

`srcset`과 `sizes`를 제공한다.

---
## AP-P-33 — Generated Asset Staleness
- Category: Performance and build efficiency
- Original IDs: P-33
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 제목 변경 후 OG 이미지가 갱신되지 않음

### 개선

입력 hash를 기준으로 파생 자산을 재생성한다.

---
## AP-P-34 — Generated Assets Committed Indefinitely
- Category: Performance and build efficiency
- Original IDs: P-34
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 파생 파일을 Git에 계속 축적

### 문제

- 저장소 비대화
- merge conflict
- stale 파일 잔존
- 원본과 생성물 혼동

### 개선

배포에서 재생성 가능하면 Git 추적을 피한다.

---
## AP-P-35 — Prune by Filename Only
- Category: Performance and build efficiency
- Original IDs: P-35
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 파생 자산 정리를 파일명 규칙에만 의존

### 문제

slug 변경, alias, redirect에서 잘못 삭제할 수 있다.

### 개선

현재 content manifest를 기준으로 유효 자산 목록을 만든다.

---
## AP-P-36 — Diagram Toolchain in Critical Path
- Category: Performance and build efficiency
- Original IDs: P-36
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### TikZ·LaTeX 같은 무거운 도구가 모든 배포 빌드에 포함

### 문제

환경 설치가 복잡하고 작은 글 수정도 다이어그램 도구에 의존한다.

### 개선

변경된 다이어그램만 생성하고 결과를 캐시한다.

---
## AP-P-37 — JavaScript for Static Metadata
- Category: Performance and build efficiency
- Original IDs: P-37
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 날짜·읽기 시간·태그 표시를 클라이언트에서 계산

### 개선

빌드 시 HTML로 생성한다.

---
## AP-P-38 — Global Bundle for Page-Specific Features
- Category: Performance and build efficiency
- Original IDs: P-38
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 검색, 댓글, 수식, 관리자 기능 JS가 모든 페이지에 포함

### 개선

페이지 유형별로 나누고 필요할 때만 로드한다.

---
## AP-P-39 — ClientRouter Tax on Every Page
- Category: Performance and build efficiency
- Original IDs: P-39
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 부드러운 전환을 위해 모든 페이지가 라우터 비용 부담

### 문제

기능 자체보다 lifecycle 복잡성이 커질 수 있다.

### 개선

실제 사용자 가치와 성능을 측정하고 progressive enhancement로 유지한다.

---
## AP-P-40 — Duplicate Event Registration After Navigation
- Category: Performance and build efficiency
- Original IDs: P-40
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 페이지 전환 때 이벤트가 계속 중복 등록

### 증상

- 클릭 한 번에 여러 번 실행
- 메모리 증가
- 검색 모달 중복
- 댓글 재생성

### 개선

명시적 dispose와 단일 lifecycle manager를 둔다.

---
## AP-P-41 — Third-Party Script Eager Loading
- Category: Performance and build efficiency
- Original IDs: P-41
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### Giscus·Analytics·AdSense·Newsletter를 즉시 로드

### 문제

초기 네트워크와 main thread를 점유한다.

### 개선

- 댓글: viewport 근처에서 로드
- 뉴스레터: 사용자 상호작용 후
- 광고: 콘텐츠 안정성 고려
- 분석: 최소 구성

---
## AP-P-42 — All Icons in One Library
- Category: Performance and build efficiency
- Original IDs: P-42
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 아이콘 몇 개를 위해 전체 라이브러리 번들

### 개선

정적 SVG 또는 tree-shakable import를 사용한다.

---
## AP-P-43 — Runtime Theme Initialization Flash
- Category: Performance and build efficiency
- Original IDs: P-43
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 테마가 JavaScript 실행 후 적용되어 화면이 번쩍임

### 개선

초기 HTML 전에 작은 inline script로 저장된 테마를 적용하거나 CSS media query를 기본으로 사용한다.

---
## AP-P-44 — Font Loading Cascade
- Category: Performance and build efficiency
- Original IDs: P-44
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 여러 폰트와 weight가 순차 로딩

### 문제

- 텍스트 교체
- CLS
- 네트워크 증가

### 개선

본문·코드 폰트를 최소화하고 실제 사용하는 weight만 제공한다.

---
## AP-P-45 — Local Font Without Subsetting
- Category: Performance and build efficiency
- Original IDs: P-45
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 한글·영문 전체 glyph를 큰 파일로 제공

### 개선

필요한 문자 범위를 분할하거나 시스템 폰트 fallback을 적극 활용한다.

---
## AP-P-46 — Preload Everything
- Category: Performance and build efficiency
- Original IDs: P-46
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 모든 폰트·이미지·스크립트를 preload

### 문제

브라우저 우선순위를 오히려 망친다.

### 개선

LCP와 핵심 폰트처럼 정말 중요한 자원만 preload한다.

---
## AP-P-47 — Prefetch Every Link
- Category: Performance and build efficiency
- Original IDs: P-47
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 글 목록의 모든 링크를 미리 요청

### 문제

콘텐츠가 많은 홈·태그 페이지에서 네트워크 낭비가 크다.

### 개선

hover·viewport·intent 기반으로 제한한다.

---
## AP-P-48 — No JavaScript Failure Fallback
- Category: Performance and build efficiency
- Original IDs: P-48
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### JS가 실패하면 검색·메뉴·탐색이 동작하지 않음

### 개선

기본 링크와 정적 페이지 구조를 유지한다.

---
## AP-P-49 — Utility Class Duplication
- Category: Performance and build efficiency
- Original IDs: P-49
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 같은 긴 Tailwind 조합이 여러 파일에 반복

### 문제

빌드 성능보다 유지보수성과 일관성 비용이 커진다.

### 개선

반복되는 의미 단위를 컴포넌트나 semantic class로 추출한다.

---
## AP-P-50 — DOM Inflation by Decorative Wrappers
- Category: Performance and build efficiency
- Original IDs: P-50
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 스타일을 위해 중첩 `<div>`가 많음

### 문제

장문 글과 많은 카드에서 DOM 크기가 커진다.

### 개선

의미 없는 wrapper를 줄이고 CSS layout을 단순화한다.

---
## AP-P-51 — Heading Anchor DOM Bloat
- Category: Performance and build efficiency
- Original IDs: P-51
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 모든 heading에 복잡한 anchor wrapper와 icon 추가

### 개선

필요한 최소 markup만 사용하고 hover 시 시각화한다.

---
## AP-P-52 — Table Wrapper Everywhere
- Category: Performance and build efficiency
- Original IDs: P-52
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 모든 표에 복잡한 스크롤·복사·caption UI

### 문제

간단한 표에도 많은 DOM과 JS가 추가된다.

### 개선

큰 표나 overflow 가능성이 있는 표에만 강화 기능을 쓴다.

---
## AP-P-53 — Permanent Offscreen UI
- Category: Performance and build efficiency
- Original IDs: P-53
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 검색 모달·메뉴·패널을 항상 DOM에 유지

### 개선

필요할 때 렌더링하거나 최소 markup으로 유지한다.

---
## AP-P-54 — Cold Install Every Build
- Category: Performance and build efficiency
- Original IDs: P-54
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 매번 dependency를 처음부터 설치

### 개선

package manager cache와 lockfile 기반 캐시를 사용한다.

---
## AP-P-55 — Cache Without Correct Key
- Category: Performance and build efficiency
- Original IDs: P-55
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 캐시 key가 너무 넓거나 좁음

### 문제

- 잘못된 artifact 재사용
- 매번 cache miss
- dependency 변경 미반영

### 개선

lockfile, Node 버전, 주요 config hash를 key에 포함한다.

---
## AP-P-56 — Cache Generated Output Blindly
- Category: Performance and build efficiency
- Original IDs: P-56
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### content 변경을 고려하지 않고 build output 캐시

### 문제

오래된 페이지나 OG 이미지가 배포될 수 있다.

### 개선

입력 fingerprint를 명확히 한다.

---
## AP-P-57 — Duplicate Work Across Jobs
- Category: Performance and build efficiency
- Original IDs: P-57
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### build, test, deploy job가 각각 전체 콘텐츠 처리

### 개선

한 번 생성한 artifact를 후속 job에서 재사용한다.

---
## AP-P-58 — Matrix Build Without Value
- Category: Performance and build efficiency
- Original IDs: P-58
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 여러 Node·OS 조합에서 전체 블로그 빌드

### 문제

범용 테마가 아니라 실제 개인 사이트라면 과도할 수 있다.

### 개선

실제 지원 환경만 테스트한다.

---
## AP-P-59 — Heavy Audit on Every Commit
- Category: Performance and build efficiency
- Original IDs: P-59
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### typo 수정에도 전체 중복 분석·신선도 검사

### 개선

변경 파일 기반 감사와 정기 전체 감사를 분리한다.

---
## AP-P-60 — No Changed-File Awareness
- Category: Performance and build efficiency
- Original IDs: P-60
- Source messages: db03d878-4086-406a-be8c-82f75efe9c64
- Merge status: canonical source
### Source material
### 변경 범위를 전혀 활용하지 않음

### 개선

다음은 변경된 문서 중심으로 처리할 수 있다.

- OG 이미지
- 링크 검사
- 이미지 검사
- front matter validation
- 관련 글 후보

---
