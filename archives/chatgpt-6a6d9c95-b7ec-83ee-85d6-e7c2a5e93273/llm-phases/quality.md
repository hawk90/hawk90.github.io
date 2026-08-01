---
title: "Phase 4 — Performance and quality controls"
item_count: 78
---

# Phase 4 — Performance and quality controls

> Execute these tasks in order within this phase. Do not mark a task complete without linking evidence or a verification command.

## PH-E-01 — 빌드 단계별 기준선 측정

- Original task: E-01
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

현재는 전체 빌드가 느리거나 heap을 많이 사용하더라도 어느 단계가 원인인지 분명하지 않을 수 있다.

전체 시간만 기록해서는 다음을 구분할 수 없다.

```text
Markdown 파싱
Shiki 하이라이팅
검색 인덱스
OG 이미지
SVG·다이어그램
링크 검사
Astro 페이지 생성
```

## PH-E-02 — 빌드 명령 역할 분리

- Original task: E-02
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

하나의 `build` 명령이 모든 감사와 생성 작업을 실행하면 로컬 반복 속도가 지나치게 느려진다.

## 권장 명령

```text
dev
check
build
build:release
audit
```

## 역할

### `dev`

```text
로컬 개발 서버
변경 콘텐츠 중심
무거운 전체 감사 제외
```

### `check`

```text
TypeScript
콘텐츠 schema
내부 링크
relation integrity
slug uniqueness
```

### `build`

```text
일반 production 정적 빌드
필수 생성 작업
```

### `build:release`

```text
production build
검색 인덱스
Sitemap
RSS
필수 OG
배포 smoke test
```

### `audit`

```text
전체 외부 링크
중복 후보
오래된 문서
대형 이미지
전체 콘텐츠 품질 리포트
```

## 핵심 원칙

```text
정확성을 위해 반드시 필요한 검사
≠
매번 실행해야 하는 검사
```

## 완료 조건

- 오탈자 수정에 전체 외부 링크 검사가 실행되지 않음
- 로컬에서도 CI와 동일한 필수 검사 실행 가능
- `build`와 `audit`의 실패 의미가 구분됨
- 배포에 필요한 작업은 `build:release` 한 명령으로 재현 가능

## 우선순위

```text
P0
```

---

## PH-E-03 — 공통 Content Manifest 생성

- Original task: E-03
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

현재 가장 큰 구조적 개선 후보다.

검색 생성기, 링크 검사기, Topic Hub, RSS, Sitemap이 각각 Markdown을 읽고 있다면 같은 콘텐츠를 여러 번 파싱하게 된다.

## 목표 구조

```text
Markdown files
      ↓
Content Manifest
      ↓
Pages / Search / RSS / Sitemap / Graph / Audits
```

## Manifest 예시

```ts
interface ContentManifestEntry {
  id: string;
  sourcePath: string;
  slug: string;
  url: string;

  title: string;
  description: string;
  published: string;
  updated?: string;
  lastVerified?: string;

  topic?: string;
  type?: string;
  status: string;

  headings: {
    id: string;
    text: string;
    depth: number;
  }[];

  internalLinks: string[];
  symbols: string[];
  errorMessages: string[];

  contentHash: string;
}
```

## Manifest에 넣지 않을 것

```text
전체 Markdown AST
전체 syntax token
전체 렌더링 HTML
모든 코드 블록 원문
전체 이미지 binary
```

공통 데이터는 유지하되 대형 중간 객체는 빌드 끝까지 보관하지 않는다.

## 완료 조건

- 콘텐츠 파싱 진입점이 한 곳으로 통합됨
- 검색·Sitemap·RSS가 동일한 공개 정책을 사용함
- 문서마다 안정적인 `contentHash`가 생성됨
- AST는 필요한 단계 이후 해제됨

## 우선순위

```text
P0
```

## 예상 난도

```text
높음
```

하지만 이후의 검색·링크·증분 빌드를 모두 단순화하기 때문에 수익률이 크다.

---

## PH-E-04 — Publication Policy 중앙화

- Original task: E-04
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

현재 각 생성기가 다음을 각각 판단하면 안 된다.

```text
이 글은 공개하는가?
검색에 넣는가?
Sitemap에 넣는가?
RSS에 넣는가?
Hub에 노출하는가?
```

## 권장 함수

```ts
interface PublicationDecision {
  render: boolean;
  index: boolean;
  includeInSearch: boolean;
  includeInSitemap: boolean;
  includeInRss: boolean;
  includeInHubLists: boolean;
}

function getPublicationDecision(
  entry: ContentManifestEntry,
  environment: "development" | "production"
): PublicationDecision
```

## 예시 정책

```text
draft
→ production render 제외

current
→ 모든 일반 출력 포함

needs-review
→ render/search/sitemap 포함, Featured 제외

historical
→ render/search 포함, ranking 감점

superseded
→ render 가능, 일반 추천·Featured 제외

archived
→ 직접 URL만 유지하거나 일반 목록 제외
```

## 완료 조건

- 검색과 Sitemap의 문서 집합이 충돌하지 않음
- Draft가 어느 생성물에도 새지 않음
- 상태 정책 변경이 한 곳에서 가능
- 각 컴포넌트가 상태 분기 로직을 다시 구현하지 않음

## 우선순위

```text
P0
```

---

## PH-E-05 — Markdown 다중 파싱 제거

- Original task: E-05
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

## 탐지 방법

코드베이스에서 다음 패턴을 찾는다.

```text
glob Markdown
gray-matter parse
remark parse
getCollection 반복 호출
본문 문자열 재처리
```

도구마다 별도로 파일을 순회하고 있다면 공통 manifest로 이동한다.

## 허용되는 예외

실제 렌더링용 AST와 검색용 metadata 추출은 요구가 다를 수 있다.

그러나 최소한:

```text
front matter
URL
상태
Topic
heading
링크
hash
```

는 한 번만 추출한다.

## 완료 조건

- 동일 문서의 metadata 파싱 횟수가 한 빌드에서 최소화됨
- 링크 검사기가 Markdown 파일을 다시 읽지 않음
- Topic Hub가 별도로 front matter를 재해석하지 않음

## 우선순위

```text
P0
```

---

## PH-E-06 — AST 생명주기 제한

- Original task: E-06
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

모든 글의 AST를 배열에 저장하면 콘텐츠가 증가할수록 Peak RSS가 커진다.

## 나쁜 흐름

```text
전체 문서 읽기
→ 전체 AST 보관
→ 모든 transformation
→ 모든 출력 완료 후 해제
```

## 권장 흐름

```text
문서 1개 읽기
→ 필요한 metadata 추출
→ 렌더 또는 중간 파일 생성
→ AST 해제
→ 다음 문서
```

일부 전역 분석에는 전체 문서 정보가 필요하지만, 이때도 전체 AST가 아니라 작은 manifest만 사용한다.

## 완료 조건

- 전역 배열에 Markdown AST나 syntax token이 없음
- 문서 처리 후 참조가 제거됨
- Peak RSS가 문서 수에 거의 선형으로 증가하지 않음
- heap 확대 없이 빌드가 가능한지 재검토됨

## 우선순위

```text
P0
```

---

## PH-E-07 — Shiki 처리량 측정

- Original task: E-07
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

코드 블록이 많은 기술 블로그에서는 syntax highlighting이 가장 큰 병목일 가능성이 있다.

## 먼저 측정할 것

```text
전체 코드 블록 수
언어별 코드 블록 수
평균 코드 길이
상위 20개 대형 코드 블록
하이라이팅 총 시간
생성 HTML 크기
```

## 언어 분포 예시

```text
cpp: 3,200
c: 1,850
bash: 1,100
text: 980
python: 430
rust: 310
unknown: 74
```

이 자료가 있어야 어떤 grammar를 실제로 유지할지 판단할 수 있다.

## 완료 조건

- 사용 언어 분포가 확인됨
- `text`, 로그, 출력이 코드 하이라이팅 대상과 구분됨
- 상위 대형 코드 블록이 식별됨
- Shiki가 전체 빌드에서 차지하는 비율이 측정됨

