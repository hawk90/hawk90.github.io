---
title: "Repository and delivery (60 anti-patterns)"
category: repository
item_count: 60
---
# Repository and delivery
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-R-01 — Git Is the Backup
- Category: Repository and delivery
- Original IDs: R-01
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### Git 저장소가 있으니 백업이 끝났다고 생각

### 문제

Git은 변경 이력 관리에는 강하지만 다음을 모두 보장하지는 않는다.

- 계정 탈취 대응
- 저장소 삭제
- 조직 정책 변경
- LFS 객체 보존
- 외부 생성 자산 보존
- GitHub Discussions 댓글 보존
- 배포 설정 복구
- 도메인 설정 복구

### 개선

```text
원본 콘텐츠
저장소 metadata
생성 자산
배포 설정
도메인 설정
외부 서비스 데이터
```

를 별도 자산으로 보고 백업한다.

---
## AP-R-02 — Single Remote Dependency
- Category: Repository and delivery
- Original IDs: R-02
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### GitHub 한 곳에만 원격 저장소 존재

### 문제

계정·서비스·정책 문제 발생 시 즉시 대체하기 어렵다.

### 개선

읽기 전용 mirror를 하나 더 둔다.

```text
GitHub
+
로컬 bare repository
또는
다른 Git hosting mirror
```

---
## AP-R-03 — Local Clone as Backup
- Category: Repository and delivery
- Original IDs: R-03
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 개발 PC의 clone을 백업으로 간주

### 문제

clone은 다음 이유로 완전한 백업이 아닐 수 있다.

- 일부 branch·tag 미수신
- shallow clone
- LFS 미다운로드
- untracked 파일 누락
- 같은 디스크 장애
- 자동 검증 없음

### 개선

정기적인 bare mirror와 복구 테스트를 사용한다.

---
## AP-R-04 — Backup Without Restore Test
- Category: Repository and delivery
- Original IDs: R-04
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 백업은 만들지만 실제 복구를 해보지 않음

### 문제

손상·누락·권한 문제를 장애 시점에 처음 발견한다.

### 개선

분기별 또는 반기별로 임시 디렉터리에서 다음을 수행한다.

```text
clone or restore
dependency install
production build
대표 페이지 확인
```

---
## AP-R-05 — Backup Without Inventory
- Category: Repository and delivery
- Original IDs: R-05
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 무엇을 백업하는지 목록이 없음

### 문제

Markdown만 보존하고 다음을 잃을 수 있다.

- 이미지 원본
- redirect map
- taxonomy registry
- OG source
- GitHub Actions
- domain configuration
- analytics export

### 개선

복구에 필요한 자산 목록을 문서화한다.

---
## AP-R-06 — Repository Backup Without Secrets Recovery Plan
- Category: Repository and delivery
- Original IDs: R-06
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 저장소는 복구했지만 배포 credentials가 없음

### 문제

운영 복구가 지연된다.

### 개선

secret 값 자체를 문서에 저장하지 않고:

```text
secret 이름
용도
발급 위치
권한
회전 방법
복구 담당 절차
```

를 기록한다.

---
## AP-R-07 — Backup Includes Live Secrets
- Category: Repository and delivery
- Original IDs: R-07
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 편의를 위해 `.env`와 token까지 통째로 백업

### 문제

백업 매체가 새로운 secret 유출 경로가 된다.

### 개선

콘텐츠 백업과 credential 관리 체계를 분리한다.

---
## AP-R-08 — Generated Site as the Only Backup
- Category: Repository and delivery
- Original IDs: R-08
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### `dist/` 결과만 보존

### 문제

최종 HTML은 남지만 다음을 잃는다.

- 원본 Markdown
- metadata
- 시리즈 관계
- 검색 source
- 다이어그램 원본
- 수정 가능한 구조

### 개선

생성 결과는 보조 스냅샷이고 원본을 대체하지 않는다.

---
## AP-R-09 — Source Only, No Rendered Snapshot
- Category: Repository and delivery
- Original IDs: R-09
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 원본만 있으면 언제든 재생성 가능하다고 생각

### 문제

미래에 다음이 사라질 수 있다.

- 특정 Node 버전
- 오래된 package
- font
- LaTeX 환경
- Expressive Code 동작
- 외부 CDN 자산

### 개선

