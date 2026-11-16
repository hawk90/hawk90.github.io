---
title: "PSCI와 SMCCC ABI — ARM 표준 SMC 호출 규약 분석"
slug: "embedded/bootloader/chapter32-psci-smccc"
date: 2026-05-22T09:32:00
description: "U-Boot smc 명령으로 TF-A v2.15.0 BL31에 PSCI CPU_ON·AFFINITY_INFO를 직접 보내, 대상 CPU가 entry로 들어오는 것과 ALREADY_ON·ON_PENDING 오류가 나는 조건을 QEMU에서 확인합니다."
series: "Bootloader Internals"
seriesOrder: 32
tags: [embedded, bootloader, psci, smccc, arm, tf-a, kernel]
topics: ["embedded"]
---

## 한 줄 요약

> SMCCC는 "어떻게 부르는가"(함수 ID와 레지스터 규약)이고, PSCI는 그 위에서 "CPU와 시스템 전원을 어떻게 바꾸는가"를 정한 계약입니다. U-Boot에서 `CPU_ON`을 직접 보내 보니, 대상 CPU는 요청한 주소에서 EL1로 깨어나 x0에 context id를 받았고, 같은 CPU에 다시 보내면 `PSCI_E_ALREADY_ON`(-4), 존재하지 않는 CPU에 보내면 영원히 `ON_PENDING`으로 남았습니다.

[Ch 31](/blog/embedded/bootloader/chapter31-tfa-bl31-runtime)에서 BL31이 OEN 4 칸을 `std_svc`에 연결해 두고, `PSCI_VERSION`이 `0x10001`(PSCI 1.1)을 돌려주는 것을 봤습니다. 이 장은 그 칸 안으로 들어가 PSCI 함수를 실제로 호출합니다. 환경은 Ch 31과 같습니다. TF-A **v2.15.0** `PLAT=qemu` release BL31, `CONFIG_CMD_SMC=y`로 빌드한 U-Boot v2024.04를 BL33으로, QEMU 11.1.3 `virt,secure=on`, `cortex-a57`이고, 이번에는 CPU를 4개(`-smp 4`) 줬습니다.

## SMCCC: 부르는 방법

SMCCC는 우편 규격과 비슷합니다. 봉투의 어느 칸에 무엇을 적는지만 정하고, 편지 내용은 받는 부서가 정합니다. 함수 ID 32비트의 칸 나눔은 아래 그림과 같고, 각 비트의 TF-A 상수는 [Ch 31](/blog/embedded/bootloader/chapter31-tfa-bl31-runtime)에 정리했습니다.

![SMCCC Function ID 32-bit 비트 레이아웃](/images/blog/bootloader/diagrams/chapter32-smccc-function-id.svg)

이 장에서 쓰는 PSCI 함수 ID는 TF-A `include/lib/psci/psci.h`에 있습니다.

| 함수 | ID | 유형·규약 | 인자 |
|------|----|----------|------|
| `PSCI_VERSION` | `0x84000000` | fast, SMC32 | 없음 |
| `PSCI_CPU_OFF` | `0x84000002` | fast, SMC32 | 없음 |
| `PSCI_CPU_ON_AARCH64` | `0xc4000003` | fast, SMC64 | target MPIDR, entry 주소, context id |
| `PSCI_AFFINITY_INFO_AARCH64` | `0xc4000004` | fast, SMC64 | target MPIDR, lowest affinity level |
| `PSCI_FEATURES` | `0x8400000A` | fast, SMC32 | 물어볼 함수 ID |

`CPU_ON`과 `AFFINITY_INFO`가 SMC64(bit 30 = 1)인 이유는 인자에 64비트 주소와 MPIDR이 들어가기 때문입니다. 결과는 x0 하나로 돌아오고, 오류 값은 같은 헤더의 `PSCI_E_*` 상수입니다.

| 상수 | 값 |
|------|----|
| `PSCI_E_SUCCESS` | 0 |
| `PSCI_E_NOT_SUPPORTED` | -1 |
| `PSCI_E_INVALID_PARAMS` | -2 |
| `PSCI_E_DENIED` | -3 |
| `PSCI_E_ALREADY_ON` | -4 |
| `PSCI_E_ON_PENDING` | -5 |
| `PSCI_E_INTERN_FAIL` | -6 |
| `PSCI_E_INVALID_ADDRESS` | -9 |

`AFFINITY_INFO`가 돌려주는 상태도 같은 헤더의 `aff_info_state_t`입니다. `AFF_STATE_ON` = 0, `AFF_STATE_OFF` = 1, `AFF_STATE_ON_PENDING` = 2입니다.

