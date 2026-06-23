---
title: "첫 부팅 추적 — 0%부터 login prompt까지의 단계 분석"
date: 2026-05-18T09:10:00
description: "보드 켜는 순간부터 login prompt까지의 단계별 체크포인트를 정리합니다. 어디서 멈추는지를 미리 알아 둡니다."
series: "BSP Development"
seriesOrder: 10
tags: [embedded, bsp, boot, debugging]
draft: false
---

## 한 줄 요약

**부팅은 "한 번에 성공"이 아니라 *7~10개의 짧은 단계가 차례로 성공*하는 과정입니다.** 각 단계가 시리얼에 어떤 신호를 남기는지 미리 알아두면, 어디서 멈췄는지 5초 안에 판별할 수 있습니다.

새 보드의 전원 스위치를 처음 누를 때, BSP 엔지니어는 시리얼 콘솔의 빈 화면을 30초 정도 응시하게 됩니다. 그동안 어떤 문자가 언제 떠야 하는지의 *기대치*가 있어야 디버깅이 가능합니다. 이번 글은 i.MX8M Mini 보드를 기준으로 BootROM부터 systemd login까지의 단계를 시간 순서대로, 각 단계가 남기는 흔적과 함께 정리합니다.

## 부팅 단계 — 큰 그림

| 시각 | 단계 |
|---|---|
| 0 ms | Power on |
| ~5 ms | BootROM (mask ROM) |
| ~50 ms | SPL / U-Boot SPL |
| ~150 ms | ATF BL31 |
| ~200 ms | U-Boot proper |
| ~600 ms | bootcmd 실행, kernel/dtb/initramfs 로드 |
| ~1.0 s | Kernel decompress |
| ~1.2 s | `start_kernel()` |
| ~1.5 s | Driver probe |
| ~2.0 s | initramfs 또는 root filesystem mount |
| ~2.5 s | systemd 또는 BusyBox init |
| ~5.0 s | getty 시작 → login prompt |

타이밍은 보드와 스토리지 속도에 따라 ±50% 변동이 흔합니다. 핵심은 *순서*와 *어떤 signal이 나오느냐*입니다.

## 단계 1 — BootROM

전원이 들어오면 SoC 내부의 mask ROM이 실행됩니다. BootROM의 동작은 SoC TRM에 적혀 있으며 수정 불가능합니다.

- 보안 fuse(eFuse) 확인. 보안 부팅 활성화 여부, secure key, lifecycle state 확인.
- 부팅 모드 핀 읽기. SD, eMMC, USB, QSPI 중 어디서 부팅할지 결정.
- 1차 부트로더(SPL 또는 FIT 헤더) 로드.

i.MX 계열은 BootROM이 시리얼에 출력을 *거의 안 남깁니다*. 출력이 있다면 보통 다음 같은 짧은 stamp입니다.

```text
fsbl_log v0.1
mode: sd
```

대부분의 SoC는 BootROM 단계에서는 시리얼이 조용합니다. 따라서 *시리얼이 영영 빈 채로 멈춰 있다*면 BootROM 단계 또는 클럭/전원 단계의 문제일 가능성이 높습니다.

### BootROM이 의심될 때

- 전원 시퀀스: PMIC가 정확한 순서로 전압을 올렸는지 오실로스코프 확인.
- 부팅 모드 핀: BOOT_MODE[2:0] 핀이 의도한 strap 값인지 측정.
- 32 kHz 또는 24 MHz 크리스털: SoC reset 직후 안정적으로 oscillation하는지 확인.
- eFuse: factory에서 무심코 burn한 보안 옵션이 부팅을 막을 수 있습니다.

## 단계 2 — SPL (Secondary Program Loader)

BootROM이 SPL을 SRAM에 올리고 점프합니다. SPL은 *작은* U-Boot입니다(보통 ≤ 256 KB). SRAM은 64~256 KB 정도라서 모든 코드가 들어가지 못해 SPL과 U-Boot proper로 분리합니다.

SPL의 책임:

1. UART 콘솔 활성화. 첫 디버그 출력이 가능한 시점.
2. DRAM 초기화. DDR 컨트롤러를 셋업, 메모리 trim/calibration.
3. ATF BL31 + U-Boot proper를 DRAM에 로드.
4. ATF BL31로 점프.

성공하면 시리얼에 다음과 유사한 첫 라인이 보입니다.

```text
U-Boot SPL 2023.04 (Sep 12 2025 - 14:23:01 +0000)
DDR4 dram init done
Trying to boot from MMC1
Loading Environment from MMC... OK
Booting BL31...
```

이 시점이 **"보드가 살아 있다"의 첫 증거**입니다. 여기까지 못 오면 콘솔 UART pinmux, baud rate, DRAM 초기화 중 하나가 의심됩니다.

## 단계 3 — ATF BL31

Arm Trusted Firmware의 EL3 runtime입니다. 한 번 동작이 시작되면 PSCI, SMC handler, secure monitor로서 시스템 전체 기간 동안 살아 있습니다.

```text
NOTICE:  BL31: v2.8(release):imx_5.15.71_2.2.0
NOTICE:  BL31: Built : 14:23:15, Sep 12 2025
```

ATF는 보통 한두 줄만 남기고 U-Boot proper로 ERET합니다. 실패 시 panic 메시지를 떨굽니다.

```text
PANIC at PC : 0x0000000000924118
```

## 단계 4 — U-Boot proper

DRAM에서 실행되는 본격적인 U-Boot입니다. 환경설정, 부팅 스크립트, 네트워크, USB 등 전체 기능이 활성화됩니다.

```text
U-Boot 2023.04 (Sep 12 2025 - 14:23:01 +0000)

CPU:   Freescale i.MX8MMQ rev1.0 1800 MHz (running at 1200 MHz)
CPU:   Industrial temperature grade (-40C to 105C) at 42C
Reset cause: POR
DRAM:  2 GiB
Core:  167 devices, 17 uclasses, devicetree: separate
WDT:   Started watchdog@30280000 with servicing (60s timeout)
MMC:   FSL_SDHC: 0, FSL_SDHC: 1
Loading Environment from MMC... OK
In:    serial@30890000
Out:   serial@30890000
Err:   serial@30890000
Net:   eth0: ethernet@30be0000

Hit any key to stop autoboot:  0
```

`Hit any key to stop autoboot` 카운트다운이 끝나면 `bootcmd`가 실행됩니다. `printenv`로 확인하고 `setenv`로 수정합니다.

```text
=> printenv bootcmd
bootcmd=fatload mmc 0:1 ${loadaddr} Image; \
        fatload mmc 0:1 ${fdt_addr_r} imx8mm-myboard.dtb; \
        booti ${loadaddr} - ${fdt_addr_r}

=> printenv bootargs
bootargs=console=ttymxc0,115200 root=/dev/mmcblk0p2 rootwait rw
```

`bootargs`가 kernel command line입니다. 부트로더 → 커널로 넘어가는 *유일한* 텍스트 인터페이스이며, 여기서 잘못된 콘솔이나 root device를 넘기면 커널이 침묵하거나 panic으로 끝납니다.

## 단계 5 — Kernel decompress와 첫 printk

`booti`(arm64) 또는 `bootm`(arm 32)이 호출되면 U-Boot가 커널 entry로 점프합니다. arm64의 `Image`는 압축 안 한 raw이므로 decompress 단계가 없지만, `Image.gz`는 self-decompressing 헤더가 압축을 풉니다.

이 시점에 *earlycon*이 활성이면 다음 같은 라인이 보입니다.

```text
[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x410fd042]
[    0.000000] Linux version 6.6.0 (build@host) (aarch64-linux-gnu-gcc ...) #1 SMP PREEMPT Sat Sep 12 ...
[    0.000000] Machine model: NXP i.MX8MM EVK
[    0.000000] earlycon: ec_imx6q0 at MMIO 0x0000000030890000 (options '115200n8')
[    0.000000] printk: bootconsole [ec_imx6q0] enabled
[    0.000000] efi: UEFI not found.
[    0.000000] Memory limited to 2048MB
```

