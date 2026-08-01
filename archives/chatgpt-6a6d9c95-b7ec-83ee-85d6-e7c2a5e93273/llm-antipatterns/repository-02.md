---
title: "Repository and delivery (40 anti-patterns)"
category: repository
item_count: 40
---
# Repository and delivery
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-R-60 — Deleted URL Forgotten
- Category: Repository and delivery
- Original IDs: R-60
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 글을 삭제하고 redirect·410·대체 안내 없이 방치

### 개선

삭제 결정마다 URL 처리 정책을 함께 기록한다.

---
## AP-R-61 — Current State Overwrites History
- Category: Repository and delivery
- Original IDs: R-61
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 최신 동작으로 글을 수정하며 과거 동작을 모두 제거

### 문제

이전 시스템을 유지하는 독자와 기술 변천 기록이 사라진다.

### 개선

버전 차이를 보존하거나 과거 문서를 Historical로 유지한다.

---
## AP-R-62 — Historical Article Looks Current
- Category: Repository and delivery
- Original IDs: R-62
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 오래된 환경을 다룬 글이 상태 표시 없이 남음

### 개선

대상 버전과 현재 상태를 명확히 표시한다.

---
## AP-R-63 — Link to Latest Documentation
- Category: Repository and delivery
- Original IDs: R-63
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 항상 최신 문서 URL만 연결

### 문제

과거 버전 글의 근거가 미래에 달라질 수 있다.

### 개선

가능하면 versioned documentation이나 snapshot을 사용한다.

---
## AP-R-64 — Source Link to Main Branch
- Category: Repository and delivery
- Original IDs: R-64
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 소스코드 분석 글이 `main` branch를 참조

### 문제

미래에 코드가 바뀌면 글과 링크가 불일치한다.

### 개선

tag 또는 commit permalink를 사용한다.

---
## AP-R-65 — Spec Reference Without Revision
- Category: Repository and delivery
- Original IDs: R-65
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### “CXL Specification에 따르면”만 기록

### 문제

개정판마다 내용과 절 번호가 달라질 수 있다.

### 개선

사양 이름·revision·가능하면 section을 기록한다.

---
## AP-R-66 — Benchmark Without Preservation Data
- Category: Repository and delivery
- Original IDs: R-66
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 그래프만 남고 raw result·환경·실행 script가 없음

### 문제

나중에 결과를 재해석하거나 재현할 수 없다.

### 개선

중요 실험은 다음을 보존한다.

```text
source
build options
environment
raw measurements
analysis script
```

---
## AP-R-67 — Environment Captured as Free Text Only
- Category: Repository and delivery
- Original IDs: R-67
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### “Ubuntu에서 테스트” 정도만 기록

### 문제

미래에 재현하기 어렵다.

### 개선

구조화된 핵심 환경 metadata와 설명을 함께 사용한다.

---
## AP-R-68 — Tool Version Lost
- Category: Repository and delivery
- Original IDs: R-68
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### profiler·compiler·SDK 버전 없음

### 문제

결과 차이의 원인을 추적할 수 없다.

### 개선

실험·디버깅 글에는 주요 도구 버전을 남긴다.

---
## AP-R-69 — Reproduction Requires Defunct Hardware
- Category: Repository and delivery
- Original IDs: R-69
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 특정 장비에서만 재현 가능하지만 대체 설명이 없음

### 개선

- 관찰 결과
- 핵심 register/log
- 일반화 가능한 원리
- 대체 가능한 시뮬레이션

을 남긴다.

---
## AP-R-70 — External Evidence Disappears
- Category: Repository and delivery
- Original IDs: R-70
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 근거가 사라진 forum·issue 링크뿐

### 개선

저작권을 침해하지 않는 범위에서 핵심 사실과 문맥을 자체 설명하고 링크는 출처로 사용한다.

---
## AP-R-71 — No Export Path
- Category: Repository and delivery
- Original IDs: R-71
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 현재 Astro 프로젝트에서 콘텐츠를 꺼내는 방법이 없음

### 개선

콘텐츠 manifest를 다음처럼 표준 형식으로 생성할 수 있게 한다.

```text
JSON
Markdown directory
RSS/Atom
static HTML
```

