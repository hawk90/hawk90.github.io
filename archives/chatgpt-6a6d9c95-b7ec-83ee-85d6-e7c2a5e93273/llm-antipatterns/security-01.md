---
title: "Security and supply chain (60 anti-patterns)"
category: security
item_count: 60
---
# Security and supply chain
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-SEC-01 — Static Means Secure
- Category: Security and supply chain
- Original IDs: SEC-01
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 정적 사이트이므로 보안 검토가 필요 없다고 생각

정적 HTML만 배포하더라도 다음은 여전히 존재한다.

- 외부 JavaScript
- 공급망 공격
- XSS
- 악성 링크
- DNS·도메인 설정
- GitHub Actions 권한
- 노출된 secret
- 관리자 도구
- 개인정보 수집

### 개선

정적 사이트의 장점은 공격 표면이 **작다**는 것이지, 공격 표면이 **없다**는 뜻은 아니다.

---
## AP-SEC-02 — No Backend, No Sensitive Data
- Category: Security and supply chain
- Original IDs: SEC-02
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 서버가 없으니 민감한 정보가 없다고 생각

저장소와 빌드 환경에는 다음이 있을 수 있다.

```text
Analytics ID
AdSense 설정
GitHub token
OAuth secret
배포 token
개인 이메일
초안 문서
비공개 이미지
```

공개해도 되는 식별자와 절대 공개하면 안 되는 secret을 구분해야 한다.

---
## AP-SEC-03 — Public Repository as a Secret Store
- Category: Security and supply chain
- Original IDs: SEC-03
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 나중에 사용할 설정값을 저장소에 먼저 기록

```env
GITHUB_CLIENT_SECRET=...
```

### 문제

한 번 Git history에 들어간 secret은 파일만 삭제해도 안전해지지 않는다.

### 개선

노출된 secret은 삭제가 아니라 **폐기·재발급**해야 한다.

---
## AP-SEC-04 — Security by Obscurity
- Category: Security and supply chain
- Original IDs: SEC-04
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### `/admin` 주소를 메뉴에서 숨기면 안전하다고 생각

### 문제

공개 정적 자산, Sitemap, JavaScript bundle, 저장소 코드에서 경로를 발견할 수 있다.

### 개선

관리자 기능은 주소 은닉이 아니라 인증·권한 검증으로 보호한다.

---
## AP-SEC-05 — Development Feature in Production
- Category: Security and supply chain
- Original IDs: SEC-05
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 실험용 관리자·미리보기 기능이 운영 빌드에 포함

### 문제

UI에서 보이지 않아도 코드와 endpoint가 남을 수 있다.

### 개선

공개 사이트 빌드에서는 기능을 숨기는 것이 아니라 **아예 포함하지 않는 것**이 좋다.

---
## AP-SEC-06 — Trust Every Third-Party Script
- Category: Security and supply chain
- Original IDs: SEC-06
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 유명 서비스의 JavaScript는 무조건 안전하다고 가정

예:

- Analytics
- AdSense
- 댓글
- Newsletter
- 공유 버튼
- 검색 서비스

외부 스크립트는 공급자가 침해되거나 전달 경로가 변조되면 사이트 방문자에게 영향을 줄 수 있다. OWASP도 제3자 JavaScript를 별도의 공급망 위험으로 다룬다. citeturn392708search12turn392708search25

### 개선

외부 스크립트마다 다음을 기록한다.

```text
왜 필요한가
어떤 데이터를 읽는가
어떤 도메인과 통신하는가
제거하면 무엇이 깨지는가
지연 로드할 수 있는가
```

---
## AP-SEC-07 — Third-Party Script Accumulation
- Category: Security and supply chain
- Original IDs: SEC-07
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 기능 하나마다 외부 스크립트 추가

```text
Analytics
AdSense
Giscus
Newsletter
Social share
Heatmap
Error tracking
```

### 문제

각 서비스의 위험은 작아도 전체 공격 표면과 개인정보 흐름은 누적된다.