중요한 릴리스는 렌더링된 정적 artifact도 함께 보존한다.

---
## AP-R-10 — Same Failure Domain Backup
- Category: Repository and delivery
- Original IDs: R-10
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 원본과 백업이 같은 계정·클라우드·기기에 있음

### 문제

계정 정지, 랜섬웨어, 디스크 장애가 동시에 영향을 준다.

### 개선

최소 하나는 다른 failure domain에 둔다.

---
## AP-R-100 — Resilience Work Prevents Publishing
- Category: Repository and delivery
- Original IDs: R-100
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 장애 대비를 완벽히 하느라 콘텐츠 작업이 멈춤

### 개선

최소 기준선에서 멈춘다.

```text
두 번째 Git mirror
정기 static snapshot
redirect manifest
복구 가능한 build 환경
핵심 runbook
```

---
## AP-R-11 — Deployment Is Rebuilt Manually
- Category: Repository and delivery
- Original IDs: R-11
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 장애가 나면 기억에 의존해 다시 설정

### 문제

- Pages 설정
- custom domain
- HTTPS
- workflow permissions
- branch 설정

을 놓치기 쉽다.

### 개선

배포 절차와 설정을 가능한 한 코드와 runbook으로 남긴다.

---
## AP-R-12 — No Known-Good Artifact
- Category: Repository and delivery
- Original IDs: R-12
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 최신 main만 배포 가능

### 문제

새 빌드 도구가 깨졌을 때 이전 사이트로 즉시 되돌릴 수 없다.

### 개선

최근 정상 배포 artifact와 commit SHA를 보존한다.

---
## AP-R-13 — Rollback Means Revert Everything
- Category: Repository and delivery
- Original IDs: R-13
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 콘텐츠 오타와 플랫폼 장애를 같은 방식으로 rollback

### 문제

불필요한 변경까지 되돌릴 수 있다.

### 개선

다음을 구분한다.

```text
콘텐츠 rollback
플랫폼 rollback
배포 artifact rollback
DNS rollback
```

---
## AP-R-14 — Rollback Untested
- Category: Repository and delivery
- Original IDs: R-14
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 이론상 이전 commit으로 돌아갈 수 있음

### 문제

현재 dependency와 workflow가 과거 commit을 더 이상 빌드하지 못할 수 있다.

### 개선

기존 artifact를 재사용할 수 있는 배포 경로를 둔다.

---
## AP-R-15 — Deploy From Mutable Environment
- Category: Repository and delivery
- Original IDs: R-15
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 로컬 PC에서 수동으로 build 후 배포

### 문제

환경 차이와 재현성 부족이 생긴다.

### 개선

가능하면 고정된 CI 환경에서 배포 artifact를 생성한다.

---
## AP-R-16 — No Post-Restore Validation
- Category: Repository and delivery
- Original IDs: R-16
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 사이트가 열리면 복구 성공

### 문제

다음이 조용히 깨질 수 있다.

- 검색
- Sitemap
- canonical
- OG 이미지
- 댓글
- 내부 링크

### 개선

복구 smoke test 목록을 둔다.

---
## AP-R-17 — Domain Recovery Ignored
- Category: Repository and delivery
- Original IDs: R-17
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 저장소 복구만 준비

### 문제

도메인 등록자 계정, DNS, 인증서 문제가 더 큰 장애가 될 수 있다.

### 개선

도메인 소유권·등록자·DNS 레코드·만료일 복구 절차를 관리한다.

---
## AP-R-18 — Automatic Renewal Assumption
- Category: Repository and delivery
- Original IDs: R-18
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 도메인이 자동 갱신되니 신경 쓰지 않음

### 문제

결제 수단 만료·계정 잠금·이메일 접근 상실로 실패할 수 있다.

### 개선

만료 알림과 대체 연락 경로를 둔다.

---
## AP-R-19 — DNS Records Undocumented
- Category: Repository and delivery
- Original IDs: R-19
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 현재 DNS 설정을 대시보드에서만 확인 가능

### 개선

민감하지 않은 DNS 구조를 문서나 export로 보존한다.

---
## AP-R-20 — No Emergency Static Host
- Category: Repository and delivery
- Original IDs: R-20
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### GitHub Pages 장애 시 대체 배포 경로 없음

### 개선

