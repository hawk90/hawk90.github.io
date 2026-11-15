---
title: "ARM Trusted Firmware-A 통합 — BL1·BL2·BL31·BL32·BL33 흐름"
slug: "embedded/bootloader/chapter25-tfa-optee"
date: 2026-05-19T09:25:00
description: "TF-A v2.15.0을 QEMU virt용으로 빌드해 U-Boot를 BL33으로 부팅하고, FIP 구성·단계별 entry 주소와 SPSR·BL2가 쓰는 PSCI 노드·reset이 BL31을 거치는 경로를 실제 로그로 확인합니다."
series: "Bootloader Internals"
seriesOrder: 25
tags: [embedded, bootloader, tf-a, atf, op-tee, secure-boot, armv8]
draft: false
topics: ["embedded"]
---

[Ch 24](/blog/embedded/bootloader/chapter24-spl-deep)의 i.MX8MM SPL은 마지막에 OCRAM `0x920000`의 BL31로 점프했습니다. 그 BL31이 **Trusted Firmware-A**(TF-A)의 EL3 런타임입니다. U-Boot는 그다음 BL33으로 실행되고, 리부팅이나 CPU 켜기 같은 요청은 다시 BL31에 맡깁니다. 그래서 U-Boot를 다루는 사람도 TF-A가 어떤 순서로 이미지를 올리고 무엇을 넘겨주는지는 알아야 합니다.

이 장은 실제로 돌려 본 결과로 설명합니다. TF-A **v2.15.0** 태그를 `PLAT=qemu`로 빌드하고, 이전 장들에서 쓴 U-Boot v2024.04 `qemu_arm64` 바이너리를 BL33으로 넣었습니다. 실행 환경은 QEMU 11.1.3의 `virt,secure=on` 머신, `cortex-a57` 2코어, 1 GiB이고, 컴파일러는 `aarch64-elf-gcc` 16.2.0입니다. OP-TEE(BL32)는 이 빌드에 넣지 않았습니다.

## 한 줄 요약

QEMU virt에서 TF-A는 BL1 → BL2 → (BL1을 거쳐) BL31 → BL33(U-Boot) 순서로 실행되고, 각 단계의 entry 주소와 SPSR이 로그에 남습니다. BL2는 device tree에 `method = "smc"`인 `/psci` 노드를 써 넣고, U-Boot의 `reset`은 그 SMC로 BL31에 들어가 플랫폼을 재시작합니다.

## TF-A의 단계 이름

TF-A가 이미지를 BL1, BL2, BL31, BL32, BL33으로 나누는 것은 공항의 보안 구역 나누기와 비슷합니다. 활주로(EL3)에는 BL1과 BL31만 들어가고, BL2는 보안 구역 안의 탑승 수속 창구(Secure EL1)에서 일하며, 승객 구역(Normal world)에는 BL33인 U-Boot가 있습니다. 구역을 오가는 문은 `SMC` 명령 하나입니다.

TF-A 문서 `docs/plat/qemu.rst`는 QEMU 포트를 이렇게 설명합니다. "BL1 is used as the BootROM, supplied with the -bios argument." 실제 SoC에서는 칩의 mask ROM이 이 자리를 차지하고, i.MX8MM처럼 BL1·BL2 없이 SPL이 BL31을 바로 올리는 플랫폼도 있습니다. QEMU 포트는 BL1·BL2·BL31을 모두 TF-A 코드로 채우므로, 리셋부터 BL33까지 단계 사이의 넘김을 TF-A 로그로 끝까지 따라갈 수 있습니다.

| 단계 | 이 빌드에서 맡는 일 | 실행 EL |
|------|------------------|--------|
| BL1 | 리셋 직후 실행, FIP에서 BL2를 읽어 실행 | EL3 |
| BL2 | FIP에서 BL31·BL33을 읽고 device tree 수정 | Secure EL1 |
| BL31 | EL3 런타임(PSCI 등), 일반 세계로 진입 | EL3 |
| BL32 | Secure OS(OP-TEE 등). 이 빌드에는 없음 | Secure EL1 |
| BL33 | U-Boot v2024.04 `qemu_arm64` | EL1 또는 EL2 |

## 빌드와 FIP

빌드 명령입니다. `BL33`에 U-Boot 바이너리를 지정하면 `fip` 타깃이 FIP에 함께 넣습니다.

```bash
make CROSS_COMPILE=aarch64-elf- PLAT=qemu \
     BL33=u-boot.bin all fip
```