### 개선

한 서비스가 실제 의사결정이나 사용자 가치에 기여하지 않는다면 제거한다.

---
## AP-SEC-08 — Third-Party Script in Critical Path
- Category: Security and supply chain
- Original IDs: SEC-08
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 외부 서비스가 실패하면 본문도 표시되지 않음

### 개선

```text
본문 렌더링
↓
외부 기능 지연 로딩
```

순서를 유지한다.

외부 스크립트 실패는 댓글·광고·분석 기능에만 영향을 줘야 한다.

---
## AP-SEC-09 — No Content Security Policy
- Category: Security and supply chain
- Original IDs: SEC-09
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 브라우저가 어디서든 스크립트와 자원을 불러올 수 있음

CSP는 허용된 스크립트·스타일·이미지·프레임 출처를 제한하는 방어 계층이다. XSS와 비인가 외부 자원 로딩 위험을 줄일 수 있다. citeturn392708search18turn392708search34turn392708search43

### 개선 예시 방향

```text
default-src 'self'
script-src 'self' 필요한 외부 도메인
img-src 'self' data: 필요한 이미지 도메인
frame-src Giscus 등 명시적 도메인
```

AdSense나 Analytics를 사용하면 허용 목록이 복잡해질 수 있으므로 실제 네트워크 요청을 기준으로 설계해야 한다.

---
## AP-SEC-10 — CSP Added After Everything
- Category: Security and supply chain
- Original IDs: SEC-10
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 외부 기능을 모두 붙인 뒤 마지막에 CSP 추가

### 문제

이미 inline script, 동적 style, 여러 외부 도메인에 의존해 엄격한 CSP를 적용하기 어려워진다.

### 개선

새 integration을 추가할 때 CSP 영향도 함께 검토한다.

---
## AP-SEC-100 — Maximum Security Complexity
- Category: Security and supply chain
- Original IDs: SEC-100
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 개인 블로그에 기업용 보안 플랫폼 구축

### 문제

보안 설정이 복잡해져 업데이트가 멈추거나 잘못된 정책을 방치하게 된다.

### 개선

위험에 비례한 단순한 방어가 더 적합하다.

```text
공개 사이트는 순수 정적
관리 기능 분리
외부 script 최소화
workflow 최소 권한
secret 없음
dependency 고정
HTTPS 강제
```

---
## AP-SEC-11 — CSP with `unsafe-inline` Everywhere
- Category: Security and supply chain
- Original IDs: SEC-11
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### CSP는 있지만 대부분 허용

```text
script-src 'self' 'unsafe-inline' 'unsafe-eval' *
```

### 문제

정책이 존재하지만 실질적인 보호 효과가 작다.

### 개선

가능하면 nonce나 hash 기반 script 정책을 사용하고, `unsafe-eval`이 필요한 의존성을 줄인다.

---
## AP-SEC-12 — CSP Report Ignored
- Category: Security and supply chain
- Original IDs: SEC-12
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### CSP 위반 리포트가 많아도 방치

### 문제

실제 공격, 잘못된 설정, 브라우저 확장 노이즈를 구분하지 못한다.

### 개선

처음에는 report-only 정책으로 관찰하고, 필요한 출처만 정제한 뒤 강제 정책으로 전환한다.

---
## AP-SEC-13 — No Subresource Integrity
- Category: Security and supply chain
- Original IDs: SEC-13
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### CDN script를 URL만 믿고 로드

SRI는 내려받은 자원의 cryptographic hash가 기대값과 일치하는지 브라우저가 확인하게 한다. CDN 자원이 예기치 않게 변경되는 위험을 줄이는 데 사용된다. citeturn392708search8turn392708search22

### 주의

AdSense처럼 공급자가 동적으로 변경하는 스크립트는 SRI 적용이 현실적으로 어려울 수 있다. 고정 버전의 정적 CDN 자원에 더 적합하다.