## CPU_ON을 직접 보내기

PSCI의 핵심 기능은 잠든 CPU를 깨우는 것입니다. 기숙사 사감이 방 번호(MPIDR)를 부르고 "이 쪽지(context id)를 들고 식당(entry 주소)으로 오라"고 전하는 셈입니다. 학생이 실제로 식당에 왔는지는 식당에 남긴 흔적으로 확인할 수 있습니다.

그래서 깨어난 CPU가 할 일을 32바이트짜리 기계어로 만들었습니다. 받은 x0(context id), 자기 `CurrentEL`, 자기 `MPIDR_EL1`을 `0x50000100`부터 적고 `wfe`로 잠듭니다.

```text
0000000000000000 <_start>:
   0:	d2aa0001 	mov	x1, #0x50000000
   4:	f9008020 	str	x0, [x1, #256]
   8:	d5384242 	mrs	x2, currentel
   c:	f9008422 	str	x2, [x1, #264]
  10:	d53800a3 	mrs	x3, mpidr_el1
  14:	f9008823 	str	x3, [x1, #272]
  18:	d503205f 	wfe
  1c:	17ffffff 	b	18 <_start+0x18>
```

`aarch64-elf-as`로 만든 이 조각을 QEMU `-device loader`로 `0x50000000`에 올리고, U-Boot에서 차례로 요청했습니다(`smc`는 결과 x0~x3을 찍고, x1~x3에는 보낸 인자가 그대로 보입니다).

```text
=> smc 0xc4000004 1 0
Res:  0x1 0x1 0x0 0x0
=> md.q 0x50000100 3
50000100: 0000000000000000 0000000000000000  ................
50000110: 0000000000000000                   ........
=> smc 0xc4000003 1 0x50000000 0xcafe
Res:  0x0 0x1 0x50000000 0xcafe
=> md.q 0x50000100 3
50000100: 000000000000cafe 0000000000000004  ................
50000110: 0000000080000001                   ........
=> smc 0xc4000004 1 0
Res:  0x0 0x1 0x0 0x0
=> smc 0xc4000003 1 0x50000000 0
Res:  0xfffffffffffffffc 0x1 0x50000000 0x0
```

한 줄씩 읽으면 PSCI 계약이 그대로 보입니다.

1. `AFFINITY_INFO(1)` = 1: CPU 1(MPIDR 1)은 `AFF_STATE_OFF`입니다. U-Boot는 CPU 0에서만 돌고 있습니다.
2. 기록 영역은 비어 있습니다.
3. `CPU_ON(1, 0x50000000, 0xcafe)` = 0: `PSCI_E_SUCCESS`입니다.
4. 기록 영역에 `0xcafe`, `0x4`, `0x80000001`이 생겼습니다. CPU 1이 `0x50000000`에서 실행을 시작했고, x0에는 요청한 context id가 들어 있었습니다. `CurrentEL` `0x4`는 EL 필드(비트 3:2)가 1, 곧 EL1입니다. 요청한 U-Boot와 같은 Non-secure EL1로 깨어났습니다. MPIDR `0x80000001`은 bit 31(RES1)과 Aff0 = 1입니다.
5. `AFFINITY_INFO(1)` = 0: 이제 `AFF_STATE_ON`입니다.
6. 같은 CPU에 `CPU_ON`을 다시 보내면 `0xfffffffffffffffc` = -4, `PSCI_E_ALREADY_ON`입니다.

QEMU는 캐시를 흉내 내지 않으므로, CPU 1이 MMU를 끈 채 쓴 값을 CPU 0이 캐시 관리 없이 바로 읽을 수 있었습니다. 실제 하드웨어에서 같은 실험을 하면 쓴 쪽의 캐시 정리와 읽는 쪽의 무효화가 필요합니다.

6번의 -4는 TF-A `lib/psci/psci_on.c:38`의 `cpu_on_validate_state()`에서 나옵니다.

```c
static int cpu_on_validate_state(aff_info_state_t aff_state)
{
	if (aff_state == AFF_STATE_ON) {
		return PSCI_E_ALREADY_ON;
	}

	if (aff_state == AFF_STATE_ON_PENDING) {
		return PSCI_E_ON_PENDING;
	}

	assert(aff_state == AFF_STATE_OFF);
	return PSCI_E_SUCCESS;
}
```

