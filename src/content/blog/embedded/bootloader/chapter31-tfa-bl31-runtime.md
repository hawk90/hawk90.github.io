---
title: "TF-A BL31 EL3 Runtime — 서비스 등록과 요청 처리 경계"
slug: "embedded/bootloader/chapter31-tfa-bl31-runtime"
date: 2026-05-22T09:31:00
description: "TF-A v2.15.0 QEMU 빌드의 BL31 ELF에서 실제로 링크된 런타임 서비스 descriptor를 읽고, U-Boot smc 명령으로 표준·미등록 OEN에 요청을 보내 디스패치 표와 SMC_UNK 경로를 확인합니다."
series: "Bootloader Internals"
seriesOrder: 31
tags: [embedded, bootloader, tf-a, bl31, el3, psci, sdei, ras, smccc, arm]
topics: ["embedded"]
---

[Ch 25](/blog/embedded/bootloader/chapter25-tfa-optee)에서 U-Boot의 `reset`이 SMC로 BL31에 들어가 플랫폼을 재시작하는 것을 봤습니다. 이 장은 그 SMC가 BL31 안에서 어디로 가는지를 따라갑니다. BL31은 부팅이 끝난 뒤에도 메모리에 남아 Normal world의 요청을 받는 **상주 펌웨어**이고, 어떤 요청을 받을지는 빌드할 때 링크된 런타임 서비스가 정합니다.

실험 대상은 Ch 25와 같은 TF-A **v2.15.0** `PLAT=qemu` release 빌드입니다. 런타임 서비스 목록은 그 `bl31.elf`에서 읽었고, 요청은 `CONFIG_CMD_SMC=y`를 켜고 다시 빌드한 U-Boot v2024.04 `qemu_arm64`를 BL33으로 넣어 U-Boot 셸의 `smc` 명령으로 보냈습니다. QEMU는 11.1.3 `virt,secure=on`, `cortex-a57`입니다.

## 한 줄 요약

이 BL31에 등록된 런타임 서비스는 `std_svc`(OEN 4)와 `arm_arch_svc`(OEN 0) 두 개뿐입니다. BL31은 SMC 함수 ID에서 `(호출 유형 << 6) | OEN`을 뽑아 128칸 표에서 descriptor를 찾고, 비어 있으면 `SMC_UNK`(-1)를 돌려줍니다. U-Boot에서 보낸 `SMCCC_VERSION`은 `0x10005`, `PSCI_VERSION`은 `0x10001`이었고, 등록되지 않은 SiP(OEN 2)와 예약 비트가 선 요청은 `0xffffffffffffffff`이었습니다.

## SMC 함수 ID의 구조

SMC는 회사 대표 전화번호와 비슷합니다. 번호 하나로 걸지만, 내선 번호에 따라 연결되는 부서가 다릅니다. SMC Calling Convention(SMCCC)에서 그 내선 번호가 32비트 함수 ID이고, TF-A는 `include/lib/smccc.h`에서 필드를 이렇게 정의합니다.

| 필드 | 비트 | 상수 | 뜻 |
|------|------|------|-----|
| 호출 유형 | 31 | `FUNCID_TYPE_SHIFT 31`, `FUNCID_TYPE_MASK 0x1` | 1 = fast call, 0 = yielding call |
| 호출 규약 | 30 | `FUNCID_CC_SHIFT 30`, `SMC_64 1`, `SMC_32 0` | 1 = SMC64, 0 = SMC32 |
| OEN(Owning Entity Number) | 29:24 | `FUNCID_OEN_SHIFT 24`, `FUNCID_OEN_MASK 0x3f` | 어느 "부서"인가 |
| 예약 | 23:17 | `FUNCID_FC_RESERVED_SHIFT 17`, 폭 7 | fast call에서는 0이어야 함 |
| SVE hint | 16 | `FUNCID_SVE_HINT_SHIFT 16` | SMCCC v1.3 힌트. `sync_handler()`가 디스패치 전에 지움 |
| 함수 번호 | 15:0 | — | 부서 안의 기능 |

