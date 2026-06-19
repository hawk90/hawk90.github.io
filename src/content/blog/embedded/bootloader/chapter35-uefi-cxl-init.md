---
title: "EFI·UEFI에서 CXL 초기화 — CEDT 생성과 HDM Decoder 사전 설정"
date: 2026-06-19T09:02:00
description: "EDK II 기반 UEFI에서 CXL 디바이스 초기화 — CEDT(CXL Early Discovery Table) 생성, HDM Decoder 사전 설정, ACPI handoff."
series: "Bootloader Internals"
seriesOrder: 35
tags: [embedded, bootloader, uefi, edk2, cxl, cedt, acpi, hdm-decoder]
draft: false
---

## 한 줄 요약

> **"UEFI는 *enumeration 결과*를 *ACPI 테이블*로 *커널에 인계*합니다."** — *CEDT (CXL Early Discovery Table)*가 *host bridge·memory window·interleave 규칙*을 담고, *HDM Decoder가 부팅 시점에 이미 프로그래밍*되어 있어 *커널이 깨어났을 때 즉시 메모리를 사용*할 수 있습니다.

[Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)에서 *U-Boot의 PCIe enumeration*과 *CXL DVSEC scan*을 봤습니다. *서버 환경*에서는 *EDK II 기반 UEFI*가 *비슷한 흐름*에 *ACPI 통합*을 더해 *훨씬 정교한 인계 절차*를 거칩니다. 이 장은 *UEFI에서 CXL 초기화가 어떻게 이루어지는지*, *어떤 ACPI 테이블이 만들어지는지*를 분해합니다.

## UEFI와 U-Boot의 차이

같은 *enumeration 작업*이지만 *환경이 다릅니다*.

| 항목 | U-Boot | UEFI |
|------|--------|------|
| 사용처 | 임베디드 | 서버·데스크탑 |
| 인계 방식 | DTB (Device Tree) | ACPI tables |
| CXL 표준 통합 | 비교적 늦음 | spec 발표 직후 |
| HDM Decoder 처리 | 단순 | CFMWS 기반 정교 |
| Secure Boot 통합 | 옵션 | 표준 |
| Hot-add 지원 | 제한적 | spec |

서버 CXL 환경에서는 *UEFI가 표준*입니다.

## EDK II의 CXL 모듈

EDK II는 *CXL 지원을 별도 DXE 드라이버 모듈*로 제공합니다. *실제 모듈 이름*은 *EDK II 버전과 vendor fork*마다 다르지만 *역할 분류*가 비슷합니다:

| 역할 | 모듈 카테고리 |
|------|--------------|
| CXL bus enumeration·DVSEC 검출 | bus driver (PCI/CXL bus DXE) |
| CXL.mem device 초기화·HDM 프로그래밍 | memory device driver DXE |
| CXL port·switch 처리 | port driver DXE |
| CEDT ACPI table 생성 | ACPI table generator |
| CXL host bridge 추상화 | host bridge driver |

부팅 흐름에서 *bus driver가 가장 먼저 동작*해 *디바이스 발견*, 그 다음 *memory driver가 HDM Decoder 프로그래밍*, 마지막에 *ACPI generator가 CEDT 생성*. *실 모듈 이름은 `MdeModulePkg`·OEM platform fork*를 참고합니다.

## CEDT 구조

*CEDT (CXL Early Discovery Table)*는 CXL의 *ACPI table*입니다. UEFI Spec과 CXL Spec 양쪽에 정의:

| Subtable | Type | 의미 |
|----------|------|------|
| Header | — | "CEDT" signature + revision |
| CHBS | 0x00 | CXL Host Bridge Structure |
| CFMWS | 0x01 | CXL Fixed Memory Window Structure |
| CXIMS | 0x02 | CXL XOR Interleave Math Structure |
| RDPAS | 0x03 | RCEC (Root Complex Event Collector) Downstream Port Association |
| CSDS | 0x04 | CXL System Description Structure |

핵심은 *CHBS·CFMWS 두 가지*. *CHBS가 어디에 host bridge가 있나*, *CFMWS가 어느 SPA range가 CXL에 매핑되어 있나*를 알려 줍니다.

## CHBS — Host Bridge Structure

각 CXL host bridge마다 CHBS 항목:

| Field | 의미 |
|-------|------|
| Subtable Type | 0x00 (CHBS) |
| UID | 고유 식별자 |
| CXL Version | 0x0001 (1.1), 0x0002 (2.0) |
| Base | host bridge component register block 시작 주소 |
| Length | register block 크기 (0x10000 = 64 KB 기본) |

호스트 커널이 *CHBS를 보고* *각 host bridge 위치*를 압니다.

## CFMWS — Fixed Memory Window Structure

가장 중요한 항목. *어느 SPA range가 CXL용으로 예약*되어 있나:

| Field | 의미 |
|-------|------|
| Subtable Type | 0x01 (CFMWS) |
| Window Size | window 크기 (예: 512 GB) |
| ENIW (Encoded Number of Interleave Ways) | interleave 방향 수 |
| HBIG (Host Bridge Interleave Granularity) | 256 B·512 B·...·16 KB |
| Restrictions | type 3 only / volatile only / persistent only 등 |
| QTG ID | QoS Throttling Group |
| Window Base Address | 시작 SPA |
| First Interleave Target List Index | 매핑된 host bridge IDs |

CFMWS가 *여러 개*면 *각각 다른 메모리 영역·다른 interleave 정책*입니다. 예를 들어:
- *CFMWS 0*: 직접 attach 256 GB, single host bridge
- *CFMWS 1*: pooling용 1 TB, 2-way interleave

## HDM Decoder 사전 프로그래밍

UEFI는 *enumeration이 끝나면 HDM Decoder를 미리 프로그래밍*해 둡니다.

이유:
1. 커널이 깨어났을 때 *즉시 메모리를 system RAM으로 인식*하게 함
2. *SRAT·HMAT 통합*이 *부팅 시점에 완료*
3. *NUMA 노드 자동 등록*

이를 *Auto-Commit*이라 부르며, *firmware-managed 모드*입니다. *커널 측이 commit 불필요*.

대조적으로 *user-managed 모드*는 *커널 부팅 후 cxl-cli로 commit*. *Hot-add·테스트*에는 user-managed가 유리.

## SRAT와 HMAT 통합

CXL.mem 메모리는 *별도 ACPI 테이블*에도 등록됩니다.

| 테이블 | 역할 | CXL 영향 |
|-------|------|---------|
| MADT | CPU·local APIC | 변경 없음 |
| SRAT | NUMA 노드 → CPU·memory affinity | CXL.mem 영역이 *별도 노드*로 등록 |
| HMAT | memory tier (latency·bandwidth) | CXL.mem이 *higher latency tier*로 분류 |
| SLIT | NUMA 노드 간 거리 | CXL 노드 *distance 50~80*으로 등록 |
| MCFG | PCIe config space | 변경 없음 |

핵심은 *HMAT*. UEFI가 *CXL 디바이스의 latency·bandwidth*를 *HMAT에 미리 적어* 두면 *커널이 자동으로 memory tier를 분류*. *DAMON·NUMA balancing*이 그 분류를 *그대로 사용*.

## Coherency Domain ID

CXL 3.0 fabric에서는 *Coherency Domain ID*가 필요합니다.

같은 *coherency domain*에 속한 디바이스는 *cache coherency를 공유*. 다른 domain은 *별도 관리*. UEFI는 *CFMWS에 domain ID*를 적어 host에 알려 줍니다.

```text
Domain 0 (host A): CFMWS 0, CFMWS 1
Domain 1 (host A·B 공유): CFMWS 2
Domain 2 (host B): CFMWS 3
```

이 정보가 *fabric 토폴로지 인식*에 핵심.

## SPDM 인증 통합 (옵션)

Confidential Computing 환경에서는 *UEFI가 부팅 시 디바이스 SPDM 인증*도 진행:

| 단계 | 동작 |
|------|------|
| 1 | UEFI가 CXL 디바이스 enumerate |
| 2 | UEFI가 SPDM 인증 시도 ([Ch 12 Security](/blog/embedded/embedded-security/chapter12-spdm-cma)) |
| 3 | 인증 성공 → CEDT에 *active* 표시 + IDE 활성화 |
| 4 | 인증 실패 → CEDT에 *disabled* 표시 또는 항목 제거 |

*보안 부팅*과 *attestation*이 *부팅 시점*에 완료됩니다.

## QEMU + OVMF 검증

EDK II 기반 *OVMF (Open Virtual Machine Firmware)*에 CXL 코드가 들어 있어 *QEMU에서 검증* 가능:

```bash
# OVMF 빌드 시 CXL 옵션
$ cd edk2
$ build -p OvmfPkg/OvmfPkgX64.dsc -t GCC -a X64 -b RELEASE \
    -D CXL_ENABLED=TRUE

# QEMU에서 OVMF 사용
$ qemu-system-x86_64 \
    -bios OVMF.fd \
    -machine q35,cxl=on \
    [CXL device options...]

# Linux guest에서 CEDT 확인
guest$ acpidump -b
guest$ iasl -d cedt.dat
guest$ cat cedt.dsl   # CHBS·CFMWS 내용 확인
```

OVMF의 CXL 코드가 *실 BIOS와 동일한 path*. *드라이버 통합 검증*에 충분합니다.

## 상용 BIOS의 CXL 구현