## 우선순위

```text
P0
```

---

## PH-E-08 — 코드 블록 역할 분리

- Original task: E-08
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

현재 모든 fenced block이 코드로 취급된다면 다음도 syntax highlighting을 받을 수 있다.

```text
터미널 출력
커널 로그
디렉터리 구조
레지스터 덤프
ASCII 다이어그램
설정 결과
```

## 권장 role

```text
source
command
output
log
dump
text
```

Markdown metadata 예시:

````markdown
```bash role="command"
cmake --build build
```

```text role="output"
[100%] Built target analyzer
```

```text role="log"
pci 0000:01:00.0: BAR 0: assigned
```
````

## 처리 정책

| 역할 | Highlight | 검색 symbol 추출 | 기본 wrap |
|---|---|---|---|
| source | 예 | 예 | 아니오 |
| command | 예 | 제한적 | 아니오 |
| output | 아니오 또는 최소 | 아니오 | 선택 |
| log | 아니오 또는 최소 | 오류만 | 선택 |
| dump | 아니오 | 아니오 | 아니오 |
| text | 아니오 | 아니오 | 예 |

## 완료 조건

- 로그와 출력이 무거운 grammar를 사용하지 않음
- 검색 인덱스에 전체 로그가 들어가지 않음
- UI에서 명령과 출력이 구분됨
- 기존 콘텐츠는 기본값으로 계속 렌더링 가능

## 우선순위

```text
P1
```

---

## PH-E-09 — Shiki 언어 Allowlist

- Original task: E-09
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

사용하지 않는 언어 grammar까지 모두 로드할 필요가 없다.

## 작업

실제 언어 통계를 기준으로 allowlist를 만든다.

```ts
const SUPPORTED_LANGUAGES = [
  "c",
  "cpp",
  "bash",
  "python",
  "rust",
  "toml",
  "yaml",
  "json",
  "cmake",
  "asm",
  "text",
] as const;
```

## Alias 정규화

```text
c++ → cpp
cxx → cpp
shell → bash
sh → bash
plaintext → text
console → text 또는 shell-session
```

## 미등록 언어

무거운 자동 감지 대신 `text`로 fallback하고 warning을 남긴다.

```text
Unknown code language "cuu" in post X; rendered as text.
```

## 완료 조건

- grammar 로드 목록이 명시적
- alias가 한 곳에서 관리됨
- 오타가 빌드 메모리를 예측 불가능하게 늘리지 않음
- 사용하지 않는 grammar가 제거됨

## 우선순위

```text
P1
```

---

## PH-E-10 — 코드 하이라이팅 캐시

- Original task: E-10
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

동일한 코드와 동일한 테마·옵션이면 결과도 동일하다.

## Cache key

```text
hash(
  code
  + canonicalLanguage
  + themeVersion
  + pluginOptions
)
```

## 저장 대상

```text
highlighted HTML
또는
필요한 token 결과
```

## 주의

캐시는 정확한 무효화 정책 없이 도입하면 stale 결과를 만든다.

다음이 바뀌면 무효화해야 한다.

```text
Shiki 버전
테마
코드 옵션
line highlighting metadata
renderer version
```

## 적용 우선순위

1차 개선에서 캐시를 바로 구현하지 않아도 된다.

먼저:

```text
로그 highlighting 제거
grammar 축소
대형 전체 소스 분리
```

를 적용한다.

그 이후에도 Shiki가 주 병목이면 캐시를 추가한다.

## 완료 조건

- cache key에 renderer version 포함
- cache miss/hit 수가 측정됨
- 캐시 삭제 후에도 전체 재생성 가능
- 캐시가 Git 원본으로 취급되지 않음

## 우선순위

```text
P2
```

---

## PH-E-11 — 대형 코드 블록 감사

- Original task: E-11
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

하이라이팅 비용과 페이지 DOM을 동시에 줄이는 작업이다.

## 리포트

```text
문서
heading
language
line count
character count
generated HTML size
```

## 검토 기준

다음은 분리 후보다.

```text
200줄 이상
설명 없이 전체 파일 삽입
본문에서 일부만 참조
동일 코드가 여러 글에 중복
```

## 개선 방법

```text
핵심 부분만 본문에 포함
생략부 명시
전체 소스는 GitHub permalink
함수 단위로 분할
```

## 주의

길다고 무조건 제거하지 않는다. Source Walkthrough에서 전체 문맥이 필요한 경우도 있다.

## 완료 조건

- 상위 20개 대형 코드 블록 검토
- 불필요한 전체 파일 삽입 축소
- 본문 코드와 외부 전체 소스 역할 구분
- 검색 인덱스와 DOM 크기 감소 확인

## 우선순위

```text
P1
```

---

## PH-E-12 — 변경 파일 인식

- Original task: E-12
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

모든 작업을 완전 증분화하기 전에, 최소한 변경 범위를 인식하도록 한다.

## 변경 입력

```text
Git diff
content hash
generator config hash
```

## 변경 파일 기반으로 처리 가능한 작업

```text
front matter validation
OG 이미지
이미지 경로 검사
문서별 검색 레코드
내부 outgoing link 검사
다이어그램 생성
```

## 전체 검사가 필요한 작업

```text
slug uniqueness
전체 relation integrity
redirect cycle
Sitemap 병합
검색 인덱스 최종 병합
```

## 완료 조건

- 변경 문서 목록을 한 번 계산해 여러 단계가 공유
- 문서별 작업과 전역 작업이 구분됨
- main release에서는 필요한 전체 불변조건을 계속 검사

## 우선순위

```text
P1
```

---

## PH-E-13 — 문서별 파생 레코드 생성

- Original task: E-13
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

검색 인덱스 전체를 매번 처음부터 만드는 대신 문서별 레코드를 생성할 수 있다.

```text
.cache/search/<content-id>.json
```

## 재생성 조건

```text
contentHash 변경
search schema 변경
alias registry 변경
extractor version 변경
```

마지막에는 공개 가능한 레코드만 병합한다.

```text
문서별 레코드
→ publication filter
→ search-index.json
```

## 장점

- 글 하나 수정 시 추출 비용 감소
- 삭제 문서 식별 가능
- 검색 생성 문제를 문서 단위로 디버깅 가능

## 주의

최종 병합 자체는 전체 문서 집합을 확인해야 한다.

## 우선순위

```text
P1
```

---

## PH-E-14 — OG 이미지 증분 생성

- Original task: E-14
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

모든 글의 OG 이미지를 매번 다시 만들 필요는 없다.

## 입력 hash

```text
문서 제목
부제목
Topic
작성자
템플릿 버전
폰트 버전
생성기 버전
```

이미지 파일의 존재만으로 재사용하지 말고 입력 hash를 비교한다.

## Manifest 예시

```json
{
  "pcie-bar-sizing": {
    "inputHash": "abc123",
    "output": "pcie-bar-sizing.png",
    "generatorVersion": "2"
  }
}
```

## 필수와 선택 구분

### 필수 OG

```text
홈
Topic Hub
Featured Guide
```

### 선택 OG

일반 글은 생성 실패 시 기본 공유 이미지를 사용할 수 있다.

## 완료 조건

- 변경된 문서만 OG 재생성
- 제목 변경이 반드시 자산 갱신으로 이어짐
- 삭제 글의 전용 OG가 정리됨
- 생성 실패가 조용히 무시되지 않음

## 우선순위

```text
P1
```

---

## PH-E-15 — 다이어그램 파이프라인 격리

- Original task: E-15
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

TikZ·LaTeX·Graphviz 같은 도구를 모든 production build의 필수 경로에 두면 환경 재현성이 낮아진다.

## 권장 구조

```text
diagram source
→ 별도 generate command
→ optimized SVG
→ 일반 Astro build가 SVG 사용
```

## 실행 조건

```text
source hash 변경
generator version 변경
명시적 전체 재생성
```

## PR 정책

