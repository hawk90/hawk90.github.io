---
title: "Ch 12: RTOS 에뮬레이션"
date: 2025-09-15T12:00:00
description: "FreeRTOS와 Zephyr를 QEMU에서 실행한다."
tags: [QEMU, FreeRTOS, Zephyr, RTOS]
series: "QEMU Embedded Emulation"
seriesOrder: 12
draft: true
---

## QEMU에서 RTOS

실시간 운영체제(RTOS)도 QEMU에서 에뮬레이션할 수 있습니다.

- **FreeRTOS**: 가장 널리 쓰이는 RTOS
- **Zephyr**: 현대적인 오픈소스 RTOS
- **NuttX**: POSIX 호환 RTOS

---

## Zephyr on QEMU

```bash
west build -b qemu_cortex_a53 samples/hello_world
west build -t run
```

---

## FreeRTOS on QEMU

FreeRTOS는 QEMU ARM Cortex-M 타겟을 지원합니다.

```bash
qemu-system-arm -M mps2-an385 -kernel freertos.elf -nographic
```

---

## 정리

- RTOS를 QEMU에서 에뮬레이션해 개발/테스트한다.
- Zephyr는 west 도구로 QEMU 타겟을 빌드/실행한다.
- FreeRTOS는 Cortex-M 타겟에서 실행한다.

---

## 시리즈 마무리

이 시리즈에서 배운 것:
- QEMU ARM/RISC-V virt 머신
- U-Boot, 리눅스 커널 부팅
- 루트 파일시스템 (Buildroot/Yocto)
- 디바이스 트리 커스터마이징
- 네트워킹, GDB 디버깅
- 베어메탈/RTOS 실행

---

## 관련 항목

- [Ch 11: 베어메탈 펌웨어](/blog/tools/qemu-embedded-emulation/chapter11-baremetal)
- [QEMU Internals 시리즈](/blog/tools/qemu-internals/chapter01-architecture)