OEN 값도 같은 헤더에 있습니다. `OEN_ARM_START 0`(Arm 아키텍처 호출), `OEN_SIP_START 2`(SoC 제조사), `OEN_STD_START 4`(PSCI 같은 표준 서비스) 등이고, 전체 범위는 `OEN_LIMIT 64`입니다. 예를 들어 `PSCI_VERSION`은 `0x84000000`이라 bit 31 = 1(fast), bit 30 = 0(SMC32), OEN = 4입니다.

## 이 BL31에는 무엇이 등록됐나

TF-A 소스에는 `DECLARE_RT_SVC()`가 여러 곳에 있습니다. v2.15.0 트리에서 찾으면 `services/std_svc/std_svc_setup.c`, `services/arm_arch_svc/arm_arch_svc_setup.c` 말고도 OP-TEE 디스패처(`services/spd/opteed/opteed_main.c`), TSP(`tspd_main.c`), Trusty, `services/el3/ven_el3_svc.c`, ChromeOS OEM 서비스, QEMU SBSA 플랫폼의 SiP 서비스(`plat/qemu/qemu_sbsa/sbsa_sip_svc.c`)가 나옵니다. 그런데 소스에 있다고 이미지에 들어가는 것은 아닙니다. 링크된 결과를 봐야 합니다.

`DECLARE_RT_SVC()`는 descriptor를 별도 섹션에 놓고, 링커 스크립트는 그 섹션을 `__RT_SVC_DESCS_START__`와 `__RT_SVC_DESCS_END__` 사이에 모읍니다. `bl31.elf`의 심볼을 주소 순으로 보면 이렇습니다.

```text
000000000e09b070 R __RT_SVC_DESCS_START__
000000000e09b070 r __svc_desc_std_svc
000000000e09b090 r __svc_desc_arm_arch_svc
000000000e09b0b0 R __RT_SVC_DESCS_END__
000000000e0bcf58 b rt_svc_descs_indices
```

두 개, 각각 0x20바이트입니다. 이 빌드에는 `SPD`를 넣지 않았고, `services/el3/ven_el3_svc.c`는 `bl31/bl31.mk`에서 `ENABLE_PMF`나 `USE_DEBUGFS`가 켜질 때만 들어가며, SiP 서비스는 플랫폼마다 따로 넣는 파일이라 나머지 선언은 링크되지 않았습니다. SDEI는 자기 descriptor가 없고 `std_svc` 안에서 `#if SDEI_SUPPORT`로 나뉘는데, 이 빌드에서는 그것도 꺼져 있습니다(`bl31.elf`에 `sdei`가 들어간 심볼이 하나도 없음). 두 descriptor의 원본 선언은 다음과 같습니다.

```c
/* services/std_svc/std_svc_setup.c:269 */
DECLARE_RT_SVC(
		std_svc,

		OEN_STD_START,
		OEN_STD_END,
		SMC_TYPE_FAST,
		std_svc_setup,
		std_svc_smc_handler
);

/* services/arm_arch_svc/arm_arch_svc_setup.c:333 */
DECLARE_RT_SVC(
		arm_arch_svc,
		OEN_ARM_START,
		OEN_ARM_END,
		SMC_TYPE_FAST,
		NULL,
		arm_arch_svc_smc_handler
);
```

`include/common/runtime_svc.h:61`의 `rt_svc_desc_t`는 `start_oen`, `end_oen`, `call_type`(각 `uint8_t`), 그리고 `name`, `init`, `handle` 포인터입니다. 이 배치대로 섹션의 원본 바이트를 읽으면 선언과 그대로 맞습니다.

```text
 e09b070 04040100 00000000 a5af090e 00000000  ................
 e09b080 f044090e 00000000 1048090e 00000000  .D.......H......
 e09b090 00000100 00000000 adaf090e 00000000  ................
 e09b0a0 00000000 00000000 c002090e 00000000  ................
```

