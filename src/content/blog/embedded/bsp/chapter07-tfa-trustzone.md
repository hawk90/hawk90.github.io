---
title: "TF-A·TrustZone 통합 — 선택적 BL 단계와 secure world"
slug: "embedded/bsp/chapter07-tfa-trustzone"
date: 2026-05-18T09:07:00
description: "TF-A를 사용하는 boot chain의 BL 단계, BL31, PSCI와 secure-world 통합을 플랫폼 범위에 맞춰 설명합니다."
series: "BSP Development"
seriesOrder: 7
tags: [embedded, bsp, tf-a, trustzone, security]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **TF-A는 Arm 시스템에서 선택할 수 있는 EL3 runtime firmware 구현입니다.** i.MX 8M Plus의 메인라인 흐름에서는 U-Boot SPL이 BL2 자리를 맡고, TF-A는 BL31 하나만 들어갑니다.

이 장은 TF-A v2.15.0 소스를 읽고, 두 가지를 실제로 빌드해 봅니다. 하나는 `PLAT=imx8mp`의 `bl31.bin`이고(보드가 없으니 빌드까지만), 다른 하나는 QEMU virt용 BL1·BL2·BL31 + U-Boot v2024.04(BL33)로, 이것은 QEMU 11.1.3에서 부팅 로그까지 받았습니다.

## TF-A가 필요한 이유

Armv8 프로세서는 EL3라는 가장 높은 권한 단계를 둡니다. 아파트 관리사무소처럼, 각 세대(EL1의 OS)가 스스로 할 수 없는 일, 예를 들어 다른 CPU 코어의 전원을 켜거나 시스템 전체를 reset하는 일을 대신 처리하는 곳입니다. OS는 `smc` 명령으로 관리사무소에 요청서를 넣고, EL3 firmware가 처리한 뒤 돌려보냅니다. 이 요청 규약 중 전원 관리 부분이 PSCI입니다.

PSCI를 꼭 TF-A가 제공해야 하는 것은 아닙니다. 이 시리즈의 Debian 13 QEMU guest(`-accel hvf`)를 DT로 부팅하면 PSCI 노드가 이렇습니다.

```text
$ cat /proc/device-tree/psci/compatible
arm,psci-1.0 arm,psci-0.2 arm,psci
$ cat /proc/device-tree/psci/method
hvc
$ dmesg | grep psci
[    0.000000] psci: probing for conduit method from DT.
[    0.000000] psci: PSCIv1.1 detected in firmware.
[    0.000000] psci: Using standard PSCI v0.2 function IDs
[    0.000000] psci: Trusted OS migration not required
[    0.000000] psci: SMC Calling Convention v1.0
```

`method`가 `hvc`입니다. 이 guest에서는 TF-A가 아니라 하이퍼바이저가 PSCI를 받아 줍니다. 실제 i.MX 8M Plus에서는 Linux v6.12 `imx8mp.dtsi:277-280`의 `psci` 노드가 `compatible = "arm,psci-1.0"; method = "smc";`이고, 그 `smc`를 TF-A BL31이 받습니다.

OP-TEE 같은 secure OS는 BL32 자리에 들어가는 선택 요소입니다.

## BL 단계 모델

TF-A 문서의 BL 이름은 단계 *역할*의 이름이고, SoC마다 일부만 씁니다.

| 단계 | 역할 | QEMU virt (`PLAT=qemu`) | i.MX 8M Plus 메인라인 |
|------|------|------------------------|----------------------|
| BootROM | SoC 내부 초기 firmware | QEMU `-bios`로 BL1을 ROM처럼 적재 | NXP BootROM |
| BL1 | TF-A의 첫 단계 | 있음 | 없음 |
| BL2 | 다음 이미지 적재(DDR 초기화 포함 가능) | 있음 | 없음, U-Boot SPL이 대신함 |
| BL31 | EL3 runtime, PSCI·SMC 처리, 상주 | 있음 | 있음 (`0x970000`) |
| BL32 | secure OS (OP-TEE 등) | 빌드 옵션 | 메인라인 U-Boot binman에는 없음 |
| BL33 | normal-world 부트로더 | U-Boot (`0x60000000`) | U-Boot (`0x40200000`) |