macOS에서는 두 가지를 더 지정해야 했습니다. 지정하지 않으면 TF-A가 호스트의 `ar`을 쓰고, Apple `ranlib`이 `archive member 'fdt.o' not a mach-o file`이라고 경고하며 ELF 아카이브의 인덱스를 만들지 못합니다. 그러면 BL1 링크에서 `memcpy`·`memset`이 `undefined reference`로 실패합니다. `AR=aarch64-elf-ar OC=aarch64-elf-objcopy`를 함께 주자 빌드가 끝났습니다. 산출물 크기는 `bl1.bin` 22,832 B, `bl2.bin` 25,072 B, `bl31.bin` 49,255 B, `fip.bin` 1,121,847 B입니다.

FIP(Firmware Image Package)는 여러 이미지를 담는 상자입니다. 빌드에 포함된 `fiptool`로 열어 보면 상자 안 목록이 나옵니다.

```text
$ fiptool info fip.bin
Trusted Boot Firmware BL2: offset=0xB0, size=0x61F0, cmdline="--tb-fw"
EL3 Runtime Firmware BL31: offset=0x62A0, size=0xC067, cmdline="--soc-fw"
Non-Trusted Firmware BL33: offset=0x12307, size=0xFFB30, cmdline="--nt-fw"
```

항목은 세 개뿐입니다. BL32 항목이 없고, `TRUSTED_BOARD_BOOT`를 켜지 않았으므로 인증서 항목도 없습니다. FIP에 들어 있다는 사실과 서명 검증을 받는다는 사실은 별개라는 것이 이 목록에서 바로 보입니다. BL33 크기 `0xFFB30`(1,047,344 B)은 U-Boot `u-boot.bin` 크기와 같습니다.

QEMU에 올리는 방법은 문서의 "Booting via flash based firmware" 절을 따랐습니다. `bl1.bin`을 0에, `fip.bin`을 64 × 4 KiB = 256 KiB 지점에 이어 붙여 하나의 flash 이미지를 만듭니다.

```bash
dd if=bl1.bin of=flash.bin bs=4096 conv=notrunc
dd if=fip.bin of=flash.bin seek=64 bs=4096 conv=notrunc
qemu-system-aarch64 -nographic -machine virt,secure=on \
    -cpu cortex-a57 -smp 2 -m 1024 -bios flash.bin
```

처음에는 FIP를 `-fw_cfg name=opt/tf-a/fip,...`로 넘겨 봤는데 `NOTICE:  BL1: Built : ...`까지만 찍히고 멈췄습니다. 원인은 제 쪽 실수였습니다. 그 방법을 설명한 문서는 TF-A main 브랜치의 `docs/plat/qemu.rst`였고, v2.15.0 태그의 문서와 `plat/qemu` 코드에는 `opt/tf-a`가 없습니다. v2.15.0 BL1에는 fw_cfg에서 FIP를 읽는 코드가 없으니 FIP를 찾지 못한 것입니다. 태그와 문서 버전을 맞춰야 한다는 교훈을 남겨 둡니다.

## 부팅 로그 — 단계마다 entry와 SPSR

release 빌드는 `NOTICE`만 찍어서 단계 이름 정도만 보입니다. 단계 사이에 무엇이 넘어가는지 보려고 `DEBUG=1 LOG_LEVEL=40`으로 다시 빌드했습니다. CPU errata 줄과 각 단계의 `Built : ...` 줄을 빼고 옮긴 로그입니다.

```text
NOTICE:  Booting Trusted Firmware
NOTICE:  BL1: v2.15.0(debug):v2.15.0
INFO:    BL1: RAM 0xe0ee000 - 0xe0f6000
INFO:    BL1: Loading BL2
INFO:    Loading image id=1 at address 0xe05b000
INFO:    Image id=1 loaded: 0xe05b000 - 0xe063204
NOTICE:  BL1: Booting BL2
INFO:    Entry point address = 0xe05b000
INFO:    SPSR = 0x3c5
NOTICE:  BL2: v2.15.0(debug):v2.15.0
INFO:    BL2: Doing platform setup
INFO:    BL2: Loading image id 3
INFO:    Loading image id=3 at address 0xe090000
INFO:    Image id=3 loaded: 0xe090000 - 0xe09f89b
INFO:    BL2: Loading image id 5
INFO:    Loading image id=5 at address 0x60000000
INFO:    Image id=5 loaded: 0x60000000 - 0x600ffb30
NOTICE:  BL1: Booting BL31
INFO:    Entry point address = 0xe090000
INFO:    SPSR = 0x3cd
NOTICE:  BL31: v2.15.0(debug):v2.15.0
INFO:    ARM GICv2 driver initialized
INFO:    BL31: Initializing runtime services
INFO:    BL31: Preparing for EL3 exit to normal world
INFO:    Entry point address = 0x60000000
INFO:    SPSR = 0x3c5
```

