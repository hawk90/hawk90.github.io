---
title: "새 보드 U-Boot 포팅 실전 — defconfig 작성부터 첫 부팅까지"
slug: "embedded/bootloader/chapter21-board-porting"
date: 2026-05-09T09:21:00
description: "U-Boot에 새 보드를 추가하는 전체 워크플로 — configs·board·dts·MAINTAINERS."
series: "Bootloader Internals"
seriesOrder: 21
tags: [embedded, bootloader, u-boot, porting, board]
draft: false
topics: ["embedded"]
---

새 보드 U-Boot 포팅은 공통 작업 순서를 참고할 수 있지만, 파일 layout, Kconfig symbol, SPL 단계, DDR 초기화와 부팅 media는 SoC와 선택한 U-Boot tag에 따라 달라집니다. 이 장은 mainline U-Boot 포팅을 위한 checklist이며 특정 i.MX board의 완성된 port나 실행 결과가 아닙니다.

## 한 줄 요약

**가장 가까운 mainline board port를 조사한 뒤, defconfig·Kconfig/Kbuild·DTS·early-phase device·SoC firmware/DDR 의존성을 target에 맞춰 정리합니다.** Reference board를 통째로 복사하거나 generic `dd` 명령으로 첫 부팅을 시도하는 절차는 안전한 porting recipe가 아닙니다.

## 시작 — 유사 port 조사

같은 SoC family, DRAM part/topology, PMIC, boot media, clock/pinmux와 security firmware가 비슷한 in-tree board를 후보로 찾습니다. SoC가 같다는 것만으로 DDR timing이나 flash layout을 복사해도 된다는 뜻은 아닙니다.

```bash
# U-Boot source tree에서 후보 파일과 DT/Kconfig 참조를 찾아 비교
rg -n "<soc-or-board-id>" configs/ board/ arch/arm/dts/
```

실제 port 전에 pinned U-Boot tag, vendor BSP version, SoC reference manual, board schematic, DRAM/PMIC datasheet 및 ROM boot requirements를 기록합니다. 이 환경에는 특정 board schematic이나 SoC documentation이 제공되지 않아 실제 target design을 검증하지 않았습니다.

## Board port 구성 요소

필요한 경로는 architecture, SoC family와 기존 tree 구조에 따라 다릅니다. 보통 defconfig, board-specific Kconfig/Kbuild, board DTS/U-Boot DTS additions, optional board code, documentation, MAINTAINERS가 관련됩니다. 모든 port에서 `include/configs/<board>.h`나 SoC Kconfig 파일을 새로 만드는 것은 아닙니다. U-Boot system configuration 문서는 board header를 last resort로 두고 Kconfig/device tree를 우선하도록 안내합니다.

U-Boot의 board best practices는 platform defconfig를 `make savedefconfig`로 생성하고 Kconfig fragments를 top-level `configs/` 대신 board directory에 두도록 권고합니다. Standard Boot 지원도 고려할 항목입니다.

```text
# Conceptual tree only; exact location and files vary by U-Boot tag/platform
board/<vendor>/<board>/
  Kconfig
  MAINTAINERS
  <board-specific-source-if-needed>
configs/<board>_defconfig
arch/<arch>/dts/<board>.dts
```

보드 코드와 hooks는 실제 초기화 sequence/source를 먼저 확인한 뒤 추가합니다. `board_init()`, `dram_init()`, SPL `board_init_f()` 구현을 다른 SoC에서 이름만 맞춰 복사하면 안 됩니다.

## defconfig와 Kconfig

기존 board의 defconfig를 비교 자료로 쓸 수는 있지만, 해당 파일을 그대로 복사하는 대신 config dependencies와 source paths를 확인합니다. Kconfig symbol은 pinned tree에서 정의 여부, dependency, select/imply effect를 확인한 뒤 설정합니다. `CONFIG_SYS_TEXT_BASE`, `CONFIG_DEFAULT_DEVICE_TREE`, boot command 및 SPL options는 모든 SoC에 공통인 checklist가 아닙니다.

대표적인 build workflow는 다음과 같지만 `<board>_defconfig`, cross compiler와 output path는 실제 tree가 제공하는 target에 맞춰야 합니다.

```bash
make <board>_defconfig
make savedefconfig
make O=<build-dir> CROSS_COMPILE=<toolchain-prefix>
```

U-Boot v2025.01 board-port guidance, system configuration 및 Kconfig 문서를 읽고 defconfig diff를 review합니다. 이 글의 placeholder 명령은 실행하지 않았으며 여기에는 해당 build tree/toolchain이 없습니다.

## Device tree와 SPL/TPL 단계

Linux/U-Boot 공유 DTS와 U-Boot 전용 DTS additions의 사용 방식은 architecture/tree에 따라 다릅니다. U-Boot SPL/TPL은 build 중 일부 DT node를 필터링할 수 있습니다. `bootph-pre-ram`, `bootph-pre-sram`, `bootph-all`은 노드가 특정 phase에 포함되어야 하는지 표시하며, 필요한 parent/bus dependency와 driver Kconfig도 함께 맞아야 합니다. `bootph-pre-ram` 하나만 넣는 것으로 device를 사용할 수 있다는 보장은 없습니다.

```dts
/* Illustration: use only when the pinned tree binding and phase need it */
&uartX {
    bootph-pre-ram;
};
```

SPL에서 해당 노드가 실제로 포함되고 driver가 연결됐는지는 생성된 SPL DT와 build output으로 확인합니다. 이 기사에서는 target DT, generated SPL tree 또는 driver binding을 실행 확인하지 않았습니다.

## DRAM과 early serial