---
## AP-SEC-14 — SRI Without `crossorigin`
- Category: Security and supply chain
- Original IDs: SEC-14
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### integrity hash는 있지만 교차 출처 검증 설정이 잘못됨

### 문제

브라우저가 자원을 의도대로 검증하거나 로드하지 못할 수 있다.

### 개선

외부 정적 자원에 SRI를 적용할 때 CORS 조건을 함께 검토한다.

---
## AP-SEC-15 — Script Version Floating
- Category: Security and supply chain
- Original IDs: SEC-15
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 외부 CDN에서 최신 버전을 자동 사용

```html
<script src=".../library/latest.js">
```

### 문제

검토하지 않은 변경이 즉시 운영에 들어온다.

### 개선

고정된 version이나 immutable URL을 사용한다.

---
## AP-SEC-16 — Same-Origin Proxy as Automatic Trust
- Category: Security and supply chain
- Original IDs: SEC-16
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 외부 script를 자체 도메인으로 proxy하면 안전하다고 생각

### 문제

출처만 바뀔 뿐 코드 자체의 신뢰 문제는 남는다.

### 개선

version, integrity, 검토, 업데이트 절차가 함께 필요하다.

---
## AP-SEC-17 — Markdown Is Trusted HTML
- Category: Security and supply chain
- Original IDs: SEC-17
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### Markdown 콘텐츠는 작성자가 썼으니 항상 안전하다고 가정

현재는 혼자 작성하더라도 향후 다음 경로가 생길 수 있다.

- 관리자 편집기
- 외부 기여
- 자동 import
- AI 생성 초안
- RSS·책 노트 동기화
- GitHub issue 기반 콘텐츠

### 문제

raw HTML이나 scriptable attribute가 렌더링될 수 있다.

### 개선

Markdown pipeline에서 raw HTML 허용 정책을 명확히 한다.

---
## AP-SEC-18 — Raw HTML Everywhere
- Category: Security and supply chain
- Original IDs: SEC-18
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### Markdown 표현이 불편할 때 직접 HTML 삽입

```html
<div onclick="...">
<iframe ...>
<script ...>
```

### 문제

콘텐츠와 실행 코드 경계가 무너지고 sanitization이 어려워진다.

### 개선

필요한 embed는 허용된 컴포넌트나 directive로 제한한다.

---
## AP-SEC-19 — Unsafe HTML Injection
- Category: Security and supply chain
- Original IDs: SEC-19
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 검색 결과나 제목을 `innerHTML`로 삽입

```javascript
results.innerHTML = userControlledText;
```

XSS는 악성 콘텐츠가 페이지 문맥에서 실행되게 만들 수 있는 심각한 취약점이다. citeturn392708search29

### 개선

기본은 `textContent`와 안전한 DOM API를 사용한다. 정말 HTML이 필요하면 검증된 sanitizer와 명확한 허용 목록을 쓴다.

---
## AP-SEC-20 — Search Highlight via String Replacement
- Category: Security and supply chain
- Original IDs: SEC-20
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 검색어를 HTML 문자열에 직접 치환

```javascript
text.replace(query, `<mark>${query}</mark>`)
```

### 문제

검색 입력이 markup으로 해석될 수 있다.

### 개선

텍스트 노드를 분리해 `<mark>` 요소를 DOM API로 만든다.

---
## AP-SEC-21 — Unescaped Front Matter
- Category: Security and supply chain
- Original IDs: SEC-21
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 제목·description·태그를 HTML attribute에 그대로 삽입

### 문제

문자열이 attribute 문맥을 탈출할 수 있다.

### 개선

Astro의 기본 escaping을 우회하지 말고, 직접 HTML 문자열을 조립하지 않는다.

---
## AP-SEC-22 — Trusting Generated Content
- Category: Security and supply chain
- Original IDs: SEC-22
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### AI나 자동화가 만든 Markdown은 안전하다고 가정

### 문제

