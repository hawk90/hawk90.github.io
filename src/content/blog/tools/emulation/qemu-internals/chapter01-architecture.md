---
title: "Ch 1: QEMU 아키텍처 개요"
date: 2026-05-17T01:00:00
description: "QEMU의 전체 아키텍처 — TCG, KVM, 디바이스 모델을 이해한다."
tags: [QEMU, Architecture, TCG, KVM, accelerator]
series: "QEMU Internals"
seriesOrder: 1
draft: true
---

QEMU의 *내부 구조*를 이해하면 단순 사용자에서 *기여자/개발자*로 한 단계 올라설 수 있습니다. 새 머신을 만들거나, 디바이스를 추가하거나, 성능을 튜닝하거나, 버그를 추적할 때 *어디를 봐야 하는지* 알게 되죠. 이 시리즈가 22장에 걸쳐 그 지도를 그립니다.

이 첫 장은 QEMU의 *큰 그림* — 어떤 components가 있고 어떻게 협력하는지를 한 번에 봅니다.

## QEMU란

QEMU는 *다목적 에뮬레이터/가상화 도구*입니다. 다음 셋이 같은 binary에 들어 있죠.

| 모드 | 역할 |
|------|------|
| **Full System Emulation** | CPU + 메모리 + 디바이스 전체. `qemu-system-...` |
| **User Mode Emulation** | 다른 architecture binary 직접 실행. `qemu-x86_64` 등 |
| **KVM 가속** | 하드웨어 가상화로 native 속도 |

대부분의 사용자는 *full system + KVM 가속* 조합을 씁니다. user mode는 Linux ABI를 그대로 호스팅하는 경량 모드.

## 핵심 components

QEMU 프로세스 안의 *주요 layer*.

| Layer | 역할 |
|-------|------|
| **CPU accelerator** | TCG / KVM / Hvf / WHPX |
| **Memory model** | MemoryRegion + AddressSpace |
| **Device model** | QOM 기반 PCI/MMIO/IRQ |
| **Block layer** | qcow2/raw/nbd I/O |
| **Network layer** | VirtIO/NIC + tap/user backend |
| **Main loop** | AIO + coroutine + timer |
| **Migration** | live migration + snapshot |

각 layer가 *자기 영역*만 다루고 *명확한 인터페이스*로 협력합니다. QOM이 그 인터페이스의 *공통 어휘*.

## CPU accelerator 셋

QEMU가 게스트 CPU를 *어떻게* 실행하는지가 가장 중요한 결정.

### TCG — Tiny Code Generator

소프트웨어 기반. host와 guest architecture가 *다를 때*.

```text
Guest binary (ARM64)
       │
       ▼
TCG IR (intermediate representation)
       │
       ▼
Host code (x86_64 native)
       │
       ▼
실행 + 캐시 (Translation Block)
```

QEMU의 *상징적인 기능*. *어떤 host*에서도 *어떤 guest*를 실행 가능. 단, native 대비 5~10× 느림.

### KVM 가속

host와 guest가 *같은* architecture일 때.

| 항목 | 동작 |
|------|------|
| CPU 명령 | VT-x/AMD-V로 *native* 직접 실행 |
| MMIO | trap → QEMU 처리 |
| Port I/O | trap → QEMU 처리 |
| Interrupt | KVM 가속 |

거의 native 성능. cloud VM이 이 방식.

### Hvf (macOS) / WHPX (Windows)

각 호스트 OS의 *kernel-level 가속*. KVM과 비슷한 역할.

## Device model — QOM

QEMU의 모든 device는 **QOM**(QEMU Object Model) 객체. C로 구현한 객체 지향 시스템.

```text
TYPE_OBJECT
  └─ TYPE_DEVICE
       └─ TYPE_SYS_BUS_DEVICE
            └─ TYPE_PCI_DEVICE
                 └─ TYPE_E1000  (구체 device)
```

상속·인터페이스·동적 타입 생성을 *C 매크로*와 *런타임 dispatch*로 지원합니다.

## Memory model — MemoryRegion

게스트가 보는 *주소 공간*은 **MemoryRegion**의 *tree*. RAM·ROM·MMIO·alias·container 다섯 종류.

```text
system_memory (root container)
├─ DRAM (RAM, 0x40000000~)
├─ Flash (ROM)
├─ PCI host bridge (container)
│   ├─ PCI device 1's BAR0 (I/O)
│   └─ PCI device 2's BAR0 (I/O)
└─ Platform peripherals (container)
    ├─ UART (I/O)
    ├─ Timer (I/O)
    └─ GIC (I/O)
```

CPU가 *load/store*하면 이 tree를 walk해서 *적합한 callback*에 도달.

## Main loop

QEMU 프로세스의 *심장*.

```c
while (running) {
    /* 1. timeout까지 event 대기 */
    os_host_main_loop_wait(timeout);

    /* 2. expired timers 처리 */
    qemu_clock_run_all_timers();

    /* 3. bottom halves 처리 */
    qemu_bh_poll();
}
```

