---
title: "Content strategy and structure (60 anti-patterns)"
category: content
item_count: 60
---
# Content strategy and structure
> LLM instructions: Treat each `AP-*` block as an atomic claim. Use `Original IDs` and `Related IDs` for traceability; do not infer that nearby blocks are duplicates.
## AP-G-08-2 — Secret 전달 범위 축소
- Category: Content strategy and structure
- Original IDs: G-08
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 나쁜 방식

```yaml
env:
  TOKEN: ${{ secrets.SOME_TOKEN }}
```

workflow 전체가 접근한다.

### 권장

```yaml
- name: Perform required operation
  env:
    TOKEN: ${{ secrets.SOME_TOKEN }}
  run: ./scripts/required-operation.sh
```

필요한 한 step에만 전달한다.

### 추가 원칙

- secret을 command-line argument에 직접 넣지 않음
- `env`, `printenv`, `set -x` 금지
- secret이 포함된 파일을 artifact로 업로드하지 않음
- build output에 환경변수 덤프를 포함하지 않음

### 완료 조건

- Secret이 job 전체에 설정되지 않음
- 사용하지 않는 step은 secret 접근 불가
- debug logging에서 환경 전체 출력 없음
- artifact 내부 secret scan 통과

### 우선순위

```text
P0
```

---
## AP-G-09 — Research Without a Question
- Category: Content strategy and structure
- Original IDs: G-09
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 자료를 많이 모으지만 무엇을 밝힐지 없음

### 증상

- 공식 문서 링크 다수
- 소스코드 위치 다수
- 결론이 정해지지 않음
- 글이 자료 모음집이 됨

### 개선

조사 시작 전에 한 문장 질문을 쓴다.

```text
Linux는 CXL Type 3 메모리를 어떤 단계에서 NUMA 노드로 등록하는가?
```

---
## AP-G-09-2 — 노출된 Secret 대응 절차
- Category: Content strategy and structure
- Original IDs: G-09
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 원칙

Git에서 문자열을 삭제하는 것만으로 해결되지 않는다.

노출 시 순서:

```text
1. Secret 폐기
2. 새 credential 발급
3. 권한 축소
4. 사용 위치 교체
5. 로그·artifact·history 범위 조사
6. 필요하면 history 정리
7. 원인과 재발 방지 기록
```

### 피해야 할 것

```text
앞 네 글자만 남기고 마스킹
파일 삭제 후 같은 token 계속 사용
Private repo였다는 이유로 무시
```

### 완료 조건

- Incident runbook에 secret 노출 절차 존재
- credential 회전 위치를 찾을 수 있음
- 실제 token 대신 명백한 placeholder를 문서에 사용

### 우선순위

```text
P1
```

---
## AP-G-10 — Research Scope Inflation
- Category: Content strategy and structure
- Original IDs: G-10
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 조사 중 연관 개념을 계속 추가

### 문제

한 글이 끝나지 않고 범위가 무한히 넓어진다.

### 개선

본문 범위와 별도 후속 글 후보를 분리한다.

```text
현재 글에서 답할 것
참고만 할 것
후속 글로 넘길 것
```

---
## AP-G-10-2 — 외부 PR과 배포 흐름 분리
- Category: Content strategy and structure
- Original IDs: G-10
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
현재 외부 기여를 받지 않더라도 workflow는 안전한 기본 구조로 두는 편이 좋다.

### PR validation

```text
읽기 권한
secret 없음
배포 없음
위험한 generator 제한
```

### Main 배포

```text
보호된 branch
검토된 commit
별도 deploy job
```

### 완료 조건

- Fork PR에서 secret이 전달되지 않음
- PR workflow가 production deploy를 실행하지 않음
- PR이 workflow나 package script를 바꿔도 write token에 접근하지 못함
- 승인되지 않은 artifact가 운영에 배포되지 않음

### 우선순위

```text
P1
```

---
## AP-G-100 — Editorial System Becomes the Product
- Category: Content strategy and structure
- Original IDs: G-100
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 콘텐츠 운영 체계 자체를 계속 설계

### 문제

가이드, 점수표, 자동화, 대시보드는 완성되지만 실제 핵심 글은 개선되지 않는다.

### 개선

운영 체계는 다음 세 작업을 빠르게 만들면 충분하다.

```text
좋은 글을 발행
기존 글을 신뢰 가능하게 유지
필요 없는 글을 정리
```

---
## AP-G-11 — Source Collection Without Hierarchy
- Category: Content strategy and structure
- Original IDs: G-11
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 출처 신뢰도를 구분하지 않음

