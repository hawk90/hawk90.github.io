---
title: "Device Tree DTB 부트로더 처리 — 로딩 시점과 fixup 메커니즘 추적"
slug: "embedded/bootloader/chapter06-device-tree"
date: 2026-05-09T09:06:00
description: "U-Boot가 DTB를 다루는 방식 — control DTB와 OS DTB, fdt 명령, 런타임 fixup."
series: "Bootloader Internals"
seriesOrder: 6
tags: [embedded, bootloader, u-boot, device-tree, dtb]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **U-Boot은 control DTB와 OS DTB를 각각 다룰 수 있습니다.** 두 역할은 다른 DTB를 쓸 수도 있고, 같은 DTB를 공유할 수도 있습니다.

Device Tree는 U-Boot과 Linux 양쪽에서 사용하는 firmware·OS 데이터 형식입니다. U-Boot은 설정과 보드 지원에 이를 활용하며, 자기 driver model용 control DTB와 커널에 넘기는 OS DTB를 각각 다룰 수 있습니다. 이 두 DTB는 같을 수도 다를 수도 있습니다.

## control DTB vs OS DTB

핵심 개념을 먼저 정리합니다.

**control DTB**

- U-Boot 자기 자신의 driver model이 사용
- U-Boot binary 내부에 embed되거나, 별도 binary
- U-Boot의 MMC, UART, GPIO 등을 정의

**OS DTB**

- 커널에 넘기는 DT
- 부트 미디어의 파일(예: `imx8mp-evk.dtb`)
- 커널의 모든 device를 정의
- U-Boot이 런타임에 fixup 가능

같은 .dtb일 수도 있고 서로 다를 수도 있습니다. 특정 SoC에서 어느 방식을 쓰는지는 board build와 boot flow로 확인해야 합니다.

![control DTB는 OF_EMBED·OF_SEPARATE·OF_BOARD 중 한 경로로 얻어 gd->fdt_blob을 거쳐 driver model이 쓰고, OS DTB는 부트 미디어의 파일을 fdt 명령과 runtime fixup으로 다듬은 뒤 booti로 커널에 넘기는 두 흐름](/images/blog/bootloader/diagrams/chapter06-two-dtb-flow.svg)

그림의 왼쪽은 U-Boot 자신이 쓰는 control DTB, 오른쪽은 커널에 넘기는 OS DTB의 흐름이며, 아래 절에서 두 흐름을 차례로 살펴봅니다.

## control DTB를 제공하는 구성

U-Boot은 Kconfig에 따라 여러 상호 배타적인 경로로 control DTB를 얻을 수 있습니다. 여기서는 공식 v2024.04 문서에 있는 세 경로를 개략적으로 소개합니다.

### CONFIG_OF_EMBED — U-Boot binary에 *embed*

```text
CONFIG_OF_EMBED=y
```

이 구성에서는 control DTB가 U-Boot image에 포함됩니다. 포함 위치와 layout은 빌드 결과로 확인해야 합니다.

```text
U-Boot image (구성·크기는 빌드에 따라 다름)
└── embedded control DTB
```

이 옵션은 control DTB를 U-Boot image에 embed합니다. debug/development 용도 등 제약과 권장 여부는 선택한 U-Boot 버전 문서를 확인하세요.

### CONFIG_OF_SEPARATE — *별도 binary*

```text
CONFIG_OF_SEPARATE=y
```

빌드 과정에서 DTB는 별도 `u-boot.dtb`와 `u-boot-nodtb.bin`로 만들어지고, 결합 결과는 `u-boot.bin`입니다. `SPL_FRAMEWORK`가 활성화된 설정에서는 `u-boot.img`도 생성될 수 있습니다.

```text
u-boot-nodtb.bin + u-boot.dtb → u-boot.bin
(SPL_FRAMEWORK 설정에서는 u-boot.img도 가능)
```

어떤 이미지 파일을 부트 미디어에 배치할지는 보드의 boot flow와 빌드 산출물을 확인하세요. 일반적인 `OF_SEPARATE` 결과 이름은 `u-boot.bin`입니다.