의도하지 않은 HTML, 외부 iframe, 추적 링크, 위험한 protocol이 들어갈 수 있다.

### 개선

생성 주체와 관계없이 동일한 content validation을 적용한다.

---
## AP-SEC-23 — Unsafe URL Scheme
- Category: Security and supply chain
- Original IDs: SEC-23
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 링크의 `href`를 검증하지 않음

```text
javascript:
data:
file:
```

### 개선

콘텐츠 링크에서 허용할 protocol을 제한한다.

일반적으로:

```text
https
http
mailto
내부 상대 경로
```

정도로 관리할 수 있다.

---
## AP-SEC-24 — Unrestricted Iframe Embedding
- Category: Security and supply chain
- Original IDs: SEC-24
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 어떤 URL이든 iframe으로 삽입 가능

### 문제

피싱 화면, 추적, 권한 요청, clickjacking 관련 위험이 늘어난다.

### 개선

- 허용 도메인 목록
- `sandbox`
- 필요한 최소 `allow`
- 명확한 제목
- 지연 로딩

을 사용한다.

OWASP는 제3자 콘텐츠 격리에 iframe sandbox와 CSP를 방어 수단으로 제안한다. citeturn392708search12

---
## AP-SEC-25 — Overpowered Iframe Sandbox
- Category: Security and supply chain
- Original IDs: SEC-25
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### sandbox를 쓰지만 모든 권한을 다시 허용

```html
sandbox="allow-scripts allow-same-origin allow-forms allow-popups ..."
```

### 문제

sandbox 효과가 크게 약해진다.

### 개선

기능에 필요한 최소 권한만 허용한다.

---
## AP-SEC-26 — Untrusted SVG as Image
- Category: Security and supply chain
- Original IDs: SEC-26
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 외부 SVG를 일반 이미지처럼 신뢰

SVG는 단순 그림 파일이 아니라 스크립트·외부 참조와 상호작용 요소를 포함할 수 있다.

### 개선

외부 SVG를 inline HTML로 삽입하지 말고, 필요하다면 sanitize하거나 빌드 과정에서 안전한 형태로 변환한다.

---
## AP-SEC-27 — Generated SVG Injection
- Category: Security and supply chain
- Original IDs: SEC-27
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### TikZ·다이어그램 생성 결과를 무조건 inline

### 문제

생성 도구나 입력 경로가 변하면 예상치 못한 markup이 들어갈 수 있다.

### 개선

생성물도 허용 요소·attribute 검사를 거친다.

---
## AP-SEC-28 — Actions Pinned by Mutable Tag
- Category: Security and supply chain
- Original IDs: SEC-28
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
```yaml
uses: actions/checkout@v4
```

태그는 편리하지만 변경 가능한 참조다. GitHub는 action을 immutable하게 사용하려면 full-length commit SHA로 고정하는 것을 권장한다. citeturn392708search1turn392708search11

### 개선

```yaml
uses: actions/checkout@<full-commit-sha>
```

그리고 사람이 이해할 수 있도록 옆에 버전 주석을 둔다.

---
## AP-SEC-29 — Arbitrary Third-Party Action
- Category: Security and supply chain
- Original IDs: SEC-29
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### README가 편리해 보여 바로 workflow에 추가

### 문제

Action은 저장소 코드·토큰·artifact에 접근할 수 있다.

GitHub도 action source가 secret과 repository 데이터를 어떻게 처리하는지 검토할 것을 권장한다. citeturn392708search1

### 개선

- 공식 action 우선
- 소스와 유지보수 상태 검토
- full SHA pin
- 최소 권한
- 대체 가능한 간단한 shell 명령과 비교

---
## AP-SEC-30 — Default Broad Workflow Permissions
- Category: Security and supply chain
- Original IDs: SEC-30
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### `GITHUB_TOKEN` 권한을 명시하지 않음

### 문제

workflow가 실제 필요한 범위보다 큰 권한을 받을 수 있다.

### 개선

