---
title: "첫 부팅 추적 — 0%부터 login prompt까지의 단계 분석"
slug: "embedded/bsp/chapter10-first-boot"
date: 2026-05-18T09:10:00
description: "보드 켜는 순간부터 login prompt까지의 단계별 체크포인트를 정리합니다. 어디서 멈추는지를 미리 알아 둡니다."
series: "BSP Development"
seriesOrder: 10
tags: [embedded, bsp, boot, debugging]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

**부팅은 BootROM부터 login 프롬프트까지 여러 단계가 바통을 넘기는 과정이고, 단계마다 시리얼에 남기는 *첫 줄*이 다릅니다.** 어느 줄까지 나왔는지를 알면 어느 단계에서 멈췄는지 압니다.

이 장은 전체 체인을 실제로 한 번 끝까지 돌린 로그로 단계를 따라갑니다. QEMU 11.1.3 virt 머신(`secure=on`, cortex-a57 ×4, 1 GiB, TCG)에서 TF-A v2.15.0(BL1·BL2·BL31) → U-Boot v2024.04(`qemu_arm64_defconfig`, TFTP로 커널 적재) → Linux 6.12(Ch 8의 `defconfig` 빌드) → Debian 13 rootfs(virtio 디스크)로 부팅했습니다. 각 단계 앞의 숫자는 QEMU를 띄운 순간부터 호스트에서 잰 초입니다. TCG 에뮬레이션이라 절대 시간은 실제 보드와 다르지만, 단계의 순서와 각 단계가 찍는 줄은 같습니다.

## 부팅 단계 — 큰 그림

| 호스트 시각 | 단계 | 시리얼에 찍힌 첫 줄 |
|---:|---|---|
| 0.052 s | TF-A BL1 | `NOTICE:  Booting Trusted Firmware` |
| 0.055 s | BL2 | `NOTICE:  BL1: Booting BL2` |
| 0.070 s | BL31 | `NOTICE:  BL1: Booting BL31` |
| 0.075 s | BL33로 나감 | `INFO:    BL31: Preparing for EL3 exit to normal world` |
| 0.085 s | U-Boot proper | `U-Boot 2024.04 (Nov 16 2026 - 07:07:34 +0000)` |
| 2.097 s | TFTP로 커널 38,246,912바이트 적재 끝 | `Bytes transferred = 38246912 (2479a00 hex)` |
| 2.713 s | 커널로 점프 | `Starting kernel ...` |
| 2.742 s | 커널 첫 printk | `Booting Linux on physical CPU 0x0000000000 [0x411fd070]` |
| 3.609 s | init 실행 | `Run /sbin/init as init process` |
| 15.223 s | systemd 목표 도달 | `Reached target multi-user.target - Multi-User System.` |

U-Boot에서 TFTP 명령을 손으로 넣었으므로 0.085~2.7초 구간에는 입력 시간과 38 MB 전송이 들어 있습니다. 실제 보드의 단계별 시간은 Ch 15에서 다룹니다.

## 단계 1 — BootROM

전원이 들어오면 SoC 내부의 mask ROM이 실행됩니다. QEMU virt에는 BootROM이 없고, `-bios`로 넘긴 TF-A BL1이 그 자리를 대신합니다(TF-A `docs/plat/qemu.rst`: "BL1 is used as the BootROM"). 실제 SoC의 BootROM은 boot 핀·fuse로 부트 매체를 고르고 첫 이미지를 읽습니다. i.MX 8M Plus EVK의 boot switch 표는 Ch 2, 매체별 이미지 위치는 Ch 17에 있습니다.

i.MX의 BootROM은 시리얼에 아무것도 찍지 않으므로, 시리얼이 영영 비어 있다면 다음 단계(SPL)의 첫 줄도 못 나온 것입니다. 이때 보는 곳은 다음과 같습니다.