외부 기여가 가능하다면 위험한 generator를 고권한 배포 job에서 직접 실행하지 않는다.

## 완료 조건

- 일반 텍스트 수정은 LaTeX 설치 없이 빌드 가능
- 변경된 다이어그램만 재생성
- source와 output 관계가 manifest에 존재
- 생성 결과가 없을 때 오류 또는 명확한 fallback

## 우선순위

```text
P1
```

---

## PH-E-16 — 이미지 처리 정책

- Original task: E-16
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

모든 이미지를 매번 다시 최적화하지 않는다.

## 원본과 파생물

```text
assets/source/
assets/generated/
```

또는 논리적으로라도 구분한다.

## 입력 hash

```text
원본 파일 hash
출력 크기
format
quality
transformer version
```

## 문서별 검사

변경된 문서의 이미지에 대해서만:

```text
존재 여부
width·height
대형 파일
alt 후보
```

를 확인한다.

전체 미사용 이미지 감사는 정기 작업으로 돌린다.

## 우선순위

```text
P1
```

---

## PH-E-17 — CI Job 분리

- Original task: E-17
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

## 권장 파이프라인

### Job 1: Fast validation

```text
install
schema
internal links
relations
typecheck
```

### Job 2: Build

```text
production build
search
RSS
Sitemap
required assets
```

### Job 3: Smoke test

```text
generated dist serve
대표 URL 확인
대표 asset 확인
검색 JSON parse
```

### Job 4: Deploy

```text
artifact 다운로드
GitHub Pages 배포만 수행
```

## 핵심 보안·성능 효과

- build job는 `contents: read`
- deploy job만 최소 write 권한
- build를 여러 job에서 반복하지 않음
- 생성 artifact를 재사용

## 완료 조건

- 배포 job가 dependency build를 다시 실행하지 않음
- 테스트한 artifact와 배포 artifact가 동일
- deploy 권한이 build script에 노출되지 않음
- 실패 단계가 명확히 구분됨

## 우선순위

```text
P0
```

---

## PH-E-18 — Dependency 설치 캐시

- Original task: E-18
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

캐시부터 최적화하기 전에 lockfile 기반 재현성을 먼저 확보한다.

## Cache key 후보

```text
OS
Node major
package manager version
lockfile hash
```

## 캐시 대상

package manager가 권장하는 다운로드 캐시를 우선한다.

`node_modules` 전체 캐시는 환경 차이로 문제를 만들 수 있으므로 도구 권장 방식에 따른다.

## 완료 조건

- lockfile 변경 시 캐시 무효화
- Node 버전 변경 시 캐시 분리
- cache hit 여부가 CI 로그에 나타남
- 캐시를 지워도 정상 빌드 가능

## 우선순위

```text
P1
```

---

## PH-E-19 — 동일 작업의 Job 간 중복 제거

- Original task: E-19
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

다음 구조는 피한다.

```text
test job: install + full build
build job: install + full build
deploy job: install + full build
```

## 권장

```text
validation
+
한 번의 release build
+
artifact 기반 smoke test·deploy
```

필요한 경우 validation job는 작은 fixture 또는 manifest 검사만 수행한다.

## 완료 조건

- 전체 Astro build는 파이프라인에서 한 번
- 검색 인덱스도 한 번 생성
- OG와 다이어그램이 여러 job에서 반복 생성되지 않음

## 우선순위

```text
P0
```

---

## PH-E-20 — 메모리 증설을 완료 조건으로 삼지 않기

- Original task: E-20
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

현재 `--max-old-space-size=8192` 같은 설정이 있다면 즉시 제거할 필요는 없다.

먼저 안전망으로 유지하면서 원인을 줄인다.

## 개선 순서

```text
1. 단계별 측정
2. AST retention 제거
3. Markdown 다중 파싱 제거
4. Shiki 범위 축소
5. 파생 작업 증분화
6. 그 후 heap 설정 재평가
```

## 완료 기준

다음 중 하나가 되어야 한다.

```text
8GB 설정 없이 안정적 빌드
또는
큰 heap이 필요한 정확한 이유가 문서화됨
```

## 피해야 할 판단

```text
빌드 성공
→ 메모리 문제 해결
```

GC 시간이 길어지고 CI 사양 의존성이 커졌다면 해결된 것이 아니다.

---

## PH-E-21 — 빌드 예산 설정

- Original task: E-21
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

현재 기준선을 측정한 다음 현실적인 예산을 정한다.

## 예산 항목

```text
Fast validation 시간
Release build 시간
Peak RSS
검색 인덱스 압축 크기
전체 JS
대표 글 HTML 크기
dist 총량
```

## 예시

수치는 측정 후 정해야 하지만 형태는 다음과 같다.

```text
Fast validation: 30초 이내
Release build p95: 현재 기준 +10% 이내
Peak RSS: 4GB 이하
Search index gzip: 500KB 이하
Homepage JS: 기존 대비 증가 없음
```

## 중요

임의의 이상적인 수치를 먼저 정하지 않는다.

```text
현재 baseline
→ 허용 회귀율
→ 점진적 목표
```

순서로 정한다.

## 우선순위

```text
P1
```

---

## PH-E-22 — 빌드 회귀 리포트

- Original task: E-22
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

각 release build에 다음을 artifact로 남긴다.

```json
{
  "commit": "abc123",
  "documents": 532,
  "pages": 711,
  "codeBlocks": 8412,
  "durationMs": 62800,
  "peakRssMb": 3410,
  "searchIndexBytes": 412880,
  "distBytes": 184220000
}
```

## 비교 규칙

```text
빌드 시간 +20%
Peak RSS +20%
검색 인덱스 +20%
JS +15%
```

같은 변화가 발생하면 경고한다.

처음부터 배포를 차단하지 말고 추세를 관찰한 뒤 기준을 강화한다.

## 완료 조건

- 최근 build와 이전 build 비교 가능
- 콘텐츠 증가와 성능 회귀를 구분 가능
- 급격한 변화가 로그에서 바로 보임

## 우선순위

```text
P1
```

---

## PH-E-23 — 대표 복잡도 페이지 Canary 선정

- Original task: E-23
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

전체 평균만으로는 극단적으로 무거운 글 문제를 찾기 어렵다.

## Canary 후보

```text
코드 블록이 가장 많은 글
표가 가장 넓은 글
다이어그램이 가장 많은 글
수식이 많은 글
일반 대표 Guide
```

## 검사 항목

```text
HTML 크기
DOM node 수
render 시간
모바일 스크롤
코드 가로 overflow
TOC 길이
```

## 완료 조건

- 3~5개 canary 페이지 고정
- 주요 UI·빌드 변경에서 반복 검증
- 가장 깨끗한 글만 테스트하지 않음

## 우선순위

```text
P1
```

---

## PH-E-24 — 배포 결과 Smoke Test

- Original task: E-24
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

빌드 성공 뒤 실제 `dist`를 로컬 서버로 열어 검사한다.

## 최소 URL

```text
/
대표 Guide
PCIe & CXL Hub
Firmware & Bootloader Hub
검색 페이지
404
```

## 검사

```text
HTTP 200 또는 예상 상태
title 존재
canonical 존재
H1 하나
주요 CSS·JS 로드
검색 JSON parse
대표 이미지 존재
내부 핵심 링크 유효
```

## 완료 조건

- source가 아니라 최종 `dist` 검사
- GitHub Pages의 실제 base path 조건 반영
- 배포 전 자동 실행
- 외부 광고·댓글 실패는 본문 성공에 영향 없음

## 우선순위

```text
P0
```

---

## PH-E-25 — 실패 등급 분리

- Original task: E-25
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

모든 감사가 release blocker가 되면 결국 검사를 끄게 된다.

## Error

```text
schema 불일치
중복 URL
없는 내부 문서
필수 asset 누락
검색 JSON 생성 실패
production build 실패
```

## Warning

```text
description 누락
대형 코드 블록
오래된 외부 링크
needs-review 장기 방치
대형 이미지
```

## Info

