---
title: "Ch 10: 테스트 자동화"
date: 2025-09-01T10:00:00
description: "CI 파이프라인에서 QEMU를 활용해 드라이버 테스트를 자동화한다."
tags: [QEMU, CI, Testing]
series: "QEMU Fake Device Driver"
seriesOrder: 10
draft: true
---

## 자동화 테스트 필요성

- 회귀 방지
- 빠른 피드백
- 재현 가능한 환경

---

## 헤드리스 QEMU 실행

```bash
qemu-system-x86_64 -nographic -serial mon:stdio ...
```

---

## 테스트 스크립트

```bash
#!/bin/bash
qemu-system-x86_64 ... &
sleep 30
# 테스트 명령 전송
echo "insmod my_driver.ko" | nc localhost 4444
```

---

## GitHub Actions 예시

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: qemu-system-x86_64 ...
```

---

## 정리

- QEMU를 헤드리스 모드로 CI에서 실행한다.
- 시리얼 콘솔로 테스트 명령을 전송한다.
- 종료 코드로 테스트 성공/실패를 판단한다.

---

## 관련 항목

- [Ch 9: 디버깅](/blog/tools/emulation/qemu-fake-device/chapter09-debugging)
- [Ch 11: 고급 시나리오](/blog/tools/emulation/qemu-fake-device/chapter11-advanced-scenarios)
