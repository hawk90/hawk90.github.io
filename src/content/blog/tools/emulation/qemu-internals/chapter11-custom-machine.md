---
title: "Ch 11: 커스텀 머신 타입"
date: 2026-05-17T11:00:00
description: "QEMU에서 새로운 머신 타입(보드)을 정의한다."
tags: [QEMU, Machine, Board]
series: "QEMU Internals"
seriesOrder: 11
draft: true
---

## 머신 타입이란

머신 타입은 가상 하드웨어 구성을 정의합니다:

- CPU
- 메모리 레이아웃
- 인터럽트 컨트롤러
- 페리페럴

---

## MachineClass

```c
static void my_machine_class_init(ObjectClass *oc, void *data)
{
    MachineClass *mc = MACHINE_CLASS(oc);
    mc->desc = "My Custom Machine";
    mc->init = my_machine_init;
    mc->max_cpus = 4;
    mc->default_ram_size = 256 * MiB;
}
```

---

## 머신 초기화

```c
static void my_machine_init(MachineState *machine)
{
    // CPU 생성
    // 메모리 설정
    // 인터럽트 컨트롤러 생성
    // 페리페럴 연결
}
```

---

## 정리

- MachineClass로 새 머신 타입을 정의한다.
- init 콜백에서 CPU, 메모리, 디바이스를 생성한다.
- -M 옵션으로 머신을 선택한다.

---

## 관련 항목

- [Ch 10: 마이그레이션](/blog/tools/emulation/qemu-internals/chapter10-migration)
- [Ch 12: QEMU 기여하기](/blog/tools/emulation/qemu-internals/chapter12-contributing)