![PSCI CPU_ON 요청 흐름: Linux 호출 CPU가 SMC/HVC로 CPU_ON을 보내고, firmware가 검증 후 플랫폼 hook으로 대상 CPU 전원을 켜고 반환하며, 대상 CPU는 warm boot 경로를 거쳐 요청한 entry로 진입한 뒤 Linux online은 별도 단계로 확인](/images/blog/bootloader/diagrams/chapter32-psci-cpu-on-seq.svg)

위 실험에서 `CPU_ON`의 0 반환(3번)과 CPU 1의 entry 진입(4번)은 서로 다른 사건이었습니다. 3번 시점에는 CPU 1이 아직 깨어나지 않았을 수도 있고, 4번 기록을 보고서야 진입을 확인할 수 있습니다. Linux에서 CPU가 "online"이 되는 것은 그보다 더 뒤의 일이고, [Ch 33](/blog/embedded/bootloader/chapter33-smp-secondary-cpu-bringup)에서 다룹니다.

## ON_PENDING이 끝나지 않는 경우

존재하지 않는 CPU를 부르면 어떻게 될까요. `-smp 4`라 QEMU에는 CPU 0~3만 있는데, CPU 7(MPIDR 7)을 불러 봤습니다.

```text
=> smc 0xc4000004 7 0
Res:  0x1 0x7 0x0 0x0
=> smc 0xc4000003 7 0x50000000 0
Res:  0x0 0x7 0x50000000 0x0
=> smc 0xc4000004 7 0
Res:  0x2 0x7 0x0 0x0
=> smc 0xc4000003 7 0x50000000 0
Res:  0xfffffffffffffffb 0x7 0x50000000 0x0
```

BL31은 CPU 7을 `OFF`로 알고 있었고, `CPU_ON`에 성공(0)을 돌려줬습니다. 그 뒤 상태는 `ON_PENDING`(2)에서 멈췄고, 다시 부르자 `PSCI_E_ON_PENDING`(-5)이 나왔습니다. 실제로 깨어날 CPU가 없으니 이 상태는 끝나지 않습니다.

이유는 TF-A QEMU 포트의 두 코드에 있습니다. 첫째, `plat/qemu/qemu/include/platform_def.h`는 AArch64 빌드에서 `PLATFORM_CPU_PER_CLUSTER_SHIFT 4`(클러스터당 16코어)와 `PLATFORM_CLUSTER_COUNT 2`를 정의하고, `plat/qemu/common/topology.c:39`의 `plat_core_pos_by_mpidr()`는 Aff1 < 2, Aff0 < 16이면 유효한 CPU로 받습니다. BL31은 QEMU 명령줄의 `-smp 4`를 모르고 32개를 가정합니다. 둘째, `plat/qemu/common/qemu_pm.c:126`의 `qemu_pwr_domain_on()`은 대상 CPU가 실제로 있는지 확인하지 않고 hold pen에 신호를 쓴 뒤 바로 `PSCI_E_SUCCESS`를 돌려줍니다.

```c
static int qemu_pwr_domain_on(u_register_t mpidr)
{
	unsigned int pos = plat_core_pos_by_mpidr(mpidr);

	plat_hold_pen_signal((struct hold_slot *)PLAT_QEMU_HOLD_BASE,
			pos, secure_entrypoint);

	return PSCI_E_SUCCESS;
}
```

![TF-A가 관리하는 대상 CPU 상태: OFF에서 CPU_ON 접수로 ON_PENDING, warm boot 경로 마무리로 ON이 되며, 플랫폼 hook 실패 시 OFF로 복원되고 Linux online은 ON 이후의 별도 단계](/images/blog/bootloader/diagrams/ch32-power-state.svg)

상태도의 "플랫폼 hook 실패 시 OFF로 복원"은 `psci_cpu_on_start()`가 `pwr_domain_on()`의 반환이 `PSCI_E_SUCCESS`가 아니면 `psci_set_aff_info_state_by_idx(target_idx, AFF_STATE_OFF)`로 되돌리는 부분입니다. QEMU 포트의 `pwr_domain_on`은 항상 성공을 돌려주므로 이 복원 경로를 타지 않고, 그래서 CPU 7이 `ON_PENDING`에 갇혔습니다. 실제 SoC 포트라면 존재하지 않는 코어를 `plat_core_pos_by_mpidr()` 단계에서 거절하거나 `pwr_domain_on`에서 `PSCI_E_INTERN_FAIL`을 돌려줘야 이런 상태가 생기지 않습니다.

## 엔트리 주소는 누가 검사하나

`CPU_ON`의 entry 주소도 시험했습니다. CPU 2에 DRAM이 아닌 `0x1000`을 줬습니다.

