---
title: "Ch 6: Device Tree와 부트로더 — DTB 로딩과 fixup"
date: 2026-05-09T06:00:00
description: "U-Boot가 DTB를 다루는 방식 — control DTB와 OS DTB, fdt 명령, 런타임 fixup."
series: "Bootloader Internals"
seriesOrder: 6
tags: [embedded, bootloader, u-boot, device-tree, dtb]
draft: false
---

## 한 줄 요약

> **"U-Boot은 *두 개의 DTB*를 다룹니다."** — 하나는 *자기 자신의 driver model*이 사용하는 control DTB, 다른 하나는 *커널에 넘기는* OS DTB. 같은 .dtb일 수도 있고 다를 수도 있습니다. 런타임 fixup은 *OS DTB만* 대상입니다.

Device Tree는 *Linux의 발명*입니다만 U-Boot도 *전적으로 차용*합니다. U-Boot 2.0 시대(2014년경)부터 Driver Model이 *DT 기반*으로 동작하기 시작했고, 지금은 *DT 없이 동작하는 U-Boot이 거의 없습니다*. 동시에 U-Boot은 *커널에 넘길 DT*도 다뤄야 하므로 "두 개의 DTB"가 *공존*합니다.

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

같은 .dtb일 수도 있고 *서로 다른 .dtb*일 수도 있습니다. NXP i.MX는 *같은 dtb*를 쓰는 경향이고, 일부 SoC는 *U-Boot용 dtb를 별도*로 빌드합니다.

## control DTB의 세 가지 방법

U-Boot은 *control DTB*를 어떻게 가져오는지에 따라 *세 가지 옵션*이 있습니다.

### CONFIG_OF_EMBED — U-Boot binary에 *embed*

```text
CONFIG_OF_EMBED=y
```

U-Boot binary의 *.data 섹션*에 DTB를 직접 박아 넣습니다. 빌드 시점에 결정됩니다.

```text
u-boot.bin (1.2 MB)
├── .text (코드)
├── .data
│   └── (embedded DTB, 50 KB)
└── ...
```

장점: *DTB가 분리된 파일이 아님*. SPL이 적재할 게 적습니다.
단점: *DTB 수정 시 U-Boot 재빌드*.

### CONFIG_OF_SEPARATE — *별도 binary*

```text
CONFIG_OF_SEPARATE=y
```

U-Boot binary와 DTB가 *별도 파일*입니다. 빌드 후 *concat*합니다.

```text
u-boot.bin (1.2 MB)
u-boot.dtb (50 KB)
u-boot-dtb.bin = u-boot.bin + u-boot.dtb  ← 이걸 부트 미디어에
```

장점: *DTB만 수정해 교체* 가능.
단점: 빌드 단계에서 *concat 필요*.

### CONFIG_OF_BOARD — *런타임에 가져옴*

```text
CONFIG_OF_BOARD=y
```

U-Boot이 *부트 시점에 DTB를 어딘가에서 가져옵니다*. 보통 *전 단계가 메모리에 적재해 준* DTB.

```c
/* 보드 코드가 정의해야 함 */
void *board_fdt_blob_setup(int *err)
{
    /* 0x40000000에 SPL이 적재해 둔 DTB */
    *err = 0;
    return (void *)0x40000000;
}
```

QEMU virt가 이 방식입니다. QEMU가 메모리에 *DTB를 준비해 두고*, U-Boot이 *그 주소를 받아 갑니다*.

## DTB가 *언제* 사용되는가

U-Boot이 control DTB를 *읽는 시점*은 *board_init_f 매우 초반*입니다.

```c
/* common/board_f.c (간략화) */

static const init_fnc_t init_sequence_f[] = {
    setup_mon_len,
    fdtdec_setup,            /* ← DTB 위치 확정 */
    initf_malloc,
    arch_cpu_init,
    initf_dm,                /* ← Driver Model 초기화, DT 파싱 */
    ...
};
```

`fdtdec_setup()`이 *DTB의 위치를 결정*하고, `initf_dm()`이 *DT를 파싱해 driver 인스턴스를 만듭니다*.

```c
/* lib/fdtdec.c */

int fdtdec_setup(void)
{
#if CONFIG_IS_ENABLED(OF_EMBED)
    gd->fdt_blob = __dtb_dt_begin;
#elif CONFIG_IS_ENABLED(OF_SEPARATE)
    gd->fdt_blob = &_end;
#elif CONFIG_IS_ENABLED(OF_BOARD)
    gd->fdt_blob = board_fdt_blob_setup(&err);
#endif
    return 0;
}
```

