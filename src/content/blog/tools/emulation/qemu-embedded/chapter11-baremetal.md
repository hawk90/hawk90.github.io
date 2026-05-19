---
title: "Ch 11: 베어메탈 펌웨어"
date: 2026-05-17T11:00:00
description: "QEMU에서 OS 없이 베어메탈 펌웨어를 실행한다."
tags: [QEMU, Baremetal, Firmware]
series: "QEMU Embedded Emulation"
seriesOrder: 11
draft: true
---

## 베어메탈이란

OS 없이 하드웨어에서 직접 실행되는 코드입니다.

- 부트 코드
- 펌웨어
- 간단한 테스트 프로그램

---

## 링커 스크립트

```ld
ENTRY(_start)
SECTIONS {
    . = 0x40000000;
    .text : { *(.text) }
    .data : { *(.data) }
    .bss  : { *(.bss)  }
}
```

---

## 실행

```bash
qemu-system-aarch64 -M virt -cpu cortex-a53 \
  -kernel firmware.elf -nographic
```

---

## 정리

- 베어메탈 펌웨어는 OS 없이 실행된다.
- 링커 스크립트로 메모리 레이아웃을 정의한다.
- QEMU로 실제 보드 없이 펌웨어를 테스트한다.

---

## 관련 항목

- [Ch 10: GDB 원격 디버깅](/blog/tools/qemu-embedded-emulation/chapter10-gdb-remote)
- [Ch 12: RTOS 에뮬레이션](/blog/tools/qemu-embedded-emulation/chapter12-rtos)