```text
=> smc 0xc4000003 2 0x1000 0
Res:  0x0 0x2 0x1000 0x0
=> smc 0xc4000004 2 0
Res:  0x0 0x2 0x0 0x0
```

성공(0)이었고 CPU 2는 `ON`이 됐습니다. PSCI에는 `PSCI_E_INVALID_ADDRESS`(-9)가 있지만, 그 검사는 플랫폼이 제공해야 합니다. `lib/psci/psci_common.c`의 `psci_validate_entry_point()`는 `psci_plat_pm_ops->validate_ns_entrypoint`가 있을 때만 그것을 부르고 실패하면 `PSCI_E_INVALID_ADDRESS`를 돌려주는데, QEMU 포트의 `plat_qemu_psci_pm_ops`(`qemu_pm.c:217`)에는 이 항목이 없습니다. 그래서 어떤 주소든 받아들였고, CPU 2는 `0x1000`의 내용을 실행하러 갔습니다. Normal world가 잘못된 주소로 CPU를 켜는 것을 막는 일은 플랫폼 포트의 몫입니다.

## Linux가 같은 계약을 쓰는 방법

Linux는 위와 같은 호출을 직접 만들지 않고, device tree의 `/psci` 노드에서 호출 방법을 읽습니다. [Ch 25](/blog/embedded/bootloader/chapter25-tfa-optee)에서 이 구성의 BL2가 QEMU DTB에 써 넣은 노드를 U-Boot에서 읽었습니다.

```text
psci {
	cpu_on = <0xc4000003>;
	cpu_off = <0x84000002>;
	cpu_suspend = <0xc4000001>;
	method = "smc";
	compatible = "arm,psci-1.0", "arm,psci-0.2", "arm,psci";
};
```

`method = "smc"`가 이 장에서 쓴 SMC 명령을 고르고, `cpu_on = <0xc4000003>`은 위 실험의 `PSCI_CPU_ON_AARCH64`와 같은 ID입니다. 각 CPU 노드의 `enable-method = "psci"`(Ch 25에서 `cpu@1`에 있던 속성)는 그 CPU를 이 경로로 깨우라는 표시입니다. Linux가 이 노드를 읽고 실제로 어떤 함수 ID를 고르는지는 커널 로그로 확인할 수 있고, 다음 장에서 봅니다.

## 정리

- SMCCC는 함수 ID와 레지스터 규약을, PSCI는 그 위의 전원 관리 함수와 오류 코드를 정합니다. 이 BL31은 SMCCC v1.5, PSCI 1.1입니다.
- `CPU_ON(1, 0x50000000, 0xcafe)` 뒤 CPU 1은 그 주소에서 EL1로 실행을 시작했고, x0에 `0xcafe`를 받았습니다. `AFFINITY_INFO`는 1(OFF)에서 0(ON)으로 바뀌었습니다.
- 켜진 CPU에 다시 `CPU_ON`을 보내면 `PSCI_E_ALREADY_ON`(-4)입니다(`cpu_on_validate_state()`).
- TF-A QEMU 포트는 32코어를 가정하고 `pwr_domain_on`이 항상 성공하므로, 없는 CPU 7은 `ON_PENDING`(2)에 갇히고 재요청은 `PSCI_E_ON_PENDING`(-5)이 됩니다.
- entry 주소 검사(`validate_ns_entrypoint`)는 플랫폼 몫이며, QEMU 포트에는 없어서 `0x1000`도 받아들였습니다.
- Linux는 `/psci`의 `method`와 `enable-method = "psci"`로 같은 함수 ID를 씁니다.

## 다음 편

[Ch 33: ARM64 Secondary Core Bring-up](/blog/embedded/bootloader/chapter33-smp-secondary-cpu-bringup)에서는 이 장에서 손으로 보낸 `CPU_ON`을 Linux가 부팅 중에 어떻게 보내는지, 그리고 PSCI가 없는 spin-table 방식은 어떻게 다른지 봅니다.

## 관련 항목

- [Ch 25: ARM TF-A 통합](/blog/embedded/bootloader/chapter25-tfa-optee) — BL2가 쓰는 `/psci` 노드
- [Ch 31: TF-A BL31 EL3 Runtime](/blog/embedded/bootloader/chapter31-tfa-bl31-runtime) — OEN 4 칸과 `std_svc` 등록
- [Ch 33: ARM64 Secondary Core Bring-up](/blog/embedded/bootloader/chapter33-smp-secondary-cpu-bringup)
- [Arm PSCI specification (DEN0022)](https://developer.arm.com/documentation/den0022)
- [Arm SMC Calling Convention (DEN0028)](https://developer.arm.com/documentation/den0028)
