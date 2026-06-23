---
title: "부트로더 디버깅 기법 — DEBUG·JTAG·serial·post-mortem 분석"
date: 2026-05-09T09:22:00
description: "부트로더 디버깅 — CONFIG_DEBUG_UART, JTAG, 시리얼 콘솔, panic dump 읽기."
series: "Bootloader Internals"
seriesOrder: 22
tags: [embedded, bootloader, u-boot, debugging, jtag]
draft: false
---

부트로더가 죽으면 대개 *조용히* 죽습니다. OS도 없고, 시리얼도 아직 안 살아 있고, gdb도 못 붙는 상태에서 무엇이 잘못됐는지 알아야 합니다. 이번 장은 이 시리즈의 마지막으로, *처음 출력 한 글자*부터 *post-mortem 분석*까지 부트로더 디버깅의 도구 상자를 정리합니다.

## 한 줄 요약

**침묵하는 부트로더는 *DEBUG_UART로 첫 글자*를 끌어내고, *JTAG으로 멈춘 위치*를 잡고, *bdinfo·md·mw로 메모리 상태*를 읽고, *cmdline에서 panic 단서*를 후추출하는 네 단계의 도구로 해부합니다.**

## DEBUG_UART — 첫 글자가 안 나올 때

가장 이른 시점의 출력입니다. SPL이 띄우는 콘솔도 아직 동작하지 않을 때, 핀mux·클럭 설정 *직후* 바로 `putc()`로 글자를 찍습니다.

```text
# defconfig
CONFIG_DEBUG_UART=y
CONFIG_DEBUG_UART_NS16550=y
CONFIG_DEBUG_UART_BASE=0x30890000   # 보드의 UART 베이스
CONFIG_DEBUG_UART_CLOCK=24000000    # UART 입력 클럭
CONFIG_DEBUG_UART_BAUDRATE=115200
CONFIG_DEBUG_UART_ANNOUNCE=y        # 활성 시 "<debug_uart>" 인사
CONFIG_DEBUG_UART_SKIP_INIT=n       # 핀mux/클럭 직접 초기화
```

코드에서는 보드 초기화 *맨 앞*에서 호출합니다.

```c
// board/myvendor/boardx/spl.c
#include <debug_uart.h>

void board_init_f(ulong dummy)
{
    /* Earliest possible point */
    debug_uart_init();
    printascii("Hello from SPL\n");

    arch_cpu_init();
    init_uart_clk(1);
    ...
}
```

`printascii`만 쓸 수 있다는 점이 제약입니다. `printf`는 아직 동작하지 않습니다. 그러나 *한 글자라도 나오는지*가 첫 갈림길입니다.

- **글자가 나옴** — UART 핀mux·클럭·전원이 살아 있음.
- **글자가 안 나옴** — 의심: `UART_BASE` 잘못, 클럭 분주 다름, 핀mux 미설정.
- **글자가 깨짐** — baudrate divisor 계산이 틀림.

## bdinfo·md·mw — 살아 있는 U-Boot 안에서

일단 U-Boot 콘솔이 떴으면 가장 자주 쓰는 명령 셋입니다.

```text
=> bdinfo
arch_number = 0x00000000
boot_params = 0x40000100
DRAM bank   = 0x00000000
-> start    = 0x40000000
-> size     = 0x40000000
baudrate    = 115200 bps
relocaddr   = 0xbff7c000
reloc off   = 0x7fd7c000
fdt_blob    = 0xbef8b790
```

`reloc off`이 의외로 자주 보는 값입니다. U-Boot은 *DDR 위쪽으로 재배치*되어 동작합니다. 디버깅 시 `0x40200000`(text base)와 `0xbff7c000`(relocaddr) 사이의 변환이 필요합니다.

`md`(memory display)와 `mw`(memory write)로 메모리를 직접 확인합니다.

```text
=> md.l 0x40000000 4
40000000: 00000000 00000000 00000000 00000000    ................

=> mw.l 0x40000000 0xdeadbeef
=> md.l 0x40000000 4
40000000: deadbeef 00000000 00000000 00000000    ................

=> md.b 0x40000000 16
40000000: ef be ad de 00 00 00 00 00 00 00 00 00 00 00 00    ................
```

이게 *DDR이 살아 있는지*의 첫 확인입니다. write 후 read가 다르면 DDR 또는 캐시 문제입니다.