workflow 또는 job 단위로 최소 권한을 지정한다.

```yaml
permissions:
  contents: read
```

배포 job만 필요한 write 권한을 별도로 준다.

---
## AP-SEC-31 — Write Token in Build Job
- Category: Security and supply chain
- Original IDs: SEC-31
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### Markdown build와 배포가 같은 고권한 job

### 문제

빌드 dependency나 script가 침해되면 write token까지 접근할 가능성이 커진다.

### 개선

```text
untrusted build
→ artifact
→ minimal deploy job
```

으로 권한 경계를 나눈다.

---
## AP-SEC-32 — Secrets Available to Every Step
- Category: Security and supply chain
- Original IDs: SEC-32
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### workflow 전체에 secret을 환경변수로 설정

```yaml
env:
  TOKEN: ${{ secrets.TOKEN }}
```

### 문제

필요하지 않은 action과 script도 secret을 볼 수 있다.

### 개선

실제로 사용하는 단일 step에만 전달한다.

---
## AP-SEC-33 — Secret Printed Through Debug Logging
- Category: Security and supply chain
- Original IDs: SEC-33
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### troubleshooting을 위해 환경 전체 출력

```bash
env
set -x
```

### 문제

secret masking이 모든 변형과 가공된 문자열을 완벽히 막는다고 가정하면 위험하다.

### 개선

민감한 환경에서는 전체 environment와 command tracing을 출력하지 않는다.

---
## AP-SEC-34 — Secret in Build Artifact
- Category: Security and supply chain
- Original IDs: SEC-34
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 환경변수를 정적 HTML이나 JavaScript에 삽입

### 문제

정적 사이트에 포함된 값은 결국 모든 방문자가 볼 수 있다.

### 개선

브라우저에서 필요한 값은 public identifier로 취급한다. 비밀이 필요한 기능은 정적 사이트에 직접 넣을 수 없다.

---
## AP-SEC-35 — Pull Request Workflow with Secrets
- Category: Security and supply chain
- Original IDs: SEC-35
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 외부 PR 콘텐츠를 secret이 있는 workflow에서 처리

### 문제

악성 PR이 build script나 package script를 변경해 secret을 탈취할 수 있다.

### 개선

외부 기여 검증과 권한 있는 배포를 분리한다.

---
## AP-SEC-36 — Unsafe `pull_request_target`
- Category: Security and supply chain
- Original IDs: SEC-36
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### fork PR 코드를 privileged context에서 checkout·실행

### 문제

기여자의 코드를 저장소 권한과 함께 실행할 수 있다.

### 개선

`pull_request_target`은 metadata 처리처럼 명확히 안전한 작업으로 제한한다.

---
## AP-SEC-37 — Branch Name Injection
- Category: Security and supply chain
- Original IDs: SEC-37
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### PR 제목·브랜치·commit message를 shell 명령에 직접 삽입

```bash
echo "${{ github.event.pull_request.title }}"
```

사용 위치에 따라 shell injection 위험이 생길 수 있다.

### 개선

환경변수로 전달하고 shell quoting을 엄격히 한다. 가능하면 GitHub context 값을 명령 코드로 직접 조립하지 않는다.

---
## AP-SEC-38 — Untrusted Markdown Executed During Build
- Category: Security and supply chain
- Original IDs: SEC-38
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 글 속 directive가 shell command나 파일 경로를 생성

예:

```text
TikZ input
diagram command
include path
```

### 문제

외부 PR의 콘텐츠가 build host에서 명령 실행이나 임의 파일 접근으로 이어질 수 있다.

### 개선

- command argument allowlist
- 작업 디렉터리 격리
- shell 문자열 조립 금지
- 외부 PR에서는 위험한 generator 비활성화

---
## AP-SEC-39 — Build Tool with Repository Write Access
- Category: Security and supply chain
- Original IDs: SEC-39
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### formatter나 migration script가 CI에서 원본 저장소를 직접 수정·push

### 문제