- boot switch와 매체의 이미지 위치(Ch 2, Ch 17)
- 전원과 reset 회로
- 오실레이터(콘솔 UART가 24 MHz OSC를 직접 쓰므로, Ch 4)

## 단계 2 — SPL 또는 BL1/BL2

i.MX 8M Plus EVK라면 이 자리에 U-Boot SPL이 오고 첫 줄은 `U-Boot SPL 2024.04 (...)`입니다(`common/spl/spl.c:836`, Ch 1). DDR training 실패는 이 단계에서 `Training FAILED`로 보입니다(Ch 5). QEMU 체인에서는 TF-A BL1과 BL2가 이 자리를 맡습니다.

```text
NOTICE:  Booting Trusted Firmware
NOTICE:  BL1: v2.15.0(debug):
...
INFO:    BL1: Loading BL2
NOTICE:  BL1: Booting BL2
NOTICE:  BL2: v2.15.0(debug):
...
INFO:    BL2: Loading image id 5
INFO:    Loading image id=5 at address 0x60000000
```

image id 5가 U-Boot(BL33)입니다(Ch 7).

## 단계 3 — TF-A BL31

BL31은 EL3에 상주하며 PSCI를 맡습니다(Ch 7, Ch 9). 이 debug 빌드는 다음 줄들을 남기고 U-Boot로 나갑니다.

```text
NOTICE:  BL1: Booting BL31
...
NOTICE:  BL31: v2.15.0(debug):
INFO:    ARM GICv2 driver initialized
INFO:    BL31: Initializing runtime services
...
INFO:    BL31: Preparing for EL3 exit to normal world
INFO:    Entry point address = 0x60000000
INFO:    SPSR = 0x3c5
```

release 빌드(`LOG_LEVEL` 기본 20)는 `NOTICE` 줄만 남깁니다(Ch 7). BL31 배너는 나오는데 U-Boot 배너가 없으면 `Entry point address`가 BL33의 링크 주소와 맞는지부터 봅니다.

## 단계 4 — U-Boot proper

```text
U-Boot 2024.04 (Nov 16 2026 - 07:07:34 +0000)

DRAM:  1 GiB
Core:  51 devices, 14 uclasses, devicetree: board
Flash: 32 MiB
Loading Environment from Flash... *** Warning - bad CRC, using default environment

In:    serial,usbkbd
...
Net:   eth0: virtio-net#32
...
Hit any key to stop autoboot:  2  0
```

`devicetree: board`는 QEMU가 만든 DT를 그대로 쓴다는 뜻이고, i.MX EVK라면 빌드에 포함한 DT를 씁니다. `bad CRC` 경고는 저장된 환경이 없어 기본값을 썼다는 뜻입니다(Ch 6). autoboot를 멈춘 뒤 TFTP로 커널을 받고 `booti`로 넘겼습니다.

```text
=> booti ${kernel_addr_r} - ${fdtcontroladdr}
## Flattened Device Tree blob at 7e693910
   Booting using the fdt blob at 0x7e693910
...
   Loading Device Tree to 000000007d686000, end 000000007d68b462 ... OK
...
Starting kernel ...
```

`bootargs`는 `console=ttyAMA0 earlycon root=PARTUUID=1f342af3-3c35-4bc7-9e48-59628a9a5f7a rootwait ro`였고, 부팅 뒤 `/proc/cmdline`에 같은 문자열이 있었습니다.

## 단계 5 — 커널 첫 printk

`booti`는 arm64 `Image`를 그대로 실행합니다. arm64 커널에는 압축 해제기가 없으므로(`Documentation/arch/arm64/booting.rst:63-65`) 별도의 decompress 단계는 없습니다.

```text
[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]
[    0.000000] Linux version 6.12.0 (root@localhost) (gcc (Debian 14.2.0-19) 14.2.0, GNU ld (GNU Binutils for Debian) 2.44) #1 SMP PREEMPT Mon Nov 16 08:10:06 UTC 2026
...
[    0.000000] Machine model: linux,dummy-virt
...
[    0.000000] earlycon: pl11 at MMIO 0x0000000009000000 (options '')
[    0.000000] printk: legacy bootconsole [pl11] enabled
```