```text
=> mtest 0x90000000 0x90100000
Testing 90000000 ... 90100000:
Pattern AA55AA55  Writing...  Reading...Done.
```

`mtest`로 *조금 더 넓은 영역*에서 패턴 테스트를 합니다. 부팅 직후 random crash가 보이면 우선 `mtest`로 DDR 의심을 풀어 둡니다.

## printenv·setenv·saveenv — env 디버깅

env는 *부팅 흐름의 데이터*가 다 들어 있는 곳입니다.

```text
=> printenv
arch=arm
baudrate=115200
board=boardx
bootcmd=run distro_bootcmd
bootargs=console=ttyS0,115200 root=/dev/mmcblk0p2 ro
...

Environment size: 1234/4092 bytes
```

부팅이 *autoboot 도중* 멈추면 `bootcmd`를 한 줄씩 직접 실행해 봅니다.

```text
=> setenv stdout serial   # 혹시 다른 콘솔로 가지 않는지
=> setenv stderr serial
=> run bootcmd
```

env가 *어디에 저장*되어 있는지도 확인합니다.

```text
=> env info
Environment is in MMC, OK, not flushed
=> env save
Saving Environment to MMC...
Writing to MMC(0)... OK
```

env 저장 위치 자체가 unreliable한 보드도 있습니다. 그런 보드는 redundant env(두 사본) 설정을 권합니다.

## JTAG·OpenOCD·gdb-multiarch

시리얼이 *아예* 안 나오거나, hang하는 *정확한 명령어 주소*를 알고 싶을 때 JTAG입니다.

```bash
# OpenOCD 띄우기 (J-Link로 imx8mm)
openocd -f interface/jlink.cfg -f target/imx8mm.cfg
```

```text
Open On-Chip Debugger 0.12.0
Info : J-Link OB-K22-SiFive compiled Apr  4 2023
Info : J-Link initialization done.
Info : imx8mm.cpu0: hardware has 6 breakpoints, 4 watchpoints
Info : starting gdb server for imx8mm.cpu0 on 3333
Info : Listening on port 3333 for gdb connections
```

다른 터미널에서 gdb를 붙입니다.

```bash
gdb-multiarch u-boot
```

```text
(gdb) target remote :3333
Remote debugging using :3333
0x0000000000910010 in ?? ()

(gdb) info reg
x0   0x0   0
x1   0x0   0
x2   0x0   0
x3   0x0   0
...
pc   0x910010    0x910010
sp   0x912000    0x912000

(gdb) bt
#0  0x0000000000910010 in spl_dram_init () at board/myvendor/boardx/spl.c:42
#1  0x000000000091012c in board_init_f (dummy=0) at board/myvendor/boardx/spl.c:71
```

이 시점부터는 일반 gdb 디버깅입니다. `break board_init_f`·`step`·`watch`로 한 줄씩 확인할 수 있습니다.

```text
(gdb) break dram_init
Breakpoint 1 at 0x910128: file board/myvendor/boardx/boardx.c, line 16.
(gdb) continue
Continuing.

Breakpoint 1, dram_init () at board/myvendor/boardx/boardx.c:16
16        gd->ram_size = imx_ddr_size();
(gdb) p gd->ram_size
$1 = 0
(gdb) step
```

JTAG의 강점은 *DDR이 동작하기 전에도 코어를 멈출 수 있다*는 점입니다. DDR 의심이 있을 때 immediate한 답을 줍니다.

## post-mortem — 죽은 시스템에서 단서 추출

production 시스템이 *부트 도중 패닉했을 때*는 ROM의 reset 직후라 RAM이 깨끗합니다. 하지만 *부트 후 한참 뒤* 죽었으면 RAM에 단서가 남아 있습니다.

U-Boot에서 가장 자주 쓰는 post-mortem 흐름입니다.

1. reboot 직후 U-Boot prompt에 멈춤.
2. `md.l <kernel-log-region>`으로 dmesg 잔재 확인.
3. cmdline에 `panic=0`이 있었으면 kernel이 멈춰 있을 수도 있음.
4. `mtest`로 DDR 무결성 확인.
5. `printenv`에서 마지막 bootcmd 추적.

Linux는 `pstore`·`ramoops`로 *재부팅 후에도 panic 로그를 RAM에 남겨* 두는 기능이 있습니다. 그 영역을 U-Boot이 *건드리지 않게* DT에 reserved-memory로 박아 둡니다.