DTB는 빌드 산출물 결합에 사용됩니다. 플래시할 파일과 업데이트 단위는 보드별 패키징을 확인해야 합니다.

### CONFIG_OF_BOARD — *런타임에 가져옴*

```text
CONFIG_OF_BOARD=y
```

U-Boot이 runtime에 control DTB를 공급받는 board-specific 경로입니다. 입력과 전달 방식은 해당 구현에서 확인해야 합니다.



예를 들어 일부 에뮬레이터·플랫폼에서는 이전 단계가 DTB를 메모리에 전달할 수 있습니다. 특정 보드의 선택된 Kconfig와 코드를 확인하지 않고 `OF_BOARD`라고 단정하지 마세요.

## DTB가 *언제* 사용되는가

control DTB는 U-Boot의 driver model 및 board 설정에서 사용됩니다. 정확한 초기화 함수 순서와 조건은 고정된 U-Boot tag의 소스에서 확인해야 합니다.



`gd->fdt_blob`은 현재 control DTB를 참조하는 전역 상태입니다. 각 subsystem이 DT를 언제 읽는지는 초기화 경로에 따라 달라집니다.

## fdt 명령

U-Boot shell의 `fdt` command family는 선택한 FDT를 조회·수정합니다. 정확한 subcommand는 대상 U-Boot version에서 `help fdt`와 command documentation으로 확인해야 합니다.

```text
# 형태를 보여주는 예시이며 U-Boot에서 실행하지 않음
fdt addr <working_fdt_address>
fdt print /chosen
fdt set /chosen bootargs <bootargs_value>
```

작업 전에 주소가 control DTB인지 OS DTB인지 확인하고, 명령 반환값과 수정 결과를 검토하세요. 노드 추가만으로 커널 드라이버 지원이 생기지는 않습니다. 새 node는 device-tree binding, address/size cells, OS driver와 맞아야 합니다.

## 런타임 fixup

U-Boot의 Linux boot flow는 구성에 따라 OS DTB에 bootargs, memory, initrd 또는 board-specific 정보를 반영할 수 있습니다. 어떤 항목이 실제 적용되는지는 board code, architecture hooks, boot command와 U-Boot version에 따라 달라집니다. 이 문서는 특정 hook의 signature나 호출 시점을 공통 규칙으로 단정하지 않습니다.

Device Tree의 각 `reg` cell은 32-bit입니다. 부모 노드의 `#address-cells`와 `#size-cells`가 각각 2인 경우 아래는 시작 주소 `0x40000000`, 크기 4 GiB를 나타내는 cell 값 예시입니다. 이는 특정 보드의 실제 RAM 구성이라는 뜻은 아닙니다.

```dts
#address-cells = <2>;
#size-cells = <2>;

memory@40000000 {
    device_type = "memory";
    reg = <0x0 0x40000000 0x1 0x0>;
};
```

각 보드의 실제 memory banks는 memory map, reserved-memory regions, firmware handoff 및 OS DTB를 대조해야 합니다. MAC 주소와 `/chosen` 정보도 hook·property·호출 조건이 보드별이므로 구현을 확인하세요.

## 부트 흐름에서의 DTB

control DTB와 OS DTB는 서로 다른 메모리 위치와 생명주기를 가질 수 있습니다. 빌드 산출물 및 OS boot command에서 실제 주소와 전달 대상이 무엇인지 확인하세요.

U-Boot의 device-tree control 문서에 따르면 `OF_EMBED`는 control DTB를 U-Boot image에 포함합니다. `OF_SEPARATE`는 `u-boot.dtb`와 `u-boot-nodtb.bin`을 만들고 결합 산출물은 `u-boot.bin`이며, `SPL_FRAMEWORK` 설정에서는 `u-boot.img`도 생성될 수 있습니다. `OF_BOARD`는 보드별 routine이 runtime에 DTB를 제공합니다. 이 외에도 bloblist나 sandbox 등 별도 경로가 있으므로 실제 board Kconfig를 확인해야 합니다.