```text
공식 규격
공식 문서
소스코드
개인 블로그
커뮤니티 답변
AI 답변
```

이 모두 같은 수준으로 취급된다.

### 개선

근거 우선순위를 정한다.

```text
1. 실제 관찰·측정
2. 공식 사양
3. 공식 소스코드·문서
4. 신뢰할 수 있는 기술 자료
5. 커뮤니티 경험
6. 미검증 가설
```

---
## AP-G-11-2 — `pull_request_target` 제한
- Category: Content strategy and structure
- Original IDs: G-11
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 위험

`pull_request_target`은 대상 저장소 문맥에서 동작하므로 외부 PR 코드를 checkout하고 실행하면 위험할 수 있다.

### 허용 가능한 역할

```text
label 부여
PR metadata 검사
안전한 댓글 작성
```

### 금지할 역할

```text
PR branch checkout 후 npm install
PR의 build script 실행
외부 콘텐츠 generator 실행
secret을 사용하는 테스트
```

### 완료 조건

- 불필요한 `pull_request_target` 없음
- 사용한다면 PR 코드를 실행하지 않음
- 목적과 권한이 주석으로 설명됨

### 우선순위

```text
P1
```

---
## AP-G-12 — Citation as Decoration
- Category: Content strategy and structure
- Original IDs: G-12
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 참고 링크를 넣었으니 검증됐다고 생각

### 문제

출처가 실제 주장과 일치하지 않을 수 있다.

### 개선

각 핵심 주장에 대해 다음을 확인한다.

```text
출처가 직접 뒷받침하는가
버전이 일치하는가
문맥을 잘라내지 않았는가
현재도 유효한가
```

---
## AP-G-12-2 — Dependency 역할 분류
- Category: Content strategy and structure
- Original IDs: G-12
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
모든 dependency를 다음으로 분류한다.

```text
runtime
build
content-tool
development
optional integration
```

### 감사표

| Package | 역할 | Browser 전달 | Install Script | 유지 상태 | 대체 가능 |
|---|---|---:|---:|---|---|
| Astro | build | 일부 | 확인 | 활발 | 낮음 |
| Shiki | build | 아니오 | 확인 | 활발 | 중간 |
| 특정 plugin | content-tool | 아니오 | 확인 | 불명 | 높음 |

### 완료 조건

- 용도를 모르는 dependency 없음
- 제거된 기능의 잔존 package 없음
- 동일 목적의 library 중복 확인
- browser runtime dependency와 build dependency를 구분

### 우선순위

```text
P0
```

---
## AP-G-13 — Secondary Source Cascade
- Category: Content strategy and structure
- Original IDs: G-13
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 다른 블로그가 인용한 블로그를 다시 인용

### 문제

원래 출처와 실제 근거가 사라지고 오류가 반복된다.

### 개선

가능하면 사양·소스·공식 문서까지 거슬러 올라간다.

---
## AP-G-13-2 — Install Script 감사
- Category: Content strategy and structure
- Original IDs: G-13
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 확인 대상

```text
preinstall
install
postinstall
prepare
```

설치 시 임의 코드가 실행될 수 있으므로 새 package 도입 시 lifecycle script를 확인한다.

### 작업

```bash
npm query ':attr(scripts, [postinstall])'
```

실제 package manager에 맞는 명령이나 lockfile 분석 도구를 사용한다.

### 정책

- 꼭 필요한 native build는 허용
- 이유를 모르는 postinstall은 검토
- 단순 도구인데 외부 binary 다운로드 시 경계 강화
- CI에서 불필요한 script를 비활성화할 수 있는지 검토

### 완료 조건

- Install script를 가진 direct dependency 목록 확보
- 외부 binary 다운로드 package 파악
- 불필요하거나 관리되지 않는 package 제거

### 우선순위

```text
P1
```

---
## AP-G-14 — Version-Mismatched Evidence
- Category: Content strategy and structure
- Original IDs: G-14
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 최신 글에 과거 버전의 자료를 근거로 사용

예:

```text
Linux 6.12 동작 설명
근거는 Linux 5.4 소스
```

### 문제

구조가 바뀌었을 가능성을 놓친다.

### 개선

근거의 버전을 본문 환경과 맞춘다.

---
## AP-G-14-2 — Lockfile 변경 분리
- Category: Content strategy and structure
- Original IDs: G-14
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
Dependency 변경과 대량 콘텐츠 수정이 같은 PR에 섞이면 공급망 diff가 묻힌다.

### 원칙

```text
dependency update
platform migration
content bulk edit
```