i.MX 8M Plus 열은 U-Boot v2024.04 `arch/arm/dts/imx8mp-u-boot.dtsi`가 근거입니다. binman이 만드는 `u-boot.itb`의 FIT에는 `uboot`와 `atf` 두 이미지만 있고, `atf`는 `load = <0x970000>; entry = <0x970000>;`입니다. TF-A v2.15.0에는 `plat/imx/imx8m/imx8mp/imx8mp_bl2_setup.c`도 있지만 `platform_def.h`에서 `NEED_BL2`를 정의할 때만 쓰이는 별도 배치이고(그때 `BL31_BASE`는 `0x950000`), 이 시리즈는 U-Boot 문서의 기본 흐름을 따릅니다.

BL31은 *상주 코드*입니다. Linux로 진입한 뒤에도 `smc`가 실행되면 EL3로 trap되어 BL31이 처리하고 돌아갑니다.

## QEMU에서 본 실제 단계 전환

TF-A `docs/plat/qemu.rst`의 절차대로 Debian guest에서 `make PLAT=qemu DEBUG=1 LOG_LEVEL=40 BL33=u-boot.bin all fip`으로 빌드하고, `bl1.bin`을 0에, `fip.bin`을 64 × 4 KiB 오프셋에 써서 `flash.bin`을 만들었습니다. 호스트의 QEMU 11.1.3에서 `-machine virt,secure=on -cpu cortex-a57 -smp 4 -m 1024 -bios flash.bin`으로 부팅한 로그입니다(같은 경고가 반복되는 줄은 줄였습니다).

```text
NOTICE:  Booting Trusted Firmware
NOTICE:  BL1: v2.15.0(debug):
INFO:    BL1: RAM 0xe0ee000 - 0xe0f6000
INFO:    BL1: Loading BL2
INFO:    Loading image id=1 at address 0xe05b000
NOTICE:  BL1: Booting BL2
INFO:    Entry point address = 0xe05b000
INFO:    SPSR = 0x3c5
NOTICE:  BL2: v2.15.0(debug):
INFO:    BL2: Loading image id 3
INFO:    Loading image id=3 at address 0xe090000
INFO:    BL2: Loading image id 5
INFO:    Loading image id=5 at address 0x60000000
INFO:    Image id=5 loaded: 0x60000000 - 0x60100a98
NOTICE:  BL1: Booting BL31
INFO:    Entry point address = 0xe090000
INFO:    SPSR = 0x3cd
NOTICE:  BL31: v2.15.0(debug):
INFO:    ARM GICv2 driver initialized
INFO:    BL31: Initializing runtime services
WARNING: BL31: cortex_a57: CPU workaround for erratum 826974 was missing!
INFO:    BL31: cortex_a57: CPU workaround for CVE 2017_5715 was applied
INFO:    BL31: Preparing for EL3 exit to normal world
INFO:    Entry point address = 0x60000000
INFO:    SPSR = 0x3c5


U-Boot 2024.04 (Nov 16 2026 - 07:07:34 +0000)
```

읽을 거리가 많습니다.

- image id 3이 BL31(`0xe090000`), id 5가 BL33인 U-Boot(`0x60000000`)입니다. BL2가 둘을 모두 적재한 뒤 BL31로 넘어갑니다.
- `SPSR = 0x3cd`의 하위 4비트 `0b1101`은 EL3h, BL33으로 나갈 때의 `0x3c5`(`0b0101`)는 EL1h입니다. `virtualization=on`을 주지 않아 EL2가 없으므로 U-Boot가 EL1에서 시작했습니다.
- `WARNING: ... erratum 826974 was missing!`은 이 빌드에서 해당 Cortex-A57 erratum workaround를 켜지 않았다는 debug 빌드의 경고입니다. Ch 2에서 본 errata가 firmware에서는 이렇게 보입니다. 제품 빌드에서는 SoC가 쓰는 코어의 erratum 플래그를 켜고 이 목록을 비웁니다.
- `LOG_LEVEL=40`은 `include/common/debug.h`의 `LOG_LEVEL_INFO`입니다. 지정하지 않으면 debug 빌드는 40, release 빌드는 20(`NOTICE`)이 기본값입니다(`Makefile:140-145`).

## TF-A 소스 트리

v2.15.0의 최상위와 이 장에서 보는 경로입니다.

