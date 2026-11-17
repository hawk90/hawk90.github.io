---
title: "Multi-core SMP Bring-up — PSCI·Secondary CPU 깨우기"
slug: "embedded/bsp/chapter09-smp-bringup"
date: 2026-05-18T09:09:00
description: "보드의 다른 코어를 깨우는 절차를 정리합니다. PSCI, spin-table, ARM CPU hotplug의 흐름을 살펴봅니다."
series: "BSP Development"
seriesOrder: 9
tags: [embedded, bsp, smp, psci, multicore]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

**부팅 직후 Linux는 CPU 하나로 시작하고, 나머지 CPU는 DT의 `enable-method`가 가리키는 방법으로 깨웁니다.** arm64에서 그 방법은 `psci`와 `spin-table` 둘이고, PSCI라면 결국 Ch 7의 BL31이 `CPU_ON` 요청을 받습니다.

이 장의 로그는 두 환경에서 받았습니다. 하나는 QEMU virt(`secure=on`, cortex-a57 ×4) 위에서 TF-A v2.15.0 BL31 → U-Boot v2024.04 → Linux 6.12(Ch 8에서 빌드한 `defconfig` 커널)로 이어지는 체인이고, 다른 하나는 Ch 3부터 쓴 Debian 13 hvf guest입니다. 첫 환경에서는 DT의 PSCI `method`를 일부러 틀리게 바꿔 실패도 재현했습니다.

## CPU bring-up의 큰 그림

비유하면 boot CPU는 먼저 출근한 당직자이고, 나머지 CPU는 문 밖에서 기다리는 동료입니다. 당직자가 출입 카드를 대 주는 방법이 `enable-method`입니다. arm64 boot protocol 문서(`Documentation/arch/arm64/booting.rst:431-452`)가 두 방법의 계약을 적어 둡니다.

| 방식 | 대기하는 쪽 | boot CPU가 하는 일 |
|------|-------------|------------------|
| `spin-table` | 예약 메모리에서 `cpu-release-addr`를 폴링(필요하면 `wfe`) | 그 주소에 진입 주소를 쓰고 `sev` |
| `psci` | 커널 밖(firmware) | PSCI `CPU_ON` 호출 |

DT binding `Documentation/devicetree/bindings/arm/cpus.yaml`의 `enable-method` enum에도 arm64용 값은 `psci`와 `spin-table`입니다(214~216행). 그 아래에 있는 vendor별 값들은 32-bit ARM SoC용입니다.

## enable-method — PSCI vs spin-table

QEMU virt 머신이 TF-A와 함께 만든 DT에서 U-Boot `fdt print`로 읽은 PSCI 노드입니다.

```text
=> fdt print /psci
psci {
	cpu_on = <0xc4000003>;
	cpu_off = <0x84000002>;
	cpu_suspend = <0xc4000001>;
	method = "smc";
	compatible = "arm,psci-1.0", "arm,psci-0.2", "arm,psci";
};
```

`cpu_on` 같은 속성은 PSCI v0.1 시절 firmware가 함수 ID를 알려 주던 방식입니다. compatible에 `arm,psci-0.2` 이상이 있으면 커널은 표준 ID를 씁니다. 실제 부팅 로그도 그렇게 말합니다.

```text
[    0.000000] psci: probing for conduit method from DT.
[    0.000000] psci: PSCIv1.1 detected in firmware.
[    0.000000] psci: Using standard PSCI v0.2 function IDs
[    0.000000] psci: MIGRATE_INFO_TYPE not supported.
[    0.000000] psci: SMC Calling Convention v1.5
```

같은 커널 메시지를 Debian hvf guest에서 보면 `SMC Calling Convention v1.0`이었고 DT `method`는 `hvc`였습니다(Ch 7). PSCI를 누가 제공하느냐에 따라 SMCCC 버전과 conduit이 다릅니다.

