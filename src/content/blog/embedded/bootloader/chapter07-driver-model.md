---
title: "U-Boot Driver Model 내부 — uclass·driver·device 추상화 구조"
slug: "embedded/bootloader/chapter07-driver-model"
date: 2026-05-09T09:07:00
description: "U-Boot Driver Model — uclass·driver·udevice 구조와 DT 기반 driver binding."
series: "Bootloader Internals"
seriesOrder: 7
tags: [embedded, bootloader, u-boot, driver-model]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

U-Boot Driver Model은 uclass(같은 인터페이스의 장치 묶음), driver(코드), device(`struct udevice`, 드라이버의 인스턴스) 셋으로 장치를 다룹니다. 장치가 생기는 단계(bind)와 하드웨어를 깨우는 단계(probe)는 따로 있고, U-Boot는 probe를 쓰일 때까지 미룹니다. QEMU의 `qemu_arm64`에서 `dm tree`를 찍어 보면 장치 대부분이 bind만 된 상태입니다. NVMe는 `nvme scan`을 한 뒤에야 `[ + ]`가 되고 그 아래 블록 장치가 생깁니다. 이 장은 그 차이를 `dm` 명령과 실제 드라이버 선언으로 따라갑니다.

## 세 요소

U-Boot v2024.04 `doc/develop/driver-model/design.rst`의 정의입니다.

| 요소 | 문서의 정의 |
| --- | --- |
| Uclass | "a group of devices which operate in the same way" — 같은 인터페이스로 접근 |
| Driver | "some code which talks to a peripheral and presents a higher-level interface to it" |
| Device | "an instance of a driver, tied to a particular port or peripheral" |

QEMU U-Boot는 부팅 배너에서 이미 규모를 알려 줍니다.

```text
Core:  51 devices, 14 uclasses, devicetree: board
```

`dm uclass serial`은 serial uclass에 속한 장치를 보여 줍니다.

```text
=> dm uclass serial
uclass 108: serial
0   * pl011@9000000 @ 7e698d10, seq 0
```

장치 하나(`pl011@9000000`)가 seq 0으로 있고, `*`는 현재 콘솔로 쓰이는 장치입니다. `@ 7e698d10`은 relocation 뒤 RAM에 있는 `struct udevice`의 주소입니다.

![uclass 하나에 MMC controller instance 두 개가 소속되고 두 instance가 같은 driver를 쓰는 관계, 그리고 DT node의 compatible이 bind와 probe를 거쳐 사용 가능한 device가 되는 순서](/images/blog/bootloader/diagrams/chapter07-driver-model.svg)

## 드라이버 선언 — PL011 UART

위 장치를 만든 드라이버는 `drivers/serial/serial_pl01x.c`에 있습니다.

```c
static const struct udevice_id pl01x_serial_id[] ={
	{.compatible = "arm,pl011", .data = TYPE_PL011},
	{.compatible = "arm,pl010", .data = TYPE_PL010},
	{}
};
```

```c
U_BOOT_DRIVER(serial_pl01x) = {
	.name	= "serial_pl01x",
	.id	= UCLASS_SERIAL,
#if CONFIG_IS_ENABLED(OF_REAL)
	.of_match = of_match_ptr(pl01x_serial_id),
	.of_to_plat = of_match_ptr(pl01x_serial_of_to_plat),
#endif
	.plat_auto	= sizeof(struct pl01x_serial_plat),
	.probe = pl01x_serial_probe,
	.ops	= &pl01x_serial_ops,
	.flags = DM_FLAG_PRE_RELOC,
	.priv_auto	= sizeof(struct pl01x_priv),
};
```

| 필드 | 이 드라이버에서 | 뜻 |
| --- | --- | --- |
| `.id` | `UCLASS_SERIAL` | 소속 uclass |
| `.of_match` | `arm,pl011`, `arm,pl010` | DT `compatible`과 맞출 문자열, `.data`로 변종 구분 |
| `.of_to_plat` | `pl01x_serial_of_to_plat` | DT 속성을 plat 구조체로 옮김 (probe 직전) |
| `.probe` | `pl01x_serial_probe` | 하드웨어 초기화 |
| `.ops` | `pl01x_serial_ops` | uclass가 부르는 함수 표 (putc, getc 등) |
| `.flags` | `DM_FLAG_PRE_RELOC` | relocation 전에도 bind |
| `*_auto` | 구조체 크기 | driver model이 대신 할당 |

이 드라이버와 짝이 되는 DT 노드는 QEMU가 만든 control DTB에 있습니다.

```text
=> fdt addr $fdtcontroladdr
Working FDT set to 7e596d90
=> fdt print /pl011@9000000
pl011@9000000 {
	clock-names = "uartclk", "apb_pclk";
	clocks = <0x00008000 0x00008000>;
	interrupts = <0x00000000 0x00000001 0x00000004>;
	reg = <0x00000000 0x09000000 0x00000000 0x00001000>;
	compatible = "arm,pl011", "arm,primecell";
};
```