을 가능한 한 별도 commit이나 PR로 나눈다.

### 완료 조건

- Lockfile 대량 변경이 콘텐츠 수정에 섞이지 않음
- 새 transitive dependency 수를 확인할 수 있음
- major update는 별도 검증 기록 존재

### 우선순위

```text
P1
```

---
## AP-G-15 — Source Code Snapshot Without Commit
- Category: Content strategy and structure
- Original IDs: G-15
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 소스 위치만 언급

```text
drivers/pci/probe.c에서 처리한다.
```

### 문제

향후 줄 번호와 동작이 바뀐다.

### 개선

가능하면 다음을 함께 기록한다.

```text
repository
tag 또는 commit
file
symbol
```

---
## AP-G-15-2 — 취약점 알림 우선순위화
- Category: Content strategy and structure
- Original IDs: G-15
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
`npm audit` 숫자 0을 목표로 삼지 않는다.

### 분류

```text
브라우저에서 실행되는가
빌드 시 임의 코드를 실행하는가
개발 환경에만 있는가
실제 취약 경로가 도달 가능한가
업데이트로 회귀 위험이 큰가
```

### 결과 상태

```text
update
remove
mitigate
accept temporarily
not applicable
```

### 완료 조건

- Critical·High 경고의 실제 노출 경로 평가
- 단순 숫자 숨기기를 위해 무리한 major update를 하지 않음
- 수용한 위험에는 이유와 재검토 조건 존재

### 우선순위

```text
P1
```

---
## AP-G-16 — Experiment After Conclusion
- Category: Content strategy and structure
- Original IDs: G-16
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 결론을 먼저 정하고 실험으로 확인하려 함

### 문제

원하는 결과만 선택하거나 반대 결과를 예외로 넘기기 쉽다.

### 개선

실험 전에 가설과 판정 기준을 적는다.

---
## AP-G-16-2 — 외부 Integration Inventory
- Category: Content strategy and structure
- Original IDs: G-16
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 목록

| Service | 목적 | 로드 페이지 | 전송 데이터 | 쿠키·저장소 | 제거 시 영향 |
|---|---|---|---|---|---|
| AdSense | 광고 | 조건부 article | 광고 관련 | 가능 | 광고만 제거 |
| Analytics | 통계 | 선별 | page event | 설정에 따라 | 통계만 제거 |
| Giscus | 댓글 | article 하단 | GitHub interaction | 외부 | 댓글만 제거 |
| 외부 폰트 | 표현 | 전체 | IP/request | 캐시 | fallback |

### 완료 조건

- 외부 요청 도메인 목록 확보
- 각 서비스의 목적과 데이터 흐름 확인
- 사용하지 않는 외부 script 제거
- Privacy Policy와 실제 integration이 일치

### 우선순위

```text
P0
```

---
## AP-G-17 — Only Successful Evidence
- Category: Content strategy and structure
- Original IDs: G-17
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 결론을 지지하는 결과만 게시

### 문제

실패 조건과 경계가 보이지 않아 일반화가 과해진다.

### 개선

반대 결과, 실패한 조건, 재현되지 않은 경우도 기록한다.

---
## AP-G-17-2 — 핵심 콘텐츠와 외부 Script 분리
- Category: Content strategy and structure
- Original IDs: G-17
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 원칙

외부 script가 실패하더라도 다음은 정상이어야 한다.

```text
본문
내비게이션
Topic Hub
내부 검색 fallback
관련 글
```

### 로딩 우선순위

```text
HTML과 핵심 CSS
→ 사이트 자체 기능
→ 댓글
→ 분석
→ 광고
```

### 완료 조건

- AdSense 실패 시 본문 정상
- Giscus 실패 시 댓글 영역만 영향
- Analytics 차단 시 페이지 이동 정상
- 외부 폰트 실패 시 읽을 수 있는 fallback

### 우선순위

```text
P0
```

---
## AP-G-18 — Unreproducible Private Evidence
- Category: Content strategy and structure
- Original IDs: G-18
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 회사 장비에서 확인했지만 공개할 수 없는 결과에 의존

### 문제

독자가 검증할 수 없고 회사 정보 노출 위험도 있다.

### 개선

- 공개 가능한 최소 환경으로 재현
- 구체 정보는 익명화
- 재현 불가능하면 관찰 범위를 명확히 표시

---
## AP-G-18-2 — 댓글 지연 로딩
- Category: Content strategy and structure
- Original IDs: G-18
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 현재 위험

댓글을 읽지 않는 사용자에게도 GitHub/Giscus 관련 요청이 즉시 발생할 수 있다.