i.MX 8M Plus는 `imx8mp.dtsi`의 `psci` 노드가 `method = "smc"`이고 CPU 노드마다 `enable-method = "psci"`입니다.

## PSCI 흐름 — CPU_ON

함수 이름은 Linux 6.12와 TF-A v2.15.0 소스에서 확인한 것입니다.

| 단계 | 위치 |
|------|------|
| Linux가 CPU마다 `cpu_up()` → arch의 `__cpu_up()` | `kernel/smp.c:1000` `smp_init()`, `arch/arm64/kernel/smp.c:119` |
| `cpu_psci_cpu_boot()`가 진입 주소 `secondary_entry`의 물리 주소로 `psci_ops.cpu_on()` 호출 | `arch/arm64/kernel/psci.c:39-47` |
| `smc #0` → BL31 → `psci_cpu_on()` → `psci_cpu_on_start()` | TF-A `lib/psci/psci_main.c:25`, `lib/psci/psci_on.c:62` |
| 플랫폼 콜백 `pwr_domain_on()`이 코어 전원을 켬 | `psci_on.c:141` (i.MX 8M Plus는 `imx_pwr_domain_on`, Ch 7) |
| 새 코어가 BL31 warm entry에서 출발해 커널로 나감 | `bl31/aarch64/bl31_entrypoint.S:133` `bl31_warm_entrypoint` |
| 커널 `secondary_entry` → `secondary_startup` | `arch/arm64/kernel/head.S:368-372` |

`cpu_psci_cpu_boot()`의 실제 코드입니다.

```c
static int cpu_psci_cpu_boot(unsigned int cpu)
{
	phys_addr_t pa_secondary_entry = __pa_symbol(secondary_entry);
	int err = psci_ops.cpu_on(cpu_logical_map(cpu), pa_secondary_entry);
	if (err && err != -EPERM)
		pr_err("failed to boot CPU%d (%d)\n", cpu, err);

	return err;
}
```

새 코어가 쓸 idle task는 boot CPU가 `secondary_data.task`에 미리 넣어 둡니다(`arch/arm64/kernel/smp.c:128`, 구조체는 `asm/smp.h:68-71`). 그 다음 5초(`msecs_to_jiffies(5000)`) 동안 코어가 online이 되기를 기다립니다(`smp.c:143-148`).

QEMU 체인에서 성공한 bring-up입니다.

```text
[    0.051058] smp: Bringing up secondary CPUs ...
[    0.055742] CPU1: Booted secondary processor 0x0000000001 [0x411fd070]
[    0.077628] CPU2: Booted secondary processor 0x0000000002 [0x411fd070]
[    0.087828] CPU3: Booted secondary processor 0x0000000003 [0x411fd070]
[    0.088180] smp: Brought up 1 node, 4 CPUs
[    0.088710] SMP: Total of 4 processors activated.
```

`[0x411fd070]`은 MIDR 값입니다. hvf guest에서는 같은 줄이 `[0x610f0000]`(Apple 코어)로 나왔습니다. 6.12의 `SMP: Total of ... activated.` 줄(`smp.c:448`)에는 BogoMIPS가 없습니다.

## spin-table — PSCI 없는 환경

spin-table에서는 secondary CPU가 커널 밖 예약 메모리에서 기다립니다. `booting.rst:431-444`의 조건은 다음과 같습니다.

- CPU 노드에 `cpu-release-addr`가 있어야 하고, 그 주소는 "naturally-aligned 64-bit zero-initalised memory location"입니다.
- 대기 코드와 그 주소는 `/memreserve/`로 커널에 알린 예약 영역 안에 있어야 합니다.
- 대기 중인 CPU는 `wfe`로 쉬고, boot CPU가 주소에 0이 아닌 값을 쓴 뒤 `sev`를 보냅니다.

커널 쪽은 `arch/arm64/kernel/smp_spin_table.c`의 `smp_spin_table_cpu_boot()`가 이 일을 하고, 100행과 117행에 `sev()`가 있습니다. `cpu-release-addr`의 타입은 binding `cpus.yaml:258-264`가 정의합니다.