`compatible`의 첫 문자열 `arm,pl011`이 `.of_match`와 맞습니다. `dm compat`는 빌드에 들어간 드라이버마다 이 표를 보여 줍니다. 이 빌드에서는 드라이버 52개가 나왔고, 그중 PL011 줄은 이렇습니다.

```text
serial_pl01x          arm,pl011
```

## DT가 없는 bind — PCI 장치

모든 장치가 DT `compatible`로 bind되는 것은 아닙니다. `dm compat`에서 `nvme` 줄은 compatible이 비어 있습니다. NVMe 드라이버(`drivers/nvme/nvme_pci.c`)는 DT 대신 PCI class 코드로 짝을 찾습니다.

```c
U_BOOT_DRIVER(nvme) = {
	.name	= "nvme",
	.id	= UCLASS_NVME,
	.bind	= nvme_bind,
	.probe	= nvme_probe,
	.priv_auto	= sizeof(struct nvme_dev),
};

struct pci_device_id nvme_supported[] = {
	{ PCI_DEVICE_CLASS(PCI_CLASS_STORAGE_EXPRESS, ~0) },
	{}
};

U_BOOT_PCI_DEVICE(nvme, nvme_supported);
```

PCI bus를 scan해서 class가 NVMe인 장치를 찾으면 이 드라이버가 bind됩니다([Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)). design.rst의 "Bind stage"도 발견 방법을 둘로 적습니다. `U_BOOT_DRVINFO()` 정의를 훑는 방법과, DT 노드의 compatible을 `of_match` 표로 찾는 방법입니다. PCI처럼 버스가 직접 찾아 bind하는 경로는 그 버스 uclass가 따로 갖습니다.

## bind와 probe는 따로 일어난다

QEMU에 NVMe 장치 하나를 붙이고 부팅 직후 `dm tree`를 찍었습니다(virtio-mmio 32개 줄 생략).

```text
=> dm tree
 Class     Index  Probed  Driver                Name
-----------------------------------------------------------
 root          0  [ + ]   root_driver           root_driver
 rsa_mod_ex    0  [   ]   mod_exp_sw            |-- mod_exp_sw
 firmware      0  [   ]   psci                  |-- psci
 sysreset      0  [   ]   psci-sysreset         |   `-- psci-sysreset
 simple_bus    0  [   ]   simple_bus            |-- platform-bus@c000000
 qfw           0  [ + ]   qfw_mmio              |-- fw-cfg@9020000
 bootdev       0  [   ]   qfw_bootdev           |   `-- fw-cfg@9020000.bootdev
 pci           0  [ + ]   pci_generic_ecam      |-- pcie@10000000
 pci_generi    0  [   ]   pci_generic_drv       |   |-- pci_0:0.0
 nvme          0  [   ]   nvme                  |   `-- nvme#0
 rtc           0  [   ]   rtc-pl031             |-- pl031@9010000
 serial        0  [ + ]   serial_pl01x          |-- pl011@9000000
 mtd           0  [ + ]   cfi_flash             |-- flash@0
 bootstd       0  [   ]   bootstd_drv           `-- bootstd
 ...
```

`[ + ]`가 probe된 장치이고 `[   ]`는 bind만 된 장치입니다. 콘솔(PL011), 환경 변수를 읽은 flash(CFI), PCI 버스, fw-cfg는 이미 쓰였으니 probe됐습니다. RTC, PSCI, NVMe는 아직 누구도 쓰지 않아서 `struct udevice`만 있습니다. `nvme scan`을 한 뒤 같은 줄은 이렇게 바뀝니다.

```text
=> nvme scan
=> dm tree
 nvme          0  [ + ]   nvme                  |   `-- nvme#0
 blk           0  [ + ]   nvme-blk              |       |-- nvme#0.blk#1
 bootdev       1  [   ]   nvme_bootdev          |       `-- nvme#0.blk#1.bootdev
```

NVMe가 probe되자 그 아래 블록 장치(`nvme#0.blk#1`)와 bootdev가 새로 생겼습니다. design.rst의 "Activation/probe" 절이 이 동작을 설명합니다. "To save resources devices in U-Boot are probed lazily. U-Boot is a bootloader, not an operating system." 대부분의 장치는 U-Boot가 한 번 도는 동안 한 번도 쓰이지 않기 때문입니다.

bind 단계에서 드라이버의 `bind()`가 할 수 있는 일도 정해져 있습니다. 같은 문서는 `bind()`가 "should not scan the device tree node, not initialise hardware, nor set up structures or allocate memory"라고 적습니다. DT 속성을 읽는 것은 `of_to_plat()`, 하드웨어 초기화는 `probe()`의 일입니다. 바로 probe하고 싶은 드라이버는 `DM_FLAG_PROBE_AFTER_BIND`(`include/dm/device.h`, 1 << 15)를 쓸 수 있습니다.

## relocation 전과 SPL