```text
reserved-memory {
    #address-cells = <2>;
    #size-cells = <2>;
    ranges;

    ramoops@bf000000 {
        compatible = "ramoops";
        reg = <0x0 0xbf000000 0x0 0x100000>;
        record-size = <0x4000>;
        console-size = <0x4000>;
    };
};
```

이러면 panic 후 `cat /sys/fs/pstore/dmesg-ramoops-0`으로 *바로 직전의 panic 메시지*를 읽을 수 있습니다.

## 흔한 부팅 실패 매트릭스

실전에서 자주 만나는 증상과 첫 의심 지점입니다.

| 증상 | 첫 의심 | 두 번째 의심 |
|------|---------|--------------|
| 시리얼에 한 글자도 안 나옴 | UART 베이스·클럭 잘못, 핀mux 미설정 | DEBUG_UART 미활성, baudrate 설정 |
| 깨진 글자만 나옴 | baudrate divisor 오계산 | UART 입력 클럭 값 |
| SPL은 떴는데 "DDR init fail" | DDR timing 잘못, refresh rate | DDR PHY calibration 실패, 전압 |
| DDR은 떴는데 proper U-Boot 점프 직후 hang | 캐시 incoherent, MMU 설정 | text base 충돌, relocation |
| U-Boot은 떴는데 MMC 초기화 실패 | usdhc pinmux, 전원 regulator | bus-width·voltage switching |
| `bootm`이 "Bad Magic Number" | uImage 헤더 손상, raw Image를 bootm으로 부름 | FIT 서명 검증 실패 |
| 커널 점프 후 침묵 | `earlycon` 누락, ABI 위반 | DTB 자리 충돌, initrd_high 미설정 |
| 커널 부팅 후 "no console" | `console=` cmdline 누락 | stdout-path가 disable된 노드를 가리킴 |
| 부팅 후 random panic | DDR timing 불안정, 캐시 coherency | 클럭 안정성, 전원 sequencing |

부트로더 디버깅의 60%가 이 표 안에서 해결됩니다. 첫 단계에서 *이 증상이 어디에 해당하는지*를 먼저 분류하면 시간이 줄어듭니다.

## 디버깅 cheat sheet

자주 쓰는 명령을 한 자리에 모았습니다.

**정보:**

- bdinfo                # 보드 정보·메모리 맵
- version               # U-Boot 버전
- coninfo               # 콘솔 device 정보
- env info              # env 저장 상태
- fdt addr ${fdt_addr_r}; fdt print /  # DTB 트리

**메모리:**

- md.l <addr> <count>   # 32-bit 단위 read
- mw.l <addr> <val>     # 32-bit 단위 write
- mtest <start> <end>   # 패턴 테스트
- cmp.l <a> <b> <count> # 두 영역 비교

**저장 매체:**

- mmc list / mmc info / mmc part
- mmc read <addr> <blk> <cnt>
- fatls mmc 0:1
- ext4ls mmc 0:2 /boot/

**env:**

- printenv [var]
- setenv var "value"
- saveenv
- env default -f -a    # factory env로 복구

**부팅:**

- bootm <addr>          # uImage/FIT
- booti <kernel> <ramdisk:size> <fdt>   # ARM64 raw Image
- bootz <kernel> <ramdisk:size> <fdt>   # ARM32 zImage
- bootefi <addr> [fdt]  # EFI PE
- reset                 # 재부팅

**진단:**

- go <addr>             # raw 점프 (디버깅 전용)
- bdinfo
- date                  # RTC 확인
- i2c probe             # I2C 버스 스캔
- usb start; usb tree

## 시리즈 마무리

이 시리즈에서 다룬 22편을 한 줄씩 추리면 이렇습니다.

- Ch 1~3: 부트로더가 *무엇*이고, *어떤 단계*로 동작하며, *어떻게 빌드*되는가.
- Ch 4~7: SPL, DDR, 스토리지, 환경 변수.
- Ch 8~11: 콘솔, 부팅 명령, 스크립팅, distro_bootcmd.
- Ch 12~15: 네트워크 부팅, USB, MMC·NAND, FIT 이미지.
- Ch 16~18: Verified Boot, A/B, EFI.
- Ch 19~20: 커널 인계, OTA 프레임워크.
- Ch 21~22: 새 보드 포팅, 디버깅.