```text
tf-a-v2.15.0/
├── bl1/ bl2/ bl2u/ bl31/ bl32/
├── common/runtime_svc.c        ← SMC를 서비스로 나누는 디스패처
├── lib/psci/                   ← PSCI 공통 구현
├── plat/
│   ├── imx/imx8m/imx8mp/       ← i.MX 8M Plus port
│   ├── imx/common/             ← i.MX SiP 서비스
│   ├── qemu/
│   └── ...
└── services/std_svc/           ← PSCI 등 표준 서비스 등록
```

i.MX 포트는 `plat/nxp/`가 아니라 `plat/imx/` 아래에 있습니다. `plat/nxp/`는 Layerscape 계열 포트의 자리입니다.

## BL31 빌드 — i.MX 8M Plus

TF-A `docs/plat/imx8m.rst`는 `CROSS_COMPILE=aarch64-linux-gnu- make PLAT=<Target_SoC> bl31`을 적고, Target_SoC로 `imx8mp`를 듭니다. arm64 Debian guest에서는 네이티브 gcc 14.2.0으로 `CROSS_COMPILE` 없이 빌드했습니다.

```text
$ make PLAT=imx8mp bl31
...
  LD      /root/src/tf-a-v2.15.0/build/imx8mp/release/bl31/bl31.elf
  BIN     /root/src/tf-a-v2.15.0/build/imx8mp/release/bl31.bin

Built /root/src/tf-a-v2.15.0/build/imx8mp/release/bl31.bin successfully
$ ls -l build/imx8mp/release/bl31.bin
-rwxr-xr-x 1 root root 38544 Nov 16 07:18 build/imx8mp/release/bl31.bin
```

release `bl31.bin`은 38,544바이트로, 아래 `BL31_SIZE` 128 KiB 안에 들어갑니다. 이 파일을 U-Boot 빌드 디렉터리에 넣으면 Ch 6의 binman 경고(`atf-blob (bl31.bin)` missing)가 사라집니다. `BL32_BASE`(기본 `0x56000000`)와 `BL32_SIZE`(기본 `0x2000000`)는 `plat/imx/imx8m/imx8mp/platform.mk:168-172`에 기본값이 있으므로 OP-TEE를 쓰지 않으면 지정하지 않습니다.

## platform_def.h — 보드별 메모리 맵

`plat/imx/imx8m/imx8mp/include/platform_def.h`의 실제 값입니다.

```c
#define PLATFORM_STACK_SIZE		0xB00
#define PLATFORM_CLUSTER0_CORE_COUNT	U(4)
#define PLATFORM_CORE_COUNT		(PLATFORM_CLUSTER0_CORE_COUNT)

#if defined(NEED_BL2)
#define BL2_BASE			U(0x970000)
#define BL31_BASE			U(0x950000)
...
#else
#define BL31_BASE			U(0x970000)
#endif

#define BL31_SIZE			SZ_128K
#define BL31_LIMIT			(BL31_BASE + BL31_SIZE)

/* non-secure uboot base */
#ifndef PLAT_NS_IMAGE_OFFSET
#define PLAT_NS_IMAGE_OFFSET		U(0x40200000)
#endif

#define IMX_BOOT_UART_CLK_IN_HZ		24000000 /* Select 24MHz oscillator */
#define IMX_UART2_BASE			U(0x30890000)
```

세 값이 다른 저장소와 짝을 이룹니다.

| TF-A 값 | 짝 | 같아야 하는 이유 |
|---------|-----|-----------------|
| `BL31_BASE 0x970000` | U-Boot `imx8mp-u-boot.dtsi`의 `atf` `load`/`entry` | SPL이 BL31을 이 주소에 놓고 점프 |
| `PLAT_NS_IMAGE_OFFSET 0x40200000` | U-Boot `CONFIG_TEXT_BASE=0x40200000` | BL31이 BL33으로 나가는 주소 |
| `IMX_BOOT_UART_BASE 0x30890000` (`platform.mk:174`) | DT `stdout-path = &uart2` | BL31 로그가 같은 콘솔에 나옴 |

Ch 4에서 본 것처럼 `IMX_BOOT_UART_BASE=auto`로 빌드하면 0이 되어 BL31이 콘솔 주소를 런타임에 찾습니다.

## PSCI 구현

i.MX 8M Plus의 PSCI 콜백 표는 `plat/imx/imx8m/imx8mp/imx8mp_psci.c:19-31`에 있습니다.