| Vendor | BIOS | CXL 지원 시점 |
|--------|------|---------------|
| Intel | RBU·MEBx | Sapphire Rapids (CXL 1.1), Granite Rapids (CXL 2.0) |
| AMI | Aptio V | Genoa (CXL 2.0), Turin (CXL 3.0) |
| Insyde | H2O | various OEM 적용 |
| Phoenix | SecureCore | 일부 서버 |

상용 BIOS는 *EDK II base*에 *vendor-specific extension*. 핵심 *CEDT 생성·HDM 프로그래밍 코드*는 공통.

## 자주 하는 실수

### CEDT 누락 시 증상

```text
[Linux kernel boot]
[    0.524] cxl_acpi: device 0000:5e:00.0 — CHBS not found in CEDT
[    0.525] cxl_acpi: skipping enumeration
```

BIOS의 *CXL 활성화 옵션이 disabled*거나 *EDK II에 CXL 모듈이 안 들어간 경우*. BIOS update가 답.

### CFMWS Restrictions 잘못 설정

```text
CFMWS 0:
  Restrictions = 0x06 (Type 3 only + Volatile only)

[Persistent memory device를 이 window에 매핑 시도]
[    1.234] cxl_mem mem0: window restrictions mismatch — skip
```

*Restrictions field*가 *디바이스 타입과 맞아야* mapping됩니다. *Type 3 persistent*를 *volatile only window*에 못 넣음.

### HDM Decoder Auto-Commit과 cxl-cli 충돌

```bash
$ cxl create-region -d decoder0.0 -t ram -s 128G
Error: decoder already committed by firmware
```

*Firmware-managed mode*에서는 *user-managed 명령이 안 됩니다*. BIOS에서 *firmware vs user managed* 선택 옵션이 보통 있음.

### Coherency Domain ID 누락 (CXL 3.0)

```text
[CXL 3.0 fabric 환경]
[    2.345] cxl_acpi: domain ID missing — assuming single domain
[    2.346] cxl_acpi: fabric features disabled
```

*CXL 2.0까지는 단일 domain 가정*이지만 *3.0 fabric은 domain ID 필수*. OEM BIOS에 *3.0 spec 준수* 확인.

### SPDM 인증 실패가 silent

```text
[BIOS SPDM 인증 실패 시]
- CEDT에서 해당 디바이스 항목 제거
- BIOS log에만 기록, 호스트 OS에 전달 안 됨
```

*인증 실패한 디바이스가 그냥 안 보임*. *Confidential Computing 환경*에서는 *BIOS log 확인* 필수.

## 정리

- UEFI는 *EDK II 기반 CXL 모듈*들로 *enumeration → HDM 프로그래밍 → ACPI 테이블 생성*을 수행합니다.
- *CEDT*는 *CHBS (host bridge)·CFMWS (memory window)·CXIMS (interleave)*를 호스트에 전달.
- *SRAT·HMAT·SLIT*에도 CXL 정보가 통합되어 *커널이 자동으로 NUMA 노드·tier 분류*.
- *Firmware-managed*는 BIOS가 HDM commit, *user-managed*는 cxl-cli로 commit. *각 모드의 장단*이 있음.
- *Confidential Computing*은 *부팅 시 SPDM 인증*도 UEFI가 진행. 인증 실패 디바이스는 *CEDT에서 빠짐*.
- *QEMU + OVMF*로 *드라이버 통합 검증*이 가능. 상용 BIOS는 *EDK II + vendor extension*.

## 다음 편

[Ch 36: 부트 시 메모리 토폴로지 결정](/blog/embedded/bootloader/chapter36-boot-memory-topology)에서는 *DDR DIMM·HBM·CXL.mem·Persistent memory*가 *하나의 메모리 토폴로지로 통합 인식*되는 흐름을 봅니다. *Bootloader Internals 시리즈의 마무리*입니다.

## 관련 항목

- [Ch 18: U-Boot의 EFI 호환 분석](/blog/embedded/bootloader/chapter18-efi-in-uboot) — U-Boot의 EFI 인터페이스
- [Ch 19: Linux Boot ABI — ARM/ARM64 커널 진입 규약 추적](/blog/embedded/bootloader/chapter19-kernel-handoff) — DTB·ACPI 인계
- [Ch 34: U-Boot PCIe Enumeration](/blog/embedded/bootloader/chapter34-pcie-enumeration)
- [Ch 36: 부트 시 메모리 토폴로지 결정](/blog/embedded/bootloader/chapter36-boot-memory-topology) (다음 편)
- [Embedded Security Ch 12: SPDM과 CMA 인증 흐름](/blog/embedded/embedded-security/chapter12-spdm-cma)
- [Modern Embedded Recipes Ch 150: QEMU CXL Type 3 디바이스 에뮬레이션](/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation)
