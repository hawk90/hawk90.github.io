---
title: "Ch 5: 리눅스 커널 부팅"
date: 2026-05-17T05:00:00
description: "크로스 컴파일된 리눅스 커널을 QEMU에서 부팅한다."
tags: [QEMU, Linux, Kernel, cross-compile, defconfig]
series: "QEMU Embedded Emulation"
seriesOrder: 5
draft: true
---

QEMU 위에서 *내가 빌드한 Linux 커널*을 띄우는 것이 임베디드 개발의 *기본 능력*입니다. cross compile 환경, defconfig 선택, 부팅 옵션, 콘솔 메시지의 의미 — 한 번 익히면 거의 모든 임베디드 작업의 출발점이 됩니다.

## Cross compile 환경

```bash
# ARM64
sudo apt install gcc-aarch64-linux-gnu
export ARCH=arm64
export CROSS_COMPILE=aarch64-linux-gnu-

# ARM32 (Cortex-A7/A9급)
sudo apt install gcc-arm-linux-gnueabihf
export ARCH=arm
export CROSS_COMPILE=arm-linux-gnueabihf-

# RISC-V
sudo apt install gcc-riscv64-linux-gnu
export ARCH=riscv
export CROSS_COMPILE=riscv64-linux-gnu-
```

이 환경 변수가 kernel `make`의 *기본 동작*을 결정합니다.

## Defconfig 선택

```bash
# 일반 ARM64 (대부분의 ARM64 가상 머신·실 보드)
make defconfig

# i.MX 보드용 (32-bit ARM)
make imx_v6_v7_defconfig

# QEMU optimized (RISC-V)
make defconfig

# 최소 (학습/embedded constrained)
make tinyconfig
```

`defconfig`는 *해당 아키텍처의 추천 설정*입니다. 거의 모든 *upstream-supported* SoC가 동작합니다.

## 빌드

```bash
make -j$(nproc) Image
```

ARM64는 `arch/arm64/boot/Image`(uncompressed)·`Image.gz`(gzip)를 생성. RISC-V도 같은 위치.

ARM32는 `arch/arm/boot/zImage`(self-extracting).

```bash
ls arch/arm64/boot/
# Image  Image.gz  dts
```

## QEMU에서 부팅

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 2G -nographic \
    -kernel arch/arm64/boot/Image \
    -append "console=ttyAMA0 earlycon"
```

`-bios` 없이 *직접 kernel*. QEMU가 *내장 boot stub*으로 kernel을 점프합니다.

부팅 로그:

```text
[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x412fd070]
[    0.000000] Linux version 6.6.0 (...) (aarch64-linux-gnu-gcc 13.2.0)
[    0.000000] Machine model: linux,dummy-virt
[    0.000000] earlycon: pl011 at MMIO 0x0000000009000000
[    0.000000] printk: bootconsole [pl011] enabled
[    0.000000] efi: UEFI not found.
[    0.000000] Memory limited to 2048MB
[    0.000000] OF: fdt: Ignoring memory range ...
[    0.000000] Kernel command line: console=ttyAMA0 earlycon
...
[    0.234567] Run /init as init process
```

마지막 `/init` 메시지가 없으면 rootfs가 잘못된 것. 이때 panic이 따라옵니다.

## 커맨드라인 핵심

| 옵션 | 의미 |
|------|------|
| `console=ttyAMA0` | PL011 콘솔(ARM virt) |
| `console=ttyS0` | NS16550 콘솔(RISC-V virt) |
| `root=/dev/vda` | 루트 디바이스 |
| `rw` | read-write mount |
| `earlycon` | 초기 콘솔 활성 (boot 메시지 일찍) |
| `init=/sbin/init` | init binary 명시 |
| `panic=10` | panic 시 10초 후 재부팅 |
| `quiet` | log 줄임 |
| `loglevel=8` | 모든 메시지 |
| `nokaslr` | KASLR off (디버깅) |

## rootfs 없이 부팅

rootfs가 없으면 kernel panic. *학습용*으로 init=`/bin/sh`를 시도해 볼 수 있지만, busybox 같은 *최소 rootfs*가 함께 있어야 의미가 있습니다(Ch 6).

```text
[    1.234567] VFS: Cannot open root device "vda" or unknown-block(0,0): error -6
[    1.234568] Please append a correct "root=" boot option; here are the available partitions:
[    1.234569] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)
```

## initramfs

가장 빠른 rootfs 형태는 initramfs(cpio archive).

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 2G -nographic \
    -kernel Image \
    -initrd rootfs.cpio.gz \
    -append "console=ttyAMA0"
```