```text
새로운 alias 후보
중복 가능성
Hub 편입 후보
읽기 환경 보완 제안
```

## 완료 조건

- 각 rule의 severity가 명시됨
- Warning만으로 배포가 막히지 않음
- 중요한 오류가 수백 개 warning에 묻히지 않음

## 우선순위

```text
P0
```

---

## PH-E-26 — 외부 링크 검사를 정기 작업으로 이동

- Original task: E-26
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

외부 URL은 일시 장애와 rate limit 때문에 CI를 불안정하게 만든다.

## 매 변경마다

```text
내부 링크
내부 anchor
문서 ID
redirect target
```

## 주간 또는 월간

```text
외부 링크
최종 redirect
HTTP 상태
반복 실패
```

## 결과 정책

```text
1회 실패 → 기록
연속 실패 → warning
핵심 출처 반복 실패 → 수동 검토
```

## 완료 조건

- 외부 네트워크 장애가 일반 배포를 막지 않음
- 반복 실패 링크는 추적됨
- 핵심 사양·소스 링크는 높은 우선순위로 표시됨

## 우선순위

```text
P1
```

---

## PH-E-27 — 로컬 Fast Path

- Original task: E-27
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

콘텐츠 한 문장을 수정할 때 전체 검색·OG·외부 감사를 기다리면 작업 흐름이 나빠진다.

## 로컬 기본 흐름

```text
Astro dev
변경 문서 schema
변경 문서 링크
필요한 렌더링만
```

## 명시적으로 실행

```text
npm run check
npm run build:release
npm run audit
```

## 완료 조건

- 일반 글 편집이 무거운 파이프라인을 자동 실행하지 않음
- push 전 필수 검사는 한 명령으로 수행 가능
- release 결과와 로컬 빠른 경로의 역할 차이가 문서화됨

## 우선순위

```text
P1
```

---

## PH-E-28 — 빌드 환경 고정

- Original task: E-28
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

재현성 없는 빌드는 성능 측정도 신뢰할 수 없다.

## 고정할 것

```text
Node 버전
package manager 버전
lockfile
Python 버전
다이어그램 도구 버전
locale
timezone
```

## 특히 날짜

게시일과 Sitemap 날짜가 CI timezone에 따라 달라지지 않게 한다.

```text
Asia/Seoul로 표시할 것
UTC로 저장할 것
```

중 하나를 명확히 결정한다.

## 완료 조건

- 로컬과 CI의 주요 버전이 일치
- 빌드 결과가 실행 locale에 따라 달라지지 않음
- 같은 commit에서 불필요한 생성 diff가 발생하지 않음

## 우선순위

```text
P0
```

---

## PH-E-29 — 생성물 Source of Truth 명확화

- Original task: E-29
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

## Source

```text
Markdown
Topic registry
Hub config
alias registry
diagram source
redirect manifest
```

## Derived

```text
검색 인덱스
Sitemap
RSS
OG 이미지
optimized SVG
content graph
```

Derived data는 언제든 재생성 가능해야 한다.

## 완료 조건

- 생성 파일을 수동 수정하지 않음
- 생성물에 generator version과 input hash 존재
- source와 artifact 디렉터리가 구분됨
- stale artifact를 manifest 기준으로 정리 가능

## 우선순위

```text
P0
```

---

## PH-E-30 — 성능 최적화 종료 조건

- Original task: E-30
- Source message: 2441cf15-fe36-456b-8e79-1810b160624e
- Status: pending

### Task details

최적화가 끝없이 이어지면 안 된다.

이번 Epic은 다음이 충족되면 1차 완료로 본다.

```text
병목 단계가 측정된다
공통 manifest가 존재한다
중복 Markdown 파싱이 줄었다
Shiki 범위가 정리됐다
빌드·감사 명령이 분리됐다
검색·OG·다이어그램이 변경 기반으로 동작한다
CI에서 build가 한 번만 실행된다
Peak RSS와 시간 회귀를 확인할 수 있다
```

Lighthouse 100이나 모든 작업의 완전 증분화는 완료 조건이 아니다.

---

## PH-H-01 — 테스트 계층 확정

- Original task: H-01
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

테스트를 네 계층으로 나눈다.

```text
1. Content validation
2. Build integration
3. Browser smoke test
4. Scheduled audit
```

## PH-H-02 — 빠른 Content Validation 명령

- Original task: H-02
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

권장 명령:

```bash
npm run check:content
```

포함할 검사:

```text
front matter schema
content ID
slug uniqueness
Topic ID 존재
type·status enum
날짜 형식
필수 description
relation 대상 존재
자기 참조
상태 불변조건
```

## 상태 불변조건 예

```text
superseded → featured 불가
archived → home 노출 불가
draft → Sitemap 불가
noindex → Sitemap 불가
featured → status=current
```

## 오류 출력 예

```text
ERROR [content/status-featured]
src/content/posts/old-pcie-bar.md

A superseded document cannot be featured.
Suggested action: remove it from featured config or set a valid current replacement.
```

## 완료 조건

- 파일명과 문제 위치가 표시됨
- 오류 이유와 수정 방향이 나옴
- JSON 또는 SARIF 출력 가능성 검토
- 로컬과 CI가 같은 명령을 사용

## 우선순위

```text
P0
```

---

## PH-H-03 — Content Fixture 세트 생성

- Original task: H-03
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

실제 전체 콘텐츠만으로 parser와 schema를 테스트하면 edge case를 재현하기 어렵다.

## 최소 fixture

```text
valid-guide.md
valid-debug-note.md
historical-post.md
invalid-status.md
missing-topic.md
duplicate-slug.md
broken-relation.md
korean-heading.md
long-code-block.md
raw-html.md
```

## fixture의 목적

각 파일은 하나 또는 소수의 동작만 재현한다.

예:

```yaml
---
title: Duplicate URL
slug: pcie-bar
status: current
type: concept
topic: pcie-cxl
---
```

다른 fixture와 동일 slug를 사용해 충돌을 검증한다.

## 피해야 할 것

- 실제 게시글 전체 복사
- fixture 자체가 수백 줄
- 여러 오류를 한 파일에 몰아넣기
- production 문서 변경에 따라 fixture도 계속 수정

## 완료 조건

- 주요 콘텐츠 타입 fixture 존재
- 실패해야 하는 fixture와 예상 오류 정의
- 한글·영문·특수문자 사례 포함
- parser 변경 시 빠르게 실행 가능

## 우선순위

```text
P1
```

---

## PH-H-04 — Internal Link 검사

- Original task: H-04
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

매 변경마다 검사한다.

## 검사 대상

```text
없는 내부 URL
없는 content ID
깨진 heading anchor
draft 문서 링크
archived 문서의 일반 추천
redirect를 거치는 내부 링크
```

## Anchor 검사

원본 heading 문자열이 아니라 실제 생성된 heading ID를 사용한다.

```text
Markdown
→ heading manifest
→ link target validation
```

예:

```markdown
[BAR 탐색](./pcie-bar/#size-probing)
```

검증 대상:

```text
해당 문서 존재
`size-probing` ID 존재
```

## Redirect debt

내부 링크가 redirect를 통과하면 warning으로 처리한다.

```text
WARNING:
`/old-pcie-bar/` redirects to `/pcie-bar-sizing/`.

Update the internal link to the canonical URL.
```

## 완료 조건

- 내부 링크는 매 commit 검사
- 코드 블록 안 URL은 검사 대상에서 제외
- Markdown reference link도 지원
- redirect target가 아니라 최종 canonical로 연결

## 우선순위

```text
P0
```

---

## PH-H-05 — Relation Integrity 검사

- Original task: H-05
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

대표 문서와 Hub 관계가 깨지지 않게 한다.

## 검사 대상

```text
parent
prerequisites
next
related
supersedes
```

## 불변조건

```text
대상 문서 존재
자기 참조 없음
중복 relation 없음
supersedes cycle 없음
archived 문서를 next로 추천하지 않음
동일 글이 여러 UI slot에 중복되지 않음
```

## Cycle 검사