읽을 거리가 많습니다. 먼저 **`BL1: Booting BL31`이 BL2 로그 뒤에 나옵니다.** BL2는 Secure EL1에서 돌기 때문에 EL3인 BL31로 직접 점프할 수 없습니다. 그래서 BL31과 BL33을 메모리에 올려 놓은 뒤 `bl2/bl2_main.c:147`의 `smc(BL1_SMC_RUN_IMAGE, ...)`로 BL1에 돌아가고, EL3의 BL1이 BL31로 넘깁니다. 은행 창구 직원(BL2)이 금고(EL3)에 직접 못 들어가서 지점장(BL1)에게 열쇠를 넘기는 구조입니다.

**SPSR**은 다음 단계가 어떤 EL과 스택으로 시작할지를 정하는 값입니다. 하위 4비트(M[3:0])가 모드이고, `0x3c0`은 DAIF 네 비트로 모든 예외를 막은 상태입니다.

| 넘김 | SPSR | M[3:0] | 의미 |
|------|------|--------|------|
| BL1 → BL2 | `0x3c5` | `0101` | EL1h (Secure EL1) |
| BL1 → BL31 | `0x3cd` | `1101` | EL3h |
| BL31 → BL33 | `0x3c5` | `0101` | EL1h (Non-secure EL1) |

**U-Boot가 EL1에서 시작했습니다.** QEMU `virt`는 `virtualization=on`을 주지 않으면 EL2를 구현하지 않습니다. TF-A는 BL33의 EL을 `plat/qemu/common/qemu_bl2_setup.c:240`에서 이렇게 고릅니다.

```c
	mode = (el_implemented(2) != EL_IMPL_NONE) ? MODE_EL2 : MODE_EL1;
```

같은 이미지를 `-machine virt,secure=on,virtualization=on`으로 다시 부팅하자 마지막 줄이 `SPSR = 0x3c9`(M=`1001`, EL2h)로 바뀌었습니다. U-Boot가 어느 EL에서 시작하는지는 U-Boot가 정하지 않습니다. 앞 단계 펌웨어와 하드웨어가 정합니다. KVM을 쓸 Linux를 띄우려면 EL2로 들어가야 하므로, 이 값은 실제 제품에서도 확인할 항목입니다.

주소도 TF-A 소스와 맞습니다. `plat/qemu/qemu/include/platform_def.h`는 secure SRAM을 `0x0e000000`부터 1 MiB(`SEC_SRAM_BASE`/`SEC_SRAM_SIZE`)로 두고, BL1의 RW 데이터를 그 꼭대기에, BL2를 BL31 바로 아래(`BL2_BASE = BL31_BASE - 0x35000`)에 둡니다. 로그의 BL2 `0xe05b000`, BL31 `0xe090000`, BL1 RAM `0xe0ee000`이 모두 이 1 MiB 안입니다. BL33 주소 `0x60000000`은 `NS_IMAGE_OFFSET = NS_DRAM0_BASE + 0x20000000`(`0x40000000 + 0x20000000`)입니다. U-Boot `qemu_arm64`는 `CONFIG_POSITION_INDEPENDENT=y`라서 `-bios`로 0번지에서 돌던 바이너리가 이 주소에서도 그대로 돕니다.

## BL2가 쓰는 PSCI 노드

리부팅이나 secondary CPU 켜기는 Normal world 혼자 할 수 없는 일입니다. 그래서 OS와 U-Boot는 PSCI라는 정해진 창구에 요청하고, 그 창구가 어디 있는지는 device tree의 `/psci` 노드로 알립니다. 노드의 `method`가 `smc`면 EL3(TF-A)에, `hvc`면 EL2(하이퍼바이저)에 요청합니다.

