---
title: "Security and supply chain (40 anti-patterns)"
category: security
item_count: 40
---
# Security and supply chain
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-SEC-60 — Editor Can Commit Anywhere
- Category: Security and supply chain
- Original IDs: SEC-60
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 관리자 편집기가 임의 경로에 파일 저장

### 문제

workflow·config·script까지 수정할 수 있다.

### 개선

콘텐츠 전용 디렉터리와 허용 파일 확장자를 제한한다.

---
## AP-SEC-61 — Editor Can Modify Workflow Files
- Category: Security and supply chain
- Original IDs: SEC-61
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 콘텐츠 편집 token이 `.github/workflows`까지 수정 가능

### 문제

다음 CI 실행에서 코드 실행 권한으로 확대될 수 있다.

### 개선

콘텐츠 작성 권한과 workflow 관리 권한을 분리한다.

---
## AP-SEC-62 — Unsanitized Commit Message
- Category: Security and supply chain
- Original IDs: SEC-62
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 사용자 입력을 commit message나 API payload에 그대로 사용

### 개선

길이·문자·형식을 제한하고 로그 인젝션이나 제어문자를 제거한다.

---
## AP-SEC-63 — No Conflict Detection
- Category: Security and supply chain
- Original IDs: SEC-63
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 편집기가 최신 commit 확인 없이 덮어씀

### 문제

보안 취약점은 아니더라도 콘텐츠 무결성과 감사 가능성이 떨어진다.

### 개선

base commit SHA를 확인하고 conflict 시 명시적으로 중단한다.

---
## AP-SEC-64 — Analytics Without Data Inventory
- Category: Security and supply chain
- Original IDs: SEC-64
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### Analytics를 켰지만 어떤 데이터가 수집되는지 모름

### 개선

최소한 다음을 정리한다.

```text
수집 이벤트
쿠키 사용
IP 처리
보존 기간
외부 이전
사용 목적
```

---
## AP-SEC-65 — Privacy Policy by Template
- Category: Security and supply chain
- Original IDs: SEC-65
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 서비스 이름만 바꾼 정책 복사

### 문제

실제 Giscus·AdSense·Analytics 구성과 일치하지 않을 수 있다.

### 개선

실제 network와 storage 동작을 기준으로 작성한다.

---
## AP-SEC-66 — Privacy Policy Drift
- Category: Security and supply chain
- Original IDs: SEC-66
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 서비스는 추가·제거했지만 정책은 그대로

### 개선

외부 integration 변경을 개인정보 처리방침 검토 조건으로 만든다.

---
## AP-SEC-67 — Consent Banner Theater
- Category: Security and supply chain
- Original IDs: SEC-67
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 실제 제어 없이 “동의” 버튼만 제공

### 문제

버튼을 누르기 전에도 모든 추적 script가 로드될 수 있다.

### 개선

동의가 필요한 환경과 서비스라면 실제 script loading과 연결한다.

---
## AP-SEC-68 — Consent for Everything
- Category: Security and supply chain
- Original IDs: SEC-68
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 필수 기능까지 모두 쿠키 동의 대상으로 표시

### 문제

사용자에게 불필요한 선택 부담을 준다.

### 개선

필수 저장, 기능 저장, 분석, 광고를 구분한다.

---
## AP-SEC-69 — Local Storage Without Disclosure
- Category: Security and supply chain
- Original IDs: SEC-69
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 테마·검색 기록·읽기 상태를 저장하지만 안내 없음

### 개선

민감하지 않은 설정이라도 무엇을 왜 저장하는지 문서화한다.

---
## AP-SEC-70 — Persistent Search History
- Category: Security and supply chain
- Original IDs: SEC-70
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 검색어를 무기한 브라우저나 서버에 저장

### 문제

기술 검색어에도 회사명·오류 로그·내부 식별자가 포함될 수 있다.

### 개선

필요하지 않다면 저장하지 않고, 저장하더라도 사용자 제어와 짧은 보존을 적용한다.

---
## AP-SEC-71 — Full URL Analytics Leakage
- Category: Security and supply chain
- Original IDs: SEC-71
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### query·fragment를 포함한 URL 전체를 analytics로 전송

### 문제

검색어, 내부 식별자, 임시 token 같은 정보가 섞일 수 있다.

### 개선

수집 전에 URL을 정규화하고 민감한 parameter를 제거한다.

---
## AP-SEC-72 — Error Logging with Page Content
- Category: Security and supply chain
- Original IDs: SEC-72
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 검색 입력이나 편집 중 문서를 오류 리포트에 첨부

### 개선

기본적으로 최소한의 기술 정보만 수집하고 콘텐츠 본문은 제외한다.

---
## AP-SEC-73 — Giscus as a First-Party Comment Store
- Category: Security and supply chain
- Original IDs: SEC-73
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 댓글 데이터가 완전히 사이트 내부에서 관리된다고 생각

