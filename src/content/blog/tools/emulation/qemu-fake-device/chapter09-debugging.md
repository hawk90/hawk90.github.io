---
title: "Ch 9: 디버깅 — QEMU + GDB"
date: 2025-09-01T09:00:00
description: "QEMU와 GDB를 연동해 커널과 드라이버를 디버깅한다."
tags: [QEMU, GDB, Debugging]
series: "QEMU Fake Device Driver"
seriesOrder: 9
draft: true
---

## QEMU GDB 서버 활성화

```bash
qemu-system-x86_64 ... -s -S
```

- `-s`: GDB 서버 포트 1234
- `-S`: 시작 시 일시정지

---

## GDB 연결

```bash
gdb vmlinux
(gdb) target remote :1234
(gdb) continue
```

---

## 커널 모듈 디버깅

```bash
(gdb) add-symbol-file my_driver.ko 0xffffffffa0000000
```

---

## QEMU 내부 디버깅

QEMU 프로세스 자체를 GDB로 디버깅할 수도 있습니다.

---

## 정리

- QEMU의 `-s -S` 옵션으로 GDB 서버를 활성화한다.
- vmlinux 심볼로 커널을 디버깅한다.
- add-symbol-file로 모듈 심볼을 추가한다.

---

## 관련 항목

- [Ch 8: 리눅스 드라이버 작성](/blog/tools/emulation/qemu-fake-device/chapter08-linux-driver)
- [Ch 10: 테스트 자동화](/blog/tools/emulation/qemu-fake-device/chapter10-test-automation)
