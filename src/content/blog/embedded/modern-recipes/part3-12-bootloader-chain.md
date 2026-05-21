---
title: "3-12: Bootloader 체인 — BootROM·SPL·U-Boot·Kernel·Secure Boot"
date: 2026-05-13T10:00:00
description: "Cortex-A 부팅 단계. BootROM → SPL → U-Boot → Linux. Secure boot, FIT image, A/B."
series: "Modern Embedded Recipes"
seriesOrder: 34
tags: [recipes, bootloader, u-boot, secure-boot, spl]
draft: false
---

## 한 줄 요약

> **"부팅은 점진적 환경 확장입니다."** 작은 ROM에서 출발해 전체 OS까지 확장합니다.

## 일반 ARM Cortex-A 부팅 단계

부트 체인을 그림으로 보면 다음과 같습니다.

![Bootloader chain — BootROM에서 init까지](/images/blog/modern-recipes/diagrams/part1-05-bootloader-chain.svg)

각 stage가 어떤 환경에서 무엇을 하는지 단계별로 정리합니다.

| 단계 | 크기 | 실행 위치 | 주 역할 |
| --- | --- | --- | --- |
| 1. BootROM | 8 ~ 32 KB | internal SRAM (DDR 미초기화) | 부트 매체 select (SD·eMMC·NOR·USB) |
| 2. SPL | ~64 KB | internal SRAM, ROM 후 | DDR 초기화, U-Boot proper 로드 |
| 3. U-Boot (full) | 수 MB | DDR | env·script·shell, Kernel·DTB·initrd 로드, `bootm` 점프 |
| 4. Linux kernel | 수십 MB | DDR | DTB 파싱, driver init, init 시작 |
| 5. systemd / busybox init | rootfs | rootfs mount 후 | 응용 시작 |

## BootROM

- Chip mask ROM, 변경 불가
- TPL (Tertiary), 또는 SBL (Secondary Boot Loader) 라고도
- Strap pin·fuse로 *부트 소스* 결정 · SD card? · eMMC? · NOR flash? · UART (recovery)?
- 매체에서 *고정 offset*에서 binary 읽음 · NXP i.MX: 0x400 offset, IVT header · STM32MP1: 0 offset, partition 'fsbl1' · Allwinner: 8 KB offset
- Header 검증 → signature check (secure boot 시)
- SRAM에 로드 후 jump

## SPL (Secondary Program Loader)

```c
/* U-Boot SPL의 역할 */
void board_init_f(ulong dummy) {
    /* 1. Pin mux·clock·UART (debug) */
    preloader_console_init();
    
    /* 2. DDR controller·PHY 초기화 */
    ddr_init();
    
    /* 3. 다음 단계 binary 로드 */
    spl_board_init();
    spl_load_image(IH_TYPE_FIRMWARE, &spl_image);
    
    /* 4. Jump to U-Boot proper */
    jump_to_image_no_args(&spl_image);
}
```

크기가 *극도로 제한*됩니다. chip 내장 SRAM에 들어가야 하므로 보통 64-128 KB 범위입니다.

## U-Boot Proper

```bash
=> printenv
bootcmd=run distro_bootcmd
fdt_addr=0x83000000
kernel_addr=0x82000000
initrd_addr=0x84000000

=> setenv bootargs "console=ttyS0,115200 root=/dev/mmcblk0p2"
=> fatload mmc 0:1 ${kernel_addr} zImage
=> fatload mmc 0:1 ${fdt_addr} board.dtb
=> bootz ${kernel_addr} - ${fdt_addr}
```

`bootcmd`는 자동 실행 명령입니다. `bootdelay` 초만 wait하고, 키 입력이 없으면 자동으로 시작합니다.

## FIT Image — 통합 부트 이미지

```text
FIT (Flattened Image Tree): 한 파일에 kernel + DTB + initrd + 서명
```

```dts
/dts-v1/;
/ {
    description = "ARM kernel image";
    images {
        kernel {
            description = "Linux 5.15";
            data = /incbin/("./zImage");
            type = "kernel";
            arch = "arm";
            os = "linux";
            compression = "none";
            load = <0x82000000>;
            entry = <0x82000000>;
            hash-1 { algo = "sha256"; };
            signature-1 {
                algo = "sha256,rsa2048";
                key-name-hint = "dev";
            };
        };
        fdt {
            data = /incbin/("./board.dtb");
            type = "flat_dt";
        };
    };
    configurations {
        default = "conf-1";
        conf-1 {
            kernel = "kernel";
            fdt = "fdt";
        };
    };
};
```

```bash
mkimage -f boot.its boot.itb
```

`boot.itb` 단일 파일로 *서명 + 검증*이 가능합니다.

## Secure Boot

```text
Hardware Root of Trust:
[eFuse / OTP — public key hash]
   ↓
[BootROM — public key 확인]
   ↓
[SPL — 서명된 image만 로드]
   ↓
[U-Boot — kernel/DTB 서명 검증]
   ↓
[Kernel — IMA·dm-verity로 user space 검증]
```

