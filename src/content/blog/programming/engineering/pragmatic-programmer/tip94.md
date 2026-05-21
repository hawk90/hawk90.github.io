---
title: "Tip 94: Don't Use Manual Procedures"
date: 2026-05-12T22:00:00
description: "수동 절차를 사용하지 마라. 반복되는 작업은 자동화하여 실수를 줄인다."
series: "The Pragmatic Programmer"
seriesOrder: 94
tags: [pragmatic-programmer, automation, scripting]
draft: false
---

## 이 팁의 메시지

> **Tip 94: Don't Use Manual Procedures.** A shell script or batch file will execute the same instructions, in the same order, time after time.

셸 스크립트나 배치 파일은 같은 명령을 같은 순서로 매번 실행한다.

## 수동 절차의 문제

사람은 실수한다. 기계는 하지 않는다.

```text
수동 배포 절차:
1. 테스트 실행
2. 버전 번호 업데이트
3. 변경 로그 작성
4. 빌드
5. 아티팩트 업로드
6. 서버에 배포
7. 스모크 테스트
8. 태그 생성

→ 3단계와 4단계 순서 실수
→ 6단계에서 잘못된 파일 업로드
→ 7단계 깜빡함
```

## 자동화의 이점

| 수동 | 자동 |
|------|------|
| 매번 시간 소요 | 한 번 작성, 계속 사용 |
| 실수 발생 | 일관된 실행 |
| 문서화 필요 | 스크립트가 문서 |
| 지식이 머릿속에 | 지식이 코드에 |

## 자동화 대상

```text
자동화해야 할 것:
- 빌드
- 테스트
- 배포
- 환경 설정
- 데이터베이스 마이그레이션
- 백업
- 모니터링 알림
- 코드 포매팅
- 의존성 업데이트
```

## 스크립트 예시

```bash
#!/bin/bash
# deploy.sh - 배포 자동화

set -e  # 에러 시 중단

echo "1. Running tests..."
npm test

echo "2. Building..."
npm run build

echo "3. Deploying to staging..."
./deploy-staging.sh

echo "4. Running smoke tests..."
./smoke-tests.sh

echo "5. Deploying to production..."
./deploy-production.sh

echo "6. Tagging release..."
git tag "v$(cat VERSION)"
git push --tags

echo "Done!"
```

## Makefile 활용

```makefile
.PHONY: build test deploy clean

build:
	npm run build

test:
	npm test

lint:
	npm run lint

deploy: test build
	./deploy.sh

clean:
	rm -rf dist node_modules
```

```bash
make deploy  # 테스트, 빌드, 배포를 순서대로
```

## CI/CD로 자동화

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: ./deploy.sh
```

푸시하면 자동으로 전체 과정이 실행된다.

## 체크리스트 → 스크립트

```text
체크리스트 문서:
[ ] 브랜치 최신화
[ ] 의존성 설치
[ ] 린트 실행
[ ] 테스트 실행
[ ] 빌드

↓ 변환

#!/bin/bash
git pull
npm ci
npm run lint
npm test
npm run build
```

체크리스트가 있다면 스크립트로 바꿀 수 있다.

## 예외 처리

```bash
#!/bin/bash
set -e  # 에러 시 중단

# 또는 개별 처리
if ! npm test; then
    echo "Tests failed!"
    exit 1
fi
```

## 문서화 효과

```bash
# 스크립트 자체가 문서
# 어떤 순서로 무엇을 하는지 명확
# 새 팀원도 스크립트를 보면 이해

./scripts/setup-dev.sh      # 개발 환경 설정
./scripts/run-tests.sh      # 테스트 실행
./scripts/deploy-staging.sh # 스테이징 배포
./scripts/deploy-prod.sh    # 프로덕션 배포
```

## 정리

- 반복되는 수동 절차는 실수의 원인이다.
- 스크립트는 같은 일을 같은 방식으로 한다.
- 체크리스트가 있으면 스크립트로 바꾼다.
- CI/CD로 빌드와 배포를 자동화한다.
- 스크립트 자체가 문서 역할을 한다.
- 자동화에 투자하면 시간과 실수를 줄인다.

## 다음 장 예고

[Tip 95: Delight Users, Don't Just Deliver Code](/blog/programming/engineering/pragmatic-programmer/tip95)에서는 코드 전달이 아닌 사용자 기쁨을 목표로 하는 방법을 다룬다.

## 관련 항목

- [Tip 88: Use Version Control to Drive Builds, Tests, and Releases](/blog/programming/engineering/pragmatic-programmer/tip88)
- [Tip 17: Eliminate Effects Between Unrelated Things](/blog/programming/engineering/pragmatic-programmer/tip17)