부트로더는 *작은 OS*입니다. 메모리 관리도, 드라이버도, 명령 인터프리터도 다 들어 있습니다. 이 시리즈를 다 읽었다면 *임의의 보드의 부팅 흐름*을 처음부터 끝까지 따라갈 수 있는 지도가 생긴 셈입니다.

## 다음 시리즈 추천

부트로더와 가까운 인접 영역의 시리즈입니다.

| 시리즈 | 이어지는 지점 |
|--------|----------------|
| [BSP Development](/blog/embedded/bsp/chapter01-what-is-bsp) | 부트로더 위로 *커널·드라이버·rootfs* 전체 BSP 구성 |
| [Buildroot Practical](/blog/embedded/buildroot/chapter01-problem) | 부트로더·커널·rootfs 빌드 시스템과 OTA 패키징 |
| [Embedded Security](/blog/embedded/embedded-security/chapter01-threat-model) | Secure Boot·HSM·TPM·anti-rollback의 *위 시점* |
| Practical RTOS Internals | 부트로더 없는·또는 minimal한 시스템의 시작 |

BSP 시리즈는 이 시리즈와 *짝*으로 읽으면 좋습니다. 같은 보드를 BSP 관점에서 다시 보면 *부트로더의 산출물이 BSP에 어떻게 흡수되는지*가 더 선명해집니다.

## 자주 하는 실수

디버깅 자체의 실수입니다.

- **DEBUG_UART를 켜 두고 production 빌드를 만든다.** 부팅 직후 잡음이 콘솔에 섞여 양산 출하 시 깨끗하지 않습니다.
- **JTAG으로 *멈춰 놓은 채로* 재부팅한다.** OpenOCD가 잡고 있는 코어는 정상 재부팅을 못 합니다. `reset run` 또는 OpenOCD 종료 후 reboot.
- **`mw`로 reserved 영역에 쓴다.** secure region이나 TZASC 보호 영역에 쓰면 abort. address validation 필수.
- **`go <addr>`을 함부로 쓴다.** 인자·스택·캐시 정리가 전혀 안 된 상태로 점프하니, 디버깅용 raw 진입 외에는 쓰지 않습니다.
- **post-mortem에서 ramoops 영역을 U-Boot이 zero-fill한다.** reserved-memory로 박혀 있어야 보존됩니다.
- **`printenv`만 보고 env 저장은 안 한다.** 변경한 변수는 `saveenv` 전까지 *부팅 사이* 보존되지 않습니다.

## 정리

- DEBUG_UART는 부트로더보다 *이른 시점*에 첫 글자를 끌어내는 마지막 보루입니다.
- bdinfo·md·mw·mtest는 *살아 있는 U-Boot 안에서* 메모리 상태를 직접 본 첫 번째 도구입니다.
- JTAG + OpenOCD + gdb-multiarch는 *DDR 이전 코드*까지 멈춰 잡을 수 있게 해 줍니다.
- post-mortem은 ramoops 영역을 reserved-memory로 박아 *재부팅 후*에도 panic 로그를 읽을 수 있게 합니다.
- 부팅 실패 매트릭스(콘솔 안 나옴 → UART, DDR 실패 → timing, 커널 침묵 → ABI)가 첫 분류의 빠른 지름길입니다.
- env는 *부팅 흐름의 데이터*입니다. 흐름이 막히면 env부터 봅니다.
- 이 시리즈를 마치면 *임의의 임베디드 보드*의 부팅을 추적·진단·수정할 수 있는 도구가 갖춰집니다.

## 관련 항목

- [Ch 21: 새 보드 포팅 — defconfig부터 첫 부팅까지](/blog/embedded/bootloader/chapter21-board-porting)
- [Ch 19: 커널로 인계 — Linux boot ABI](/blog/embedded/bootloader/chapter19-kernel-handoff)
- [BSP Development 시리즈](/blog/embedded/bsp/chapter01-what-is-bsp)
- [Buildroot Practical 시리즈](/blog/embedded/buildroot/chapter01-problem)
- [Embedded Security 시리즈](/blog/embedded/embedded-security/chapter01-threat-model)
- [원문 — U-Boot doc/usage/debug.rst](https://u-boot.readthedocs.io/en/latest/usage/index.html)