relocation 전에는 메모리가 적어서 모든 장치를 bind하지 않습니다. design.rst의 "Pre-Relocation Support" 절입니다.

> Only drivers marked with DM_FLAG_PRE_RELOC or the device tree 'bootph-all' property are initialised prior to relocation.

PL011 드라이버가 `DM_FLAG_PRE_RELOC`를 가진 것은 relocation 전부터 콘솔이 필요하기 때문입니다. 같은 문서는 두 방법의 차이도 적습니다. 플래그를 쓰면 그 드라이버를 쓰는 장치가 모두 bind되어 메모리를 더 쓰고, DT의 `bootph-*` 속성은 노드 단위로 고를 수 있습니다. DT 없이 `U_BOOT_DRVINFO()`로 선언한 장치는 이 플래그가 유일한 방법입니다.

SPL에서는 이 선택이 DT 자체에 반영됩니다. [Ch 6](/blog/embedded/bootloader/chapter06-device-tree)에서 본 대로 imx8mm SPL의 DTB에는 `bootph-pre-ram`이 붙은 노드 42개만 남습니다. 거기 없는 장치는 SPL의 `dm tree`에 나타날 수 없습니다.

## 새 드라이버를 붙일 때의 확인 순서

| 증상 | 확인 | 이 장의 도구 |
| --- | --- | --- |
| `dm tree`에 장치가 없음 | 드라이버가 빌드에 들어갔나, `compatible`이 `.of_match`와 맞나, 노드 `status`가 `okay`인가 | `dm compat`, `dm drivers`, `fdt print` |
| 장치는 있는데 `[   ]` | 아직 아무도 안 썼을 수 있음. 해당 서브시스템 명령으로 사용 | `nvme scan`처럼 uclass 명령 |
| probe가 실패 | clock·reset·pinctrl 등 의존 장치, `of_to_plat`에서 읽는 속성 | 드라이버의 `probe` 반환값, 로그 |
| relocation 전·SPL에서 없음 | `DM_FLAG_PRE_RELOC` 또는 `bootph-*` | SPL DTB를 `dtc`로 확인 |

`dm drivers`는 드라이버마다 uclass와 그 드라이버를 쓰는 장치를 보여 줍니다. 이 빌드에서는 머리줄을 빼고 83줄이었고(같은 드라이버의 장치가 여럿이면 줄이 늘어남), 장치가 `<none>`인 드라이버는 빌드에 들어갔지만 짝을 찾지 못한 것입니다.

```text
nvme                      078 nvme                 nvme#0
nvme-blk                  022 blk                  <none>
serial_pl01x              108 serial               pl011@9000000
```

(위 출력은 `nvme scan` 전. 일부 줄만 발췌)

## 정리

- uclass는 같은 인터페이스의 장치 묶음, driver는 코드, device는 드라이버의 인스턴스입니다. QEMU 빌드에는 장치 51개, uclass 14개가 있었습니다.
- DT 장치는 `compatible`과 `.of_match`로, PCI 장치는 `U_BOOT_PCI_DEVICE`의 class 코드로 bind됩니다.
- probe는 쓰일 때 일어납니다. NVMe는 `nvme scan` 전까지 bind만 된 상태였고, probe 뒤에 블록 장치가 생겼습니다.
- relocation 전과 SPL에서는 `DM_FLAG_PRE_RELOC` 드라이버나 `bootph-*` 노드만 bind됩니다.

## 다음 편

[Ch 8: 보드 초기화 — board_init_f와 board_init_r](/blog/embedded/bootloader/chapter08-board-init)에서는 relocation 전후의 초기화와 보드 hook을 살펴봅니다.

## 근거 자료

- [U-Boot v2024.04 Driver Model design](https://docs.u-boot.org/en/v2024.04/develop/driver-model/design.html) (`doc/develop/driver-model/design.rst`): 용어 정의, Bind stage, Activation/probe, Pre-Relocation Support.
- U-Boot v2024.04 소스: `drivers/serial/serial_pl01x.c`, `drivers/nvme/nvme_pci.c`, `include/dm/device.h`(`DM_FLAG_PRE_RELOC`, `DM_FLAG_PROBE_AFTER_BIND`).
- 이 글의 실행: QEMU 11.1.3 `qemu_arm64`에 NVMe 하나를 붙이고 `dm uclass`·`dm compat`·`dm drivers`·`dm tree`·`nvme scan`·`fdt print`.

## 관련 항목

- [Ch 3: 빌드 시스템](/blog/embedded/bootloader/chapter03-build-system)
- [Ch 6: Device Tree와 부트로더](/blog/embedded/bootloader/chapter06-device-tree)
- [Ch 8: board_init_f vs board_init_r](/blog/embedded/bootloader/chapter08-board-init)
- [Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init)
- [Ch 21: 보드 포팅 — 처음부터 끝까지](/blog/embedded/bootloader/chapter21-board-porting)
- [Ch 34: PCIe Enumeration](/blog/embedded/bootloader/chapter34-pcie-enumeration)
- [BSP Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