---
## AP-R-72 — Export Loses Relationships
- Category: Repository and delivery
- Original IDs: R-72
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### Markdown만 복사하면 시리즈·Topic·redirect 관계가 사라짐

### 개선

taxonomy와 graph manifest도 export 대상에 포함한다.

---
## AP-R-73 — Export Depends on Building the Whole Site
- Category: Repository and delivery
- Original IDs: R-73
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### export를 위해 현재 toolchain 전체가 필요

### 문제

프로젝트가 깨진 뒤에는 내보내기조차 어려워진다.

### 개선

가벼운 독립 export script를 유지한다.

---
## AP-R-74 — Content IDs Not Stable
- Category: Repository and delivery
- Original IDs: R-74
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 새로운 시스템으로 옮기면 문서 identity가 바뀜

### 문제

댓글·redirect·관계·번역 연결이 깨진다.

### 개선

framework와 무관한 안정적 content ID를 둔다.

---
## AP-R-75 — Search Data Is Non-Portable
- Category: Repository and delivery
- Original IDs: R-75
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 특정 검색 library 전용 index만 존재

### 개선

정제된 검색 document manifest를 원본으로 두고 library index는 파생한다.

---
## AP-R-76 — Theme Contains Business Logic
- Category: Repository and delivery
- Original IDs: R-76
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### publication status·canonical·관계 계산이 UI component에 묶임

### 문제

테마를 바꾸면 콘텐츠 규칙도 다시 구현해야 한다.

### 개선

콘텐츠 정책을 독립 모듈 또는 manifest 단계에 둔다.

---
## AP-R-77 — Build Scripts Assume Repository Name
- Category: Repository and delivery
- Original IDs: R-77
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 경로와 URL이 `hawk90.github.io`에 하드코딩

### 문제

fork·mirror·새 domain 이전이 어렵다.

### 개선

site identity와 path를 config에서 주입한다.

---
## AP-R-78 — GitHub Pages Assumptions Everywhere
- Category: Repository and delivery
- Original IDs: R-78
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### base path·404·redirect·deployment branch 규칙이 코드 곳곳에 존재

### 개선

hosting adapter와 핵심 사이트 로직을 분리한다.

---
## AP-R-79 — No Alternative Render Test
- Category: Repository and delivery
- Original IDs: R-79
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 콘텐츠가 현재 Astro에서만 읽히는지 확인

### 개선

대표 Markdown을 GitHub renderer나 일반 parser에서도 정기적으로 확인할 수 있다.

---
## AP-R-80 — Migration Rewrite Temptation
- Category: Repository and delivery
- Original IDs: R-80
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 플랫폼 이전 시 콘텐츠와 URL까지 전면 재작성

### 문제

여러 위험이 한 번에 겹친다.

### 개선

```text
1. 동일 콘텐츠·동일 URL로 이전
2. 안정화
3. 정보 구조 개선
```

순서를 권장한다.

---
## AP-R-81 — Live Site Is the Archive
- Category: Repository and delivery
- Original IDs: R-81
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 운영 사이트가 과거 상태도 보존한다고 생각

### 문제

업데이트와 삭제로 과거 맥락이 사라진다.

### 개선

중요한 시점의 정적 snapshot을 별도 보존한다.

---
## AP-R-82 — Archive Without Discovery
- Category: Repository and delivery
- Original IDs: R-82
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### snapshot은 있지만 어디 있는지 모름

### 개선

릴리스 tag나 archive manifest로 시점과 위치를 기록한다.

---
## AP-R-83 — Archive Every Build
- Category: Repository and delivery
- Original IDs: R-83
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 모든 commit의 전체 정적 사이트를 영구 보존

### 문제

저장 비용과 관리 노이즈가 커진다.

### 개선

다음 시점만 선택할 수 있다.

```text
주요 리디자인
대규모 migration 전
연간 snapshot
중요 콘텐츠 release
```

---
## AP-R-84 — Archive Without Checksums
- Category: Repository and delivery
- Original IDs: R-84
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 파일이 장기간 손상됐는지 확인 불가

### 개선

중요 snapshot에 checksum manifest를 둔다.

---
## AP-R-85 — Archive Uses Proprietary Container Only
- Category: Repository and delivery
- Original IDs: R-85
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 특정 backup 제품 없이는 복원 불가

### 개선