`earlycon`이 없으면 *완전히 침묵*합니다. 커널이 죽었는지 살아 있는지조차 모릅니다. 그래서 BSP 초기에는 `bootargs`에 항상 `earlycon=ec_imx6q0,0x30890000,115200n8` 같은 형식을 넣어 둡니다.

## 단계 6 — start_kernel과 driver probe

`start_kernel()`이 호출되면 커널이 자기 자신을 초기화합니다. 이 단계의 로그는 ftrace 없이도 dmesg로 직접 보입니다.

```text
[    0.000123] CPU features: detected: GIC system register CPU interface
[    0.001234] percpu: Embedded 30 pages/cpu s84120 r8192 d28520 u122880
[    0.012345] Memory: 1985944K/2097152K available
[    0.234567] Detected PIPT I-cache on CPU0
[    0.345678] GICv3: 480 SPIs implemented
[    0.456789] arch_timer: cp15 timer(s) running at 8.00MHz
[    0.567890] Console: colour dummy device 80x25
[    0.678901] printk: console [tty0] enabled
[    0.789012] printk: bootconsole [ec_imx6q0] disabled
[    0.890123] Calibrating delay loop (skipped), value calculated using timer frequency.. 16.00 BogoMIPS (lpj=80000)
```

`bootconsole disabled`가 보이면 *정식 console*이 인계받은 시점입니다. 다음 줄부터는 `earlycon`이 아니라 `console=ttymxc0,115200`에서 정한 UART에서 출력됩니다.

이후 driver probe 단계에서 다음과 같은 라인이 줄줄이 흐릅니다.

```text
[    0.912345] mmc0: SDHCI controller on 30b40000.mmc [30b40000.mmc] using ADMA
[    1.023456] usb 1-1: New USB device found, idVendor=0bda, idProduct=8153
[    1.234567] sdhci-esdhc-imx 30b40000.mmc: SDHCI controller on 30b40000.mmc
[    1.345678] mmc0: new HS200 MMC card at address 0001
[    1.456789] mmcblk0: mmc0:0001 SDW32G 29.7 GiB
```

## 단계 7 — Rootfs mount

```text
[    1.567890] EXT4-fs (mmcblk0p2): mounted filesystem with ordered data mode.
[    1.678901] VFS: Mounted root (ext4 filesystem) readonly on device 179:2.
[    1.789012] devtmpfs: mounted
[    1.890123] Freeing unused kernel memory: 5184K
[    1.901234] Run /sbin/init as init process
```

`Run /sbin/init`이 보이면 커널은 자기 일을 끝낸 셈입니다. 이제 사용자 공간이 시작됩니다.

## 단계 8 — init과 systemd

`init`(보통 systemd 또는 BusyBox)이 PID 1로 실행됩니다.

```text
[    2.012345] systemd[1]: systemd 252 running in system mode (+PAM +AUDIT ...)
[    2.123456] systemd[1]: Detected architecture arm64.
[    2.234567] systemd[1]: Hostname set to <myboard>.
[    2.345678] systemd[1]: Queued start job for default target Multi-User System.
[    3.456789] systemd[1]: Started Journal Service.
[    3.567890] systemd[1]: Mounting Temporary Directory (/tmp)...
[    4.678901] systemd[1]: Started Network Manager.
[    4.789012] systemd[1]: Started Login Service.
[    4.890123] systemd[1]: Reached target Multi-User System.
```

마지막으로 getty가 시리얼 콘솔에 login prompt를 띄웁니다.

```text
Welcome to MyBoard Linux 1.0!

myboard login:
```

## 체크포인트별 결정 트리

부팅이 멈추는 위치에 따라 진단이 달라집니다.

