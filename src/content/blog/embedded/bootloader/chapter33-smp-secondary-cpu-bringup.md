---
title: "ARM64 Secondary Core Bring-up — PSCI와 spin-table 시작 계약"
slug: "embedded/bootloader/chapter33-smp-secondary-cpu-bringup"
date: 2026-05-22T09:33:00
description: "TF-A v2.15.0 위에서 Debian 6.12 커널을 4코어로 부팅해 PSCI로 secondary CPU가 올라오는 로그를 보고, DTB의 enable-method를 지우거나 spin-table로 바꿨을 때 커널이 무엇을 거절하는지 확인합니다. U-Boot의 spin-table 코드도 함께 읽습니다."
series: "Bootloader Internals"
seriesOrder: 33
tags: [embedded, bootloader, smp, psci, arm64, kernel, hotplug]
topics: ["embedded"]
---

## 한 줄 요약

> AArch64 Linux는 CPU 노드마다 `enable-method`를 보고 보조 CPU를 깨우는 방법을 정합니다. TF-A 위에서 4코어로 부팅하자 PSCI로 CPU 1~3이 모두 올라왔고, DTB에서 `enable-method`를 지운 CPU와 `cpu-release-addr` 없이 `spin-table`로 바꾼 CPU는 커널이 부팅 초기에 거절해 2코어로만 올라왔습니다.

[Ch 32](/blog/embedded/bootloader/chapter32-psci-smccc)에서 U-Boot 셸로 `CPU_ON`을 보내 CPU 1을 직접 깨웠습니다. 이 장은 같은 일을 Linux가 부팅 중에 하는 장면을 봅니다. 그리고 PSCI가 아닌 다른 약속, 곧 spin-table이 무엇을 요구하는지 Linux 문서와 U-Boot 코드로 확인합니다.

실험 환경은 Ch 31·32와 같은 TF-A **v2.15.0** `PLAT=qemu` release + U-Boot v2024.04, QEMU 11.1.3 `virt,secure=on`, `cortex-a57` 4코어(`-smp 4`), 1 GiB입니다. 커널은 [Ch 16](/blog/embedded/bootloader/chapter16-verified-boot)·[Ch 19](/blog/embedded/bootloader/chapter19-kernel-handoff)에서 쓴 Debian `6.12.107+deb13-arm64` Image를 `-device loader`로 `0x40400000`에 올려 `booti 0x40400000 - ${fdtcontroladdr}`로 실행했습니다. root 파일 시스템은 주지 않았으므로 마지막에는 `Unable to mount root fs`로 멈추지만, CPU를 올리는 단계는 그 전에 끝납니다.

## 계약서는 DTB에 있다

여러 사람이 함께 쓰는 회의실을 생각하면 쉽습니다. 문 앞에 "예약은 관리실(펌웨어)에 전화"라고 붙어 있는 방이 있고, "열쇠는 2층 사물함(메모리 주소)에 둘 테니 가져가라"라고 붙어 있는 방이 있습니다. 앞쪽이 PSCI, 뒤쪽이 spin-table입니다. Linux는 이 안내문을 CPU 노드의 `enable-method`에서 읽습니다.

Linux 6.12의 `Documentation/arch/arm64/booting.rst`는 부트로더 쪽 의무를 이렇게 적습니다. 주 CPU가 넘기는 DTB에는 "an 'enable-method' property for each cpu node"가 있어야 하고, "It is expected that the bootloader will generate these device tree properties and insert them into the blob prior to kernel entry." 이 구성에서 그 일을 한 것은 [Ch 25](/blog/embedded/bootloader/chapter25-tfa-optee)에서 본 TF-A BL2의 `dt_add_psci_cpu_enable_methods()`입니다.

## PSCI 방식 — 커널이 CPU_ON을 보낸다

같은 문서는 PSCI CPU를 이렇게 정의합니다. "CPUs with a \"psci\" enable method should remain outside of the kernel"이고, 커널이 "CPU_ON calls"로 그 CPU들을 커널 안으로 데려옵니다. 커널 밖에서 기다리는 곳은 이 구성에서 TF-A입니다. TF-A `docs/plat/qemu.rst`는 "BL1 selects a primary CPU to handle the boot and the secondaries are placed in a polling loop to be released by normal world via PSCI"라고 설명하고, [Ch 32](/blog/embedded/bootloader/chapter32-psci-smccc)에서 본 `qemu_pwr_domain_on()`이 그 루프에 신호를 줍니다.

DTB를 그대로 두고 부팅한 커널 로그입니다(CPU 기능 줄은 생략).