일반 tar·zip·Git bundle·정적 파일처럼 널리 읽을 수 있는 포맷을 병행한다.

---
## AP-R-86 — No Offline Readability
- Category: Repository and delivery
- Original IDs: R-86
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 모든 CSS·font·script가 외부에 있어 snapshot이 독립적으로 열리지 않음

### 개선

장기 보존 snapshot은 필요한 핵심 자산을 자체 포함한다.

---
## AP-R-87 — Archive Excludes Redirect History
- Category: Repository and delivery
- Original IDs: R-87
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 최종 글만 보존하고 이전 URL 관계를 잃음

### 개선

redirect manifest도 archive에 포함한다.

---
## AP-R-88 — Archive Excludes Comments and Corrections
- Category: Repository and delivery
- Original IDs: R-88
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 본문 snapshot은 있지만 중요한 정정은 외부 댓글에만 있음

### 개선

핵심 정정은 본문 변경 이력에 반영한다.

---
## AP-R-89 — No Human-Readable Manifest
- Category: Repository and delivery
- Original IDs: R-89
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 파일은 많지만 어떤 snapshot인지 모름

### 개선

```text
site version
commit SHA
build date
tool versions
content count
known limitations
```

을 기록한다.

---
## AP-R-90 — Preservation System Becomes the Product
- Category: Repository and delivery
- Original IDs: R-90
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 완벽한 디지털 보존 플랫폼을 구축

### 문제

개인 블로그 운영 비용을 초과한다.

### 개선

현실적인 보존 단위를 선택한다.

```text
Git mirror
연간 static snapshot
원본 이미지
redirect manifest
복구 문서
```

---
## AP-R-91 — No Failure Classification
- Category: Repository and delivery
- Original IDs: R-91
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 모든 장애를 “사이트 안 됨”으로 처리

### 개선

```text
Build failure
Deploy failure
DNS failure
Content corruption
External integration failure
Account compromise
```

로 구분한다.

---
## AP-R-92 — No Recovery Priority
- Category: Repository and delivery
- Original IDs: R-92
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 모든 기능을 동시에 복구하려 함

### 개선 순서

```text
1. 핵심 정적 본문
2. URL·HTTPS
3. 검색·Sitemap
4. 이미지
5. 댓글·광고·분석
```

---
## AP-R-93 — Comments Delay Site Recovery
- Category: Repository and delivery
- Original IDs: R-93
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### Giscus 복구까지 사이트 공개를 미룸

### 개선

외부 기능 없이도 핵심 사이트를 먼저 복구한다.

---
## AP-R-94 — Analytics Required for Deployment
- Category: Repository and delivery
- Original IDs: R-94
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 분석 script 설정 오류가 build를 막음

### 개선

분석·광고는 선택적 integration으로 취급한다.

---
## AP-R-95 — Recovery Changes Canonical URLs
- Category: Repository and delivery
- Original IDs: R-95
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 임시 호스트에서 복구하면서 해당 URL을 canonical로 출력

### 문제

검색 신호가 임시 domain으로 이동할 수 있다.

### 개선

임시 복구 환경과 production canonical 정책을 분리한다.

---
## AP-R-96 — Emergency Host Indexed
- Category: Repository and delivery
- Original IDs: R-96
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 임시 복구 사이트가 검색에 노출

### 개선

필요하면 `noindex`하고 원래 domain 복구 후 종료한다.

---
## AP-R-97 — Incident Fix Without Root Cause
- Category: Repository and delivery
- Original IDs: R-97
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 재배포해 정상화되면 종료

### 문제

같은 장애가 반복된다.

### 개선

짧은 incident note를 남긴다.

```text
원인
영향
복구
재발 방지
```

---
## AP-R-98 — No Account Recovery Preparation
- Category: Repository and delivery
- Original IDs: R-98
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### GitHub·도메인·이메일 계정 복구 경로가 없음

### 개선

복구 이메일, 2FA backup code, 보안키 등 계정 복구 수단을 안전하게 관리한다.

---
## AP-R-99 — Single Maintainer Knowledge
- Category: Repository and delivery
- Original IDs: R-99
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 모든 복구 절차가 기억 속에만 있음

개인 사이트라도 몇 년 뒤의 본인은 사실상 다른 운영자다.

### 개선

짧은 운영·복구 문서를 남긴다.

---