SPL DRAM path는 controller/PHY, memory part, board routing, voltage/clock, vendor firmware/calibration, training result와 pinned source에 의존합니다. Reference-board timing source나 `dram_timing` C structure를 다른 board에 그대로 넣지 않습니다. 구체 API와 init order는 target SoC port를 따라야 하므로, 이 글은 generic `board_init_f()` pseudo-implementation을 제시하지 않습니다.

Early console 역시 UART instance, clock, pinmux, address mapping, phase-specific driver와 CONFIG_DEBUG_UART settings에 의존합니다. “UART pinmux/clock이 켜지지 않았을 수 있다”는 진단 가설이지, 모든 첫 출력 실패의 원인을 뜻하지는 않습니다.

## Build와 실제 첫 부팅

먼저 isolated build host에서 pinned tree와 target defconfig를 build하고, expected artifacts와 ROM packaging requirements를 확인합니다. `u-boot.bin`, SPL image, signed/container image의 이름과 구성은 platform마다 다릅니다.

기존 기사의 `flash.bin`·`seek=33` 및 `/dev/sdb` write 예는 특정 ROM/media 조건을 근거 없이 보편화하고 실수로 host disk를 덮을 위험이 있어 제거했습니다. 실제 flashing은 보드 제조사의 recovery method, exact device identity, image layout, backup와 recovery plan을 확인한 뒤 대상별 절차로 수행해야 합니다. 여기서는 어떤 media/board write도 하지 않았습니다.

## Boot 단계별 관측

아래 그림은 조사 순서를 나타내는 개념도입니다. UART/ROM→SPL→DRAM→U-Boot proper→OS handoff 단계와 실제 console messages는 SoC/board/boot source에 따라 달라집니다.

![새 보드 first-boot 진단 단계의 개념도](/images/blog/bootloader/diagrams/chapter21-first-boot-stages.svg)

문제 기록에는 board revision, SoC/DRAM/PMIC, boot strap state, U-Boot tag/commit, defconfig, build artifacts, serial adapter/baud, 전원 조건 및 정확한 마지막 출력이 필요합니다. Synthetic transcript를 실행 증거처럼 사용하지 않습니다. 이 환경에서 보드 로그나 first-boot result는 수집하지 않았습니다.

## MAINTAINERS와 upstream 제출

MAINTAINERS entry와 file patterns, patch organization은 pinned U-Boot tree의 convention을 확인합니다. 이름과 주소는 실제 maintainer의 동의를 받아 입력하며 template의 연락처를 그대로 사용하지 않습니다. Device tree, board support, config와 docs 변경을 검토 가능한 단위로 나눌 수 있지만 project review가 요구하는 순서가 우선입니다.

```text
BOARD <vendor> <board>
M: <maintainer name> <maintainer email>
S: Maintained
F: board/<vendor>/<board>/
F: configs/<board>_defconfig
```

## 자주 하는 실수

- **same SoC라며 DDR timing을 복사한다.** DRAM part, topology, layout, PMIC/clock과 training evidence를 board documentation으로 확인해야 합니다.
- **Kconfig symbol을 근거 없이 추가한다.** pinned tree의 Kconfig/Kbuild path와 dependency를 대조하고 defconfig를 generated config로 검증합니다.
- **SPL DTS에서 필요한 node/driver 의존성을 누락한다.** phase property와 parent node, Kconfig, SPL build output을 함께 확인합니다.
- **board API 이름만 보고 초기화 순서를 가정한다.** 해당 architecture/SoC의 current port와 init sequence를 따라갑니다.
- **가공한 first-boot output을 증거로 남긴다.** 실제 target log와 build identity를 분리해 기록합니다.
- **명령 예시의 media address를 그대로 복사한다.** image format, ROM layout과 recovery route가 보드별로 다르므로 generic host write command를 쓰지 않습니다.

## 정리

- Reference port는 조사 출발점이지 복사해도 되는 보장된 template이 아닙니다.
- Defconfig, Kconfig/Kbuild, DTS/SPL phase, DDR/firmware와 ROM packaging은 pinned tag와 board source를 기준으로 확인합니다.
- U-Boot best practice에 따라 defconfig는 `savedefconfig`로 정리하고 Standard Boot와 documentation도 검토합니다.
- First-boot 진단은 단계 구분과 실제 log/build identity를 기록하되, target evidence 없이 성공했다고 주장하지 않습니다.
- 이 문서에는 특정 board port, build, flash write 또는 first-boot runtime 결과가 없습니다.

## 다음 장 예고

다음은 이 시리즈의 22편입니다. 부팅 실패를 진단하는 방법은 UART/SPL/DDR/relocation/OS handoff의 실제 증거를 모으고 target-specific failure matrix로 좁혀 봅니다.

## 관련 항목

- [Ch 20: RAUC / SWUpdate](/blog/embedded/bootloader/chapter20-rauc-swupdate)
- [Ch 22: U-Boot 디버깅](/blog/embedded/bootloader/chapter22-debugging)
- [BSP Development Ch 1: What is BSP](/blog/embedded/bsp/chapter01-what-is-bsp)
- [U-Boot v2025.01 Board Port Best Practices](https://docs.u-boot.org/en/v2025.01/develop/board_best_practices.html)
- [U-Boot v2025.01 System Configuration](https://docs.u-boot.org/en/v2025.01/develop/system_configuration.html)
- [U-Boot v2025.01 Generic xPL/SPL Framework](https://docs.u-boot.org/en/v2025.01/develop/spl.html)
- [U-Boot v2025.01 Driver Model design: pre-relocation support](https://docs.u-boot.org/en/v2025.01/develop/driver-model/design.html)