특히 다음 관계는 cycle이 없어야 한다.

```text
supersedes
next
필수 prerequisite
```

`related`는 양방향 또는 cycle이 있어도 괜찮다.

## 완료 조건

- 존재하지 않는 문서 ID 차단
- cycle 경로가 오류에 표시됨
- inverse relation이 필요한 경우 자동 파생 또는 검증
- 구판이 대표 경로에 들어오지 않음

## 우선순위

```text
P0
```

---

## PH-H-06 — Topic Hub Validation

- Original task: H-06
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

각 Hub가 단순 빈 껍데기로 공개되지 않게 한다.

## 검사 항목

```text
고유 title
고유 description
Start Here 1~3개
Featured 3~6개
관련 Topic 최소 1개
모든 문서 current 또는 허용 상태
중복 article ID 없음
```

## 예외 처리

초기 구축 중인 Hub는 production에서 숨기거나 `noindex`할 수 있다.

하지만 공개 Hub라면 완성 기준을 적용한다.

## 완료 조건

- 빈 Hub 생성 없음
- Start Here가 발행순으로 자동 결정되지 않음
- Featured에 `needs-review`나 `superseded` 없음
- Hub 링크가 모두 실제 문서로 연결

## 우선순위

```text
P0
```

---

## PH-H-07 — Featured Content Validation

- Original task: H-07
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

홈의 Featured는 사이트 대표 문서이므로 일반 글보다 강한 기준을 적용한다.

## 필수 조건

```text
status=current
description 존재
Primary Topic 존재
type 지정
canonical URL 존재
상위 Hub 연결
```

환경이나 버전이 중요한 글은:

```text
lastVerified 또는 명시적인 historical scope
```

가 필요하다.

## 추가 검사

```text
Featured 4~6개
같은 Topic으로 과도하게 편중되지 않음
동일 검색 의도의 중복 문서 없음
```

Topic 다양성은 자동 오류보다 warning이 적절하다.

## 완료 조건

- Featured 설정 오류가 build 전에 차단됨
- 구판이 홈에 노출되지 않음
- 모든 Featured 링크가 200 응답
- Featured 카드 metadata 누락 없음

## 우선순위

```text
P0
```

---

## PH-H-08 — Publication Set 일치 검사

- Original task: H-08
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

다음 생성물이 서로 다른 문서 정책을 사용하면 안 된다.

```text
렌더링 페이지
검색 인덱스
Sitemap
RSS
Topic Hub 자동 목록
```

## 집합 검사

예:

```text
renderedCurrentArticles
searchCurrentArticles
sitemapCurrentArticles
```

를 비교한다.

## 허용되는 차이

```text
Historical:
렌더링·검색에는 포함
Sitemap은 선별

Archived:
직접 URL 유지
검색·RSS·Hub에서 제외
```

차이는 Publication Policy에 명시돼 있어야 한다.

## 자동 오류 예

```text
ERROR:
Draft document `private-xrt-note` exists in search-index.json.
```

```text
ERROR:
Noindex URL `/tags/misc/` is included in sitemap.xml.
```

## 완료 조건

- 공통 Publication Policy 사용
- 예외가 코드 여러 곳에 흩어지지 않음
- Draft·Search·Admin이 공개 목록에 없음
- 삭제 글의 stale 검색 레코드 없음

## 우선순위

```text
P0
```

---

## PH-H-09 — Production Build 통합 테스트

- Original task: H-09
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

권장 명령:

```bash
npm run build:release
```

반드시 다음을 실제로 생성한다.

```text
HTML
CSS·JS
검색 인덱스
Sitemap
RSS
필수 OG
Topic Hub
404
```

## 검사할 실패

```text
unknown syntax grammar
생성 asset 누락
잘못된 base path
JSON serialization 오류
duplicate route
Markdown transformation 오류
```

## 완료 조건

- main merge 전 production build 실행
- build가 최종 배포 설정을 사용
- dev server 성공만으로 배포하지 않음
- build artifact가 이후 smoke test와 deploy에 재사용됨

## 우선순위

```text
P0
```

---

## PH-H-10 — 최종 `dist` 구조 검사

- Original task: H-10
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

원본이 아니라 배포물을 검사한다.

## 기본 검사

```text
HTML 파일 수
예상하지 못한 확장자
숨김 파일
.env
backup 파일
source map
admin bundle
secret pattern
```

## 파일 크기 검사

```text
대형 HTML
대형 JS
대형 CSS
대형 이미지
검색 인덱스
```

예:

```text
WARNING:
`/posts/cuda-complete-guide/index.html` is 3.8 MB.
Largest contributors: code blocks, line-number markup.
```

## 완료 조건

- 민감 파일이 artifact에 없음
- 관리자 자산이 없음
- 예상 밖의 대형 파일이 보고됨
- 배포 파일 목록을 artifact로 보존 가능

## 우선순위

```text
P0
```

---

## PH-H-11 — Dist HTTP Smoke Test

- Original task: H-11
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

생성된 `dist`를 실제 HTTP 서버로 제공하고 검사한다.

```bash
npm run preview:dist
npm run test:smoke
```

## 최소 URL

```text
/
PCIe & CXL Hub
Firmware & Bootloader Hub
대표 Guide 2개
Historical 문서 1개
검색
About
Privacy
Editorial Policy
존재하지 않는 URL
```

## 검사 항목

```text
예상 HTTP status
title
meta description
canonical
H1 하나
주요 내비게이션
CSS·JS 로드
핵심 내부 링크
```

## 404

존재하지 않는 URL은 404 동작을 확인한다.

GitHub Pages의 실제 404 제공 특성도 고려해 테스트 환경과 운영 환경 차이를 문서화한다.

## 완료 조건

- 대표 URL 모두 정상
- 404가 soft 404 형태로 200 응답하지 않음
- 자산 경로가 production base에서 정상
- 외부 댓글·광고 실패와 무관하게 본문 표시

## 우선순위

```text
P0
```

---

## PH-H-12 — SEO Metadata 회귀 검사

- Original task: H-12
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

모든 indexable 페이지에서 검사한다.

```text
title
description
canonical
robots
Open Graph
published
updated
author
```

## 불변조건

```text
title 비어 있지 않음
H1과 title이 완전히 무관하지 않음
description 존재
canonical은 HTTPS production URL
noindex URL은 Sitemap 제외
preview origin 없음
```

## 중복 감사

- title 완전 중복
- description 완전 중복
- canonical 중복
- 여러 페이지가 같은 OG URL 사용

일부 공통 정책 페이지는 예외가 있을 수 있지만, 일반 글은 고유해야 한다.

## 완료 조건

- 대표 페이지는 PR마다 검사
- 전체 중복 검사는 release 또는 정기 audit
- canonical target가 실제 페이지임
- 날짜가 미래로 설정되지 않음

## 우선순위

```text
P0
```

---

## PH-H-13 — 구조화 데이터 검사

- Original task: H-13
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

대표 페이지 대상으로만 시작한다.

## 페이지

```text
홈
Topic Hub
Guide
Debug Note
About
```

## 검사

```text
유효 JSON-LD
페이지 내용과 일치
canonical 일치
author 일치
날짜 일치
Breadcrumb URL 일치
```

## 피해야 할 것

- 화면에 없는 review
- 가짜 rating
- 모든 글을 HowTo로 표시
- About 페이지를 Article로 표시
- `lastVerified`를 게시일처럼 사용

## 완료 조건

- JSON parse 오류 없음
- schema type이 페이지 역할과 일치
- 실제 화면에 없는 정보 없음
- 구조화 데이터 실패가 페이지 build를 깨뜨리지 않음

## 우선순위

```text
P1
```

---

## PH-H-14 — 검색 Golden Query 테스트

- Original task: H-14
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

Task 3-4에서 만든 대표 검색어를 자동 테스트한다.

## 최소 query 수

```text
20개
```

구성:

```text
상위 주제
정확한 개념
한글 alias
영문 alias
기호 용어
identifier
오류 메시지
```

## 테스트 형식