```text
[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x411fd070]
[    0.000000] psci: probing for conduit method from DT.
[    0.000000] psci: PSCIv1.1 detected in firmware.
[    0.000000] psci: Using standard PSCI v0.2 function IDs
[    0.000000] psci: MIGRATE_INFO_TYPE not supported.
[    0.000000] psci: SMC Calling Convention v1.5
...
[    0.226976] smp: Bringing up secondary CPUs ...
[    0.328668] Detected PIPT I-cache on CPU1
[    0.329805] CPU1: Booted secondary processor 0x0000000001 [0x411fd070]
[    0.359235] Detected PIPT I-cache on CPU2
[    0.359538] CPU2: Booted secondary processor 0x0000000002 [0x411fd070]
[    0.378236] Detected PIPT I-cache on CPU3
[    0.378534] CPU3: Booted secondary processor 0x0000000003 [0x411fd070]
[    0.380082] smp: Brought up 1 node, 4 CPUs
[    0.380175] SMP: Total of 4 processors activated.
```

`psci:` 다섯 줄은 [Ch 31](/blog/embedded/bootloader/chapter31-tfa-bl31-runtime)·[Ch 32](/blog/embedded/bootloader/chapter32-psci-smccc)에서 U-Boot `smc`로 직접 받은 값과 같습니다. 커널은 `/psci` 노드의 `method`로 SMC를 골랐고(`probing for conduit method from DT`), `PSCI_VERSION`으로 1.1을, `SMCCC_VERSION`으로 v1.5를 확인했습니다. `MIGRATE_INFO_TYPE not supported`는 Trusted OS 이동 기능을 물었다가 -1을 받은 것입니다. U-Boot에서 `smc 0x84000006`을 보내도 `0xffffffffffffffff`가 돌아왔습니다. TF-A는 SPD(Trusted OS 디스패처)가 `psci_register_spd_pm_hook()`(`lib/psci/psci_common.c`)으로 등록될 때만 `PSCI_MIG_INFO_TYPE`을 지원 목록(`psci_caps`)에 넣는데, 이 빌드에는 SPD가 없습니다.

`smp: Bringing up secondary CPUs ...`(0.227초)부터 `Brought up 1 node, 4 CPUs`(0.380초)까지가 커널이 `enable-method = "psci"`인 CPU 1~3을 PSCI로 올린 구간입니다. Ch 32에서 손으로 보낸 요청을 커널이 대신 한 셈입니다. CPU 1이 올라오는 데 약 0.1초 걸린 것은 QEMU TCG(소프트웨어 에뮬레이션) 위의 시간이므로 실제 하드웨어의 시간으로 읽으면 안 됩니다. 이 로그만으로는 각 `CPU_ON`이 언제 호출됐는지 알 수 없고, CPU가 커널 코드에 도착한 시점(`Booted secondary processor`)만 보입니다.

## 계약을 깨면 커널이 거절한다

안내문을 지우거나 잘못 쓰면 어떻게 될까요. U-Boot에서 `booti` 직전에 control DTB를 고쳐 두 CPU의 계약을 깼습니다.

```text
=> fdt addr ${fdtcontroladdr}
=> fdt resize 4096
=> fdt rm /cpus/cpu@1 enable-method
=> fdt set /cpus/cpu@2 enable-method spin-table
=> fdt print /cpus/cpu@2 enable-method
enable-method = "spin-table"
```

CPU 1은 안내문이 아예 없고, CPU 2는 "사물함에서 열쇠를 가져가라"고 적었지만 사물함 위치(`cpu-release-addr`)가 없습니다. 커널 로그입니다.

```text
[    0.000000] psci: SMC Calling Convention v1.5
[    0.000000] /cpus/cpu@1: missing enable-method property
[    0.000000] CPU 2: missing or invalid cpu-release-addr property
...
[    0.166492] smp: Bringing up secondary CPUs ...
[    0.179498] Detected PIPT I-cache on CPU3
[    0.181892] CPU3: Booted secondary processor 0x0000000003 [0x411fd070]
[    0.191600] smp: Brought up 1 node, 2 CPUs
[    0.191708] SMP: Total of 2 processors activated.
```

두 CPU는 커널이 부팅 직후(타임스탬프 0초) DTB를 읽는 단계에서 이미 걸러졌고, `Bringing up secondary CPUs` 단계에서는 CPU 3에만 `CPU_ON`을 보냈습니다. 시스템은 경고 두 줄만 남기고 2코어로 정상 부팅을 계속합니다. 실제 제품에서 "코어 수가 이상하게 적다"는 증상이 있으면 부팅 로그 맨 앞에서 이 두 형태의 메시지를 먼저 찾을 이유입니다.

## spin-table 방식 — 사물함과 wfe