```c
cpu1: cpu@1 {
	device_type = "cpu";
	compatible = "arm,cortex-a53";
	reg = <0x0 0x1>;
	enable-method = "spin-table";
	cpu-release-addr = <0x0 0x80000ff8>;
};
```

위 주소는 예시입니다. 그 주소를 포함하는 `/memreserve/`와 그 영역에서 도는 대기 코드는 부트로더가 준비해야 합니다.

spin-table의 한계는 CPU를 *끄는* 경로가 없다는 점입니다. `smp_spin_table.c`의 `cpu_operations`에는 `cpu_init`·`cpu_prepare`·`cpu_boot`만 있고(124~126행), PSCI 쪽(`arch/arm64/kernel/psci.c`)에는 `cpu_disable`·`cpu_die`·`cpu_kill`이 더 있습니다(119~121행). CPU hotplug와 깊은 idle은 PSCI에서만 됩니다.

## smp_init — 커널 시작

secondary CPU를 깨우는 호출은 `kernel/smp.c:1000`의 `smp_init()`에서 시작합니다. 이 함수가 `"Bringing up secondary CPUs ..."`(1007행)와 `"Brought up %d node%s, %d CPU%s"`(1013행)를 찍습니다. 위 QEMU 로그에서 두 줄 사이가 37 ms(0.051 → 0.088초)였습니다. TCG 에뮬레이션 시간이므로 보드의 bring-up 시간이 아닙니다.

## kernel CPU hotplug

PSCI가 정상이면 부팅 후에도 CPU를 끄고 켤 수 있습니다.

```bash
echo 0 > /sys/devices/system/cpu/cpu2/online
echo 1 > /sys/devices/system/cpu/cpu2/online
cat /sys/devices/system/cpu/online
```

끄는 쪽은 PSCI `CPU_OFF`입니다. 그런데 firmware의 `CPU_OFF`가 돌아오면 무슨 일이 생기는지가 이 시리즈의 hvf guest에서 실제로 드러났습니다. `cpu2`를 끄자 다음 로그와 함께 guest 전체가 멈췄습니다.

```text
[ 1791.633288] psci: CPU2 killed (polled 0 ms)
[ 1791.683646] ------------[ cut here ]------------
[ 1791.683859] kernel BUG at arch/arm64/kernel/smp.c:393!
[ 1791.684071] Internal error: Oops - BUG: 00000000f2000800 [#1] SMP
...
[ 1791.686927] pc : cpu_die+0x44/0x50
...
[ 1791.881605] Kernel panic - not syncing: Attempted to kill the idle task!
```

`smp.c:375-393`의 `cpu_die()`는 `ops->cpu_die(cpu)`를 부른 뒤 바로 `BUG()`입니다. 주석은 "Actually shutdown the CPU. This must never fail."입니다. PSCI `CPU_OFF`는 성공하면 돌아오지 않는 호출이므로, 돌아왔다는 것 자체가 firmware(여기서는 QEMU hvf)의 실패입니다. 같은 guest에서 `/sys/devices/system/cpu/online`은 끄기 직후 `0-1,3`이었습니다. 새 보드에서 hotplug 시험을 할 때 이 BUG가 보이면 커널이 아니라 firmware의 `CPU_OFF` 구현을 봅니다.

## 흔한 실패 모드

### PSCI `method`와 firmware가 다름

QEMU 체인에서 U-Boot로 DT를 고쳐 `method`를 `hvc`로 바꾼 뒤 부팅했습니다. 이 머신에는 EL2가 없으므로 HVC를 받아 줄 쪽이 없습니다.