`earlycon`에 인자를 주지 않았는데도 PL011 주소를 찾은 것은 DT `chosen/stdout-path`를 따랐기 때문입니다(Ch 3). i.MX 8M Plus EVK의 U-Boot 환경은 `earlycon=ec_imx6q,0x30890000,115200`처럼 주소를 직접 줍니다(Ch 6).

earlycon이 없으면 어떻게 되는지도 돌려 봤습니다. `console=ttyS0`만 주고(QEMU virt의 UART는 `ttyAMA0`) 부팅하면 `Starting kernel ...` 뒤로 30초 동안 한 글자도 나오지 않았습니다. 커널은 돌고 있어도 보이는 콘솔이 없는 상태입니다.

## 단계 6 — start_kernel과 driver probe

정식 콘솔이 올라오면 boot console이 꺼지고, 드라이버들이 probe됩니다. 디스크가 보이는 줄입니다.

```text
[    0.218514] printk: legacy bootconsole [pl11] disabled
...
[    0.445550] virtio_blk virtio0: [vda] 16777216 512-byte logical blocks (8.59 GB/8.00 GiB)
[    0.458936]  vda: vda1 vda15
```

SMP bring-up(0.051~0.088초)은 이 사이에 있습니다(Ch 9).

## 단계 7 — Rootfs mount

```text
[    0.599186] EXT4-fs (vda1): INFO: recovery required on readonly filesystem
...
[    0.665036] EXT4-fs (vda1): recovery complete
[    0.666980] EXT4-fs (vda1): mounted filesystem 6ab127dd-2315-4d4b-9afe-d56a5d309f78 ro with ordered data mode. Quota mode: none.
[    0.667422] VFS: Mounted root (ext4 filesystem) readonly on device 254:1.
...
[    0.755344] Freeing unused kernel memory: 2880K
[    0.756240] Run /sbin/init as init process
```

journal recovery가 돈 이유는 이 디스크가 Ch 14의 watchdog 시험에서 전원이 강제로 끊긴 guest의 디스크였기 때문입니다. 정상 종료된 디스크라면 `recovery` 줄 없이 바로 `mounted filesystem`이 나옵니다. `Run /sbin/init`이 보이면 커널은 할 일을 끝낸 셈입니다.

## 단계 8 — init과 systemd

```text
[    1.124174] systemd[1]: systemd 257.13-1~deb13u1 running in system mode (+PAM +AUDIT ...)
[    1.125286] systemd[1]: Detected architecture arm64.

Welcome to Debian GNU/Linux 13 (trixie)!

[    1.139284] systemd[1]: Hostname set to <localhost>.
...
[  OK  ] Reached target multi-user.target - Multi-User System.
...
Debian GNU/Linux 13 localhost ttyAMA0

localhost login:
```

시리얼 login 프롬프트는 `serial-getty@ttyAMA0.service`가 띄웁니다. 같은 로그에 `Started serial-getty@ttyAMA0.service - Serial Getty on ttyAMA0.`가 있습니다.

## 체크포인트별 결정 트리

마지막으로 나온 줄로 의심 영역을 좁힙니다. 각 행의 "마지막 줄"은 위 실행 로그의 실제 문자열입니다.

| 마지막으로 나온 줄 | 다음 단계 | 먼저 볼 곳 |
|-----------|---------|--------------|
| 아무것도 없음 | SPL/BL1 | boot switch, 이미지 위치, 전원·reset, 콘솔 UART 클록(Ch 2, 4, 17) |
| `U-Boot SPL ...` (i.MX) | DDR, U-Boot 적재 | `Training FAILED`(Ch 5), `Trying to boot from BOOTROM`(Ch 6) |
| `BL31: Preparing for EL3 exit to normal world` | U-Boot | `Entry point address`와 U-Boot 링크 주소(Ch 7) |
| `Starting kernel ...` | 커널 콘솔 | `earlycon`, `console=` 이름, DTB 주소 |
| `psci: probing for conduit method from DT.` | PSCI | DT `method`(Ch 9) |
| `Run /sbin/init as init process` | userspace | rootfs 안의 init, `init=` (Ch 11) |
| `Reached target multi-user.target` | getty | `serial-getty@<콘솔>.service` |