### 권장 방식

```text
댓글 영역이 viewport에 가까워짐
또는
사용자가 댓글 열기 선택
→ Giscus 로드
```

### UX

초기 상태:

```text
댓글 보기
댓글은 GitHub Discussions를 통해 제공됩니다.
```

### 완료 조건

- 초기 화면에서 Giscus 요청 없음
- 댓글 로딩 실패가 본문에 영향 없음
- 외부 서비스 사용 사실 표시
- 중요한 정정은 댓글에만 남기지 않음

### 우선순위

```text
P1
```

---
## AP-G-19 — Outline as a Table of Contents Only
- Category: Content strategy and structure
- Original IDs: G-19
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 소제목만 나열하고 논리 구조는 없음

```text
소개
원리
코드
결과
결론
```

### 개선

각 절이 답할 질문을 적는다.

```text
무슨 증상인가
어디까지 정상인가
어떤 가설을 제외했는가
최종 원인은 무엇인가
```

---
## AP-G-19-2 — 분석 이벤트 최소화
- Category: Content strategy and structure
- Original IDs: G-19
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 수집 대상 후보

```text
페이지 조회
Topic Hub → 글 이동
검색 결과 선택
검색 결과 없음
```

### 기본 제외

```text
전체 검색어 원문 장기 저장
코드 내용
편집 중 문서
사용자 IP 기반 장기 식별
모든 클릭 이벤트
```

특히 검색창에는 회사명, 내부 오류 로그, 사내 hostname이 입력될 수 있다.

### 완료 조건

- 각 이벤트가 실제 의사결정 질문과 연결됨
- 수집하지 않는 데이터가 정의됨
- Query parameter와 fragment가 analytics page path를 폭증시키지 않음
- 개발자와 bot 트래픽을 가능한 범위에서 분리

### 우선순위

```text
P1
```

---
## AP-G-20 — Introduction Written First and Never Revised
- Category: Content strategy and structure
- Original IDs: G-20
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 초기 예상 범위로 서론을 작성한 뒤 그대로 둠

### 문제

본문이 바뀌었는데 서론은 다른 글을 약속할 수 있다.

### 개선

본문이 완성된 뒤 제목·description·서론을 다시 작성한다.

---
## AP-G-20-2 — Privacy Policy와 실제 동작 일치 검사
- Category: Content strategy and structure
- Original IDs: G-20
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
외부 Integration Inventory에서 Privacy Policy를 생성하는 것이 아니라, 사람이 실제 문장으로 정리한다.

### 검사 항목

```text
서비스 이름
수집 목적
쿠키·localStorage 사용
외부 전송
댓글의 GitHub 의존성
광고 설정
연락 방법
```

### 변경 트리거

다음 변경 시 Privacy Policy 검토:

```text
AdSense 추가·제거
Analytics 변경
Giscus 추가·제거
Newsletter 추가
검색어 수집 시작
외부 폰트 변경
```

### 완료 조건

- 정책에 사용하지 않는 서비스 없음
- 사용 중인 서비스 누락 없음
- 푸터 링크 정상
- 마지막 검토일 표시

### 우선순위

```text
P0
```

---
## AP-G-21 — Conclusion Written from Memory
- Category: Content strategy and structure
- Original IDs: G-21
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 본문을 다시 검토하지 않고 결론 작성

### 문제

실제 증거보다 강한 주장을 할 수 있다.

### 개선

결론의 각 문장이 본문의 증거와 대응하는지 확인한다.

---
## AP-G-21-2 — CSP 적용 가능성 조사
- Category: Content strategy and structure
- Original IDs: G-21
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
GitHub Pages 환경에서 header 제어가 제한될 수 있으므로 배포 방식에 맞는 현실적인 적용안을 확인한다.

### 먼저 할 일

현재 페이지가 사용하는 출처를 수집한다.

```text
script-src
style-src
img-src
font-src
connect-src
frame-src
```

### 초기 목표

완벽한 CSP보다 외부 출처 인벤토리를 정확히 만드는 것이 먼저다.

예상 정책 방향:

```text
default-src 'self'
img-src 'self' data: 필요한 이미지 도메인
font-src 'self' 필요한 폰트 도메인
frame-src Giscus 관련 도메인
connect-src Analytics·광고·댓글의 필요한 도메인
```

### 주의

AdSense는 여러 동적 출처를 사용할 수 있어 CSP가 복잡해질 수 있다. 광고를 위해 광범위한 wildcard를 추가하면 정책 효과가 크게 줄어들 수 있다.