`dist/`만 있으면 다른 정적 호스팅에 올릴 수 있도록 host-specific coupling을 줄인다.

---
## AP-R-21 — Comments as Permanent Knowledge
- Category: Repository and delivery
- Original IDs: R-21
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 중요한 정정·답변을 Giscus 댓글에만 남김

### 문제

댓글 서비스가 사라지거나 연결이 깨지면 지식도 사라진다.

### 개선

중요한 정정과 반복 질문은 본문으로 승격한다.

---
## AP-R-22 — Analytics as Historical Archive
- Category: Repository and delivery
- Original IDs: R-22
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### Analytics 서비스가 모든 방문 기록을 영구 보존한다고 가정

### 문제

보존 기간·계정 변경·서비스 종료로 데이터가 사라질 수 있다.

### 개선

정말 필요한 장기 지표만 정기적으로 집계해 별도 보존한다.

---
## AP-R-23 — External Image Hotlinking
- Category: Repository and delivery
- Original IDs: R-23
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 외부 이미지 URL을 직접 사용

### 문제

- 원본 삭제
- URL 변경
- 접근 차단
- 추적
- 이미지 내용 교체

가능성이 있다.

### 개선

라이선스가 허용되고 장기 가치가 있는 자산은 자체 관리한다.

---
## AP-R-24 — External Script as Required Functionality
- Category: Repository and delivery
- Original IDs: R-24
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 검색·내비게이션이 외부 CDN 장애에 의존

### 개선

핵심 기능은 자체 정적 자산으로 제공하고 외부 script는 보조 기능으로 제한한다.

---
## AP-R-25 — External Font Dependency
- Category: Repository and delivery
- Original IDs: R-25
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 폰트 CDN 장애 시 레이아웃이 크게 깨짐

### 개선

합리적인 시스템 폰트 fallback과 크기 호환성을 확보한다.

---
## AP-R-26 — Newsletter Provider Lock-In
- Category: Repository and delivery
- Original IDs: R-26
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 구독자 목록과 폼이 특정 서비스에만 존재

### 문제

서비스 변경 시 구독자 이전과 동의 증빙이 어려울 수 있다.

### 개선

필요한 데이터 export 가능성과 이전 절차를 확인한다.

---
## AP-R-27 — Search Service Lock-In
- Category: Repository and delivery
- Original IDs: R-27
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 외부 검색 API 없이는 콘텐츠를 찾을 수 없음

### 개선

최소한의 정적 Topic·검색 fallback을 유지한다.

---
## AP-R-28 — Social Platform as Discovery Backbone
- Category: Repository and delivery
- Original IDs: R-28
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 외부 SNS 게시물 없이는 과거 글 발견이 어려움

### 문제

플랫폼 정책과 계정 상태에 영향을 받는다.

### 개선

사이트 내부 허브와 RSS를 주요 발견 경로로 유지한다.

---
## AP-R-29 — AdSense Script Failure Breaks Layout
- Category: Repository and delivery
- Original IDs: R-29
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 광고가 로드되지 않으면 큰 빈 공간이나 오류 발생

### 개선

광고는 실패해도 문서 레이아웃과 탐색이 정상이어야 한다.

---
## AP-R-30 — OAuth Provider as Admin Availability
- Category: Repository and delivery
- Original IDs: R-30
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### GitHub OAuth가 장애면 콘텐츠 작성도 불가능

### 개선

로컬 Git 기반 작성 경로를 항상 유지한다.

---
## AP-R-31 — Framework-Specific Content
- Category: Repository and delivery
- Original IDs: R-31
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### Markdown에 Astro 전용 컴포넌트가 다수 포함

### 문제

다른 정적 사이트 생성기로 이동하기 어렵다.

### 개선

일반 글은 표준 Markdown과 제한된 확장으로 유지한다.

---
## AP-R-32 — MDX Component Lock-In
- Category: Repository and delivery
- Original IDs: R-32
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 문서 의미가 특정 UI 컴포넌트에 의존

```mdx
<BenchmarkResult />
<InteractiveDiagram />
```

### 문제

컴포넌트 없이는 콘텐츠가 불완전해진다.

### 개선

핵심 정보는 Markdown에도 남기고 컴포넌트는 향상 기능으로 사용한다.