`gd->fdt_blob`이 *control DTB의 메모리 주소*입니다. 이 시점부터 모든 코드가 *DT를 읽을 수 있습니다*.

## fdt 명령

U-Boot의 명령 인터프리터는 *런타임에 DTB를 조작*할 수 있는 `fdt` 명령군을 제공합니다.

```text
=> help fdt
fdt - flattened device tree utility commands

Usage:
fdt addr <addr>          - Set the fdt location to <addr>
fdt move <fdt> <newaddr> - Copy the fdt to <newaddr>
fdt resize [<extrasize>] - Resize fdt to size + padding
fdt print  <path>        - Recursive print starting at <path>
fdt list   <path>        - Print one level starting at <path>
fdt get value <var> <path> <prop>
fdt set <path> <prop> [<val>]
fdt mknode <path> <node>
fdt rm     <path> [<prop>]
fdt chosen [<start> [<end>]]
fdt fixup
```

### 기본 사용

```text
=> load mmc 0:1 0x43000000 imx8mp-evk.dtb
26580 bytes read in 9 ms (2.8 MiB/s)

=> fdt addr 0x43000000
=> fdt print /
/ {
    compatible = "fsl,imx8mp-evk", "fsl,imx8mp";
    model = "NXP i.MX8MPlus EVK";
    #address-cells = <0x02>;
    #size-cells = <0x02>;

    aliases { ... };
    chosen { ... };
    cpus { ... };
    memory@40000000 { ... };
    ...
};

=> fdt print /chosen
chosen {
    stdout-path = "serial0:115200n8";
    bootargs = "";
};

=> fdt set /chosen bootargs "console=ttymxc1,115200 root=/dev/mmcblk0p2 rw"
=> fdt print /chosen
chosen {
    stdout-path = "serial0:115200n8";
    bootargs = "console=ttymxc1,115200 root=/dev/mmcblk0p2 rw";
};
```

`bootargs`는 *chosen 노드*에 들어갑니다. 커널이 *이 값을 commandline으로* 읽습니다.

### 노드 추가

```text
=> fdt mknode /soc my-extra-device
=> fdt set /soc/my-extra-device compatible "vendor,my-driver"
=> fdt set /soc/my-extra-device reg "<0x30890000 0x1000>"
=> fdt set /soc/my-extra-device status "okay"
```

이렇게 만든 DT를 *커널에 넘기면*, 커널이 *해당 device를 인식*합니다.

## 런타임 fixup

DTB의 *특정 필드*는 *부트 시점에 확정*되어야 합니다. 빌드 시점에 미리 적어 두기 어렵습니다.

| 필드 | 빌드 시 알 수 있는가 |
|------|--------------------|
| 메모리 크기 | 아니오 (보드별, 옵션별로 다름) |
| MAC 주소 | 아니오 (개체별) |
| Serial number | 아니오 (개체별) |
| 부트 디바이스 | 아니오 (boot mode 따라) |
| Kernel cmdline | 아니오 (부트 정책에 따라) |

U-Boot이 *런타임에* 이 필드들을 DT에 *주입*합니다. 이 과정이 *fixup*입니다.

```c
/* arch/arm/lib/bootm-fdt.c */

int arch_fixup_fdt(void *blob)
{
    int ret;

    /* 메모리 크기 fixup */
    ret = fdt_fixup_memory_banks(blob,
        gd->bd->bi_dram[0].start,
        gd->bd->bi_dram[0].size,
        CONFIG_NR_DRAM_BANKS);
    if (ret)
        return ret;

    /* PSCI 노드 fixup */
    fdt_psci(blob);

    return 0;
}
```

`fdt_fixup_memory_banks()`가 DT의 `/memory@xxx` 노드에 *실제 DDR 크기*를 씁니다.

```text
[Build-time DTB]
memory@40000000 {
    device_type = "memory";
    reg = <0 0x40000000 0 0x80000000>;  ← 2GB로 박혀 있음
};

[Runtime fixup 후]
memory@40000000 {
    device_type = "memory";
    reg = <0 0x40000000 0 0x100000000>; ← 4GB로 수정됨 (실제 RAM)
};
```

### MAC 주소 fixup

이더넷 MAC 주소는 *공장 fuse* 또는 *EEPROM*에서 읽어 *DT에 주입*합니다.