```c
static const plat_psci_ops_t imx_plat_psci_ops = {
	.pwr_domain_on = imx_pwr_domain_on,
	.pwr_domain_on_finish = imx_pwr_domain_on_finish,
	.pwr_domain_off = imx_pwr_domain_off,
	.validate_ns_entrypoint = imx_validate_ns_entrypoint,
	.validate_power_state = imx_validate_power_state,
	...
	.pwr_domain_suspend = imx_domain_suspend,
	.pwr_domain_suspend_finish = imx_domain_suspend_finish,
	.pwr_domain_pwr_down = imx_pwr_domain_pwr_down_wfi,
	.get_sys_suspend_power_state = imx_get_sys_suspend_power_state,
	.system_reset = imx_system_reset,
	.system_off = imx_system_off,
};
```

`plat_setup_psci_ops()`(35~44행)는 `imx_mailbox_init(sec_entrypoint)` 뒤 이 표를 돌려줍니다. 콜백 구현은 i.MX 8M 공용 파일 `imx8m_psci_common.c`에 있고, 예를 들어 `imx_system_reset()`(210행)은 watchdog으로 reset합니다.

```c
void __dead2 imx_system_reset(void)
{
#ifdef IMX_WDOG_B_RESET
	imx_wdog_restart(true);
#else
	imx_wdog_restart(false);
#endif
}
```

Linux의 `reboot`이 결국 이 함수에 도착하므로, 보드의 watchdog reset 배선(`WDOG_B` 핀을 PMIC에 연결했는지)이 이 `#ifdef` 선택과 맞아야 합니다.

## device tree에서의 PSCI

Linux DT에 PSCI 노드와 `enable-method`가 있어야 secondary CPU가 PSCI로 켜집니다. QEMU guest의 `/proc/device-tree/cpus/cpu@0/enable-method`는 `psci`였고, `cpus` 아래에 `cpu@0`~`cpu@3`이 있었습니다. Linux 쪽에서 `method` 문자열은 `drivers/firmware/psci/psci.c`의 `get_set_conduit_method()`(286행)가 읽고, `set_conduit()`(270행)이 `__invoke_psci_fn_hvc` 또는 `__invoke_psci_fn_smc`를 고릅니다. Ch 9에서 SMP bring-up 디버깅을 자세히 다룹니다.

## TrustZone 메모리 분할

secure OS를 쓰면 DRAM 일부를 TZASC(TrustZone Address Space Controller)로 secure 전용으로 묶습니다. i.MX 8M Plus TF-A의 기본 BL32 영역은 `platform.mk`의 `BL32_BASE=0x56000000`, `BL32_SIZE=0x2000000`(32 MiB)입니다. 이 영역을 쓴다면 세 곳이 같은 범위를 가리켜야 합니다.

1. TF-A의 `BL32_BASE`/`BL32_SIZE`
2. OP-TEE 빌드의 TZDRAM 시작·크기
3. Linux DT의 `reserved-memory`(Linux가 그 범위를 일반 메모리로 쓰지 않도록)

이 글은 OP-TEE를 빌드하지 않았고 TZASC 레지스터 설정 코드도 실행하지 않았으므로, 레지스터 값과 접근 위반 시의 동작은 싣지 않습니다.

## OP-TEE를 BL32로 통합

U-Boot v2024.04의 i.MX 8M Plus binman 설정은 FIT에 `uboot`와 `atf`만 넣습니다. OP-TEE를 더하려면 FIT에 BL32 이미지를 추가하고, TF-A를 `SPD=opteed`로 빌드해 BL31이 BL32를 먼저 기동하게 해야 합니다. TF-A 쪽 옵션은 `docs/plat/qemu.rst`의 OP-TEE 예(`BL32=bl32.bin ... SPD=opteed all fip`)와 같은 이름입니다. 이 글에서는 OP-TEE 통합을 실행하지 않았습니다.

## SMC 호출 — Linux에서 BL31로

Linux가 `CPU_ON`을 요청하는 경로를 따라가 봅니다. 함수 ID는 Linux `include/uapi/linux/psci.h`의 `PSCI_0_2_FN_BASE 0x84000000`과 `PSCI_0_2_64BIT 0x40000000`에서 `PSCI_0_2_FN64_CPU_ON = PSCI_0_2_FN64(3)`, 즉 0xC4000003입니다.

