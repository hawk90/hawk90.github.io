---
title: "ARM Trusted Firmware-A 통합 — BL1·BL2·BL31·BL32·BL33 흐름"
slug: "embedded/bootloader/chapter25-tfa-optee"
date: 2026-05-19T09:25:00
description: "TF-A의 BL 단계와 FIP, 선택적 OP-TEE 및 U-Boot 통합을 보드별 설정과 함께 이해합니다."
series: "Bootloader Internals"
seriesOrder: 25
tags: [embedded, bootloader, tf-a, atf, op-tee, secure-boot, armv8]
draft: false
topics: ["embedded"]
---

Trusted Firmware-A(TF-A)는 Arm 플랫폼용 reference firmware입니다. TF-A가 제품에 포함된다는 사실만으로 부팅 단계나 secure boot 정책이 정해지는 것은 아닙니다. Arm reference platform의 BL1·BL2·BL31·BL32·BL33 흐름은 이해의 출발점이며, SoC vendor의 BootROM, 전용 패키징과 보드 설정에 따라 단계와 메모리 배치가 달라집니다.

## 한 줄 요약

BL 단계는 TF-A의 firmware 역할 구분입니다. 실제 이미지 구성, 실행 주소, Exception Level과 인증 여부는 선택한 TF-A release 및 platform configuration에서 확인합니다.

## TF-A 단계 모델

TF-A firmware design 문서는 AArch64 reference 흐름을 BL1, BL2, BL31, 선택적 BL32, BL33으로 나눕니다. BL1은 신뢰되는 첫 실행 코드, BL2는 다음 firmware를 준비하는 단계, BL31은 EL3 runtime firmware입니다. BL32는 secure payload이며 옵션이고, BL33은 normal-world firmware로 U-Boot이나 다른 bootloader가 맡을 수 있습니다. 이 이름은 모든 SoC의 ROM·loader 구성을 그대로 묘사하지 않습니다. 일부 플랫폼은 vendor ROM이나 별도 firmware를 함께 사용하고 TF-A 단계 일부만 채택합니다.

| 이름 | TF-A에서 흔히 쓰는 역할 | 플랫폼에서 확인할 사항 |
|---|---|---|
| BL1 | 초기 trusted firmware | SoC ROM과 TF-A BL1 중 어느 코드가 실제 reset path에 있는가 |
| BL2 | 다음 단계 로드·초기화 | 메모리 준비, FIP 사용 여부, 인증·load 정책 |
| BL31 | EL3 runtime firmware | 실제 메모리 영역, 초기화·runtime service, 호출 규약 |
| BL32 | 선택적 secure payload | OP-TEE 등 선택 여부, dispatcher·secure partition 구성 |
| BL33 | non-trusted firmware | U-Boot/UEFI 등 이미지, 시작 EL과 인계 ABI |

실행 주소와 secure carveout은 임의의 공통 표로 정할 수 없습니다. 정확한 주소·크기와 접근 권한은 해당 platform의 linker 설정, device tree, memory map, TrustZone controller 구성에서 확인합니다. Linux의 `/reserved-memory` 설명이 존재하더라도 그 자체로 secure access control을 설정하는 것은 아닙니다. 메모리 보호 설정과 커널의 예약·매핑 정보가 일치하는지 확인해야 합니다.

## FIP와 이미지 묶음

TF-A의 Firmware Image Package(FIP)는 firmware와 설정 payload를 묶는 형식입니다. TF-A `fiptool`은 platform이 사용하는 image 유형을 UUID 항목으로 기록합니다. 어떤 항목이 필수인지, BL2가 어느 매체에서 이를 읽는지, FIP이 ROM이 직접 읽는 형식인지 여부는 platform마다 다릅니다. 많은 제품은 vendor의 별도 container나 image tool을 추가로 사용합니다.

따라서 `bl2`, `bl31`, `bl32`, `bl33`을 하나의 보편적 명령으로 빌드해 모든 보드에서 실행할 수 있다고 보지 마세요. 해당 TF-A release의 build options와 platform README, vendor image-generation 문서를 함께 확인하고, 산출물 이름·FIP 항목·ROM 입력 형식을 실제 빌드 로그와 image inspection 결과로 기록합니다.

## Trusted Board Boot는 선택적 기능