```c
/* board/<vendor>/<board>/<board>.c */

int ft_board_setup(void *blob, struct bd_info *bd)
{
    u8 mac[6];
    int offset;

    /* fuse 또는 EEPROM에서 MAC 읽기 */
    read_mac_from_fuse(mac);

    /* DT의 ethernet 노드 찾기 */
    offset = fdt_path_offset(blob, "/soc/ethernet@30be0000");
    if (offset < 0)
        return offset;

    /* mac-address 프로퍼티 설정 */
    fdt_setprop(blob, offset, "mac-address", mac, 6);

    return 0;
}
```

`ft_board_setup()`은 U-Boot이 *커널로 점프 직전*에 호출하는 *훅 함수*입니다. 보드 코드에서 *원하는 fixup*을 자유롭게 합니다.

### chosen 노드 — bootargs와 stdout

`/chosen` 노드는 *커널에 전달하는 명령줄과 console 정보*가 들어갑니다.

```text
/ {
    chosen {
        bootargs = "console=ttymxc1,115200 root=/dev/mmcblk0p2 rw";
        stdout-path = "serial0:115200n8";
        linux,initrd-start = <0x46000000>;
        linux,initrd-end = <0x46f00000>;
    };
};
```

`bootargs`는 U-Boot의 환경 변수 `bootargs`가 *부트 직전에* 여기에 *복사*됩니다.

```c
/* common/fdt_support.c */

void fdt_chosen(void *fdt)
{
    int nodeoffset;
    const char *bootargs;

    nodeoffset = fdt_find_or_add_subnode(fdt, 0, "chosen");

    bootargs = env_get("bootargs");
    if (bootargs)
        fdt_setprop(fdt, nodeoffset, "bootargs", bootargs,
                    strlen(bootargs) + 1);
}
```

`booti`와 `bootm` 명령이 *내부적으로* `fdt_chosen()`을 호출합니다.

## 부트 흐름에서의 DTB

전체 부트에서 DTB가 *어떻게 전파*되는지 봅니다.

![두 DTB 흐름 — SPL/U-Boot의 control DTB와 커널로 넘기는 OS DTB](/images/blog/bootloader/diagrams/chapter06-two-dtb-flow.svg)

control DTB와 OS DTB는 *다른 메모리 위치*에 있습니다.

```text
0x40080000  - U-Boot Proper의 control DTB (embed인 경우 binary 끝에)
0x43000000  - OS DTB (mmc에서 load한 곳)
```

## 같은 DT를 *양쪽에 쓰기*

NXP의 i.MX 8M Plus EVK처럼 *같은 imx8mp-evk.dtb*를 *U-Boot 자기 자신용*과 *커널용* 양쪽에 쓰는 경우가 흔합니다. arch/arm/dts/imx8mp-evk.dts가 *kernel과 U-Boot의 정의를 모두 포함*하도록 작성됩니다.

```dts
/* arch/arm/dts/imx8mp-evk.dts (U-Boot의 dts) */

#include "imx8mp.dtsi"      /* 커널과 공유 */

/ {
    model = "NXP i.MX8MPlus EVK";
    compatible = "fsl,imx8mp-evk", "fsl,imx8mp";

    /* 커널이 모르는 U-Boot 전용 노드 */
    binman: binman { ... };
};

&uart2 {
    pinctrl-names = "default";
    pinctrl-0 = <&pinctrl_uart2>;
    status = "okay";
};
```

`binman` 같은 *U-Boot 전용 노드*는 커널이 *무시*합니다. status를 *okay/disabled*로 양쪽이 *각자 사용하는 device만 활성화*하는 패턴도 일반적입니다.

## U-Boot의 device tree overlay

U-Boot은 *device tree overlay*(`.dtbo`)도 지원합니다. 부트 시점에 *base DT*에 *overlay를 합쳐* 최종 DT를 만들 수 있습니다.

```text
=> load mmc 0:1 0x43000000 imx8mp-evk.dtb
=> load mmc 0:1 0x44000000 my-overlay.dtbo
=> fdt addr 0x43000000
=> fdt resize 8192
=> fdt apply 0x44000000
=> booti 0x40480000 - 0x43000000
```

`fdt apply`가 overlay를 base에 *merge*합니다. 같은 *하드웨어 base + 다른 페리페럴*을 가진 *변종 보드*에 유용합니다.

## fdtoverlay 도구

호스트에서 미리 overlay를 적용한 *결과 .dtb*를 만들 수도 있습니다.

