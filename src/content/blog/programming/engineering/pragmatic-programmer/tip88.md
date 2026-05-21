---
title: "Tip 88: Use Version Control to Drive Builds, Tests, and Releases"
date: 2026-05-12T16:00:00
description: "버전 관리를 빌드, 테스트, 릴리스의 중심에 두라. 커밋이 모든 자동화의 트리거다."
series: "The Pragmatic Programmer"
seriesOrder: 88
tags: [pragmatic-programmer, version-control, ci-cd]
draft: false
---

## 이 팁의 메시지

> **Tip 88: Use Version Control to Drive Builds, Tests, and Releases.** Build, test, and release should be triggered by commits to version control.

빌드, 테스트, 릴리스는 버전 관리 커밋으로 트리거되어야 한다.

## 버전 관리 중심

모든 것이 버전 관리에서 시작한다.

```text
커밋
  ↓
자동 빌드
  ↓
자동 테스트
  ↓
자동 배포 (스테이징)
  ↓
승인
  ↓
자동 배포 (프로덕션)
```

## 수동 vs 자동

| 수동 | 자동 |
|------|------|
| 누가 빌드를 돌렸는지 모름 | 모든 커밋이 빌드됨 |
| 빌드 환경이 제각각 | 일관된 환경 |
| 테스트를 잊음 | 항상 테스트 |
| 릴리스가 긴장되는 이벤트 | 릴리스가 평범한 일상 |

## 지속적 통합 (CI)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: make build
      - name: Test
        run: make test
      - name: Lint
        run: make lint
```

커밋할 때마다 빌드, 테스트, 린트가 자동 실행된다.

## 지속적 배포 (CD)

```yaml
# 배포 파이프라인
deploy:
  needs: build
  if: github.ref == 'refs/heads/main'
  steps:
    - name: Deploy to staging
      run: ./deploy.sh staging
    - name: Run smoke tests
      run: ./smoke-tests.sh
    - name: Deploy to production
      run: ./deploy.sh production
```

메인 브랜치에 머지하면 자동 배포된다.

## 모든 것을 코드로

**버전 관리에 넣어야 할 것:**

- 소스 코드
- 빌드 스크립트
- 테스트 코드
- 인프라 코드 (Terraform, Ansible)
- 환경 설정 (Docker, K8s)
- 문서
- 마이그레이션 스크립트

"내 컴퓨터에서는 되는데"가 없어진다.

## 불변 빌드

**빌드 원칙:**

- 같은 커밋 → 같은 결과
- 빌드 환경도 버전 관리
- 의존성 버전 고정
- 빌드 아티팩트에 버전 태그

```dockerfile
# Dockerfile로 빌드 환경 고정
FROM node:20.10.0-alpine
WORKDIR /app
COPY package-lock.json .
RUN npm ci
COPY . .
RUN npm run build
```

## 브랜치 전략

**main (또는 master):**

- 항상 배포 가능
- 보호된 브랜치
- PR로만 머지

**feature/*:**

- 기능 개발
- CI 통과 필수
- PR 후 머지

**hotfix/*:**

- 긴급 수정
- main에서 분기
- 테스트 후 즉시 머지

## 롤백 전략

```text
문제 발생 시:
1. 이전 커밋으로 롤백
2. 이전 빌드 아티팩트 재배포
3. 기능 플래그 off

git revert HEAD
git push origin main
# CI/CD가 자동으로 롤백 배포
```

## 환경 일관성

```text
개발 == 스테이징 == 프로덕션

방법:
- Docker로 환경 정의
- 환경 변수로 설정 분리
- 인프라를 코드로 관리
- 시크릿만 별도 관리
```

## 정리

- 버전 관리 커밋이 모든 자동화의 트리거다.
- 수동 빌드, 수동 배포를 없앤다.
- 모든 것을 코드로 버전 관리한다.
- 같은 커밋은 같은 결과를 만든다.
- 브랜치 전략으로 품질을 보장한다.
- 롤백도 커밋으로 쉽게 한다.

## 다음 장 예고

[Tip 89: Test Early, Test Often, Test Automatically](/blog/programming/engineering/pragmatic-programmer/tip89)에서는 자동화된 테스트의 중요성을 다룬다.

## 관련 항목

- [Tip 87: Deliver When Users Need It](/blog/programming/engineering/pragmatic-programmer/tip87)
- [Tip 28: Always Use Version Control](/blog/programming/engineering/pragmatic-programmer/tip28)