```yaml
- query: PCIe BAR
  mustInclude:
    - pcie-bar-sizing
  preferredTopThree:
    - pcie-device-initialization
  exclude:
    - old-pcie-bar-note
```

## 판정

정확한 내부 점수를 고정하지 않는다.

검사할 것은 다음이다.

```text
필수 문서 포함
선호 문서 상위 3개
구판 제외
무관한 문서 과다 노출 없음
```

## 완료 조건

- 검색 알고리즘 변경 시 자동 실행
- 한글·영문 alias 모두 테스트
- 기호 제거로 C++·MSI-X가 깨지지 않음
- `superseded` 문서가 일반 검색 상위에 없음

## 우선순위

```text
P0
```

---

## PH-H-15 — 검색 UI 브라우저 테스트

- Original task: H-15
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

검색 알고리즘만 맞아도 UI가 깨질 수 있다.

## 동작 시나리오

```text
검색 버튼 클릭
인덱스 로딩
검색어 입력
결과 선택
Escape로 닫기
focus 복원
결과 없음
인덱스 로드 실패
```

## 키보드

```text
Tab
Shift+Tab
Enter
Arrow keys를 지원한다면 해당 동작
Escape
```

## 보안 입력

다음 검색어를 넣어도 DOM이 깨지거나 실행되지 않아야 한다.

```text
<script>alert(1)</script>
"><img src=x onerror=alert(1)>
C++
MSI-X
&
```

## 완료 조건

- 검색 modal focus trap 정상
- 닫은 후 원래 버튼으로 focus 복귀
- highlight가 안전한 DOM API로 생성
- 모바일 키보드에서 결과 영역 사용 가능
- 검색 실패 fallback 존재

## 우선순위

```text
P0
```

---

## PH-H-16 — 접근성 자동 검사

- Original task: H-16
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

대표 페이지에 axe 계열 자동 검사를 적용할 수 있다.

## 대상

```text
홈
Topic Hub
대표 Guide
검색 modal
404
```

## 자동으로 잘 잡는 항목

```text
accessible name 누락
색 대비 일부
heading 구조 일부
form label
ARIA 오류
중복 ID
```

## 자동 검사로 충분하지 않은 항목

```text
링크 문구 품질
문서 논리 구조
다이어그램 설명
focus 이동의 자연스러움
```

## 완료 조건

- 심각한 자동 접근성 오류 0개
- warning은 의도와 이유를 검토
- suppression은 구체적인 요소에만 적용
- 라이트·다크 테마 중 최소 대표 페이지 검사

## 우선순위

```text
P1
```

---

## PH-H-17 — 수동 키보드 Smoke Checklist

- Original task: H-17
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

자동화가 놓치는 핵심 흐름만 짧게 확인한다.

```text
[ ] Skip link로 본문 이동
[ ] Header 메뉴 접근
[ ] 검색 열기·닫기
[ ] 검색 결과 선택
[ ] Topic Hub Start Here 순서 탐색
[ ] 코드 복사 버튼 접근
[ ] Heading permalink 접근
[ ] 댓글 열기 기능 접근
```

## 완료 조건

- 마우스 없이 핵심 탐색 가능
- focus indicator가 모든 인터랙션에서 보임
- modal 뒤쪽으로 focus가 빠지지 않음
- 카드가 실제 `<a>` 또는 `<button>`으로 구현됨

## 우선순위

```text
P1
```

---

## PH-H-18 — 모바일 Viewport Smoke Test

- Original task: H-18
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

## 권장 viewport

```text
360×800
390×844
태블릿 폭 768
```

모든 기기를 테스트할 필요는 없지만 작은 폭과 일반 모바일 폭은 필요하다.

## 페이지 유형

```text
홈
Topic Hub
긴 Guide
코드 많은 글
표 많은 글
검색
Privacy
404
```

## 검사

```text
가로 페이지 overflow
코드 버튼 겹침
표 잘림
Hero 과대 점유
Header 높이
TOC overlay
긴 영문 identifier
touch target
```

## 자동 검사 가능 항목

```javascript
document.documentElement.scrollWidth <= window.innerWidth
```

하지만 의도적인 코드·표 내부 가로 스크롤은 허용한다.

페이지 전체 viewport만 확장되지 않게 한다.

## 완료 조건

- 페이지 전체 가로 스크롤 없음
- 코드·표는 자체 스크롤 영역 사용
- Core Topics와 Featured가 한 열에서도 이해 가능
- 검색 modal이 화면과 키보드에 가리지 않음

## 우선순위

```text
P0
```

---

## PH-H-19 — Visual Canary 세트

- Original task: H-19
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

모든 페이지 screenshot을 보존하지 않는다.

대표적인 문제 페이지 5개 정도만 선정한다.

## 권장 Canary

```text
홈
PCIe & CXL Hub
코드 블록이 가장 많은 글
표·다이어그램이 많은 글
검색 modal 열린 상태
```

추가로 다크모드 대표 글 1개를 포함할 수 있다.

## Screenshot 상태

```text
Desktop light
Mobile light
대표 페이지 dark
```

## 안정화 조건

- 외부 광고·댓글 mock 또는 제외
- 날짜·현재 시간 고정
- font 고정
- animation 비활성화
- 동일 브라우저 환경

## 완료 조건

- 주요 CSS 변경에서 실행
- 작은 렌더링 차이에 과민하지 않은 threshold 사용
- 결과 diff를 사람이 볼 수 있음
- 실패 시 무조건 snapshot 갱신하지 않음

## 우선순위

```text
P1
```

---

## PH-H-20 — 코드 블록 회귀 검사

- Original task: H-20
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

기술 블로그의 핵심 UI다.

## 시나리오

```text
짧은 코드
긴 코드
긴 한 줄
한글 주석
로그
명령과 출력
line highlight
파일명 표시
복사
```

## 검사

```text
강제 wrap 여부
가로 스크롤
복사 결과 원문 일치
복사 버튼 겹침
line number alignment
다크모드 대비
```

## 복사 결과

UI용 line number나 강조 markup이 clipboard에 들어가면 안 된다.

```text
화면:
1 int main() {

복사:
int main() {
```

## 완료 조건

- 코드 원문이 정확히 복사됨
- 모바일에서 첫 줄이 버튼에 가리지 않음
- 로그·출력이 불필요한 syntax grammar를 사용하지 않음
- 장문 코드 페이지 DOM 회귀 추적

## 우선순위

```text
P1
```

---

## PH-H-21 — 표와 다이어그램 회귀 검사

- Original task: H-21
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

## 표

```text
wide table
긴 identifier
많은 열
모바일
인쇄
```

검사:

```text
페이지 viewport 확장 없음
가로 스크롤 영역 명확
header cell 존재
caption 존재 여부
```

## 다이어그램

```text
SVG 렌더링
viewBox
text clipping
모바일 축소
alt·본문 설명
```

## 완료 조건

- 대표 표와 SVG를 canary로 지정
- 생성 성공뿐 아니라 실제 렌더링 확인
- 텍스트가 잘리지 않음
- 색만으로 관계를 구분하지 않음

## 우선순위

```text
P1
```

---

## PH-H-22 — 보안 회귀 검사

- Original task: H-22
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

매 release build에서 다음을 자동 검사한다.

```text
secret pattern
private key header
.env 파일
admin route
OAuth secret 문자열
unsafe innerHTML 위치
금지 iframe domain
workflow permissions
```

## Production artifact 검사

다음을 검색한다.

```text
client_secret
ghp_
Authorization:
BEGIN PRIVATE KEY
/admin
```

오탐을 줄이기 위해 예제 placeholder allowlist를 제한적으로 둔다.

## 완료 조건

- 실제 가능성이 높은 secret은 build 차단
- 민감 파일은 artifact 생성 단계에서 차단
- production 관리자 코드 존재 시 오류
- allowlist가 전체 디렉터리 단위가 아님

## 우선순위

```text
P0
```

---

## PH-H-23 — GitHub Actions Lint

- Original task: H-23
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

검사할 내용:

```text
permissions 명시
write-all 금지
Action full SHA
사용하지 않는 secret
pull_request_target 위험 패턴
deploy job 권한 분리
```

## 오류 예

```text
ERROR:
Third-party action `vendor/action@v2` is not pinned to a full commit SHA.
```

```text
ERROR:
Build job requests `contents: write`.
Expected: `contents: read`.
```

## 완료 조건

- workflow 변경 PR에서 자동 실행
- 제3자 action mutable tag 차단
- deploy 외 job의 불필요 write 권한 차단
- 위험한 `pull_request_target` 사용 감지

## 우선순위

```text
P0
```

---

## PH-H-24 — 성능 회귀 기준

- Original task: H-24
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

Task 3-5에서 만든 build metrics를 비교한다.

## 추적 지표

```text
release build duration
Peak RSS
검색 인덱스 크기
홈 JavaScript
대표 Guide HTML
dist 총량
```

## 초기 정책

먼저 warning으로 시작한다.

```text
Build time +20%
Peak RSS +20%
Search index +20%
Homepage JS +15%
Canary HTML +20%
```

## 주의

콘텐츠가 실제로 많이 늘어난 경우와 구조적 회귀를 구분한다.

따라서 함께 기록한다.

```text
문서 수
코드 블록 수
이미지 수
변경 파일 수
```

## 완료 조건

- 이전 release와 비교 가능
- 갑작스러운 증가가 PR에서 보임
- 초기에 warning으로 운영
- 충분한 baseline 뒤 blocker 범위 검토

## 우선순위

```text
P1
```

---

## PH-H-25 — 외부 Integration 실패 테스트

- Original task: H-25
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

댓글·Analytics·AdSense·외부 폰트를 차단한 상태에서 페이지를 연다.

## 기대 결과

```text
본문 정상
내비게이션 정상
내부 검색 또는 fallback 정상
레이아웃 유지
오류가 사용자에게 과도하게 노출되지 않음
```

## 테스트 방법

브라우저에서 관련 domain 요청을 block하거나 test 환경에서 script URL을 실패시키는 방식으로 확인한다.

## 완료 조건

- Giscus 실패가 본문을 깨뜨리지 않음
- 광고 실패 시 큰 빈 공간이 남지 않음
- Analytics 차단 시 navigation 정상
- 외부 폰트 차단 시 읽을 수 있는 fallback

## 우선순위

```text
P1
```

---

## PH-H-26 — 광고 제외 페이지 회귀 검사

- Original task: H-26
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

승인 후 광고를 적용할 경우 반드시 자동 검사한다.

## 광고가 없어야 하는 페이지

```text
404
Search
Admin
Draft
Privacy
Contact
Superseded
Archived
빈 Tag
```

## 검사 방법

최종 HTML에서 광고 script와 slot markup 존재 여부를 확인한다.

## Article 조건

```text
status=current
adsEligible=true
publisher content 존재
```

글자 수 하나만으로 판정하지 않는다.

## 완료 조건

- 광고 script가 global layout에 무조건 삽입되지 않음
- 제외 페이지에 광고 markup 0개
- 상태 변경 시 광고 eligibility가 자동 반영
- 광고 없는 상태에서도 레이아웃 완전

## 우선순위

```text
P1
```

---

## PH-H-27 — 출시 전 수동 대표 문서 리뷰

- Original task: H-27
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

자동화로 기술 정확성을 판정할 수 없다.

대표 문서 10개에 대해 마지막 수동 리뷰를 진행한다.

## 공통

```text
[ ] 제목이 실제 질문과 일치
[ ] description이 고유함
[ ] 핵심 결론에 근거가 있음
[ ] 관찰과 가설이 구분됨
[ ] 버전·환경이 필요하면 표시됨
[ ] 적용 범위와 한계가 있음
[ ] 구판 링크가 최신 문서를 방해하지 않음
[ ] 다음 학습 경로가 있음
```

## Source Walkthrough

```text
[ ] commit 또는 tag
[ ] file과 symbol
[ ] 현재 소스와 차이 가능성
```

## Experiment

```text
[ ] baseline
[ ] 반복 횟수
[ ] 결과 단위
[ ] 일반화 한계
```

## Debug Note

```text
[ ] 증상
[ ] 정상 기대값
[ ] 제외한 가설
[ ] 해결 후 검증
```

## 완료 조건

- 대표 글 10개 리뷰 완료 기록
- 리뷰 중 발견한 중대한 오류 수정
- 검증하지 못한 글은 `current`로 강제하지 않음
- Featured 목록과 리뷰 결과 일치

## 우선순위

```text
P0
```

---

## PH-H-28 — 단계적 출시 전략

- Original task: H-28
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

홈, Hub, metadata, 검색, 색인, 빌드를 모두 한 번에 배포하면 원인 추적이 어렵다.

## Release 1: 콘텐츠 기반

```text
상태·타입 schema
대표 글 metadata
Topic registry
```

사용자 화면 변화는 최소화한다.

## Release 2: 탐색 구조

```text
홈 개편
Topic Hub
Featured Guides
역할 기반 다음 글
```

## Release 3: 검색·색인

```text
SearchDocument
alias
상태 ranking
Sitemap
canonical
tag 정책
```

## Release 4: 파이프라인

```text
Content Manifest
Publication Policy
CI build 1회
smoke test
```

## Release 5: 신뢰·정책

```text
About
Privacy
Editorial Policy
보안·외부 integration 정리
```

실제로는 일부를 합칠 수 있지만, 데이터 구조와 UI·SEO 대규모 변경을 한 번에 섞지 않는 것이 중요하다.

## 완료 조건

- 각 release가 독립적으로 rollback 가능
- migration과 redesign이 분리됨
- 각 단계에 완료 조건과 smoke test 존재
- URL 변경은 별도 검토

## 우선순위

```text
P0
```

---

## PH-H-29 — Release Branch와 Commit 경계

- Original task: H-29
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

## 분리할 변경

```text
기계적 front matter migration
수동 콘텐츠 수정
UI redesign
검색 알고리즘
dependency update
workflow 변경
```

각 항목을 가능한 한 별도 commit으로 둔다.

## 예시

```text
1. chore(content): add status and type fields
2. content(pcie): verify five canonical guides
3. feat(home): add core topics and featured guides
4. feat(search): add alias-aware search documents
5. ci: split build and deploy jobs
```

## 피해야 할 것

```text
홈 개편 + dependency major upgrade + 글 500개 formatter 적용
```

## 완료 조건

- 의미 변경과 formatting noise 분리
- rollback 단위가 명확
- lockfile 변경이 콘텐츠 diff에 묻히지 않음
- 대량 migration 결과를 별도 검토 가능

## 우선순위

```text
P1
```

---

## PH-H-30 — 데이터 Migration Dry Run

- Original task: H-30
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

Front matter나 URL을 대량 수정할 때 적용한다.

## 흐름

```text
analyze
→ dry-run
→ report
→ sample review
→ apply
→ full validation
```

## 리포트

```text
수정 파일 수
추가·변경 필드
해석 실패 파일
중복 URL
예상 redirect
```

## Idempotency

같은 migration을 두 번 실행해도 두 번째에는 변경이 없어야 한다.

## 완료 조건

- Dry run 없이 원본 수정 금지
- 실패 파일 목록 명확
- 기계적 변경과 수동 판단 분리
- 적용 후 전체 manifest 비교
- migration 전후 commit 경계 존재

## 우선순위

```text
P0
```

---

## PH-H-31 — Rollback 계획

- Original task: H-31
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

## 콘텐츠 rollback

문서 수정 commit을 되돌린다.

## UI rollback

기존 홈·검색 컴포넌트를 다시 활성화한다.

## 배포 rollback

이전 정상 artifact를 재배포한다.

## URL rollback

URL을 원복하기보다 redirect 정책을 유지하면서 이전 UI나 콘텐츠를 복구하는 것이 안전할 수 있다.

## 준비할 것

```text
최근 정상 artifact
commit SHA
배포 명령
domain·canonical 확인 절차
```