오류나 침해 시 대량 변경을 자동 반영할 수 있다.

### 개선

자동 수정은 PR을 생성하고 사람이 검토하게 한다.

---
## AP-SEC-40 — Deployment From Unreviewed Commit
- Category: Security and supply chain
- Original IDs: SEC-40
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 임의 branch나 workflow_dispatch 입력으로 운영 배포

### 개선

보호된 branch와 검토된 artifact만 배포한다.

---
## AP-SEC-41 — Blind Dependency Installation
- Category: Security and supply chain
- Original IDs: SEC-41
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 패키지 이름과 다운로드 수만 보고 설치

npm 생태계의 dependency는 취약점과 공급망 위험을 포함할 수 있으므로 검토와 관리가 필요하다. citeturn392708search39turn392708search44

### 개선

새 dependency마다 다음을 확인한다.

```text
유지보수 상태
소유자 변경
release 빈도
transitive dependency
install script
필요 권한
대체 가능성
```

---
## AP-SEC-42 — Dependency for Minor Convenience
- Category: Security and supply chain
- Original IDs: SEC-42
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 몇 줄이면 되는 기능에 대형 패키지 추가

### 문제

직접 코드 수는 줄지만 공급망과 업데이트 책임은 늘어난다.

### 개선

패키지 도입 비용을 다음으로 평가한다.

```text
코드 절감
보안 표면
dependency tree
업데이트 빈도
브라우저 bundle
빌드 영향
```

---
## AP-SEC-43 — Transitive Dependency Blindness
- Category: Security and supply chain
- Original IDs: SEC-43
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 직접 설치한 패키지만 검토

### 문제

실제 의존성 대부분은 하위 패키지일 수 있다.

### 개선

lockfile 변화와 dependency tree 크기를 함께 검토한다.

---
## AP-SEC-44 — Automatic Major Update Merge
- Category: Security and supply chain
- Original IDs: SEC-44
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### Dependabot PR이 테스트만 통과하면 자동 merge

### 문제

API 변경 외에도 빌드 결과·HTML·보안 정책·추적 동작이 달라질 수 있다.

### 개선

패키지 역할에 따라 정책을 나눈다.

```text
patch: 자동화 가능
minor: 검토
major: 수동 검증
security: 노출도 평가 후 우선 처리
```

Dependabot은 업데이트 자동화를 지원하지만, 자동화 범위와 승인 정책은 별도로 설계해야 한다. citeturn392708search17

---
## AP-SEC-45 — Vulnerability Count Theater
- Category: Security and supply chain
- Original IDs: SEC-45
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### `npm audit` 숫자 0만 목표

### 문제

빌드 시에만 사용하는 패키지와 실제 브라우저에 전달되는 코드의 위험이 다르다.

### 개선

```text
실행 가능성
노출 경로
영향도
사용 버전
완화 수단
```

을 평가한다.

---
## AP-SEC-46 — Ignoring Build-Time Compromise
- Category: Security and supply chain
- Original IDs: SEC-46
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 브라우저 bundle에 포함되지 않으니 build dependency는 안전하다고 생각

### 문제

빌드 도구는 원본 콘텐츠, secret, output HTML을 변경할 수 있다.

### 개선

build dependency도 production supply chain으로 취급한다.

---
## AP-SEC-47 — Install Script Trust
- Category: Security and supply chain
- Original IDs: SEC-47
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### package의 `preinstall`·`postinstall` 실행을 무조건 허용

### 문제

설치 과정에서 임의 코드가 실행될 수 있다.

### 개선

새 package의 lifecycle script를 확인하고 필요하지 않은 실행 권한을 줄인다.

---
## AP-SEC-48 — Lockfile Bypass
- Category: Security and supply chain
- Original IDs: SEC-48
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### CI에서 lockfile과 다른 최신 dependency 설치

### 개선

재현 가능한 설치 명령을 사용하고 lockfile 변경은 코드처럼 검토한다.