spin-table에 대한 Linux 6.12 문서의 요구는 구체적입니다. spin-table CPU의 노드에는 `cpu-release-addr`가 있어야 하고, 그 주소는 "a naturally-aligned 64-bit zero-initialised memory location"입니다. CPU들은 "in a reserved area of memory (communicated to the kernel by a /memreserve/ region in the device tree)"에서 그 주소를 읽으며 돌고, "A wfe instruction may be inserted to reduce the overhead of the busy-loop and a sev will be issued by the primary CPU"입니다. 읽은 값이 0이 아니면 그 주소로 점프합니다. 위 실험의 CPU 2는 첫 조건(`cpu-release-addr`)부터 어겨서 거절됐습니다.

U-Boot v2024.04에는 이 약속을 지키는 구현이 있습니다. 대기 루프 `arch/arm/cpu/armv8/spin_table_v8.S`는 문서의 문장을 그대로 네 줄로 옮긴 모양입니다.

```text
ENTRY(spin_table_secondary_jump)
.globl spin_table_reserve_begin
spin_table_reserve_begin:
0:	wfe
	ldr	x0, spin_table_cpu_release_addr
	cbz	x0, 0b
	br	x0
.globl spin_table_cpu_release_addr
	.align	3
spin_table_cpu_release_addr:
	.quad	0
.globl spin_table_reserve_end
spin_table_reserve_end:
ENDPROC(spin_table_secondary_jump)
```

`wfe`로 잠들었다가 깨면 `spin_table_cpu_release_addr`를 읽고, 0이면 다시 잠들고, 아니면 그 주소로 갑니다. release 주소는 `.align 3`(8바이트 정렬)에 `.quad 0`으로 0에서 시작합니다. 문서의 "naturally-aligned 64-bit zero-initialised"와 그대로 맞습니다.

DTB 쪽은 `arch/arm/cpu/armv8/spin_table.c`의 `spin_table_update_dt()`가 채웁니다. 이 함수는 첫 루프에서 **모든** CPU 노드의 `enable-method`가 `"spin-table"`인지 확인하고, 하나라도 아니면 "just return successfully to not disturb other methods, like psci"라는 주석대로 아무것도 하지 않습니다. 모두 spin-table이면 각 노드에 `cpu-release-addr`를 `spin_table_cpu_release_addr`의 주소로 쓰고, `spin_table_reserve_begin`~`spin_table_reserve_end`를 `fdt_add_mem_rsv()`로 `/memreserve/`에 넣은 뒤 `Reserved memory region for spin-table: addr=%lx size=%lx`를 찍습니다. 문서가 요구한 "reserved area"와 "contained in the reserved region"이 이 두 줄입니다.

이 구현은 이 장의 QEMU 구성에서 실행하지 않았습니다. `qemu_arm64_defconfig`에는 `CONFIG_ARMV8_SPIN_TABLE`이 없고, `arch/arm/cpu/armv8/Kconfig:44`의 도움말이 요구하는 조건을 이 구성은 만족하지 않습니다. 도움말은 secondary CPU를 "into U-Boot proper in a board specific manner"로, 그것도 relocation 뒤에 데려와야 한다고 적습니다. 그러지 않으면 "the secondary CPUs will spin in unprotected memory area"라는 것입니다. 이 구성의 secondary CPU는 U-Boot가 아니라 TF-A BL1의 대기 루프에 있으므로, U-Boot의 spin 코드가 그들을 데려올 길이 없습니다. spin-table은 펌웨어가 PSCI를 제공하지 않는 보드에서, 보드 코드가 secondary CPU를 U-Boot의 이 루프로 보내 줄 때 쓰는 방식입니다.

## 둘의 차이

| 항목 | PSCI | spin-table |
|------|------|-----------|
| DTB 노드 | `/psci` 노드 + CPU마다 `enable-method = "psci"` | CPU마다 `enable-method = "spin-table"`, `cpu-release-addr`, `/memreserve/` |
| 기다리는 곳 | 펌웨어(이 구성에서 TF-A BL1의 polling loop) | 부트로더가 남겨 둔 예약 메모리의 루프(U-Boot `spin_table_secondary_jump`) |
| 깨우는 방법 | 커널이 SMC/HVC로 `CPU_ON` | 커널이 release 주소에 entry를 쓰고 `sev` |
| 다시 끄기 | `CPU_OFF`로 펌웨어에 돌려줌 | 문서에 되돌리는 절차가 없음 |
| 이 장에서 확인한 것 | 4코어 부팅 로그, 계약 위반 시 거절 | 문서 조항과 U-Boot 코드, 계약 위반 시 거절 |

