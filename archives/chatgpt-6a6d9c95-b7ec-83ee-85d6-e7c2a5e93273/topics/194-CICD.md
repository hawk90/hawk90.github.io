---
title: "CI/CD"
source_message: 33
source_role: assistant
---

# CI/CD

## M-31. CI as the Only Reproducible Environment

### 로컬에서는 전체 검증을 실행하기 어려움

### 문제

문제가 push 후에만 발견된다.

### 개선

CI와 같은 명령을 로컬에서도 실행할 수 있게 한다.

---

## M-32. Local and CI Command Divergence

### 로컬 `npm run build`와 CI build가 다름

### 문제

로컬 성공 후 CI 실패가 반복된다.

### 개선

CI는 package script를 호출하고 별도 로직을 최소화한다.

---

## M-33. Hidden Environment Dependency

### CI에만 설치된 도구에 의존

예:

```text
LaTeX
Python package
system font
ImageMagick
```

### 개선

필수 의존성을 명시하고 bootstrap script 또는 container를 제공한다.

---

## M-34. Floating Tool Versions

### Node·Python·OS package 버전이 고정되지 않음

### 문제

어제 성공한 빌드가 오늘 실패할 수 있다.

### 개선

주요 런타임과 생성 도구 버전을 명시적으로 고정한다.

---

## M-35. CI Workflow Logic Duplication

### 여러 workflow에 install·build·cache 설정 반복

### 문제

한 곳만 수정되어 동작이 달라진다.

### 개선

재사용 workflow 또는 composite action으로 공통화한다.

---

## M-36. Deploy on Every Branch Push

### 불필요한 preview·artifact 생성

### 개선

브랜치와 변경 경로에 따라 실행 범위를 제한한다.

---

## M-37. No Path-Based Trigger

### 문서 오탈자 수정에도 tooling 전체 테스트

### 개선

콘텐츠·UI·도구 변경에 따라 job을 나눈다.

단, 최종 main 배포에서는 통합 검사를 유지한다.

---

## M-38. CI Cache as a Mystery

### 캐시가 왜 hit/miss 되는지 모름

### 문제

stale 결과나 낮은 효율을 방치한다.

### 개선

cache key와 대상 디렉터리를 문서화하고 hit ratio를 확인한다.

---

## M-39. Flaky Build Accepted as Normal

### 가끔 메모리 부족이나 timeout이 발생

### 문제

재실행으로 넘기면 근본 원인이 누적된다.

### 개선

flaky 실패를 별도 issue로 추적하고 재시도는 보조 장치로만 사용한다.

---

## M-40. No Post-Deploy Verification

### 배포 성공 메시지만 확인

### 개선

배포 후 대표 URL, 검색 인덱스, Sitemap, 주요 asset을 smoke test한다.

---