---
## AP-SEC-49 — Lockfile Change Hidden in Large PR
- Category: Security and supply chain
- Original IDs: SEC-49
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 콘텐츠 대량 수정과 dependency update가 섞임

### 문제

공급망 변화 검토가 묻힌다.

### 개선

dependency 변경은 별도 PR이나 commit으로 분리한다.

---
## AP-SEC-50 — Abandoned Dependency Retention
- Category: Security and supply chain
- Original IDs: SEC-50
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 더 이상 유지되지 않는 plugin을 계속 사용

### 문제

새로운 Astro·Node 환경에서 호환성뿐 아니라 보안 패치도 기대하기 어렵다.

### 개선

핵심 plugin마다 유지보수 상태와 제거 대안을 기록한다.

---
## AP-SEC-51 — OAuth Secret in Static Client
- Category: Security and supply chain
- Original IDs: SEC-51
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### GitHub OAuth client secret을 Astro 정적 bundle에 포함

### 문제

브라우저에 전달된 secret은 secret이 아니다.

### 개선

OAuth code exchange에 secret이 필요한 구조라면 신뢰할 수 있는 server-side component가 필요하다.

---
## AP-SEC-52 — Personal Access Token in Browser Storage
- Category: Security and supply chain
- Original IDs: SEC-52
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### GitHub PAT를 `localStorage`에 저장

### 문제

동일 origin의 XSS나 악성 script가 읽을 수 있다.

### 개선

개인용 로컬 도구로 범위를 제한하거나, 짧은 수명의 token과 안전한 backend session 구조를 사용한다.

---
## AP-SEC-53 — Long-Lived Broad PAT
- Category: Security and supply chain
- Original IDs: SEC-53
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 저장소 전체를 수정할 수 있는 장기 token 사용

### 개선

- fine-grained token
- 특정 저장소
- 필요한 권한만
- 짧은 만료
- 주기적 회전

을 적용한다.

---
## AP-SEC-54 — OAuth Scope Inflation
- Category: Security and supply chain
- Original IDs: SEC-54
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 미래 기능을 위해 넓은 scope 요청

### 문제

사용자와 저장소에 대한 불필요한 접근 권한을 가진다.

### 개선

현재 기능에 필요한 최소 scope만 요청한다.

---
## AP-SEC-55 — Authentication Without Authorization
- Category: Security and supply chain
- Original IDs: SEC-55
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 로그인했으면 누구나 글 수정 가능

### 문제

사용자 신원 확인과 권한 확인은 다른 문제다.

### 개선

허용 사용자·조직·저장소·branch를 별도로 검증한다.

---
## AP-SEC-56 — Client-Side Authorization Only
- Category: Security and supply chain
- Original IDs: SEC-56
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### UI에서 관리자 메뉴를 숨기는 것으로 권한 처리

### 문제

API 요청은 직접 호출할 수 있다.

### 개선

권한이 필요한 모든 write operation은 신뢰 경계에서 다시 검증한다.

---
## AP-SEC-57 — Missing OAuth `state`
- Category: Security and supply chain
- Original IDs: SEC-57
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### OAuth 요청과 callback의 연결을 검증하지 않음

### 문제

로그인 CSRF나 callback 혼동 위험이 생긴다.

### 개선

예측 불가능한 state 값을 생성하고 callback에서 검증한다.

---
## AP-SEC-58 — Redirect URI Wildcard
- Category: Security and supply chain
- Original IDs: SEC-58
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 여러 환경 지원을 위해 넓은 callback URL 허용

### 문제

token이나 authorization code가 예상치 못한 위치로 전달될 수 있다.

### 개선

정확한 redirect URI를 환경별로 등록한다.

---
## AP-SEC-59 — Token in URL
- Category: Security and supply chain
- Original IDs: SEC-59
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### access token을 query string에 전달

### 문제

browser history, referrer, 로그에 남을 수 있다.

### 개선

URL에 secret이나 token을 넣지 않는다.

---