첫 descriptor는 `04 04 01`(OEN 4~4, fast)이고, `init` `0xe0944f0`과 `handle` `0xe094810`은 `nm`의 `std_svc_setup`, `std_svc_smc_handler` 주소입니다. `name` `0xe09afa5`에는 문자열 `std_svc`가 있습니다. 둘째는 `00 00 01`(OEN 0~0, fast)에 `init`이 0, 곧 선언의 `NULL`이고, `handle` `0xe0902c0`은 `arm_arch_svc_smc_handler`입니다.

## 등록 — 128칸짜리 내선 표

BL31 초기화의 `runtime_svc_init()`(`common/runtime_svc.c`)은 내선 표를 만듭니다. 먼저 `memset(rt_svc_descs_indices, -1, sizeof(rt_svc_descs_indices))`로 128칸(`MAX_RT_SVCS`)을 모두 "연결 안 됨"으로 채웁니다. 그다음 descriptor마다 `validate_rt_svc_desc()`로 검사하고(실패하면 `Invalid runtime service descriptor`를 찍고 `panic()`), `init`이 있으면 부르고(실패하면 `Error initializing runtime service %s`를 찍고 그 서비스만 건너뜀), OEN 범위의 칸에 descriptor 번호를 적습니다.

칸 번호는 `include/common/runtime_svc.h:108`의 `get_unique_oen()`이 정합니다.

```c
	return ((call_type & FUNCID_TYPE_MASK) << FUNCID_OEN_WIDTH) |
		(oen & FUNCID_OEN_MASK);
```

`FUNCID_OEN_WIDTH`가 6이므로 fast call은 64~127, yielding call은 0~63 칸을 씁니다. 이 빌드에서 채워지는 칸은 `std_svc`의 (1 << 6) | 4 = 68번과 `arm_arch_svc`의 (1 << 6) | 0 = 64번, 두 칸뿐이고 나머지 126칸은 -1입니다.

## 요청 경로 — 벡터에서 핸들러까지

