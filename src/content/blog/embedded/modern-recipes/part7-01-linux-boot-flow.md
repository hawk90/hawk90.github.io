---
title: "7-01: 임베디드 Linux 부팅 흐름"
date: 2026-05-15T03:00:00
description: "BootROM, SPL, U-Boot, Kernel, Init까지 각 단계의 책임과 ATF/OP-TEE, initramfs, init 시스템 선택을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 75
tags: [recipes, linux, boot]
---

## 한 줄 요약

> **"임베디드 Linux 부팅은 *DRAM이 살아나는 순간*을 기준으로 둘로 나뉩니다."** 그 전은 BootROM과 SPL이, 그 후는 U-Boot부터 init까지 차례로 책임집니다.

## 어떤 상황에서 쓰나

새 SoC를 받아 자체 BSP를 구성할 때, 부팅 시간 초기화를 줄여야 할 때, secure boot chain을 설계할 때 전체 부팅 흐름을 정확히 알아야 합니다. 단계가 5~7개 있고 각 단계가 다른 binary, 다른 storage, 다른 책임을 가지므로 한 번 그림을 그려두면 디버깅과 최적화가 모두 단순해집니다.

또 한 가지 흔한 작업은 boot time 단축입니다. 자동차 인포테인먼트는 cold boot 2초 이내가 요구사항이고, 어떤 단계에서 몇 ms가 드는지 알아야 줄일 부분을 짚을 수 있습니다.

## 핵심 개념

표준 5~6단계 흐름입니다.

```text
1. BootROM (SoC 내장)        on-chip ROM이 boot device 선택
2. SPL (Secondary Program Loader) DRAM init, U-Boot 로드
3. ATF (TF-A) / OP-TEE       secure world 초기화 (선택)
4. U-Boot                     Linux Kernel + DTB + initramfs 로드
5. Kernel                     driver init, root mount
6. Init (systemd / busybox)   userland 서비스 시작
```

각 단계의 책임을 표로 보면 분명합니다.

```text
단계        실행 환경     주요 작업               전형적 시간
BootROM    SRAM (on-chip) boot mode 결정         ~10 ms
SPL        SRAM           DRAM init, U-Boot load  100 ms
U-Boot     DRAM           Kernel+DTB load         200~500 ms
Kernel     DRAM           driver init             500 ms ~ 수 s
Init       DRAM           service start           수 s
```

ATF/OP-TEE는 ARMv8 secure world에서 EL3/secure EL1을 담당하며, 일반 ARMv7 시스템이라면 보통 생략합니다.

## 코드 / 실제 사용 예

### Boot device 선택 (BootROM)

```text
SoC pin strapping 또는 OTP fuse로 선택
BOOT_SEL[2:0] = 000   eMMC
              = 001   SD card
              = 010   SPI NOR
              = 011   QSPI
              = 100   USB (DFU mode)
```

BootROM은 변경 불가능한 mask ROM입니다. SoC datasheet의 "Boot mode" 표가 가장 정확한 reference입니다.

### SPL의 역할

```c
/* U-Boot SPL — board/<vendor>/<board>/spl.c */
void board_init_f(ulong dummy) {
    timer_init();
    preloader_console_init();
    dram_init();         /* DDR controller PHY 학습 */
    spl_init();
}

void board_init_r(gd_t *gd, ulong dummy) {
    spl_image_info_t spl_image;
    spl_load_image(&spl_image);   /* eMMC/SD에서 u-boot.bin 읽기 */
    jump_to_image(&spl_image);
}
```

SPL의 핵심 작업은 DRAM 초기화입니다. DDR PHY training이 끝나야 큰 binary를 받을 수 있고, 그 다음 U-Boot proper를 로드해 점프합니다.

### U-Boot의 bootcmd

```text
=> printenv bootcmd
bootcmd=load mmc 0:1 ${kernel_addr_r} zImage;
        load mmc 0:1 ${fdt_addr_r}    dtb/board.dtb;
        load mmc 0:1 ${ramdisk_addr_r} initramfs.cpio.gz;
        bootz ${kernel_addr_r} ${ramdisk_addr_r} ${fdt_addr_r}
```

U-Boot는 kernel, DTB, initramfs 세 binary를 RAM에 올린 후 ARM 규약에 맞게 register에 주소를 채워 Linux에 control을 넘깁니다.

### Kernel bootargs

```text
=> printenv bootargs
bootargs=console=ttyS0,115200 root=/dev/mmcblk0p2 rootwait
         init=/sbin/init quiet
```

이 문자열이 Linux kernel command line으로 그대로 전달됩니다. `init=`이 PID 1을 결정합니다.

### Init 선택