*single-threaded* event loop. KVM mode에서는 *vCPU thread*가 별도, IO만 main loop.

## Block layer

```text
┌──────────────────┐
│  BlockDevice     │  ← guest 인터페이스 (virtio-blk, IDE)
└────────┬─────────┘
         │
┌────────▼─────────┐
│  BlockBackend    │  ← host 측 throttle, mirroring
└────────┬─────────┘
         │
┌────────▼─────────┐
│  BlockDriverState│  ← qcow2 / raw / nbd 등
└────────┬─────────┘
         │
┌────────▼─────────┐
│  Protocol        │  ← file / nbd / iscsi / ssh
└──────────────────┘
```

각 layer가 *coroutine 기반*으로 동작해 *비동기 I/O*를 자연스럽게 처리.

## Network layer

```text
┌──────────────────┐
│ Guest NIC        │  ← e1000 / virtio-net
└────────┬─────────┘
         │
┌────────▼─────────┐
│ NetClientState   │
└────────┬─────────┘
         │
┌────────▼─────────┐
│ Backend          │  ← tap / user / socket / vhost
└──────────────────┘
```

NIC frontend과 backend가 *분리* — guest가 무엇을 사용하든 host backend는 자유롭게 선택.

## 시리즈 구성

22장의 흐름.

| 범위 | 주제 |
|------|------|
| Ch 1~2 | 개요 + QOM |
| Ch 3~4 | 메모리 + main loop |
| Ch 5~6 | block + network |
| Ch 7~9 | PCI + IRQ + timer |
| Ch 10~12 | migration + machine + contributing |
| Ch 13~14 | TCG + KVM 심화 |
| Ch 15~17 | coroutine + AIO + block I/O 심화 |
| Ch 18~19 | VirtIO + vhost |
| Ch 20 | microvm |
| Ch 21~22 | confidential + snapshot |

각 장이 *어떤 영역의 깊은 내부*를 보여 줍니다. 이 시리즈를 끝내면 QEMU mainline 코드를 *읽고 수정*할 수 있는 어휘가 모입니다.

## QEMU 소스 트리

main repository는 `https://gitlab.com/qemu-project/qemu`. 주요 디렉터리.

| 디렉터리 | 내용 |
|---------|------|
| `accel/` | TCG·KVM·Hvf accelerator |
| `block/` | block layer |
| `hw/` | device models |
| `target/` | guest architecture (arm, riscv, x86) |
| `softmmu/` | full system emulation main |
| `linux-user/` | Linux user mode |
| `migration/` | live migration |
| `tcg/` | TCG IR + 백엔드 |
| `qapi/` | QMP API |
| `chardev/` | character device backends |

`hw/`가 device model 전체 — *수백 개* device. `target/`은 CPU emulation. 새 기여는 보통 *둘 중 하나*에.

## 빌드

```bash
git clone https://gitlab.com/qemu-project/qemu.git
cd qemu
git checkout v9.0.0

# 의존성 (Ubuntu)
sudo apt install ninja-build libglib2.0-dev libpixman-1-dev \
    libfdt-dev libslirp-dev

# 빌드
./configure --target-list=aarch64-softmmu,riscv64-softmmu,x86_64-softmmu \
    --enable-kvm --enable-debug
make -j$(nproc)

# 실행
./build/qemu-system-aarch64 -M virt ...
```

`--enable-debug`로 GDB 친화적 binary 생성. mainline 기여 시 *필수*.

## 정리

- QEMU는 *full system + user mode* binary로 다양한 architecture를 emulate.
- CPU 가속: **TCG**(software) / **KVM**(VT-x/AMD-V) / Hvf / WHPX.
- 모든 device가 **QOM** 객체. 상속·인터페이스·property를 C 매크로로.
- Memory model은 **MemoryRegion** tree + **AddressSpace** view.
- **Main loop**가 event·timer·BH 처리. KVM vCPU는 별도 thread.
- Block/network layer가 *frontend + backend* 분리로 유연성.
- 소스 트리: `accel/`·`hw/`·`target/`·`softmmu/`·`migration/`이 핵심.

## 다음 장 예고

다음 장은 *모든 layer의 공통 어휘* — **QOM**을 깊이 들여다봅니다. TypeInfo·property·인터페이스·dynamic type creation까지.

## 관련 항목

- [Ch 2: QOM 심화](/blog/tools/emulation/qemu-internals/chapter02-qom-deep-dive)
- [QEMU Fake Device Driver](/blog/tools/emulation/qemu-fake-device/chapter01-overview)
- [QEMU RISC-V — 커스텀 디바이스](/blog/tools/emulation/qemu-riscv/chapter08-custom-device)
- [QEMU Embedded](/blog/tools/emulation/qemu-embedded/chapter01-overview)