TF-A의 Trusted Board Boot(TBB)는 firmware 인증 체인을 구현하는 기능입니다. TF-A 문서에서 TBB 지원과 인증서 생성은 빌드 옵션으로 켜며, 해당 기능을 포함하지 않은 기본 build가 동일한 인증을 수행한다고 가정할 수 없습니다. TBB가 구성된 플랫폼에서는 ROTPK 신뢰 원점과 인증서 및 firmware image 간 관계를 TF-A release의 설계 문서로 확인합니다. 플랫폼은 신뢰 root의 저장·검증 방식과 signing key 관리 절차도 제공해야 합니다.

펌웨어가 FIP에 들어 있다는 사실만으로 서명 또는 인증이 적용되는 것은 아닙니다. 다음 항목을 분리해서 검토하세요.

- 실제 trust anchor가 어디에 저장되고 어떻게 검증되는가
- TF-A build에서 인증 지원이 포함되었는가
- 각 firmware image가 해당 인증 단계에 연결되었는가
- 실패했을 때 다음 image 실행이 차단되는가
- update와 key rotation 경로가 제품 보안 정책과 일치하는가

## BL31, PSCI와 OP-TEE

BL31은 TF-A에서 EL3 runtime firmware 역할을 맡고 PSCI 같은 runtime service를 제공할 수 있습니다. 다만 시스템에 TF-A BL31이 있다는 사실만으로 모든 PSCI 호출이 구현되거나 특정 firmware가 모든 전원 관리를 맡는다고 단정할 수 없습니다. 실제 service와 OS 인계는 platform port, device tree/ACPI와 firmware configuration에 맞춰 확인합니다.

OP-TEE는 TrustZone 기반 시스템에서 사용할 수 있는 secure OS 중 하나입니다. TF-A의 `BL32`와 secure payload dispatcher 구성은 release와 platform 통합 방식에 따라 달라집니다. OP-TEE의 build artifact 이름, TA 개발 키, shared memory 영역, Linux `/dev/tee*` 호출 경로를 임의의 보드 설정으로 묶지 마세요. OP-TEE 공식 문서, TF-A platform configuration과 실제 제품의 reserved-memory/device tree가 함께 필요합니다.

## 재현 가능한 통합 점검

통합 전에 SoC와 board revision, TF-A tag, U-Boot/OP-TEE tag, toolchain, vendor packaging version과 build configuration을 고정하세요. 이어서 ELF/map과 package metadata에서 image 이름·entry point·load 영역을 확인하고, 성공 및 인증 거부 경로를 별도로 시험합니다. PSCI를 쓰는 제품은 OS가 보는 firmware interface와 플랫폼 동작을 맞춰 확인합니다.

이 글의 수정 과정에는 특정 SoC나 board가 제공되지 않아 TF-A, OP-TEE, FIP, PSCI 및 ROM package build를 실행하지 않았습니다. 아래 절차는 시험 계획 항목이지 실행 결과가 아닙니다.

## 정리

- TF-A의 BL1/BL2/BL31/BL32/BL33은 reference firmware 역할을 설명하며, 모든 SoC의 동일한 단계 체인을 뜻하지 않습니다.
- BL32와 Trusted Board Boot 등 기능은 선택적이며 build/platform 설정으로 확인합니다.
- FIP은 image package 형식입니다. 사용 항목·인증·ROM 입력 형식은 platform에 따라 다릅니다.
- 메모리 주소, secure carveout, 시작 EL, PSCI와 OP-TEE ABI는 platform 문서·빌드 산출물에서 확인합니다.
- 정적 설정 검토와 실제 보드의 정상·거부 경로 검증을 구분합니다.

## 다음 편

다음은 [Ch 26: DDR training 깊이](/blog/embedded/bootloader/chapter26-ddr-training)입니다. 메모리 초기화 설명도 PHY·SoC·DRAM 조합과 보드 자료에 맞춰 읽습니다.

## 관련 항목

- [Ch 24: SPL·TPL 내부 해부](/blog/embedded/bootloader/chapter24-spl-deep)
- [Ch 27: Chain of Trust](/blog/embedded/bootloader/chapter27-chain-of-trust)
- [TF-A v2.12.12: Trusted Board Boot](https://trustedfirmware-a.readthedocs.io/en/lts-v2.12.12/design/trusted-board-boot.html)
- [TF-A v2.12.12: Firmware design](https://trustedfirmware-a.readthedocs.io/en/lts-v2.12.12/design/firmware-design.html)
- [TF-A: Build options](https://trustedfirmware-a.readthedocs.io/en/stable/getting_started/build-options.html)
- [OP-TEE documentation](https://optee.readthedocs.io/)
- [Arm PSCI specification](https://developer.arm.com/documentation/den0022)