```text
systemd                 풀스택 service manager, dependency graph, 빠른 parallel boot
busybox init            단순한 SysV-style, RAM과 부팅 시간 최소
runit / s6              middle ground, supervision tree
custom init             /sbin/init으로 직접 만든 binary
```

차량 인포테인먼트나 산업 device는 빠른 boot와 minimal RAM을 위해 busybox나 custom init을 선택하는 경우가 많고, Yocto/Debian 기반은 systemd가 표준입니다.

### Initramfs vs root on storage

```text
initramfs       부팅 시 cpio.gz를 RAM에 풀어 임시 rootfs
                modules 로드 후 진짜 root로 pivot_root
root direct     U-Boot가 mmcblk0p2를 root로 직접 mount
```

초기 driver 로드 순서가 까다로운 환경(NVMe, NFS root)은 initramfs가 필수입니다.

### ATF/OP-TEE 흐름 (ARMv8)

```text
BootROM → BL1 (ATF) → BL2 (ATF) → BL31 (secure monitor)
                                   → BL32 (OP-TEE, secure OS, EL1S)
                                   → BL33 (U-Boot, normal world EL2)
                                            → Linux Kernel
```

Secure boot, TEE, Trusted Apps가 필요한 환경에서는 ATF가 BL1~BL31을 담당하고 U-Boot는 BL33이 됩니다. 일반 Cortex-A 콘솔 board에서는 ATF를 생략하기도 합니다.

## 측정 / 성능 비교

i.MX8M Mini board에서 cold boot 시간 측정값입니다.

```text
단계                    누적 시간
BootROM                 12 ms
SPL                     85 ms
U-Boot (default)        650 ms
Kernel start            720 ms
Kernel ready (printk)   2100 ms
systemd default.target  6500 ms
```

가장 큰 비중을 차지하는 것은 보통 kernel init과 userland 서비스 시작입니다.

```text
최적화 후 (boot time 단축)
U-Boot silent mode      -300 ms
kernel quiet + minimal  -800 ms
busybox init + 최소 service -3000 ms
total                   2.5 s
```

Silent mode, console 비활성, 비핵심 driver 제거, 최소 init 적용으로 흔히 1/3까지 줄입니다.

## 자주 보는 함정

> Boot mode pin strapping 오류

```text
BOOT_SEL을 잘못 stuff → BootROM이 다른 device에서 무한 retry
```

증상은 "전원만 들어오고 console에 아무것도 안 나옴"입니다. SoC datasheet의 pin table을 다시 확인합니다.

> DRAM training 실패

```text
SPL: dram_init failed
```

DDR PHY parameter가 맞지 않으면 SPL이 hang합니다. SoC vendor의 DRAM training tool로 회로별 파라미터를 다시 뽑습니다.

> DTB 누락

```text
Kernel panic - not syncing: Failed to find appropriate machine
```

U-Boot가 DTB를 안 올렸거나 주소를 잘못 넘긴 경우입니다. `bootz`의 두 번째와 세 번째 인자 위치를 확인합니다.

> initramfs 압축 헤더 mismatch

```text
Failed to execute /init: -8
```

cpio.gz가 부분 손상이거나 SPL/U-Boot가 size를 잘못 계산한 경우입니다. `gzip -t initramfs.cpio.gz`로 무결성을 확인합니다.

> Console 설정 누락

```text
bootargs에 console=ttyS0,115200 없음
```

Kernel 출력이 보이지 않으면 디버깅이 거의 불가능합니다. 양산이 아니면 console과 earlycon을 항상 명시합니다.

## 정리

- BootROM과 SPL은 *DRAM이 살아나기 전*까지의 작업을 담당합니다.
- U-Boot의 본질은 kernel, DTB, initramfs를 RAM에 올려 boot하는 loader입니다.
- ATF는 ARMv8 secure world의 표준이고, ARMv7에는 보통 생략됩니다.
- Init 선택(systemd, busybox, custom)이 부팅 시간과 RAM 사용량을 크게 좌우합니다.
- Initramfs는 NVMe, NFS root처럼 초기 driver가 필요한 환경에 필수입니다.
- Boot time 단축은 silent mode, kernel 최소화, init 단순화 순으로 효과가 큽니다.

다음 편은 **U-Boot 활용**입니다. Environment, script, network boot를 다룹니다.

## 관련 항목

- [7-02: U-Boot 활용](/blog/embedded/modern-recipes/part7-02-uboot-usage)
- [7-04: Device Tree Overlay](/blog/embedded/modern-recipes/part7-04-device-tree-overlay)
- [7-05: 커널 빌드](/blog/embedded/modern-recipes/part7-05-kernel-build)
- [7-14: 루트 파일시스템 (Buildroot 기초)](/blog/embedded/modern-recipes/part7-14-rootfs-buildroot)
