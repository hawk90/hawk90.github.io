---
title: "Tip 72: Apply Security Patches Quickly"
date: 2026-05-12T00:00:00
description: "보안 패치를 빠르게 적용하라. 알려진 취약점은 빠르게 악용된다."
series: "The Pragmatic Programmer"
seriesOrder: 72
tags: [pragmatic-programmer, security, maintenance]
draft: false
---

## 이 팁의 메시지

> **Tip 72: Apply Security Patches Quickly.** Attackers deploy exploits quickly, so you should deploy patches quickly too.

공격자는 익스플로잇을 빠르게 배포한다. 패치도 빠르게 배포해야 한다.

## 시간이 생명

취약점이 공개되면 공격자가 먼저 움직인다.

| 시점 | 상황 |
|------|------|
| Day 0 | 취약점 발견 |
| Day 1 | CVE 공개, 패치 릴리스 |
| Day 2 | 익스플로잇 코드 공개 |
| Day 3-7 | 대량 스캔 시작 |
| Day 7+ | 패치 안 된 시스템 공격 |

패치가 늦으면 위험에 노출된다.

## 취약점 모니터링

의존성의 취약점을 추적한다.

```bash
# Python
pip install safety
safety check

# Node.js
npm audit

# Ruby
bundle audit

# Go
go list -m -json all | nancy sleuth
```

CI/CD 파이프라인에 통합한다.

```yaml
# GitHub Actions 예
name: Security Check
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run security audit
        run: npm audit --audit-level=high
```

## 자동 업데이트

가능하면 자동화한다.

```yaml
# Dependabot 설정 (.github/dependabot.yml)
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
    open-pull-requests-limit: 10

  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "daily"
```

Dependabot이 자동으로 PR을 생성한다.

## 버전 잠금과 유연성

| 방식 | 예 | 장점 | 단점 |
|------|---|------|------|
| 완전 잠금 | `package-lock.json`, `Pipfile.lock` | 재현 가능 | 수동 업데이트 필요 |
| 유연한 버전 | `^1.2.3`, `~=1.2.3` | 마이너/패치 자동 업데이트 | 예상치 못한 변경 위험 |

보안 패치는 빠르게, 메이저 업데이트는 신중하게.

## 패치 적용 프로세스

**패치 적용 절차:**

1. 알림 수신 (CVE, 보안 권고)
2. 영향 평가 (우리 시스템에 영향?)
3. 테스트 환경에서 패치 테스트
4. 프로덕션 배포
5. 검증

**목표: 심각도에 따른 대응 시간:**

| 심각도 | 대응 시간 |
|--------|----------|
| Critical | 24시간 이내 |
| High | 1주 이내 |
| Medium | 1달 이내 |
| Low | 다음 정기 업데이트 |

## 롤백 계획

패치가 문제를 일으킬 수 있다.

```bash
# 이전 버전으로 롤백
npm install package@1.2.3

# 또는 git으로 롤백
git revert HEAD
git push
```

배포 전에 롤백 방법을 확인한다.

## 레거시 시스템

업데이트가 어려운 시스템도 있다.

| 상황 | 대응 |
|------|------|
| EOL 소프트웨어 | 마이그레이션 계획 |
| 호환성 문제 | 격리, 방화벽 |
| 테스트 부재 | 테스트 추가 후 업데이트 |
| 복잡한 의존성 | 점진적 업데이트 |

업데이트할 수 없다면 다른 방어 수단을 강화한다.

## 알림 채널

취약점 정보를 받는 채널을 구독한다.

- CVE 데이터베이스
- GitHub Security Advisories
- 프레임워크/라이브러리 보안 메일링 리스트
- US-CERT, KISA 등 정부 기관

```python
# 주요 의존성 목록 관리
CRITICAL_DEPENDENCIES = [
    "django",
    "flask",
    "requests",
    "cryptography",
]

# 이것들의 보안 권고를 특히 주시
```

## 정리

- 취약점 공개 후 공격은 빠르게 시작된다.
- 보안 패치는 최대한 빠르게 적용한다.
- 의존성 스캔을 CI/CD에 통합한다.
- 자동 업데이트 도구를 활용한다.
- 롤백 계획을 준비한다.
- 보안 알림 채널을 구독한다.

## 다음 장 예고

[Tip 73: Name Well; Rename When Needed](/blog/programming/engineering/pragmatic-programmer/tip73)에서는 좋은 이름의 중요성을 다룬다.

## 관련 항목

- [Tip 71: Keep It Simple and Minimize Attack Surfaces](/blog/programming/engineering/pragmatic-programmer/tip71)
- [Tip 73: Name Well; Rename When Needed](/blog/programming/engineering/pragmatic-programmer/tip73)