TF-A 문서는 "BL2 edits the Flattened Device Tree, FDT, generated by QEMU at run-time to add a node describing PSCI and also enable methods for the CPUs"라고 적습니다. 실제 코드는 `qemu_bl2_setup.c:99`에서 `dt_add_psci_node()`를, 104행에서 `dt_add_psci_cpu_enable_methods()`를 부릅니다. `common/fdt_fixup.c:65`의 `dt_add_psci_node()`는 compatible 세 개와 `fdt_setprop_string(fdt, offs, "method", "smc")`, 그리고 `cpu_suspend`·`cpu_off`·`cpu_on` 함수 ID를 씁니다. 이미 `/psci`가 있으면 `PSCI Device Tree node already exists!` 경고만 남기고 손대지 않습니다.

U-Boot 프롬프트에서 같은 노드를 읽었습니다. 비교를 위해 TF-A 없이 `-machine virt -bios u-boot.bin`으로 부팅한 결과도 나란히 둡니다.

```text
=> fdt addr $fdtcontroladdr
Working FDT set to 7e694b10
=> fdt print /psci
psci {
	cpu_on = <0xc4000003>;
	cpu_off = <0x84000002>;
	cpu_suspend = <0xc4000001>;
	method = "smc";
	compatible = "arm,psci-1.0", "arm,psci-0.2", "arm,psci";
};
```

```text
=> fdt print /psci
psci {
	migrate = <0xc4000005>;
	cpu_on = <0xc4000003>;
	cpu_off = <0x84000002>;
	cpu_suspend = <0xc4000001>;
	method = "hvc";
	compatible = "arm,psci-1.0", "arm,psci-0.2", "arm,psci";
};
```

첫 번째가 TF-A를 거친 경우입니다. 속성 구성이 `dt_add_psci_node()`가 쓰는 목록과 정확히 같고 `migrate`가 없습니다. 두 번째는 `secure=on`이 없을 때 QEMU가 스스로 PSCI를 흉내 내며 만든 노드라서 `method = "hvc"`이고 `migrate`가 있습니다. 같은 U-Boot 바이너리가 앞 단계에 따라 다른 창구로 요청하게 되는 것입니다. `cpu@1` 노드에도 `enable-method = "psci"`가 붙어 있어서 `dt_add_psci_cpu_enable_methods()`가 일한 것을 확인할 수 있습니다.

## reset 한 번이 지나가는 길

U-Boot의 `reset` 명령은 직접 하드웨어를 건드리지 않습니다. 이 빌드의 `.config`에는 `CONFIG_ARM_PSCI_FW=y`, `CONFIG_SYSRESET_PSCI=y`가 있어서, U-Boot의 PSCI 드라이버(`drivers/firmware/psci.c`)가 위 노드의 `method` 문자열을 읽어(206행 `!strcmp("hvc", method)`) 호출 방식을 정하고 SYSTEM_RESET을 요청합니다. 여기서는 `smc`이므로 BL31로 들어갑니다.

BL31의 QEMU 포트는 `plat/qemu/common/qemu_pm.c:204`의 `qemu_system_reset()`에서 secure GPIO(`SECURE_GPIO_RESET`)를 Low에서 High로 토글합니다. QEMU는 이 GPIO를 머신 리셋에 연결해 두었으므로, 결과는 처음부터 다시 부팅입니다. 실제 로그입니다.

```text
=> reset
resetting ...
ERROR:   QEMU System Reset: with GPIO.
NOTICE:  Booting Trusted Firmware
NOTICE:  BL1: v2.15.0(release):v2.15.0
```

`resetting ...` 다음 줄은 BL31이 찍은 것입니다. `qemu_pm.c:206`의 `qemu_system_reset()`이 GPIO를 토글하기 직전에 `ERROR("QEMU System Reset: with GPIO.\n")`을 남기고, 그다음 줄이 다시 BL1입니다. U-Boot → SMC → BL31 → GPIO → 리셋 → BL1로 이어지는 경로가 로그 세 줄에 그대로 들어 있습니다. 실제 SoC에서 리부팅이 안 되면 U-Boot 쪽 sysreset 드라이버만 보지 말고 BL31의 `system_reset` 구현까지 따라가야 하는 이유입니다.

## OP-TEE(BL32)를 넣으려면

이 장의 빌드에는 BL32가 없습니다. TF-A QEMU 문서는 OP-TEE를 넣는 빌드를 다음과 같이 적습니다.

```bash
make CROSS_COMPILE=aarch64-linux-gnu- PLAT=qemu BL32=bl32.bin \
    BL32_EXTRA1=bl32_extra1.bin BL32_EXTRA2=bl32_extra2.bin \
    BL33=bl33.bin BL32_RAM_LOCATION=tdram SPD=opteed all fip
```