Giscus는 GitHub Discussions와 GitHub 계정에 의존하는 외부 integration이다.

### 개선

댓글을 쓰면 외부 서비스로 이동한다는 사실과 관련 정책을 명확히 보여준다.

---
## AP-SEC-74 — Loading Comments Before User Intent
- Category: Security and supply chain
- Original IDs: SEC-74
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 댓글을 읽지 않는 사용자에게도 즉시 외부 요청

### 개선

댓글 영역에 도달하거나 사용자가 열었을 때 로드하는 방식을 고려한다.

---
## AP-SEC-75 — Advertising Identifier Assumptions
- Category: Security and supply chain
- Original IDs: SEC-75
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### AdSense를 단순 이미지 광고처럼 생각

### 문제

광고 ecosystem은 쿠키·식별자·동의·지역별 규제와 연결될 수 있다.

### 개선

광고 도입 시 Google의 최신 정책과 사용 지역의 요구사항을 별도로 확인한다.

---
## AP-SEC-76 — HTTPS Optional
- Category: Security and supply chain
- Original IDs: SEC-76
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### HTTP 접속도 그대로 허용

GitHub Pages는 HTTPS 강제를 지원하며, HTTPS는 전송 중 가로채기와 변조 위험을 줄인다. citeturn392708search37

### 개선

`Enforce HTTPS`를 활성화하고 내부 링크와 canonical도 HTTPS로 통일한다.

---
## AP-SEC-77 — Mixed Content
- Category: Security and supply chain
- Original IDs: SEC-77
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### HTTPS 페이지에서 HTTP 이미지·script 로드

### 문제

브라우저 차단이나 콘텐츠 변조 위험이 생긴다.

### 개선

모든 외부 자원을 HTTPS로 사용하거나 자체 호스팅한다.

---
## AP-SEC-78 — Dangling Custom Domain
- Category: Security and supply chain
- Original IDs: SEC-78
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### GitHub Pages 설정을 제거했지만 DNS는 남음

### 문제

도메인 소유권과 hosting 연결이 어긋나면 takeover 위험을 검토해야 한다.

### 개선

사이트 이전·삭제 시 DNS와 Pages 설정을 함께 정리한다.

---
## AP-SEC-79 — DNS Change Without Verification
- Category: Security and supply chain
- Original IDs: SEC-79
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### custom domain 변경 후 인증서·리다이렉트·canonical 미검증

### 개선

다음을 함께 확인한다.

```text
HTTPS certificate
www/apex redirect
canonical URL
Sitemap
GitHub Pages domain verification
```

---
## AP-SEC-80 — Preview Domain Indexed
- Category: Security and supply chain
- Original IDs: SEC-80
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### preview·staging 사이트가 검색에 노출

### 문제

중복 콘텐츠와 운영 전 콘텐츠 노출이 발생한다.

### 개선

preview 환경은 인증하거나 `noindex`를 적용하고 Sitemap에서 제외한다.

---
## AP-SEC-81 — Source Map Exposure Without Need
- Category: Security and supply chain
- Original IDs: SEC-81
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### production JavaScript source map을 공개

### 문제

비밀이 직접 들어가면 안 되지만, 내부 코드 구조와 개발 경로를 불필요하게 노출할 수 있다.

### 개선

실제 오류 분석에 필요한지 판단하고 공개 여부를 결정한다.

---
## AP-SEC-82 — Backup Files in Public Output
- Category: Security and supply chain
- Original IDs: SEC-82
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 다음 파일이 `dist`에 포함

```text
.env
*.bak
draft.md
source.psd
private.json
```

### 개선

배포 artifact allowlist 또는 민감 파일 검사를 둔다.

---
## AP-SEC-83 — Internal Log Publication
- Category: Security and supply chain
- Original IDs: SEC-83
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 기술 설명을 위해 회사 로그를 그대로 게시

### 노출 가능 정보

- 내부 hostname
- IP
- 사용자 이름
- 경로
- repository URL
- 고객명
- device serial
- token
- 이메일

### 개선

로그는 게시 전 구조적으로 redact한다.

---
## AP-SEC-84 — Screenshot Metadata Leakage
- Category: Security and supply chain
- Original IDs: SEC-84
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 터미널이나 브라우저 전체 화면 캡처

### 문제

탭 제목·북마크·경로·이메일·알림이 노출될 수 있다.

### 개선

필요 영역만 crop하고 게시 전 별도 검토한다.

---
## AP-SEC-85 — Image EXIF Leakage
- Category: Security and supply chain
- Original IDs: SEC-85
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 사진 원본의 위치·기기 metadata 유지

### 개선

게시 파이프라인에서 불필요한 metadata를 제거한다.

---
## AP-SEC-86 — Repository URL Leakage
- Category: Security and supply chain
- Original IDs: SEC-86
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 비공개 GitLab·Jira·사내 도메인을 그대로 표시

### 문제