각 단계에서 *다음 stage의 서명을 확인*합니다. 한 단계라도 검증에 실패하면 부팅이 중단됩니다.

### TF-A (Trusted Firmware-A)

```text
BL1 (BootROM)
   ↓
BL2 (Trusted Boot Firmware): DDR 초기화, 다음 binary 로드
   ↓
BL31 (EL3 Runtime): secure monitor, PSCI provider
   ↓
BL32 (Secure-EL1 OS): OP-TEE 등
   ↓
BL33 (Non-secure): U-Boot or Linux 직접
```

Cortex-A ARMv8 표준 부팅 chain입니다. 자동차 ECU·모바일 SoC의 표준입니다.

## A/B Boot — 안전 업데이트

**Partition layout:**

- /boot_a (kernel A + DTB A)
- /boot_b (kernel B + DTB B)
- /root_a, /root_b
- /misc — current slot + boot count

```bash
# U-Boot
=> if test ${current_slot} = "a"; then
     run boot_a
   else
     run boot_b
   fi

# Fail count
=> setexpr boot_count ${boot_count} + 1
=> if test ${boot_count} -ge 3; then
     run rollback_to_other_slot
   fi
```

업데이트 후 *N회 부팅 실패*가 발생하면 *자동 rollback*이 일어납니다. Android·Tesla·자동차 OTA에서 씁니다.

## STM32MP1 부팅 예

1. BootROM (32 KB)
2. FSBL (First Stage): TF-A BL2, 100 KB, internal SRAM
3. SSBL (Second Stage): U-Boot, DDR로 로드
4. Linux + DTB + extlinux script

`STM32CubeProgrammer`로 *flash·verify*를 수행합니다.

## i.MX8 부팅

1. BootROM
2. SCFW (System Controller Firmware): power·clock 관리 전용 ARM-M
3. SECO (Security Controller): secure key 관리
4. ATF BL31
5. U-Boot
6. Linux

이렇게 *멀티 프로세서* 부팅이 일어납니다. 자동차·산업 분야에서 표준입니다.

## 부팅 디버깅

### UART 부트 로그 캡쳐

```bash
# host
screen /dev/ttyUSB0 115200 -L

# 보드 power on → 로그 확인
[ROM] Booting from SD...
[SPL] DRAM init done
[U-Boot] Hit any key to stop autoboot...
```

각 stage가 다른 *문자열·서명*을 출력합니다. 이렇게 어느 stage에서 hang이 났는지 식별할 수 있습니다.

### JTAG로 stage별 break

```bash
(gdb) target remote :3333
(gdb) break *0x10000000   # SPL entry
(gdb) continue
```

OpenOCD·J-Link로 BootROM 이후 *어느 PC*에 있는지 확인합니다.

## 자주 하는 실수

> ⚠️ DTB · kernel 버전 mismatch

```bash
fatload mmc 0:1 ${fdt_addr} old.dtb   # 옛 DTB
bootz ${kernel_addr} - ${fdt_addr}     # 새 kernel
# → 부팅 hang or "Unable to find a usable RTC"
```

DTB는 *kernel과 같은 버전*에서 빌드해야 합니다. 자동화는 Yocto·Buildroot로 합니다.

> ⚠️ Boot partition offset 잘못

```bash
dd if=u-boot-spl.img of=/dev/mmcblk0 bs=1k seek=8   # ← BootROM offset 다름
```

칩별 offset을 *정확히 확인*해야 합니다. NXP i.MX는 0x400, Allwinner는 8 KB입니다.

> ⚠️ Bootargs 잘못

```bash
bootargs="console=ttyAMA0,115200 root=/dev/mmcblk0p2"
# ← console driver 이름이 잘못되면 로그가 안 나옵니다
```

DT의 `chosen { stdout-path = ... }`와 *일치*해야 합니다.

> ⚠️ Secure boot key 분실

```text
eFuse에 public key hash가 박히면 revert가 불가합니다
```

개발 시에는 *test key*를 쓰고, 양산 직전에 *production key*로 burn합니다. 잘못하면 chip이 *brick*됩니다.

## 정리

- 부팅은 **BootROM → SPL → U-Boot → Kernel** 순서입니다.
- SPL은 DDR 초기화와 다음 단계 로드를 담당합니다.
- **FIT image**로 통합과 서명을 합니다.
- **A/B boot**로 안전한 업데이트를 보장합니다.
- TF-A는 ARMv8 표준 chain입니다 (BL1~BL33).
- 디버깅에는 UART 로그와 JTAG break를 씁니다.

다음 편은 **JTAG/SWD 디버깅**입니다.

## 관련 항목

- [1-04: Device Tree](/blog/embedded/modern-recipes/part1-04-device-tree)
- [1-06: JTAG·SWD](/blog/embedded/modern-recipes/part1-06-jtag)
