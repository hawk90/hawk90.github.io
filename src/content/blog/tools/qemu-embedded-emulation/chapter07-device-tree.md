---
title: "Ch 7: 디바이스 트리"
date: 2025-09-15T07:00:00
description: "QEMU가 생성하는 디바이스 트리를 이해하고 커스터마이징한다."
tags: [QEMU, DeviceTree, DTB]
series: "QEMU Embedded Emulation"
seriesOrder: 7
draft: true
---

## 디바이스 트리란

디바이스 트리(Device Tree)는 하드웨어 구성을 기술하는 데이터 구조입니다.

- ARM/RISC-V 플랫폼에서 표준
- 커널에 하드웨어 정보 전달
- `.dts` (소스) → `.dtb` (바이너리)

---

## QEMU 자동 생성

QEMU는 머신 구성에 맞는 DTB를 자동 생성합니다.

```bash
qemu-system-aarch64 -M virt,dumpdtb=qemu.dtb ...
```

---

## DTB 분석

```bash
dtc -I dtb -O dts qemu.dtb > qemu.dts
cat qemu.dts
```

---

## 커스텀 DTB

```bash
qemu-system-aarch64 -M virt -dtb custom.dtb ...
```

---

## 정리

- QEMU는 머신 구성에 맞는 디바이스 트리를 자동 생성한다.
- dumpdtb 옵션으로 생성된 DTB를 추출한다.
- -dtb 옵션으로 커스텀 DTB를 사용한다.

---

## 관련 항목

- [Ch 6: 루트 파일시스템](/blog/tools/qemu-embedded-emulation/chapter06-rootfs)
- [Ch 8: 페리페럴 추가](/blog/tools/qemu-embedded-emulation/chapter08-peripherals)