| 단계 | 위치 |
|------|------|
| Linux `psci_cpu_on()` → `invoke_psci_fn` | `drivers/firmware/psci/psci.c:231`, `__invoke_psci_fn_smc`(123행) |
| `smc #0` → EL3 vector `sync_exception_aarch64` | TF-A `bl31/aarch64/runtime_exceptions.S:230` |
| `handle_sync_exception` 매크로 → `handler_sync_exception()` | `runtime_exceptions.S:81`, `common/runtime_svc.c:238` |
| 함수 ID로 서비스 선택 → `std_svc_smc_handler()` | `runtime_svc.c` `sync_handler()`, `services/std_svc/std_svc_setup.c:108` |
| `psci_smc_handler()` → `psci_cpu_on()` | `std_svc_setup.c:150`, `lib/psci/psci_main.c:25` |
| 플랫폼 콜백 `imx_pwr_domain_on()` | `imx8mp_psci.c:20` |

이 경로의 시간은 이 글에서 측정하지 않았습니다.

## SiP service — vendor 확장

표준 PSCI 외에 SoC vendor가 정의하는 SMC를 SiP(Silicon Provider) service라고 부릅니다. i.MX의 ID는 `plat/imx/common/include/imx_sip_svc.h`에 있습니다.

```c
#define IMX_SIP_GPC			0xC2000000
#define IMX_SIP_CPUFREQ			0xC2000001
#define IMX_SIP_SRTC			0xC2000002
#define IMX_SIP_BUILDINFO			0xC2000003
#define IMX_SIP_DDR_DVFS		0xc2000004
#define IMX_SIP_SRC			0xC2000005
#define IMX_SIP_GET_SOC_INFO		0xC2000006
#define IMX_SIP_HAB			0xC2000007
#define IMX_SIP_AARCH32			0xC20000FD
```

디스패처는 `plat/imx/common/imx_sip_svc.c`의 `switch`이고, 예를 들어 `case IMX_SIP_DDR_DVFS:`는 `dram_dvfs_handler()`로 갑니다. 이 ID의 Linux 쪽 사용자는 `drivers/devfreq/imx8m-ddrc.c`입니다. 같은 값 `0xc2000004`를 `IMX_SIP_DDR_DVFS`로 정의하고(16행) `arm_smccc_smc(IMX_SIP_DDR_DVFS, target_freq, online_cpus, ...)`로 DDR 주파수 변경을 BL31에 요청합니다(113행). PSCI 함수 ID가 0x84000000/0xC4000000대, SiP가 0xC2000000대로 갈리는 것은 SMC Calling Convention의 소유자(OEN) 필드 때문입니다. TF-A `include/lib/smccc.h`는 OEN을 함수 ID의 24번 비트부터 읽고(`FUNCID_OEN_SHIFT`), `OEN_SIP_START`를 2, `OEN_STD_START`를 4로 정의합니다. 0xC2000000의 OEN은 2, 0x84000000·0xC4000000의 OEN은 4입니다.

## TF-A 디버깅

TF-A가 시작은 했는데 그 뒤가 멈춘다면 콘솔 출력이 가장 큰 단서입니다. 위 QEMU 로그처럼 debug 빌드는 단계마다 `Loading image id=...`와 `Entry point address`를 찍으므로, 마지막 줄이 어느 단계의 어느 이미지인지 보면 멈춘 곳이 좁혀집니다. i.MX 8M Plus에서 BL31 로그가 아예 없다면 SPL이 BL31로 점프하지 못했거나 콘솔 UART가 다른 것입니다. 앞의 표에서 `BL31_BASE`와 `IMX_BOOT_UART_BASE`를 먼저 맞춰 봅니다.

source-level 디버깅에는 `build/<plat>/debug/bl31/bl31.elf`의 심볼을 씁니다. QEMU라면 `-s -S`로 gdbstub를 열고 `bl31_main`에 break를 걸 수 있습니다. 이 글에서는 gdb 세션을 실행하지 않았습니다.

## 자주 하는 실수

### BL31 주소가 SPL과 TF-A에서 다름

U-Boot binman의 `atf` `load`(0x970000)와 TF-A `BL31_BASE`가 다르면 SPL이 엉뚱한 곳으로 점프합니다. TF-A를 `NEED_BL2`로 빌드하면 `BL31_BASE`가 0x950000으로 바뀌므로 특히 주의합니다.