`-initrd`로 cpio.gz를 받으면 kernel이 *내부에 풀어* 임시 rootfs로 사용. Buildroot의 표준 출력 중 하나.

## tinyconfig — 최소 빌드

학습이나 embedded constrained 환경에서.

```bash
make tinyconfig
make -j$(nproc) Image
ls -lh arch/arm64/boot/Image
# -rw-r--r-- 1 user user 2.5M ... Image
```

tinyconfig는 2~3MB의 *최소* kernel. 정상 부팅하지만 *대부분의 driver*가 빠져 있어 학습용 외에는 부적합.

## Kconfig — 옵션 조정

```bash
make menuconfig
```

ncurses 인터페이스에서 *수천 개* config 옵션을 토글. 자주 조정하는 항목:

- `CONFIG_DEBUG_INFO=y` — GDB 디버깅용 심볼
- `CONFIG_DEBUG_KERNEL=y` — KASAN·UBSAN 같은 디버그 옵션
- `CONFIG_VIRTIO_*` — VirtIO 드라이버
- `CONFIG_*_FS=y` — 파일시스템

## 빌드 시간 줄이기

| 도구 | 효과 |
|------|------|
| `make -j$(nproc)` | 병렬 빌드 |
| `ccache` | 재컴파일 cache |
| `make olddefconfig` | 기존 .config 유지, 새 옵션은 default |
| `make modules_install INSTALL_MOD_PATH=...` | 모듈 분리 설치 |

큰 kernel(`allmodconfig`)이 30분이라면 ccache로 *재빌드*는 1~2분.

## 디버그 심볼

GDB로 kernel 디버깅(Ch 10) 시 *반드시* DEBUG_INFO=y. 빌드 결과 `vmlinux`가 *심볼 있는* ELF.

```bash
file vmlinux
# ELF 64-bit LSB executable, ARM aarch64, ...

# 심볼 일부
nm vmlinux | grep " T start_kernel"
# ffff800010000000 T start_kernel
```

## 흔한 함정

- **`root=...` 누락** — VFS panic. 항상 cmdline에.
- **console name 혼동** — ARM virt = `ttyAMA0`, RISC-V virt = `ttyS0`, sifive_u = `ttySIF0`.
- **defconfig가 아닌 임의 .config** — 옵션 누락으로 부팅 실패 가능. `make defconfig`로 reset.
- **modules 미포함** — module은 rootfs에 *복사*해야. `make modules_install`로.

## 정리

- Cross compile은 `ARCH`+`CROSS_COMPILE` 환경 변수로. `defconfig`가 시작점.
- ARM64는 `Image`, ARM32는 `zImage`, RISC-V는 `Image`. QEMU의 `-kernel`이 받음.
- 커맨드라인 핵심: `console=...`·`root=...`·`earlycon`·`panic=N`.
- rootfs 없이는 *panic*. initramfs(`-initrd`)가 가장 빠른 시작.
- `tinyconfig`로 최소 2~3MB kernel. 학습용.
- GDB 디버깅을 위해 `CONFIG_DEBUG_INFO=y` 필수 — vmlinux 심볼.
- 빌드 가속: ccache·병렬 make·올바른 defconfig 선택.

## 다음 장 예고

다음 장은 *그 다음 단계* — **rootfs**. Buildroot로 ext4 또는 cpio 이미지를 만들고 QEMU에 연결해 user-space까지 진입하는 흐름.

## 관련 항목

- [Ch 4: U-Boot 부팅](/blog/tools/emulation/qemu-embedded/chapter04-uboot)
- [Ch 6: 루트 파일시스템](/blog/tools/emulation/qemu-embedded/chapter06-rootfs)
- [Ch 10: GDB 원격 디버깅](/blog/tools/emulation/qemu-embedded/chapter10-gdb-remote)
- [Modern Embedded Recipes — Kernel Build](/blog/embedded/modern-recipes/part7-05-kernel-build)