### 완료 조건

- 현재 외부 출처 목록 존재
- 불필요한 출처 제거
- CSP 적용 가능·불가능 범위 문서화
- 무의미한 `*`, `unsafe-eval` 중심 정책을 도입하지 않음

### 우선순위

```text
P1
```

---
## AP-G-22 — Section-by-Section Isolation
- Category: Content strategy and structure
- Original IDs: G-22
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 각 절은 좋지만 서로 논리적으로 이어지지 않음

### 증상

- 절마다 새로운 시작
- 앞 절의 결과가 다음 절에서 사용되지 않음
- 글이 여러 노트의 결합처럼 보임

### 개선

절의 시작과 끝에 인과관계를 만든다.

```text
앞 절에서 확인한 A 때문에 이제 B를 검사한다.
```

---
## AP-G-22-2 — Inline Script 최소화
- Category: Content strategy and structure
- Original IDs: G-22
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
테마 초기화처럼 초기 렌더 전에 필요한 작은 script는 있을 수 있다.

하지만 다음이 늘어나면 CSP 적용과 유지보수가 어려워진다.

```text
inline event handler
동적 HTML 문자열
페이지마다 별도 inline script
```

### 개선

```text
onclick 속성 제거
명시적 event listener 사용
공통 client module로 이동
서버·빌드 타임 HTML 우선
```

### 완료 조건

- `onclick`, `onload` 같은 inline handler 없음
- `innerHTML` 사용 위치 전수 확인
- 필수 inline script가 소수이며 이유가 명확
- 동적 script 문자열 생성 없음

### 우선순위

```text
P1
```

---
## AP-G-23 — Writing Around Missing Evidence
- Category: Content strategy and structure
- Original IDs: G-23
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 확인하지 못한 부분을 일반 설명으로 채움

### 문제

글이 길지만 핵심 원인이나 결과는 불명확해진다.

### 개선

확인하지 못했다면 그대로 한계로 표시한다.

---
## AP-G-23-2 — `innerHTML`과 검색 Highlight 감사
- Category: Content strategy and structure
- Original IDs: G-23
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 위험 위치

```text
검색 결과 snippet
검색어 highlight
Markdown 외부 import
댓글 fallback
사용자 입력 메시지
```

### 권장

텍스트는 `textContent`로 삽입하고, highlight는 DOM node를 나눠 만든다.

나쁜 예:

```ts
result.innerHTML = text.replace(query, `<mark>${query}</mark>`);
```

개선 방향:

```ts
function appendHighlightedText(
  container: HTMLElement,
  text: string,
  query: string,
): void {
  // Match ranges, then append Text and <mark> nodes.
}
```

### 완료 조건

- 사용자 입력이 HTML 문자열로 직접 삽입되지 않음
- Markdown raw HTML 정책 명확
- 검색 query에 `<`, `"`, `&` 등을 넣어도 script 실행이나 DOM 파손 없음

### 우선순위

```text
P0
```

---
## AP-G-24 — Tone Uniformity by Automation
- Category: Content strategy and structure
- Original IDs: G-24
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 문체 검사로 모든 문장을 같은 톤으로 만듦

### 문제

디버깅 기록, 레퍼런스, 에세이가 모두 같은 리듬이 된다.

### 개선

금지할 저정보 문장은 관리하되 콘텐츠 유형별 문체 차이는 허용한다.

---
## AP-G-24-2 — Raw HTML 허용 정책
- Category: Content strategy and structure
- Original IDs: G-24
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 선택지

#### 완전 금지

가장 단순하지만 기존 콘텐츠 호환성 문제가 있을 수 있다.

#### 제한 허용

필요한 태그와 attribute만 허용한다.

```text
표준 텍스트 요소
details/summary
제한된 iframe directive
안전한 class 없는 구조
```

#### 신뢰 콘텐츠로 전면 허용

현재 혼자 쓰더라도 미래의 import·AI 초안·외부 기여에서 위험이 커진다.

### 권장

Raw HTML 사용 위치를 먼저 집계하고, 기능별 컴포넌트나 directive로 대체한다.

```text
YouTube embed
callout
diagram
details
```

### 완료 조건

- Raw HTML 사용 문서 수 확인
- Script·inline event attribute 차단
- iframe은 허용 도메인·sandbox 정책 적용
- 자동 import 콘텐츠도 같은 validation 통과

### 우선순위

```text
P1
```

---
## AP-G-25 — Excessive Personal Narrative
- Category: Content strategy and structure
- Original IDs: G-25
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 기술 문제보다 경험담이 더 길어짐