![SMC 디스패치 흐름 — EL1의 smc #0에서 BL31 벡터, handler_sync_exception(), sync_handler()의 OEN 조회를 거쳐 std_svc_smc_handler까지](/images/blog/bootloader/diagrams/chapter31-smc-dispatcher.svg)

v2.15.0에서 AArch64 SMC 하나가 지나가는 길은 다음과 같습니다.

1. 하위 EL의 AArch64 동기 예외는 EL3 벡터 테이블(`bl31/aarch64/runtime_exceptions.S`의 `vector_base runtime_exceptions`)에서 "Lower EL using AArch64 : 0x400 - 0x600" 구간의 `sync_exception_aarch64`로 들어옵니다.
2. `handle_sync_exception` 매크로는 `ESR_EL3`가 `EC_IMP_DEF_EL3`인 특수한 경우만 빠른 경로로 보내고, 나머지는 `prepare_el3_entry` 뒤 C 함수 `handler_sync_exception()`을 부릅니다.
3. `handler_sync_exception()`(`common/runtime_svc.c`)은 `ESR_EL3`의 예외 종류가 `EC_AARCH64_SMC`나 `EC_AARCH32_SMC`면 `sync_handler()`로 넘깁니다.
4. `sync_handler()`는 fast call의 예약 비트(23:17)가 0이 아니면 바로 `smc_unknown()`을 부릅니다. 그다음 `get_handler_for_smc_fid()`가 위 128칸 표를 보고, 칸이 비어 있으면(descriptor 번호가 개수 이상이면) 역시 `smc_unknown()`입니다.
5. `smc_unknown()`은 저장된 컨텍스트의 x0에 `SMC_UNK`(`include/lib/smccc.h:114`, -1)를 써서 돌려보냅니다.

같은 파일의 `handle_runtime_svc()`는 이름이 비슷하지만 주석대로 "in AArch32 mode"용 경로입니다. 오래된 자료에서 AArch64 경로를 이 함수로 설명하는 경우가 있는데, v2.15.0 AArch64 BL31에서는 위 2~4단계가 그 역할을 합니다.

## U-Boot에서 직접 두드려 보기

표가 정말 이렇게 동작하는지 보려고, U-Boot의 `smc` 명령(`cmd/Kconfig`의 `CMD_SMC`, "Mostly useful for development and testing")을 켜고 Ch 25의 FIP에서 BL33만 `fiptool update --nt-fw`로 바꿨습니다. `smc <fid> [args...]`는 결과 레지스터 x0~x3을 찍습니다. 상태를 바꾸지 않는 질의만 보냈습니다.

```text
=> smc 0x80000000
Res:  0x10005 0x0 0x0 0x0
=> smc 0x80000001 0x80008000
Res:  0x0 0x80008000 0x0 0x0
=> smc 0x84000000
Res:  0x10001 0x0 0x0 0x0
=> smc 0x8400000a 0xc4000003
Res:  0x0 0xc4000003 0x0 0x0
=> smc 0x8400000a 0xc4000012
Res:  0xffffffffffffffff 0xc4000012 0x0 0x0
=> smc 0xc2000000
Res:  0xffffffffffffffff 0x0 0x0 0x0
=> smc 0x85000000
Res:  0xffffffffffffffff 0x0 0x0 0x0
=> smc 0x84800000
Res:  0xffffffffffffffff 0x0 0x0 0x0
```

| 요청 | OEN → 칸 | 결과 x0 | 해석 |
|------|---------|--------|------|
| `SMCCC_VERSION` `0x80000000` | 0 → 64 | `0x10005` | `SMCCC_MAJOR_VERSION 1`, `SMCCC_MINOR_VERSION 5` → v1.5 |
| `SMCCC_ARCH_FEATURES`(`SMCCC_ARCH_WORKAROUND_1`) | 0 → 64 | `0x0` | 이 workaround 호출을 지원 |
| `PSCI_VERSION` `0x84000000` | 4 → 68 | `0x10001` | `PSCI_MAJOR_VER (1 << 16)`, `PSCI_MINOR_VER 0x1` → PSCI 1.1 |
| `PSCI_FEATURES`(`PSCI_CPU_ON_AARCH64` `0xc4000003`) | 4 → 68 | `0x0` | 지원 |
| `PSCI_FEATURES`(`PSCI_SYSTEM_RESET2_AARCH64` `0xc4000012`) | 4 → 68 | `-1` | `PSCI_E_NOT_SUPPORTED`. 표는 찾았고 PSCI가 "그 기능 없음"이라고 답함 |
| SiP `0xc2000000` | 2 → 66 | `-1` | `SMC_UNK`. 칸이 비어 있음 |
| `0x85000000` | 5 → 69 | `-1` | `SMC_UNK`. 칸이 비어 있음 |
| `0x84800000` | 4, 예약 비트 23 | `-1` | `SMC_UNK`. 표를 보기 전에 예약 비트 검사에서 거절 |

같은 -1이라도 출처가 둘입니다. `SYSTEM_RESET2` 질의는 내선 표에서 PSCI 부서까지 연결됐고, PSCI가 "그 기능은 없다"고 답한 것입니다(`PSCI_E_NOT_SUPPORTED`, `include/lib/psci/psci.h:163`). 반면 SiP 요청은 내선 표의 빈칸에 걸려 부서까지 가지도 못했습니다(`SMC_UNK`). 마지막 줄은 OEN 4라 PSCI 칸이 채워져 있는데도, 예약 비트 하나 때문에 `sync_handler()` 첫 검사에서 막혔습니다. 결과 x1에 보낸 인자가 그대로 보이는 것은 서비스가 x0만 써서 돌려줬기 때문입니다.

실제 SoC에서는 이 표가 다릅니다. 제조사 SiP 서비스(OEN 2)가 들어가면 66번 칸이 채워지고, Linux의 SoC 드라이버가 그 번호로 클록이나 전원을 요청합니다. "이 SMC가 왜 -1을 돌려주나"를 조사할 때는 위 표처럼, 먼저 그 OEN의 칸이 그 BL31 이미지에 있는지 `nm`으로 확인하고, 있으면 그다음 서비스 핸들러 안을 봅니다.

## 표준 서비스 안쪽

`std_svc_smc_handler()`는 OEN 4 안에서 다시 나눕니다. `std_svc_setup.c:135`의 `is_psci_fid(smc_fid)`면 PSCI로, `#if SDEI_SUPPORT`(184행) 안의 `is_sdei_fid()`면 SDEI로 보내는 식입니다. 이 빌드는 SDEI를 넣지 않았으므로 SDEI 함수 ID는 OEN 4 칸까지는 가지만, `std_svc_smc_handler()`의 `default:` 분기에서 `Unimplemented Standard Service Call`(VERBOSE 로그)과 함께 `SMC_UNK`로 돌아갑니다. 서비스 포함 여부는 `DECLARE_RT_SVC()` 하나가 아니라, 이런 빌드 옵션까지 함께 봐야 정해집니다. PSCI 함수들의 의미는 [Ch 32](/blog/embedded/bootloader/chapter32-psci-smccc)에서 다룹니다.

## 정리

- TF-A v2.15.0 QEMU release BL31에는 런타임 서비스 descriptor가 `std_svc`(OEN 4)와 `arm_arch_svc`(OEN 0) 두 개, 각각 0x20 B로 링크됐습니다. 소스의 다른 `DECLARE_RT_SVC()`(OP-TEE, TSP, SiP 등)는 빌드 옵션에 따라 빠집니다.
- descriptor 원본 바이트의 OEN·init·handler 포인터가 선언과 `nm` 주소에 그대로 맞습니다.
- `runtime_svc_init()`은 128칸 표를 -1로 채운 뒤 `(유형 << 6) | OEN` 칸에 descriptor 번호를 적습니다. 이 빌드는 64번과 68번 두 칸만 씁니다.
- AArch64 SMC는 벡터 0x400 → `handle_sync_exception` → `handler_sync_exception()` → `sync_handler()`로 가며, `handle_runtime_svc()`는 AArch32 경로입니다.
- 실측: SMCCC v1.5(`0x10005`), PSCI 1.1(`0x10001`), 미등록 OEN과 예약 비트 위반은 `SMC_UNK`, 등록된 PSCI의 미지원 기능은 `PSCI_E_NOT_SUPPORTED`로 둘 다 -1이지만 거절된 위치가 다릅니다.

## 다음 편

[Ch 32: PSCI와 SMCCC ABI](/blog/embedded/bootloader/chapter32-psci-smccc)에서는 OEN 4 칸 안쪽, PSCI 함수들이 CPU와 전원 상태를 어떻게 바꾸는지 봅니다.

## 관련 항목

- [Ch 4: 부트 단계 — BL1 → SPL → TPL → U-Boot Proper](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 25: ARM TF-A 통합 — BL1·BL2·BL31·BL32·BL33](/blog/embedded/bootloader/chapter25-tfa-optee) — 같은 빌드로 본 부팅 흐름과 reset 경로
- [Ch 32: PSCI와 SMCCC ABI](/blog/embedded/bootloader/chapter32-psci-smccc)
- [TF-A v2.15.0 — docs/getting_started/rt-svc-writers-guide.rst](https://github.com/TrustedFirmware-A/trusted-firmware-a/blob/v2.15.0/docs/getting_started/rt-svc-writers-guide.rst) — `DECLARE_RT_SVC()` 사용법
- [Arm SMC Calling Convention (DEN0028)](https://developer.arm.com/documentation/den0028)