## 실제 측정 — boot time 분석

login 뒤 `systemd-analyze`로 본 같은 부팅입니다.

```text
$ systemd-analyze
Startup finished in 882ms (kernel) + 11.435s (userspace) = 12.317s
graphical.target reached after 11.432s in userspace.
$ systemd-analyze blame --no-pager | head -8
6.831s dev-vda1.device
5.779s systemd-udev-trigger.service
1.588s user@0.service
1.112s systemd-resolved.service
 935ms grub-common.service
 855ms ssh.service
 854ms systemd-logind.service
 809ms dev-hugepages.mount
```

TCG 에뮬레이션에서 userspace가 11초 넘게 걸렸고, 그중 디스크 장치 대기(`dev-vda1.device`)와 udev가 가장 큽니다. 커널 쪽을 더 쪼개는 `initcall_debug`는 Ch 11과 Ch 15에서 씁니다.

## 흔한 실수

- **`console=` 장치 이름 착오**: QEMU virt의 PL011은 `ttyAMA0`, i.MX UART는 `ttymxcN`(Ch 6)입니다. 위 실험처럼 이름이 틀리고 earlycon도 없으면 `Starting kernel ...` 뒤가 조용합니다.
- **`rootwait` 누락**: 커널 문서(`kernel-parameters.txt:5907`)의 설명대로 `rootwait`는 root 장치가 나타날 때까지 기다립니다. 비동기로 probe되는 MMC에서 이것이 없으면 장치가 보이기 전에 마운트를 시도합니다.
- **`root=` 장치 이름 고정**: 이 실행은 `root=PARTUUID=...`를 썼습니다. 장치 이름은 열거 순서에 따라 바뀝니다(Ch 17).
- **`quiet`·낮은 `loglevel`**: 단계 5~7에서 인용한 줄은 모두 커널 printk입니다. 이 줄들이 없으면 어디서 멈췄는지 알 수 없으므로, 초기 bring-up에서는 끄지 않습니다.

## 정리

- 체인은 BootROM(QEMU에서는 BL1) → SPL/BL2 → BL31 → U-Boot → 커널 → init → systemd이고, 단계마다 고유한 첫 줄이 있습니다.
- QEMU TCG에서 커널 첫 printk부터 `Run /sbin/init`까지 0.76초, systemd `multi-user.target`까지 커널 시각 기준 약 11초가 더 걸렸습니다.
- earlycon은 DT `stdout-path`를 따라 인자 없이도 동작했고, 없을 때는 `Starting kernel ...` 뒤가 비었습니다.
- 마지막 줄이 무엇이냐가 디버깅의 첫 질문입니다.

## 다음 편 예고

[Ch 11: 부트로그 디버깅](/blog/embedded/bsp/chapter11-bootlog-debugging)에서는 시리얼 garbage, hang, panic, late hang 같은 실제 부팅 실패 패턴을 카탈로그로 정리합니다.

## 관련 항목

- [Ch 9: Multi-core SMP bring-up](/blog/embedded/bsp/chapter09-smp-bringup)
- [Ch 11: 부트로그 디버깅](/blog/embedded/bsp/chapter11-bootlog-debugging)
- [Ch 12: 드라이버 추가](/blog/embedded/bsp/chapter12-driver-add)
- [Buildroot로 첫 이미지 만들기](/blog/embedded/buildroot/chapter01-problem) — initramfs와 rootfs 만들기
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/00-preface) — 양산 부팅 최적화