직접 접근되지 않더라도 조직 구조와 기술 환경을 노출한다.

### 개선

콘텐츠 가치에 필요하지 않으면 일반화한다.

---
## AP-SEC-87 — Personal Path Leakage
- Category: Security and supply chain
- Original IDs: SEC-87
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
```text
/Users/sangduk/...
/home/hawk/...
```

### 문제

사용자 계정명과 개발 환경이 드러난다.

### 개선

예제 경로로 치환한다.

---
## AP-SEC-88 — Real Token in Tutorial
- Category: Security and supply chain
- Original IDs: SEC-88
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 설명을 위해 실제 API key 형식 사용

### 문제

샘플과 실 secret을 구분하기 어렵고 자동 scanner에 탐지될 수 있다.

### 개선

명백한 placeholder를 사용한다.

```text
YOUR_GITHUB_TOKEN
example.invalid
```

---
## AP-SEC-89 — Secret Redaction by Partial Mask
- Category: Security and supply chain
- Original IDs: SEC-89
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
```text
ghp_abcd********
```

### 문제

token prefix와 길이, 일부 값이 재사용·식별에 도움이 될 수 있다.

### 개선

secret 전체를 placeholder로 교체한다.

---
## AP-SEC-90 — Private Draft in Git History
- Category: Security and supply chain
- Original IDs: SEC-90
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 공개되지 않게 `draft: true`만 설정

### 문제

공개 repository에는 원본 Markdown이 그대로 보인다.

### 개선

비공개 내용은 공개 저장소에 commit하지 않는다. Draft flag는 사이트 출력 제어이지 접근 통제가 아니다.

---
## AP-SEC-91 — No Security Update Routine
- Category: Security and supply chain
- Original IDs: SEC-91
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 취약점 알림이 올 때만 대응

### 개선

정기적으로 다음을 확인한다.

```text
dependency alerts
GitHub Actions versions
외부 integrations
CSP violations
노출된 secrets
도메인 설정
```

---
## AP-SEC-92 — Alert Fatigue
- Category: Security and supply chain
- Original IDs: SEC-92
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 모든 dependency 경고를 같은 우선순위로 처리

### 개선

```text
브라우저 runtime
빌드 실행
개발 전용
도달 불가능 경로
```

별로 분류한다.

---
## AP-SEC-93 — Security Scanner as Proof of Safety
- Category: Security and supply chain
- Original IDs: SEC-93
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### scanner가 통과했으니 안전하다고 판단

### 문제

권한 설계, 개인정보 흐름, 잘못된 OAuth 구조 같은 문제는 단순 dependency scan으로 잡히지 않는다.

### 개선

자동 검사와 threat modeling을 함께 사용한다.

---
## AP-SEC-94 — No Integration Inventory
- Category: Security and supply chain
- Original IDs: SEC-94
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 어떤 외부 도메인과 서비스가 연결됐는지 모름

### 개선

```text
Service
Purpose
Loaded on
Data sent
Credentials
Owner
Removal procedure
```

형태의 간단한 목록을 둔다.

---
## AP-SEC-95 — No Secret Rotation Plan
- Category: Security and supply chain
- Original IDs: SEC-95
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### token이 노출됐을 때 무엇을 바꿔야 하는지 모름

### 개선

secret별 위치·권한·회전·폐기 절차를 기록한다.

---
## AP-SEC-96 — Incident Means Site Defacement Only
- Category: Security and supply chain
- Original IDs: SEC-96
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 화면이 변조돼야 침해라고 생각

실제로는 다음도 incident다.

- 악성 script 삽입
- 광고 계정 오용
- Analytics 데이터 변조
- OAuth token 노출
- content repository 변경
- DNS 변경
- secret 유출

### 개선

탐지·차단·복구 범위를 넓게 정의한다.

---
## AP-SEC-97 — No Deployment Provenance
- Category: Security and supply chain
- Original IDs: SEC-97
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 어떤 workflow와 dependency로 배포됐는지 모름

### 개선

배포 artifact에 commit SHA, build 시각, 주요 tool version을 기록한다.

---
## AP-SEC-98 — Manual Emergency Edit
- Category: Security and supply chain
- Original IDs: SEC-98
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### 운영 장애 때 생성된 HTML을 직접 수정

### 문제

원본과 운영 상태가 달라지고 다음 배포에서 되돌아간다.

### 개선

항상 원본 저장소에서 수정하고 긴급 rollback 절차를 마련한다.

---
## AP-SEC-99 — Security Controls Without Tests
- Category: Security and supply chain
- Original IDs: SEC-99
- Source messages: f8db6fce-9ed2-49f0-bb1c-0b5d2935a99b
- Merge status: canonical source
### Source material
### CSP·redirect·admin 제한을 설정했지만 실제 검증 없음

### 개선

배포 후 자동 검사를 둔다.

```text
HTTPS 강제
security headers
admin route 노출
source map
민감 파일
외부 script 출처
```

---
