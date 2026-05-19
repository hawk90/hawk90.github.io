---
title: "Ch 1: QEMU RISC-V 개요"
date: 2026-05-17T19:00:00
description: "QEMU RISC-V — 지원 머신, 빌드 옵션, 기본 사용법을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 1
tags: [RISC-V, QEMU, Emulation, virt, RV64]
draft: true
---

RISC-V 개발에서 실 하드웨어 없이도 펌웨어·부트로더·커널을 돌려 볼 수 있는 가장 일반적인 도구가 **QEMU**입니다. ARM에 비해 보드 수가 적은 RISC-V 환경에서는 QEMU가 *대안*이 아니라 *주된* 개발 환경인 경우가 많습니다. 이 시리즈는 그 환경을 *깊게* 쓰는 법을 다룹니다.

이 첫 장은 시리즈 전체의 어휘를 정리합니다. 어떤 binary가 있고, 어떤 머신이 있고, 어떻게 설치하고, 어떤 옵션이 있는지를 한 번에 봅니다. 다음 장부터 각 머신과 디버깅 기법을 깊이 들어갑니다.

## QEMU RISC-V 바이너리

QEMU는 architecture별로 별도의 binary를 제공합니다. RISC-V는 32비트와 64비트가 분리되어 있고, *system emulation*과 *user-mode emulation*이 또 분리됩니다.

| 바이너리 | 용도 |
|----------|------|
| `qemu-system-riscv32` | 32비트 full system emulation (펌웨어·OS) |
| `qemu-system-riscv64` | 64비트 full system emulation (Linux 등) |
| `qemu-riscv32` | 32비트 user-mode (Linux binary 직접 실행) |
| `qemu-riscv64` | 64비트 user-mode |

대부분의 작업은 `qemu-system-riscv64`로 시작합니다. user-mode는 *Linux ABI*를 그대로 호스팅하는 가벼운 도구로, 크로스 컴파일된 ELF를 host에서 그냥 돌려 볼 때 씁니다.

## 지원 머신

`-machine help`로 머신 목록을 봅니다.

```bash
qemu-system-riscv64 -machine help
```

실제 출력은 다음과 같이 나옵니다(버전에 따라 약간 다름).

```text
Supported machines are:
microchip-icicle-kit Microchip PolarFire SoC Icicle Kit
none                 empty machine
opentitan            RISC-V Board compatible with OpenTitan
shakti_c             RISC-V Board compatible with Shakti SDK
sifive_e             RISC-V Board compatible with SiFive E SDK
sifive_u             RISC-V Board compatible with SiFive U SDK
spike                RISC-V Spike board (default)
virt                 RISC-V VirtIO board
```

가장 자주 쓰는 머신들의 성격을 한 줄로:

| 머신 | 성격 |
|------|------|
| `virt` | 범용 가상 플랫폼. VirtIO + PLIC + CLINT 표준 구성 |
| `sifive_e` | SiFive HiFive1 호환. 마이크로컨트롤러급(RV32IMAC) |
| `sifive_u` | SiFive HiFive Unleashed 호환. Linux 구동급(RV64GC) |
| `opentitan` | OpenTitan 보안 SoC, Ibex 코어 |
| `microchip-icicle-kit` | PolarFire SoC FPGA 보드 |
| `spike` | Spike ISA 시뮬레이터 호환 |
| `shakti_c` | IIT Madras의 Shakti C-class |

이 시리즈는 `virt`·`sifive_e`·`sifive_u`·`opentitan`을 차례로 깊이 다룹니다.

## 설치

대부분의 Linux 배포판에 QEMU RISC-V가 패키지로 들어 있습니다.

```bash
# Ubuntu/Debian
sudo apt install qemu-system-misc

# Fedora
sudo dnf install qemu-system-riscv

# macOS (Homebrew)
brew install qemu
```

다만 RISC-V는 빠르게 진화하는 영역이라, 최신 vector extension(`v`) 같은 기능을 쓰려면 *source build*가 필요할 때가 많습니다.

```bash
git clone https://gitlab.com/qemu-project/qemu.git
cd qemu
git checkout v9.0.0   # 또는 master

# RISC-V target만 빌드
./configure --target-list=riscv32-softmmu,riscv64-softmmu,riscv64-linux-user
make -j$(nproc)

sudo make install
```

build에서 흔히 빠지는 의존성은 `ninja-build`·`libglib2.0-dev`·`libpixman-1-dev` 셋입니다. 빌드 끝까지 성공하면 `./build/qemu-system-riscv64`가 만들어집니다.

## 가장 간단한 실행

`virt` 머신에 OpenSBI firmware만 올려서 한 번 돌려 봅니다.

```bash
qemu-system-riscv64 -machine virt -nographic \
    -bios default
```

`-bios default`는 QEMU 빌드 시 포함된 OpenSBI를 자동 선택한다는 뜻입니다. 결과:

```text
OpenSBI v1.3
   ____                    _____ ____ _____
  / __ \                  / ____|  _ \_   _|
 | |  | |_ __   ___ _ __ | (___ | |_) || |
 | |  | | '_ \ / _ \ '_ \ \___ \|  _ < | |
 | |__| | |_) |  __/ | | |____) | |_) || |_
  \____/| .__/ \___|_| |_|_____/|____/_____|
        | |
        |_|

Platform Name             : riscv-virtio,qemu
Platform Features         : medeleg
Platform HART Count       : 1
...
```

여기까지 보이면 환경 셋업은 끝났습니다. 종료는 `Ctrl-A`, `x`.

## 부트로더와 커널까지

OpenSBI 위에 U-Boot, 그 위에 Linux 커널을 올리는 *풀 스택* 부팅은 9장에서 자세히 다룹니다. 미리 한 줄로 맛만 보면:

```bash
qemu-system-riscv64 -machine virt -m 2G -nographic \
    -bios opensbi-riscv64-generic-fw_jump.bin \
    -kernel u-boot.bin \
    -drive file=rootfs.ext2,format=raw,id=hd0 \
    -device virtio-blk-device,drive=hd0 \
    -append "root=/dev/vda rw console=ttyS0"
```

이 명령이 익숙해지면 RISC-V 시스템 개발의 90%가 끝납니다.

## 주요 옵션 정리

| 옵션 | 설명 |
|------|------|
| `-machine virt` | 머신 타입 |
| `-cpu rv64` | CPU 모델·확장 (예: `rv64,v=true,vlen=256`) |
| `-smp 4` | 코어 개수 |
| `-m 2G` | 메모리 크기 |
| `-bios <file>` | M-mode 펌웨어 (보통 OpenSBI) |
| `-kernel <file>` | S-mode 부트로더 또는 커널 |
| `-initrd <file>` | initial ramdisk |
| `-append "..."` | 커널 cmdline |
| `-drive file=...` | 디스크 이미지 |
| `-device virtio-blk-device,drive=hd0` | 블록 디바이스 attach |
| `-netdev user,id=net0` | host-side 네트워크 백엔드 |
| `-device virtio-net-device,netdev=net0` | NIC attach |
| `-nographic` | GUI 없이, stdio가 직렬 콘솔 |
| `-serial mon:stdio` | monitor + serial 분리 |
| `-s -S` | GDB 서버(포트 1234) + 시작 시 정지 |
| `-d in_asm,int` | 명령어·인터럽트 트레이스 |

이 표에 있는 옵션들이 다음 9장에서 반복적으로 등장합니다.

## 왜 QEMU가 RISC-V에서 특히 중요한가

ARM 생태계는 Raspberry Pi·BeagleBone·STM32 Discovery 같은 *저렴하고 풍부한* 보드가 있습니다. RISC-V는 SiFive HiFive Unmatched·LicheePi 4A·VisionFive 2 같은 보드가 있지만 가격대와 가용성이 ARM보다 못합니다. 결과적으로:

- *학습자*는 QEMU로 시작합니다.
- *firmware 개발*은 보드 도착 전에 QEMU에서 spec을 따라가는 게 보통입니다.
- *커널/Userland 포팅*은 QEMU에서 1차 검증.
- *CI*는 거의 항상 QEMU에서 돕니다.

ARM 세계에서 *옵션*이었던 QEMU가 RISC-V 세계에서는 *기본*입니다. 이 차이가 시리즈 전체의 동기입니다.

## 정리

- QEMU RISC-V는 `qemu-system-riscv32/64` + user-mode binary 두 축으로 제공됩니다.
- 자주 쓰는 머신: `virt`(범용)·`sifive_e/u`(SiFive 호환)·`opentitan`(보안)·`spike`(ISA reference).
- 패키지 설치로 시작하지만, vector 같은 최신 확장에는 source build가 필요합니다.
- `-bios default`로 OpenSBI 한 단계만 띄워 환경을 확인하고, 거기서부터 U-Boot/Linux로 쌓아 올립니다.
- 주요 옵션 20여 개가 시리즈 전반에 반복 등장합니다.
- ARM 대비 RISC-V는 보드 가용성이 낮아 QEMU가 *대안*이 아니라 *기본* 환경입니다.

## 다음 장 예고

다음 장에서는 가장 자주 쓰는 머신인 **virt**를 깊이 들여다봅니다. 메모리 맵·표준 디바이스·DTB 자동 생성·CPU 확장 옵션까지 한 머신을 끝까지 해부합니다.

## 관련 항목

- [Ch 2: virt 머신 해부](/blog/tools/emulation/qemu-riscv/chapter02-virt-machine)
- [QEMU Internals — Architecture](/blog/tools/emulation/qemu-internals/chapter01-architecture) — QEMU 내부 구조
- [QEMU Embedded — RISC-V virt](/blog/tools/emulation/qemu-embedded/chapter03-riscv-virt) — 임베디드 관점
- [RISC-V ISA 해부](/blog/systems/riscv/isa-anatomy/chapter01-overview) — ISA 기초
