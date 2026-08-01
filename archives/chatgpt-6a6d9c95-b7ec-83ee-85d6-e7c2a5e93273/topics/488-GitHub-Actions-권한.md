---
title: "GitHub Actions 권한"
source_message: 50
source_role: assistant
---

# GitHub Actions 권한

## G-03. Workflow별 권한 전수 조사

### 문제

`GITHUB_TOKEN` 기본 권한이나 기존 workflow 설정에 의존하면 실제 필요보다 넓은 권한이 부여될 수 있다.

### 감사표

| Workflow | 목적 | 필요 권한 | 현재 권한 | 수정 |
|---|---|---|---|---|
| validate | schema·link 검사 | contents: read |  |  |
| build | 정적 artifact 생성 | contents: read |  |  |
| deploy | Pages 배포 | pages/id-token write |  |  |
| audit | 외부 링크·dependency | contents: read |  |  |

### 기본 권장

```yaml
permissions:
  contents: read
```

배포 job만 필요한 권한을 명시적으로 추가한다.

### 피해야 할 것

```yaml
permissions: write-all
```

또는 workflow 최상위에 광범위한 write 권한을 주고 모든 job이 공유하는 구조.

### 완료 조건

- 모든 workflow에 `permissions` 명시
- validation·build는 읽기 권한만 사용
- deploy job만 배포 권한 보유
- 사용하지 않는 `issues`, `pull-requests`, `packages` 쓰기 권한 없음

### 우선순위

```text
P0
```

---

## G-04. Build와 Deploy 권한 분리

### 목표 구조

```text
Unprivileged build job
→ immutable artifact
→ privileged deploy job
```

### Build job

```yaml
permissions:
  contents: read
```

여기에서 수행:

```text
dependency install
content validation
Astro build
검색·RSS·Sitemap 생성
smoke test
```

### Deploy job

필요한 artifact만 다운로드한 뒤 Pages에 올린다.

여기에서는 다음을 하지 않는다.

```text
npm install
postinstall 실행
Markdown generator 실행
외부 PR 코드 실행
```

### 이유

빌드 dependency나 콘텐츠 generator가 침해되어도 배포 write 권한과 직접 결합되지 않게 한다.

### 완료 조건

- 테스트한 artifact와 배포 artifact가 동일
- deploy job가 저장소 코드를 다시 빌드하지 않음
- build job에 write token 없음
- artifact 출처 commit을 추적 가능

### 우선순위

```text
P0
```

---

## G-05. Action 참조 고정

### 문제

다음과 같은 major tag는 관리에는 편리하지만 변경 가능한 참조다.

```yaml
uses: actions/checkout@v4
```

### 강화안

중요한 배포 workflow는 full commit SHA에 고정한다.

```yaml
uses: actions/checkout@<full-commit-sha> # v4.x
```

### 적용 우선순위

```text
공식 배포 action
artifact upload/download
외부 제3자 action
보안·secret 관련 action
```

### 운영 비용

SHA 고정은 업데이트가 자동으로 따라오지 않으므로 Dependabot이나 정기 점검이 필요하다.

따라서 단순 shell 명령으로 쉽게 대체할 수 있는 소규모 제3자 action은 제거하는 편이 나을 수 있다.

### 완료 조건

- 제3자 action은 모두 full SHA 고정
- 공식 핵심 action도 가능하면 SHA 고정
- SHA 옆에 이해 가능한 버전 주석 존재
- 업데이트 절차가 문서화됨

### 우선순위

```text
P0
```

---

## G-06. 제3자 Action 최소화

### 감사 질문

각 action에 대해 다음을 확인한다.

```text
무슨 기능을 하는가
공식 action인가
shell 명령으로 대체 가능한가
저장소·token·artifact 중 무엇에 접근하는가
유지보수되고 있는가
```

### 제거 우선 후보

```text
간단한 파일 복사 action
단순 문자열 치환 action
작은 JSON 생성 action
관리되지 않는 link checker action
```

복잡한 action 하나를 설치하는 것보다 저장소 내부의 짧고 검토 가능한 script가 안전할 수 있다.

### 완료 조건

- 모든 제3자 action의 목적이 명확
- 대체 가능한 불필요 action 제거
- 유지보수 중단 action 없음
- action source 변경을 dependency 변경처럼 검토

### 우선순위

```text
P1
```

---