---
## AP-R-33 — Custom Directive Without Fallback
- Category: Repository and delivery
- Original IDs: R-33
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 전용 parser가 없으면 내용을 이해할 수 없음

### 개선

원문 자체가 최소한 읽을 수 있는 문법을 선택한다.

---
## AP-R-34 — HTML Embedded for Layout
- Category: Repository and delivery
- Original IDs: R-34
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 표·열·카드를 만들기 위해 복잡한 HTML 사용

### 문제

다른 renderer와 EPUB·PDF 변환에서 깨지기 쉽다.

### 개선

의미 구조와 화면 배치를 분리한다.

---
## AP-R-35 — CSS Class in Content
- Category: Repository and delivery
- Original IDs: R-35
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
```html
<div class="grid-cols-3 dark:bg-zinc-900">
```

### 문제

테마와 Tailwind 버전에 강하게 결합된다.

### 개선

콘텐츠에는 의미 역할만 남기고 스타일은 renderer에서 처리한다.

---
## AP-R-36 — File Path as Public Identity
- Category: Repository and delivery
- Original IDs: R-36
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 글 ID가 물리적 경로와 동일

### 문제

콘텐츠 이동이 public identity 변경이 된다.

### 개선

안정적인 content ID와 slug를 분리한다.

---
## AP-R-37 — Front Matter Parser Lock-In
- Category: Repository and delivery
- Original IDs: R-37
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 특정 YAML extension이나 custom type에 의존

### 문제

다른 도구에서 해석이 달라진다.

### 개선

단순하고 널리 지원되는 scalar·array·object를 사용한다.

---
## AP-R-38 — Date Stored in Ambiguous Format
- Category: Repository and delivery
- Original IDs: R-38
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
```yaml
date: 08/01/26
```

### 문제

도구와 locale에 따라 다르게 해석된다.

### 개선

ISO 8601 형식을 사용한다.

---
## AP-R-39 — Implicit Metadata Derived From Filename
- Category: Repository and delivery
- Original IDs: R-39
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 날짜·순서·언어를 파일명 규칙만으로 추론

### 문제

파일 이동과 이름 변경이 의미 변경으로 이어진다.

### 개선

중요한 의미는 metadata에 명시하고 파일명은 저장 편의로 사용한다.

---
## AP-R-40 — Binary Source Format
- Category: Repository and delivery
- Original IDs: R-40
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 다이어그램 원본이 독점 binary 파일뿐

### 문제

향후 도구 없이 수정하기 어렵다.

### 개선

가능하면 텍스트 기반 원본을 함께 보존한다.

---
## AP-R-41 — Only Generated Diagram Kept
- Category: Repository and delivery
- Original IDs: R-41
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### SVG 결과만 있고 원본 source 없음

### 문제

수정과 재생성이 어렵다.

### 개선

```text
diagram source
generator version
generated output
```

관계를 보존한다.

---
## AP-R-42 — Only Source Diagram Kept
- Category: Repository and delivery
- Original IDs: R-42
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 생성 결과는 매번 도구로 만들어야 함

### 문제

도구가 사라지면 과거 사이트를 재현하지 못한다.

### 개선

중요한 release에는 결과물도 함께 보존한다.

---
## AP-R-43 — Unversioned Diagram Toolchain
- Category: Repository and delivery
- Original IDs: R-43
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 어떤 TikZ·Graphviz 버전을 사용했는지 모름

### 문제

미래에 레이아웃과 폰트가 달라질 수 있다.

### 개선

generator version을 manifest에 기록한다.

---
## AP-R-44 — External Asset by Mutable URL
- Category: Repository and delivery
- Original IDs: R-44
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### `latest`, raw branch URL 같은 변경 가능한 주소 사용

### 문제

과거 글의 이미지나 코드가 미래에 달라질 수 있다.

### 개선

고정된 commit·release·자체 snapshot을 사용한다.

---
## AP-R-45 — Screenshot Without Source Context
- Category: Repository and delivery
- Original IDs: R-45
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 화면 캡처만 있고 재현 명령과 버전 없음

### 문제

나중에 무엇을 보여주는지 판단하기 어렵다.

### 개선

캡션 또는 metadata에 환경과 출처를 남긴다.

---
## AP-R-46 — Lossy Re-encoding Loop
- Category: Repository and delivery
- Original IDs: R-46
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 이미지 최적화 과정이 반복되며 품질 저하