## 완료 조건

- 이전 artifact 재배포 가능
- rollback에 새 dependency install이 필요하지 않음
- 복구 후 대표 URL smoke test 존재
- rollback이 canonical URL을 임시 domain으로 바꾸지 않음

## 우선순위

```text
P1
```

---

## PH-H-32 — Production Verification

- Original task: H-32
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

배포 완료 메시지로 끝내지 않는다.

## 즉시 확인

```text
홈
Topic Hub 2개
대표 글 2개
검색
Sitemap
RSS
404
```

## 검사

```text
실제 production origin
canonical
최신 CSS·JS
검색 index version
대표 internal link
HTTPS
```

## 외부 서비스

댓글·Analytics·AdSense는 나중에 확인해도 되지만, 오류가 핵심 콘텐츠에 영향을 주지 않아야 한다.

## 완료 조건

- 실제 운영 URL에서 smoke test
- 배포 commit SHA 확인
- Sitemap과 검색 인덱스가 새 버전인지 확인
- 예상치 못한 캐시·구버전 asset 없음

## 우선순위

```text
P0
```

---

## PH-H-33 — 출시 후 관찰 기간

- Original task: H-33
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

기술 오류와 검색 효과는 관찰 시점이 다르다.

## 즉시 확인

```text
build
links
UI
검색 기능
404
canonical
```

## 며칠 내 확인

```text
Search Console crawling
Sitemap 처리
Google-selected canonical
Core Web Vitals 초기 이상
```

## 장기 확인

```text
검색 유입
Topic Hub 이동
대표 문서 노출
AdSense 결과
```

검색 지표를 하루 이틀 만에 평가하지 않는다.

## 완료 조건

- 즉시 기술 검증과 장기 관측을 분리
- 변경 로그와 commit 기록 존재
- 관찰 기간 중 불필요한 구조 재변경 제한

## 우선순위

```text
P1
```

---

## PH-H-34 — 실패 Severity 정책

- Original task: H-34
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

## Blocker

```text
production build 실패
중복 URL
깨진 핵심 내부 링크
Draft 노출
secret 탐지
Sitemap·canonical 충돌
관리 코드 production 포함
검색 JSON 파손
```

## Warning

```text
대형 코드 블록
description 부족
오래된 외부 링크
Needs Review 장기 방치
성능 예산 증가
Topic 다양성 부족
```

## Info

```text
alias 후보
통합 후보
Hub 편입 후보
환경 정보 보완 제안
```

## 완료 조건

- Warning 폭증이 blocker를 가리지 않음
- 각 rule의 배포 차단 여부가 명확
- 오탐이 많은 rule은 warning 이하
- rule마다 rationale과 수정 예시 존재

## 우선순위

```text
P0
```

---

## PH-H-35 — CI 파이프라인 최종안

- Original task: H-35
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

권장 흐름:

```text
Pull Request
├── Content Validation
├── Typecheck
├── Workflow Security Lint
└── 필요한 경우 Preview Build

Main
├── Content Validation
├── Production Build
├── Dist Validation
├── Browser Smoke
├── Security Scan
├── Artifact Upload
└── Deploy

Scheduled
├── External Link Audit
├── Dependency Audit
├── Content Freshness
└── Asset Audit
```

## 핵심 제약

```text
Astro full build는 한 번
Deploy job에서 재빌드하지 않음
외부 네트워크 검사는 일반 배포와 분리
```

## 완료 조건

- 테스트한 artifact를 그대로 배포
- build와 deploy 권한 분리
- 실패 위치가 명확
- scheduled audit 실패가 일반 콘텐츠 배포를 무조건 차단하지 않음

## 우선순위

```text
P0
```

---

## PH-H-36 — 테스트 유지비 제한

- Original task: H-36
- Source message: e82e1aae-6fa7-4358-8799-41b3f8bc3114
- Status: pending

### Task details

다음 신호가 보이면 테스트 체계가 과도해지고 있는 것이다.

```text
사소한 문장 수정에 수십 snapshot 갱신
fixture가 실제 콘텐츠보다 복잡
flaky visual test 재실행이 일상화
대부분의 warning이 항상 무시됨
테스트 때문에 dependency가 크게 증가
```

## 유지 원칙

```text
빈번하고 치명적인 문제 자동화
드물고 의미적인 문제는 수동 리뷰
불안정한 외부 조건은 정기 audit
```

## 삭제 후보

- 실제 버그를 잡지 못하는 snapshot
- 항상 suppression되는 lint
- 구현 세부사항만 고정하는 unit test
- 운영하지 않는 브라우저 전체 matrix

## 완료 조건

- 테스트마다 보호하는 계약이 설명 가능
- 6개월간 가치가 없었던 검사는 제거 검토
- 테스트 코드가 콘텐츠 파이프라인보다 커지지 않음

## 우선순위

```text
P1
```

---

## PH-TST-01 — 테스트 계층 분리

- Original task: TST-01
- Source message: ca0fc6ce-6a4a-46c1-9628-0a463c0bba09
- Status: pending

### Task details

Unit·Content·Artifact·Browser의 책임을 명확히 한다.

## PH-TST-02 — 실제 기술 문자열 Fixture

- Original task: TST-02
- Source message: ca0fc6ce-6a4a-46c1-9628-0a463c0bba09
- Status: pending

### Task details

```text
C++
MSI-X
std::vector
한글 제목
긴 식별자
```

를 추가한다.

## PH-TST-03 — Domain Policy Matrix

- Original task: TST-03
- Source message: ca0fc6ce-6a4a-46c1-9628-0a463c0bba09
- Status: pending

### Task details

상태별 핵심 계약을 검증한다.

## PH-TST-04 — Invalid Content Fixture

- Original task: TST-04
- Source message: ca0fc6ce-6a4a-46c1-9628-0a463c0bba09
- Status: pending

### Task details

```text
중복 ID
잘못된 Topic
없는 Relation
Cycle
```

을 고정한다.

## PH-TST-05 — Markdown Pipeline Fixture

- Original task: TST-05
- Source message: ca0fc6ce-6a4a-46c1-9628-0a463c0bba09
- Status: pending

### Task details

Code·Table·Heading·Legacy 문법을 검증한다.

## PH-TST-06 — Generated HTML Contract

- Original task: TST-06
- Source message: ca0fc6ce-6a4a-46c1-9628-0a463c0bba09
- Status: pending

### Task details

H1·Canonical·Robots·Main 구조를 검사한다.

## PH-TST-07 — Golden Search Queries

- Original task: TST-07
- Source message: ca0fc6ce-6a4a-46c1-9628-0a463c0bba09
- Status: pending

### Task details

대표 검색어의 Top-N 회귀를 막는다.

## PH-TST-08 — Dist Artifact Test

- Original task: TST-08
- Source message: ca0fc6ce-6a4a-46c1-9628-0a463c0bba09
- Status: pending

### Task details

Draft·Admin·민감 경로가 없는지 검사한다.

## PH-TST-09 — Browser Core Flow

- Original task: TST-09
- Source message: ca0fc6ce-6a4a-46c1-9628-0a463c0bba09
- Status: pending

### Task details

Home·Hub·Article·Search를 접근 가능한 Selector로 검증한다.

## PH-TST-10 — JavaScript Disabled Smoke

- Original task: TST-10
- Source message: ca0fc6ce-6a4a-46c1-9628-0a463c0bba09
- Status: pending

### Task details

핵심 정적 탐색을 보호한다.

## PH-TST-11 — Visual Canary 축소

- Original task: TST-11
- Source message: ca0fc6ce-6a4a-46c1-9628-0a463c0bba09
- Status: pending

### Task details

전체 페이지가 아니라 위험 영역 중심으로 관리한다.

## PH-TST-12 — Warning Baseline

- Original task: TST-12
- Source message: ca0fc6ce-6a4a-46c1-9628-0a463c0bba09
- Status: pending

### Task details

기존 Warning은 추적하되 신규 부채 증가를 차단한다.

---