### 문제

검색 독자가 핵심 내용을 찾기 어렵다.

### 개선

개인 경험은 다음에 기여할 때 사용한다.

```text
문제 발생 맥락
판단 변화
실패 원인
실무적 교훈
```

---
## AP-G-25-2 — Iframe 허용 목록
- Category: Content strategy and structure
- Original IDs: G-25
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 허용 후보

```text
Giscus
YouTube
공식 문서의 제한된 embed
```

### 각 integration에 정의할 것

```text
도메인
sandbox
allow
referrerpolicy
loading
title
```

### 피해야 할 것

Markdown에서 임의 URL을 iframe으로 넣는 범용 기능.

### 완료 조건

- 허용되지 않은 iframe domain build warning 또는 error
- iframe마다 accessible title 존재
- 필요한 최소 권한만 허용
- 모바일 크기와 로딩 실패 fallback 존재

### 우선순위

```text
P1
```

---
## AP-G-26 — No Personal Context at All
- Category: Content strategy and structure
- Original IDs: G-26
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 반대로 실제 경험을 완전히 제거

### 문제

공식 문서 요약처럼 보이고 고유 가치가 약해진다.

### 개선

필요한 범위에서 실제 환경과 판단 과정을 포함한다.

---
## AP-G-26-2 — 콘텐츠 Secret Scan
- Category: Content strategy and structure
- Original IDs: G-26
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
기술 글의 코드 블록과 로그에도 secret이 들어갈 수 있다.

### 검사 패턴

```text
GitHub token 형식
AWS·Cloud API key 형식
Private key header
Bearer token
password=
client_secret
Authorization:
```

### 주의

예제 placeholder도 scanner에 걸릴 수 있으므로 다음처럼 명백히 가짜 값을 사용한다.

```text
YOUR_GITHUB_TOKEN
EXAMPLE_API_KEY
example.invalid
```

### 결과 정책

```text
실제 가능성이 높은 secret → build error
불명확한 토큰형 문자열 → warning + 수동 확인
```

### 완료 조건

- Markdown과 source code 모두 scan
- 생성된 `dist`도 scan
- Allowlist가 구체적이고 제한적
- 실제 token이 발견되면 즉시 회전 절차 실행

### 우선순위

```text
P0
```

---
## AP-G-27 — Emotional Certainty
- Category: Content strategy and structure
- Original IDs: G-27
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 답답함이나 확신이 기술적 단정으로 이어짐

예:

```text
이 설계는 완전히 잘못됐다.
```

### 개선

감정과 기술 판단을 분리하고 조건을 명확히 쓴다.

---
## AP-G-27-2 — 로그와 스크린샷 Redaction Checklist
- Category: Content strategy and structure
- Original IDs: G-27
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 로그에서 제거할 후보

```text
사내 hostname
사설·공인 IP
사용자 이름
절대 경로
고객명
Jira·GitLab 내부 URL
device serial
이메일
token
```

### 스크린샷에서 확인할 후보

```text
브라우저 탭
북마크
알림
터미널 prompt
홈 디렉터리
파일 목록
회사명
```

### 게시 전 처리

```text
필요 영역 crop
식별자 일반화
실 token 전체 교체
EXIF metadata 제거
```

### 완료 조건

- 콘텐츠 작성 가이드에 redaction checklist 존재
- 대표 기술 글 스크린샷 재검토
- 내부 hostname과 개인 경로 검색 리포트 존재
- 새 이미지에서 EXIF 제거 여부 확인

### 우선순위

```text
P0
```

---
## AP-G-28 — Unreviewed Terminology
- Category: Content strategy and structure
- Original IDs: G-28
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 한 글 안에서 용어가 바뀜

```text
device memory
CXL memory
expander memory
far memory
```

### 문제

같은 대상을 말하는지 구분하기 어렵다.

### 개선

첫 등장에 용어 관계를 정의하고 이후 표기를 통일한다.

---
## AP-G-28-2 — 민감 파일 Artifact Allowlist
- Category: Content strategy and structure
- Original IDs: G-28
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 위험

`public/`이나 copy script 설정 오류로 다음이 배포될 수 있다.

```text
.env
*.bak
draft.md
private.json
source archive
원본 PSD
debug log
```

### 권장 방식

금지 목록만 두기보다 허용된 public 자산 경로를 명확히 한다.

### 배포 후 검사

```text
확장자 목록
숨김 파일
대형 예상 밖 파일
환경 파일명
source map
backup suffix
```

### 완료 조건