```bash
fdtoverlay -i imx8mp-evk.dtb \
           -o imx8mp-evk-with-camera.dtb \
           camera-overlay.dtbo

# imx8mp-evk-with-camera.dtb를 부트 미디어에 굽기
```

런타임 overlay는 *부트 시간을 늘리므로* 양산용은 *호스트에서 미리 합쳐* 굽는 것이 일반적입니다.

## 자주 하는 실수

### `fdt addr` 안 하고 fdt 명령

```text
=> fdt print /
fdt is not set
```

`fdt addr <주소>`로 *작업 대상 DTB의 위치*를 먼저 지정해야 합니다.

### `fdt resize` 안 하고 *큰 fixup*

DTB는 *내부 공간이 빠듯*하게 잡혀 있습니다. 노드/프로퍼티를 추가하면 *공간 부족*으로 fixup이 *조용히 실패*합니다.

```text
=> fdt resize 4096    ← 4KB 여유 공간 추가
=> fdt set /chosen bootargs "..."
```

### control DTB와 OS DTB *혼동*

U-Boot 명령 인터프리터에서 `fdt set`을 할 때 *어느 DTB*를 수정하는지 헷갈리기 쉽습니다. `fdt addr <주소>`로 *명시*해야 안전.

```text
[control DTB 수정 — 비추천, U-Boot이 동작 중 사용]
=> fdt addr ${fdtcontroladdr}

[OS DTB 수정 — 정상]
=> load mmc 0:1 0x43000000 imx8mp-evk.dtb
=> fdt addr 0x43000000
=> fdt set ...
```

### `booti`의 *3번째 인자*에 `-` 잊음

`booti <kernel_addr> [<initrd>] <fdt_addr>`. initrd가 없으면 *그 자리에 `-`*를 써야 합니다.

```text
=> booti 0x40480000 0x43000000     ← 잘못. fdt가 initrd로 해석됨

=> booti 0x40480000 - 0x43000000   ← OK
```

### MAC 주소 fixup이 *bootcmd 안에서* 실행 안 됨

`ft_board_setup()`은 *bootm/booti 직전*에 호출됩니다. 그 *이전에* `fdt print`로 본 DTB에는 MAC fixup이 *아직 안 들어가 있을 수 있습니다*.

```bash
=> fdt print /soc/ethernet@30be0000
ethernet@30be0000 {
    mac-address = [00 00 00 00 00 00];   # 아직 fixup 전
};
=> booti ...
# 부팅 후 ip a → 실제 MAC이 들어가 있음
```

### `fdt_get_property()` vs `fdt_getprop()`

U-Boot 코드에서 *둘 다* 보이지만 *반환 타입이 다름*. `fdt_getprop()`이 *데이터 포인터*를 반환합니다. 새 코드는 `fdt_getprop()` 권장.

### 빌드 시 `dtc not found`

```text
HOSTCC scripts/dtc/dtc.c
make: dtc: Command not found
```

Ubuntu/Debian: `sudo apt install device-tree-compiler`. U-Boot이 *호스트 dtc*도 빌드해 두지만 일부 환경에서는 *시스템 dtc*를 요구합니다.

## 정리

- U-Boot은 *control DTB*(자기 자신용)와 *OS DTB*(커널용)의 *두 DT*를 다룹니다.
- control DTB는 `CONFIG_OF_EMBED`(embed), `CONFIG_OF_SEPARATE`(별도 binary), `CONFIG_OF_BOARD`(런타임) 중 한 방식으로 얻습니다.
- `gd->fdt_blob`이 control DTB의 메모리 주소입니다. `fdtdec_setup()`이 board_init_f 초반에 확정.
- `fdt` 명령군은 *런타임에 DTB를 조작*합니다. `fdt addr`로 대상 DTB를 지정한 뒤 `fdt set`, `fdt mknode` 등 사용.
- 런타임 *fixup*은 *빌드 시점에 모를 정보*(메모리 크기, MAC, serial)를 *DT에 주입*합니다. `ft_board_setup()`이 보드 훅.
- `/chosen` 노드는 *bootargs와 stdout-path*가 들어갑니다. 환경 변수 `bootargs`가 자동으로 복사됩니다.
- `fdt apply`로 *device tree overlay*를 런타임에 합칠 수 있습니다. 양산은 *호스트에서 미리 합치는* 편이 일반적.
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
- [원문 — Device Tree Specification](https://www.devicetree.org/specifications/)
- [원문 — U-Boot Device Tree Control](https://u-boot.readthedocs.io/en/latest/develop/devicetree/control.html)