| 멈춘 위치 | 첫 의심 | 두 번째 의심 | 세 번째 의심 |
|-----------|---------|--------------|--------------|
| 시리얼 빈 화면, 영영 | 전원/PMIC | 부팅 모드 핀 | UART pinmux, baud rate |
| `U-Boot SPL`만 나오고 hang | DRAM init | ATF BL31 로드 경로 | SD/eMMC 매체 |
| `Booting BL31...`에서 멈춤 | ATF 빌드/위치 | 보안 fuse | RVBAR 설정 |
| U-Boot proper 진입 후 hang | DRAM training 실패 | 클럭/regulator | console UART |
| `booti` 후 침묵 | earlycon 누락 | 커널 entry 주소 | kernel/DTB load 경로 |
| `start_kernel` 후 침묵 | console 설정 | DT memory node | 잘못된 ATAGS/DTB |
| `Run /sbin/init` 후 panic | rootfs 없음 | init binary 없음 | initramfs 손상 |
| init 후 reboot loop | systemd unit 실패 | watchdog timeout | OOM |
| login 안 뜸 | getty.service 비활성 | tty 디바이스 부재 | console mux 잘못 |

## 실제 측정 — boot time 분석

`systemd-analyze`가 사용자 공간의 단계를 잘게 보여줍니다.

```bash
$ systemd-analyze
Startup finished in 1.234s (kernel) + 3.456s (userspace) = 4.690s
multi-user.target reached after 3.401s in userspace.

$ systemd-analyze blame
   1.234s NetworkManager-wait-online.service
   0.567s docker.service
   0.345s systemd-journald.service
   0.234s systemd-udev-trigger.service
   ...

$ systemd-analyze critical-chain
graphical.target @3.401s
└─multi-user.target @3.401s
  └─NetworkManager.service @1.234s +234ms
    └─dbus.service @1.001s
      ...
```

커널 단계를 더 분해하려면 `bootargs`에 `initcall_debug printk.time=1`을 넣어 각 init함수 호출 시간을 dmesg에 남깁니다.

## 흔한 실수

- **`console=ttyS0` 대신 `console=ttymxc0`이 맞는 보드**: i.MX는 `ttymxc`, Rockchip은 `ttyS`, BCM은 `ttyAMA` 또는 `ttyS`로 다릅니다. SoC 매뉴얼을 확인합니다.
- **`rootwait` 누락**: MMC 디스크가 인식되기 전에 root mount를 시도해 panic.
- **`bootargs`에 `quiet` 또는 `loglevel=0`**: 양산 펌웨어에서는 적절하지만 BSP 초기에는 *최대 verbose*로 둡니다.
- **`earlycon`을 빌트인 안 함**: `CONFIG_SERIAL_EARLYCON=y`가 없으면 인자 무시.
- **`mmcblk0p2` 대신 `mmcblk0p1`**: 파티션 번호 확인. `fdisk -l`로 검증.

## 정리

- 부팅은 BootROM → SPL → ATF → U-Boot → kernel → init → systemd의 단계별 진행입니다.
- 각 단계는 시리얼에 *고유한* 첫 라인을 남기며, 그 라인 유무로 진행 위치를 판별합니다.
- SPL의 첫 출력은 DRAM 초기화 직후입니다. 이 라인이 없으면 콘솔/전원/모드 문제입니다.
- `earlycon`과 `console`을 정확히 지정해야 커널 첫 단계가 보입니다.
- `bootargs`의 `root=`, `console=`, `rootwait`는 BSP의 가장 기본적인 약속입니다.
- `Run /sbin/init` 이후는 사용자 공간이며 `systemd-analyze`로 분석합니다.
- 멈춘 위치별로 결정 트리가 다르므로 *어디까지 나왔는지*가 디버깅의 첫 질문입니다.

## 다음 편 예고

[Ch 11: 부트로그 디버깅](/blog/embedded/bsp/chapter11-bootlog-debugging)에서는 시리얼 garbage, hang, panic, late hang 같은 실제 부팅 실패 패턴을 카탈로그로 정리합니다.

## 관련 항목

- [Ch 9: Multi-core SMP bring-up](/blog/embedded/bsp/chapter09-smp-bringup)
- [Ch 11: 부트로그 디버깅](/blog/embedded/bsp/chapter11-bootlog-debugging)
- [Ch 12: 드라이버 추가](/blog/embedded/bsp/chapter12-driver-add)
- [Buildroot로 첫 이미지 만들기](/blog/embedded/buildroot/chapter01-problem) — initramfs와 rootfs 만들기
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/00-preface) — 양산 부팅 최적화