하나의 DT source를 U-Boot와 Linux가 공유할 수 있지만, 각 프로젝트가 필요로 하는 property와 binding은 다를 수 있습니다. U-Boot는 `*-u-boot.dtsi` 등으로 보드별 tweak를 추가할 수 있습니다. OS가 이해하지 못하는 항목이나 binding 차이가 없는지 target DT를 확인하세요.

U-Boot은 설정에 따라 `fdt apply`로 overlay를 적용할 수 있습니다. overlay의 target/reference와 작업 중인 FDT의 여유 공간을 확인해야 하며, runtime 적용과 사전 결합 중 어느 방식을 쓸지는 제품의 boot/update 정책으로 정합니다. 호스트 `fdtoverlay`는 별도 staging 파일에서 시험할 수 있습니다.

## 자주 하는 실수

- `fdt` 명령 전에 작업 대상 FDT를 지정하지 않거나, control DTB와 OS DTB를 혼동하는 경우
- overlay나 property를 추가하면서 buffer 용량과 command 실패를 확인하지 않는 경우
- `booti`에서 kernel, optional initrd, FDT 인자의 순서를 혼동하는 경우
- 보드별 MAC·memory fixup이 모든 boot path에서 같은 hook으로 적용된다고 가정하는 경우
- `reg` cell 수를 부모의 `#address-cells`와 `#size-cells`에 맞추지 않는 경우

재현할 때는 실제 target DTB를 복사해 작업하고, U-Boot shell 또는 `fdtoverlay`의 반환 코드와 결과 DTB를 검증하세요. 이 글의 명령 패턴은 보드에서 실행한 transcript가 아닙니다.

## 정리

- U-Boot은 *control DTB*(자기 자신용)와 *OS DTB*(커널용)의 *두 DT*를 다룹니다.
- control DTB는 `OF_EMBED`, `OF_SEPARATE`, `OF_BOARD` 등 상호 배타적인 구성에서 얻을 수 있습니다. 선택 가능한 옵션은 board Kconfig에 따릅니다.
- `gd->fdt_blob`은 현재 control DTB를 가리킵니다. 정확한 초기화 지점은 해당 버전·보드의 소스에서 확인합니다.
- `fdt` 명령군은 *런타임에 DTB를 조작*합니다. `fdt addr`로 대상 DTB를 지정한 뒤 `fdt set`, `fdt mknode` 등 사용.
- 런타임 fixup은 OS DTB에 동적 정보를 넣을 수 있습니다. 사용 hook과 대상 필드는 보드·boot path에 따라 다릅니다.
- `/chosen`은 OS에 전달되는 bootargs, stdout-path 또는 initrd 정보를 담을 수 있습니다. 생성·복사 시점은 board boot path에서 확인합니다.
- 설정과 command 지원이 갖춰진 경우 `fdt apply`로 overlay를 적용할 수 있습니다. 운용 방식은 제품 요구에 따라 선택합니다.
- `booti <kernel> - <fdt>`처럼 *initrd 자리에 `-`*를 꼭 넣습니다.

## 다음 편

[Ch 7: Driver Model — uclass, driver, device](/blog/embedded/bootloader/chapter07-driver-model)에서는 U-Boot의 *driver model*을 정리합니다. control DTB가 *어떻게 driver 인스턴스로 변환*되는지, uclass·driver·udevice 삼각 구조와 `compatible` 기반 binding을 봅니다.

## 관련 항목

- [Ch 3: 빌드 시스템](/blog/embedded/bootloader/chapter03-build-system)
- [Ch 5: Falcon Mode](/blog/embedded/bootloader/chapter05-falcon-mode)
- [Ch 7: Driver Model](/blog/embedded/bootloader/chapter07-driver-model)
- [Ch 8: board_init_f vs board_init_r](/blog/embedded/bootloader/chapter08-board-init)
- [Ch 15: FIT Image](/blog/embedded/bootloader/chapter15-fit-image)
- [Ch 19: Kernel 인계](/blog/embedded/bootloader/chapter19-kernel-handoff)
- [BSP Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [Devicetree Specification](https://devicetree-specification.readthedocs.io/en/stable/devicetree-basics.html)
- [U-Boot v2024.04 Device Tree Control](https://docs.u-boot.org/en/v2024.04/develop/devicetree/control.html)