"다시 끄기" 줄은 문서에서 읽은 차이입니다. Ch 32의 표에 `PSCI_CPU_OFF`가 있었던 것처럼 PSCI는 CPU를 펌웨어에 돌려보내는 함수가 있지만, booting.rst의 spin-table 절에는 커널에 들어온 CPU를 다시 내보내는 절차가 없습니다. CPU hotplug나 CPU별 전원 차단이 필요하면 PSCI가 필요한 이유입니다.

![spin-table과 PSCI 비교: spin-table은 primary가 cpu-release-addr에 entry를 기록하고 SEV를 보내면 대기 중인 CPU가 non-zero 값을 읽고 이동하며, PSCI는 primary가 SMC 또는 HVC로 CPU_ON을 호출하고 firmware와 플랫폼 코드가 대상 CPU를 시작](/images/blog/bootloader/diagrams/chapter33-spin-vs-psci.svg)

## 보조 CPU가 안 올라올 때

![secondary CPU 시작 확인 흐름: DT 또는 ACPI에서 enable 방식을 확인한 뒤 psci면 CPU_ON 요청, spin-table이면 cpu-release-addr 기록과 SEV를 거쳐 secondary가 커널 entry에 진입하고, 마지막으로 Linux online 여부를 확인](/images/blog/bootloader/diagrams/chapter33-smp-bringup-flow.svg)

이 장의 로그를 거꾸로 쓰면 점검 순서가 됩니다.

1. 부팅 로그 맨 앞(타임스탬프 0초)에서 `missing enable-method property`나 `missing or invalid cpu-release-addr property`를 찾습니다. 있으면 커널이 DTB 단계에서 그 CPU를 버린 것이므로, 부트로더가 넘긴 DTB를 봅니다. U-Boot에서는 `booti` 직전에 `fdt print /cpus`로 확인할 수 있습니다.
2. PSCI라면 `psci: PSCIv... detected`와 `SMC Calling Convention`이 찍혔는지 봅니다. `/psci` 노드의 `method`가 펌웨어와 맞지 않으면 이 단계에서 어긋납니다.
3. `smp: Brought up ... N CPUs`의 N과 `Booted secondary processor` 줄 수를 DTB의 CPU 노드 수와 비교합니다. DTB 단계를 통과했는데 빠진 CPU가 있으면 펌웨어 쪽입니다. [Ch 32](/blog/embedded/bootloader/chapter32-psci-smccc)처럼 U-Boot에서 `AFFINITY_INFO`로 그 CPU 상태를 물어볼 수 있고, `ON_PENDING`에 갇혀 있다면 플랫폼의 `pwr_domain_on` 쪽을 봐야 합니다.

## 정리

- AArch64 Linux는 CPU 노드의 `enable-method`로 깨우는 방법을 정하며, Linux 6.12 booting.rst는 부트로더가 모든 CPU 노드에 이를 넣으라고 요구합니다.
- TF-A v2.15.0 위에서 Debian 6.12 커널은 PSCI 1.1·SMCCC v1.5를 확인하고 `CPU_ON`으로 CPU 1~3을 올려 `Brought up 1 node, 4 CPUs`가 됐습니다.
- `enable-method`를 지운 CPU는 `missing enable-method property`, `cpu-release-addr` 없는 spin-table CPU는 `missing or invalid cpu-release-addr property`로 거절되고, 시스템은 2코어로 부팅을 계속했습니다.
- U-Boot의 spin-table 루프는 `wfe` / `ldr` / `cbz` / `br` 네 줄이고, `spin_table_update_dt()`는 모든 CPU가 spin-table일 때만 `cpu-release-addr`와 `/memreserve/`를 채웁니다.
- spin-table은 secondary CPU를 보드 코드가 U-Boot 루프로 데려와야 쓸 수 있어서, TF-A가 CPU를 붙잡고 있는 이 구성에서는 실행하지 않았습니다.

## 다음 편

다음은 [Ch 34: PCIe enumeration](/blog/embedded/bootloader/chapter34-pcie-enumeration)입니다. CPU 다음으로 부트로더가 찾아 주는 장치, PCIe 버스를 U-Boot가 어떻게 훑는지 봅니다.

## 관련 항목

- [Ch 25: ARM TF-A 통합](/blog/embedded/bootloader/chapter25-tfa-optee) — BL2가 넣는 `/psci`와 `enable-method`
- [Ch 32: PSCI와 SMCCC ABI](/blog/embedded/bootloader/chapter32-psci-smccc) — U-Boot에서 직접 보낸 `CPU_ON`
- [Ch 19: 커널 진입 관찰](/blog/embedded/bootloader/chapter19-kernel-handoff) — 주 CPU의 커널 진입 조건
- [Linux ARM64 boot protocol v6.12](https://docs.kernel.org/6.12/arch/arm64/booting.html)