`BL32*`는 OP-TEE 빌드 산출물(`tee-header_v2.bin`, `tee-pager_v2.bin`, `tee-pageable_v2.bin`)이고, `SPD=opteed`는 BL31에 OP-TEE 디스패처를 넣어 Secure EL1과 SMC를 주고받게 합니다. 같은 절은 `TRUSTED_BOARD_BOOT=1 GENERATE_COT=1`을 추가해 인증서 체인으로 이미지를 검증하는 빌드도 보여 줍니다. 이 둘을 켜면 앞의 `fiptool info` 목록에 BL32와 인증서 항목이 생깁니다. 이 장에서는 OP-TEE를 빌드하지 않았으므로 BL32의 동작이나 로그는 다루지 않습니다. 인증서 체인은 [Ch 27](/blog/embedded/bootloader/chapter27-chain-of-trust)에서 다시 봅니다.

## 실제 SoC와 다른 점

QEMU 포트는 단계가 모두 보이는 대신, 제품과 다른 점도 분명합니다. [Ch 24](/blog/embedded/bootloader/chapter24-spl-deep)의 i.MX8MM을 나란히 놓으면 차이가 드러납니다.

| 항목 | QEMU `PLAT=qemu` | i.MX8MM (U-Boot SPL 경로) |
|------|-----------------|---------------------------|
| 첫 코드 | TF-A BL1 (`-bios`) | NXP mask ROM |
| BL31을 올리는 주체 | BL2 (FIP에서) | U-Boot SPL (FIT에서) |
| BL31 위치 | secure SRAM `0xe090000` | OCRAM `0x920000` |
| BL33 위치 | `0x60000000` | `0x40200000` |
| 이미지 묶음 | FIP | FIT (`u-boot.itb`) |

## 정리

- TF-A v2.15.0 `PLAT=qemu`는 BL1 → BL2 → BL1 → BL31 → BL33 순서로 실행됩니다. Secure EL1의 BL2는 SMC로 BL1에 돌아가 BL31을 실행시킵니다.
- 이 빌드의 FIP에는 BL2·BL31·BL33 세 항목만 있습니다. BL32와 인증서는 빌드 옵션을 켜야 생깁니다.
- 단계 사이의 SPSR은 BL2 `0x3c5`, BL31 `0x3cd`, BL33 `0x3c5`(EL1h)였고, `virtualization=on`에서는 BL33이 `0x3c9`(EL2h)가 됩니다.
- BL2는 `dt_add_psci_node()`로 `method = "smc"`인 `/psci` 노드를 씁니다. TF-A 없이 부팅하면 QEMU가 만든 `method = "hvc"` 노드가 보입니다.
- U-Boot `reset`은 PSCI SYSTEM_RESET SMC → BL31 `qemu_system_reset()` → secure GPIO → BL1 재시작으로 이어집니다.
- macOS에서 TF-A를 빌드할 때는 `AR`·`OC`를 cross binutils로 지정해야 링크 오류를 피할 수 있습니다.

## 다음 편

다음은 [Ch 26: DDR training 깊이](/blog/embedded/bootloader/chapter26-ddr-training)입니다. [Ch 24](/blog/embedded/bootloader/chapter24-spl-deep)에서 i.MX8MM SPL이 부르던 `ddr_init(&dram_timing)` 안으로 들어갑니다.

## 관련 항목

- [Ch 19: 커널 진입 관찰](/blog/embedded/bootloader/chapter19-kernel-handoff) — U-Boot에서 커널로 넘어갈 때의 레지스터와 EL
- [Ch 24: SPL·TPL 내부 해부](/blog/embedded/bootloader/chapter24-spl-deep) — i.MX8MM SPL이 BL31로 점프하는 경로
- [Ch 27: Chain of Trust](/blog/embedded/bootloader/chapter27-chain-of-trust) — Trusted Board Boot와 인증서 체인
- [TF-A v2.15.0 — docs/plat/qemu.rst](https://github.com/TrustedFirmware-A/trusted-firmware-a/blob/v2.15.0/docs/plat/qemu.rst) — QEMU 포트 빌드·실행 방법 원문
- [TF-A: Firmware design](https://trustedfirmware-a.readthedocs.io/en/latest/design/firmware-design.html) — BL 단계 설계 문서
- [OP-TEE documentation](https://optee.readthedocs.io/) — BL32로 쓰는 Secure OS
- [Arm PSCI specification (DEN0022)](https://developer.arm.com/documentation/den0022) — PSCI 함수 ID와 호출 규약