- `dist`의 금지 파일 검사
- `.env`, private key, backup 파일 없음
- 예상하지 못한 확장자 경고
- 배포 artifact 파일 목록 보존

### 우선순위

```text
P0
```

---
## AP-G-29 — Acronym Saturation
- Category: Content strategy and structure
- Original IDs: G-29
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 약어가 지나치게 많음

### 개선

- 첫 등장에 풀네임
- 문맥상 필요 없는 약어 제거
- 용어표는 긴 시리즈에만 제공

---
## AP-G-29-2 — Source Map 공개 정책
- Category: Content strategy and structure
- Original IDs: G-29
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 판단 기준

```text
실제 오류 분석에 필요한가
브라우저 JS가 얼마나 복잡한가
오류 추적 도구를 사용하는가
내부 경로·주석 노출이 불필요한가
```

Source map 자체가 secret은 아니지만 공개 필요가 없다면 production에서 제외한다.

### 완료 조건

- 공개 여부가 의도적으로 결정됨
- source map 내부에 secret이 없는지 별도 검사
- 관리 코드가 source map을 통해 드러나지 않음

### 우선순위

```text
P2
```

---
## AP-G-30 — Translation Residue
- Category: Content strategy and structure
- Original IDs: G-30
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 영문 문장을 직역한 어색한 표현

### 문제

전문 용어는 정확하지만 문장의 인과관계가 불명확해질 수 있다.

### 개선

원문 구조보다 한국어 독자의 이해 순서에 맞춰 재구성한다.

---
## AP-G-30-2 — HTTPS·Canonical·Domain 점검
- Category: Content strategy and structure
- Original IDs: G-30
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 검사

```text
HTTP → HTTPS 전환
www/apex 일관성
GitHub Pages custom domain
canonical production origin
Sitemap origin
OG URL
```

### 완료 조건

- 모든 내부 absolute URL이 HTTPS
- HTTP 접근은 HTTPS로 이동
- 한 개의 production origin 사용
- 인증서 오류 없음
- preview URL이 canonical이나 Sitemap에 들어가지 않음

### 우선순위

```text
P0
```

---
## AP-G-31 — Proofreading Equals Review
- Category: Content strategy and structure
- Original IDs: G-31
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 맞춤법만 확인하면 리뷰 완료

### 실제 기술 리뷰 항목

```text
사실 정확성
논리 흐름
재현 가능성
버전 일치
출처 대응
적용 한계
내부 중복
```

---
## AP-G-31-2 — Domain Takeover 방지 운영
- Category: Content strategy and structure
- Original IDs: G-31
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
Custom domain을 변경하거나 사이트를 이전할 때 DNS와 Pages 설정을 함께 관리한다.

### 문서화

```text
도메인 등록자
DNS provider
GitHub Pages 연결 방식
검증 상태
만료일
이전·삭제 절차
```

### 완료 조건

- 사용하지 않는 DNS record 없음
- GitHub Pages domain verification 확인
- 저장소 이동·삭제 시 DNS 정리 절차 존재
- 도메인 자동 갱신과 복구 연락 경로 확인

### 우선순위

```text
P1
```

---
## AP-G-32 — Self-Review Immediately After Writing
- Category: Content strategy and structure
- Original IDs: G-32
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 작성 직후 바로 검수

### 문제

내용을 이미 알고 있어 누락을 보지 못한다.

### 개선

가능하면 시간을 두고 다시 읽거나 관점별 검사를 분리한다.

---
## AP-G-32-2 — 최소 보안 Runbook
- Category: Content strategy and structure
- Original IDs: G-32
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
최소한 다음 사건을 다룬다.

```text
Secret 노출
악성 dependency 의심
사이트 변조
GitHub 계정 침해
Domain·DNS 변경
잘못된 광고·외부 script 삽입
```

### 각 Runbook 구조

```text
탐지
즉시 차단
credential 회전
정상 artifact rollback
영향 범위 확인
재발 방지
```

### 완료 조건

- 저장소 안에 짧은 보안 runbook 존재
- 최근 정상 artifact 위치 확인 가능
- 계정 복구·2FA 수단 안전하게 관리
- 연락·지원 경로 기록

### 우선순위

```text
P1
```

---
## AP-G-33 — Review Without Reader Simulation
- Category: Content strategy and structure
- Original IDs: G-33
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 작성자의 지식으로만 읽음

### 개선

다음 독자 관점으로 각각 확인한다.

```text
검색으로 중간 글에 들어온 사람
기본 개념만 아는 사람
실제 문제를 해결하려는 사람
빠른 레퍼런스를 찾는 사람
```