### `PLATFORM_CORE_COUNT`가 실제 코어 수와 다름

i.MX 포트는 MPIDR을 코어 인덱스로 바꿀 때 `plat/imx/common/imx8_topology.c:23-40`의 `plat_core_pos_by_mpidr()`를 쓰고, 이 함수는 `PLATFORM_CLUSTER_COUNT`와 `PLATFORM_MAX_CPU_PER_CLUSTER`를 넘는 MPIDR에 -1을 돌려줍니다. i.MX 8M Plus 포트는 `PLATFORM_CLUSTER0_CORE_COUNT U(4)`, `PLATFORM_MAX_CPU_PER_CLUSTER U(4)`입니다. 코어 수가 다른 파생 SoC에 포트를 그대로 쓰지 않습니다.

### BL32 범위가 세 곳에서 다름

TF-A `BL32_BASE`/`BL32_SIZE`, OP-TEE TZDRAM, Linux `reserved-memory`가 같은 범위를 가리키게 합니다.

### `PLAT_NS_IMAGE_OFFSET`과 U-Boot의 `CONFIG_TEXT_BASE` 불일치

BL31은 `PLAT_NS_IMAGE_OFFSET`으로 나가고, U-Boot는 `CONFIG_TEXT_BASE`에 링크됩니다. 둘 다 0x40200000이 기본값입니다.

### SiP SMC ID를 아무 값으로 정함

vendor 확장 ID는 SiP 범위(0xC2000000대)에서 기존 `imx_sip_svc.h` 목록과 겹치지 않게 정합니다. PSCI 범위(0x84000000/0xC4000000대)를 쓰면 표준 서비스 디스패처로 갑니다.

### `secure-status`의 기본값 오해

Linux `Documentation/devicetree/bindings/arm/secure.txt`에 따르면 `secure-status`가 없으면 `status`와 같은 값으로 간주됩니다. 그래서 `status = "okay"`만 둔 장치는 secure와 non-secure 양쪽에서 보이고, non-secure에서만 보이게 하려면 `secure-status = "disabled"`를 명시해야 합니다.

## 정리

- i.MX 8M Plus 메인라인 흐름은 BootROM → U-Boot SPL(BL2 역할) → TF-A BL31(0x970000) → U-Boot(0x40200000)이고, U-Boot v2024.04 binman의 FIT에는 `atf`와 `uboot`만 들어갑니다.
- TF-A v2.15.0 `make PLAT=imx8mp bl31`의 release 결과는 38,544바이트였습니다.
- QEMU virt에서 BL1 → BL2 → BL31 → U-Boot 전환이 `Loading image id`, `Entry point address`, `SPSR` 로그로 보입니다.
- i.MX 포트 경로는 `plat/imx/imx8m/imx8mp/`, SiP ID는 `plat/imx/common/include/imx_sip_svc.h`입니다.
- `imx_system_reset()`은 watchdog으로 reset합니다.
- PSCI 제공자는 DT의 `method`가 정합니다. hvf QEMU guest는 `hvc`, TF-A 보드는 `smc`입니다.
- `secure-status`는 기본값이 `status`와 같습니다.

## 다음 편

[Ch 8 — Linux 커널 설정](/blog/embedded/bsp/chapter08-kernel-config)에서는 TF-A가 깨운 환경 위에서 Linux 커널을 설정하고 빌드하는 흐름을 다룹니다.

## 관련 항목

- [Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [Ch 8: Linux 커널 설정](/blog/embedded/bsp/chapter08-kernel-config)
- [Ch 9: Multi-core SMP bring-up](/blog/embedded/bsp/chapter09-smp-bringup)
- [Ch 13: Power Management](/blog/embedded/bsp/chapter13-power-management)
- [Embedded Security Ch 4: TrustZone](/blog/embedded/embedded-security/chapter04-trustzone)
- [Embedded Security Ch 5: TEE — OP-TEE](/blog/embedded/embedded-security/chapter05-tee)
- [원문 — Trusted Firmware-A](https://trustedfirmware-a.readthedocs.io/)
- [원문 — PSCI Specification](https://developer.arm.com/documentation/den0022/latest)
- [원문 — SMC Calling Convention](https://developer.arm.com/documentation/den0028/latest)