```text
=> fdt addr ${fdtcontroladdr}
=> fdt set /psci method hvc
=> booti ${kernel_addr_r} - ${fdtcontroladdr}
...
[    0.000000] psci: probing for conduit method from DT.
[    0.000000] Internal error: Oops - Undefined instruction: 0000000002000000 [#1] PREEMPT SMP
[    0.000000] pc : __arm_smccc_hvc+0x4/0x30
[    0.000000] lr : __invoke_psci_fn_hvc+0x40/0x70
...
[    0.000000] x2 : 0000000000000000 x1 : 0000000000000000 x0 : 0000000084000000
```

secondary CPU를 깨우기도 전에, PSCI 버전을 묻는 첫 호출(`x0 = 0x84000000`, `include/uapi/linux/psci.h:33`의 `PSCI_0_2_FN_PSCI_VERSION`)에서 커널이 죽습니다. timeout이 아니라 undefined instruction입니다. `faddr2line`으로 PC를 소스 줄로 바꾸면 `arch/arm64/kernel/smccc-call.S:43`과 `drivers/firmware/psci/psci.c:120`이 나옵니다(Ch 11).

### 하나의 CPU만 안 올라옴

`__cpu_up()`이 출력하는 문구는 두 가지입니다(`smp.c:135, 148`). firmware가 `CPU_ON`을 거절하면 `CPU%u: failed to boot: %d`가, 요청은 받았는데 5초 안에 그 코어가 커널에 도착하지 않으면 `CPU%u: failed to come online`이 찍힙니다. 앞은 PSCI 반환값(`psci_to_linux_errno()`로 바뀐 값)을 보고, 뒤는 warm boot 경로(BL31 warm entry, 코어 전원·클록)를 봅니다. 이 글은 두 메시지를 재현하지 않았습니다.

### 모든 secondary CPU 실패

`smp: Brought up 1 node, 1 CPU`는 secondary가 하나도 올라오지 않았다는 뜻입니다. CPU 노드에 `enable-method`가 없으면 `arch/arm64/kernel/cpu_ops.c:76`이 `%pOF: missing enable-method property`를 찍고 그 CPU를 쓰지 않습니다. 이 글은 이 경우를 재현하지 않았습니다.

## 정리

- arm64의 `enable-method`는 `psci`와 `spin-table` 둘이고, 계약은 `Documentation/arch/arm64/booting.rst:431-452`에 있습니다.
- PSCI 경로는 `cpu_psci_cpu_boot()` → `smc` → TF-A `psci_cpu_on_start()` → `pwr_domain_on()` → `bl31_warm_entrypoint` → `secondary_entry`입니다.
- QEMU TCG + TF-A 체인에서 4코어가 37 ms(TCG 시간, 보드 값 아님) 안에 올라왔고, SMCCC는 v1.5로 보고됐습니다.
- DT `method`를 firmware와 다르게 쓰면 첫 PSCI 호출에서 undefined instruction으로 죽습니다.
- spin-table에는 CPU를 끄는 경로가 없어 hotplug·깊은 idle은 PSCI에서만 됩니다.
- firmware의 `CPU_OFF`가 돌아오면 `cpu_die()`의 `BUG()`(`smp.c:393`)로 끝납니다. hvf guest에서 실제로 일어났습니다.

## 다음 편 예고

[Ch 10: 첫 부팅 — 0%부터 login prompt까지](/blog/embedded/bsp/chapter10-first-boot)에서는 보드를 켠 순간부터 login이 뜨기까지의 전체 부팅 단계를 체크포인트별로 따라갑니다.

## 관련 항목

- [Ch 7: Device Tree 작성](/blog/embedded/bsp/chapter07-tfa-trustzone)
- [Ch 8: Linux 커널 설정](/blog/embedded/bsp/chapter08-kernel-config)
- [Ch 10: 첫 부팅 — 0%부터 login prompt까지](/blog/embedded/bsp/chapter10-first-boot)
- [Ch 13: Power Management](/blog/embedded/bsp/chapter13-power-management) — CPU hotplug와 cpuidle 통합
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface) — multi-core scheduling 기본
- [Embedded Performance Engineering](/blog/embedded/performance-engineering/00-preface) — SMP scaling