---
## AP-G-33-2 — 정기 보안 감사 범위
- Category: Content strategy and structure
- Original IDs: G-33
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
### 매 변경마다

```text
content secret scan
dist 민감 파일 검사
workflow permission lint
내부 HTML/XSS 관련 테스트
```

### 월간 또는 dependency 변경 시

```text
dependency 취약점
install script
외부 integration 목록
Action SHA 업데이트
```

### 분기별

```text
도메인·HTTPS
계정 복구
사용하지 않는 secret
Privacy Policy 일치
```

### 완료 조건

- 빠른 검사와 정기 검사가 분리
- 외부 네트워크 감사가 일반 배포를 불안정하게 하지 않음
- 반복 결과가 issue 또는 report로 남음

### 우선순위

```text
P1
```

---
## AP-G-34 — Review Against Style, Not Purpose
- Category: Content strategy and structure
- Original IDs: G-34
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 템플릿 준수만 확인

### 문제

글이 실제 질문에 답하는지는 놓친다.

### 개선

리뷰의 첫 질문은 이것이어야 한다.

> 이 글은 제목이 약속한 문제를 충분히 해결하는가?

---
## AP-G-34-2 — 보안 수준의 종료 조건
- Category: Content strategy and structure
- Original IDs: G-34
- Source messages: e03e77c0-719d-46b1-b37d-c7f01262d26e
- Merge status: canonical source
### Source material
이 Epic에서 다음까지 만들 필요는 없다.

```text
SIEM
상시 SOC
복잡한 WAF
자체 OAuth 서버
그래프 기반 공급망 플랫폼
```

### 1차 완료 기준

```text
공개 사이트에 secret·쓰기 권한 없음
관리 코드 production 제외
workflow 최소 권한
build·deploy 분리
action SHA 고정
외부 script 인벤토리
민감 콘텐츠·artifact scan
Privacy Policy 일치
HTTPS와 domain 정상
```

이 상태면 개인 정적 기술 블로그에 필요한 현실적인 기준선을 갖춘 것이다.

---
## AP-G-35 — Technical Claim Without Verification Marker
- Category: Content strategy and structure
- Original IDs: G-35
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 어떤 문장을 확인해야 하는지 리뷰어가 모름

### 개선

초안에서 임시 marker를 사용할 수 있다.

```text
[VERIFY]
[SOURCE]
[MEASURE]
[UNKNOWN]
```

발행 전 모두 제거하거나 한계로 전환한다.

---
## AP-G-36 — Review Checklist Inflation
- Category: Content strategy and structure
- Original IDs: G-36
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 체크 항목이 너무 많아 형식적으로 처리

### 개선

필수·권장·특수 유형으로 나눈다.

#### 모든 글 필수

```text
목적
정확성
출처
결론
링크
```

#### 실험 글 추가

```text
환경
baseline
반복
한계
```

---
## AP-G-37 — No Regression Review
- Category: Content strategy and structure
- Original IDs: G-37
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 기존 대표 글을 수정하면서 핵심 내용이 사라지는지 확인하지 않음

### 개선

대규모 수정 전후로:

- 주요 결론
- 환경
- 코드
- 내부 링크
- 검색 의도

를 비교한다.

---
## AP-G-38 — Link Check as Content Review
- Category: Content strategy and structure
- Original IDs: G-38
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 링크가 모두 살아 있으면 품질이 괜찮다고 판단

### 문제

링크는 유효하지만 실제 주장을 뒷받침하지 않을 수 있다.

### 개선

대표 글의 핵심 출처는 의미 수준으로 검토한다.

---
## AP-G-39 — AI Review as Final Authority
- Category: Content strategy and structure
- Original IDs: G-39
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### AI가 “문제가 없다”고 하면 발행

### 문제

전문 사양·코드·실험 결과를 잘못 검증할 수 있다.

### 개선

AI는 다음에 활용한다.

```text
누락 후보
문장 불명확성
중복
반론 후보
체크리스트
```

핵심 기술 판단은 원자료와 실행 결과로 확인한다.

---
## AP-G-40 — No Adversarial Review
- Category: Content strategy and structure
- Original IDs: G-40
- Source messages: 64380e9f-5fe2-49a6-bf78-99986e16bd56
- Merge status: canonical source
### Source material
### 결론을 반박하려는 검토가 없음

### 개선

발행 전 다음을 질문한다.

```text
어떤 조건에서 틀리는가
다른 원인이 가능한가
결과를 재현하지 못할 경우는
독자가 오해할 표현은
```

---