### 개선

원본과 배포용 파생 파일을 분리한다.

---
## AP-R-47 — No Original Image Preservation
- Category: Repository and delivery
- Original IDs: R-47
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### WebP 변환 후 원본 삭제

### 문제

다른 크기·형식으로 다시 만들 때 품질이 떨어진다.

### 개선

중요 자산의 무손실 또는 고품질 원본을 별도 보존한다.

---
## AP-R-48 — Font-Dependent SVG
- Category: Repository and delivery
- Original IDs: R-48
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 특정 시스템 폰트가 없으면 라벨 위치가 깨짐

### 개선

폰트 라이선스를 고려해 경로 변환 또는 안전한 fallback 전략을 선택한다.

---
## AP-R-49 — Diagram Text as Paths Only
- Category: Repository and delivery
- Original IDs: R-49
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 모든 글자를 path로 변환

### 장점

렌더링 일관성.

### 단점

- 검색 불가
- 접근성 저하
- 수정 어려움
- 파일 크기 증가

### 개선

장기 보존과 접근성 요구를 고려해 선택한다.

---
## AP-R-50 — Media Without Checksums
- Category: Repository and delivery
- Original IDs: R-50
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 백업된 자산이 손상됐는지 알 수 없음

### 개선

중요 archive에는 manifest와 checksum을 사용할 수 있다.

---
## AP-R-51 — URL Changes With Every Taxonomy Refactor
- Category: Repository and delivery
- Original IDs: R-51
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### Category를 바꿀 때 URL도 바뀜

### 문제

외부 링크와 검색 유입이 지속적으로 깨진다.

### 개선

URL은 콘텐츠 정체성을, taxonomy는 탐색을 담당하게 분리한다.

---
## AP-R-52 — Date-Based URL Lock-In
- Category: Repository and delivery
- Original IDs: R-52
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
```text
/2026/08/01/post/
```

### 문제

수정·통합 후에도 오래된 날짜 구조가 남고 URL이 불필요하게 길다.

### 개선

날짜가 콘텐츠 의미에 중요하지 않다면 안정적인 slug 중심 URL을 고려한다.

기존 URL은 유지한다.

---
## AP-R-53 — Title-Derived Slug Mutation
- Category: Repository and delivery
- Original IDs: R-53
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 제목을 개선할 때 slug도 바꿈

### 개선

제목과 URL 수명주기를 분리한다.

---
## AP-R-54 — No Redirect Registry
- Category: Repository and delivery
- Original IDs: R-54
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### redirect가 config 여러 곳에 흩어짐

### 문제

중복·cycle·chain을 관리하기 어렵다.

### 개선

단일 redirect manifest를 둔다.

---
## AP-R-55 — Redirect Chain Accumulation
- Category: Repository and delivery
- Original IDs: R-55
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
```text
old-a → old-b → new-c
```

### 개선

모든 이전 URL을 최종 URL로 직접 연결한다.

---
## AP-R-56 — Redirect Provider Lock-In
- Category: Repository and delivery
- Original IDs: R-56
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 특정 hosting 설정에만 redirect가 존재

### 문제

호스팅 이전 시 URL 보존이 깨진다.

### 개선

host-neutral redirect manifest에서 각 플랫폼 설정을 생성한다.

---
## AP-R-57 — Canonical Depends on Runtime Host
- Category: Repository and delivery
- Original IDs: R-57
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### preview 환경이나 custom domain 변경 시 canonical이 잘못됨

### 개선

production canonical origin을 명시적으로 관리한다.

---
## AP-R-58 — Anchor Instability
- Category: Repository and delivery
- Original IDs: R-58
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### heading 문구 변경 때 section URL이 깨짐

### 개선

중요한 장에는 안정적인 explicit ID를 고려한다.

모든 heading을 수동 ID로 만들 필요는 없다.

---
## AP-R-59 — Duplicate Anchor Renumbering
- Category: Repository and delivery
- Original IDs: R-59
- Source messages: 29dfd3e0-113e-46b8-9e88-7ba41aa263e8
- Merge status: canonical source
### Source material
### 앞쪽에 같은 heading을 추가하면 기존 `-2`, `-3` anchor가 변경

### 개선

외부 참조가 많은 주요 절은 명시적 anchor를 둔다.

---
