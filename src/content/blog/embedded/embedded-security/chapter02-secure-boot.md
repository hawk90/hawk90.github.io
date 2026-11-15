---
title: "Secure Boot 분석 — 부트 체인 서명 검증과 RoT 구축"
slug: "embedded/embedded-security/chapter02-secure-boot"
date: 2026-05-21T09:02:00
description: "ROM → bootloader → kernel → app. 각 단계 서명 검증. Root of Trust."
tags: [secure-boot, root-of-trust, Cryptography]
series: "Embedded Security"
seriesOrder: 2
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Secure Boot는 ROM에서 application까지 이어지는 검증 체인입니다."** — 변경 불가능한 ROM이 다음 단계의 서명을 검증하고, 검증된 단계가 또 그 다음을 검증합니다. 사슬의 어느 한 고리라도 끊기면 전체가 무너집니다.

## 왜 ROM에서부터 시작하는가

Ch 1의 설명용 위험 표는 RoT 공개키 변조를 높은 우선순위로 놓았습니다. 이 임의 점수는 제품 위험의 측정 결과가 아닙니다. 이유는 단순합니다. *부팅이 검증되지 않으면* 검증되지 않은 부트 단계가 담당하는 보호 기능을 신뢰하기 어렵습니다. 공격자가 부트로더를 자기 것으로 바꾸면 TrustZone도, TEE도, secure storage도 그가 통제합니다.

따라서 보안은 *변경 불가능한 출발점*이 필요합니다. 이 출발점이 Root of Trust(RoT)입니다. RoT는 다음 두 가지 형태로 존재합니다.

- **Immutable code RoT** — 칩 제조 시 mask ROM에 새겨지는 부트 코드. 영구히 바뀌지 않습니다.
- **Immutable data RoT** — OTP fuse에 한 번 굽힌 공개키 hash. 한 번 굽으면 다시 못 굽힙니다.

이 둘이 만나면 다음과 같은 *짧은 신뢰 체인*이 만들어집니다. mask ROM 코드가 OTP에서 공개키 hash를 읽고, 외부 flash의 부트로더 이미지에 붙은 서명을 그 공개키로 검증합니다. 검증 통과하면 부트로더에 제어를 넘기고, 부트로더는 같은 패턴으로 다음 단계를 검증합니다.

## 부트 체인의 일반적인 모양

다음은 가능한 Cortex-A/Linux 부트 체인을 단순화한 예시입니다. 실제 단계·서명 형식·키 저장소·검증 주체는 SoC BootROM, 플랫폼 펌웨어와 부트로더 설정에 따라 다르므로 해당 제품의 부트 아키텍처 문서를 확인해야 합니다.

| 구성 예 | 신뢰 전달에서 확인할 것 |
|------|------|
| BootROM → 초기 loader | ROM이 지원하는 인증 형식과 신뢰 anchor |
| 초기 loader → TF-A·일반 bootloader | 어느 단계가 어떤 image·certificate를 인증하는지 |
| U-Boot·UEFI → kernel·initrd·DTB | 실행에 쓰는 모든 보안 관련 입력의 인증 |
| Kernel → rootfs·application | verity의 root hash와 서명·실행 정책이 이전 신뢰 경계에 연결되는지 |
| MCUboot → application slot | image 서명·보안 counter·test/confirm·fallback 정책 |

서명 없는 SHA-256 digest는 공격자가 이미지와 digest를 함께 바꿀 수 있으면 인증이 아닙니다. Hash 비교를 신뢰하려면 기준 digest 자체가 보호돼 있어야 합니다. 또한 TF-A의 실제 인증 주체는 플랫폼 CoT에 따라 달라지므로 BL31이 반드시 U-Boot 서명을 검증하는 하나의 직선 체인으로 가정하지 않습니다.

각 단계는 플랫폼 정책에 따라 다음 구성요소를 인증하고 제어를 넘깁니다. 실패 시 복구·정지·대체 이미지 중 무엇을 택하는지도 제품의 구현과 정책에 따라 다릅니다.

## 서명 검증의 핵심 — hash + asymmetric signature

서명 형식은 image format과 알고리즘에 따라 다릅니다. RSA-PSS·ECDSA 기반 흐름은 digest를 사용하지만, Ed25519와 Ed25519ph처럼 외부 prehash를 다르게 다루는 형식을 구분해야 합니다. 다음은 digest 기반 흐름의 설명이며 임의 sign API에 digest를 넘기라는 코드가 아닙니다.

**1. 펌웨어 빌드 시:**

- ─ image_hash = SHA-256(firmware_image)
- ─ signature  = sign(private_key, image_hash)
- ─ firmware_image + signature + public_key_cert 를 묶어 배포

**2. 부팅 시:**

- ─ ROM 또는 이전 단계가 firmware_image를 flash에서 읽어 hash 다시 계산
- ─ public_key_cert가 OTP의 hash와 일치하는지 검증
- ─ signature를 public_key로 verify
- ─ verify(public_key, image_hash, signature) == true 이면 jump

두 알고리즘이 자주 쓰입니다.

| 알고리즘 | 흔한 인코딩 크기 | 메모 |
|---|---:|---|
| RSA-2048 | 모듈러스와 서명 각각 256 bytes | 공개 지수·키 포맷 등의 인코딩 오버헤드는 별도입니다. |
| RSA-3072 | 모듈러스와 서명 각각 384 bytes | 지원 여부와 보안 수명은 제품 정책·표준을 확인합니다. |
| ECDSA P-256 | 비압축 공개점 65 bytes, r‖s 서명 64 bytes | DER 서명은 길이가 달라질 수 있습니다. |
| ECDSA P-384 | 비압축 공개점 97 bytes, r‖s 서명 96 bytes | 실제 부트 포맷이 허용하는 표현을 확인합니다. |
| Ed25519 | 공개키 32 bytes, 서명 64 bytes | 지원 여부와 키 인코딩은 해당 BootROM/도구가 결정합니다. |

알고리즘 선택은 일반적인 선호만으로 결정하지 않습니다. BootROM 지원 알고리즘, 이미지 포맷, 보안 수명 요구와 타깃에서 측정한 자원 사용량을 함께 확인합니다.

## OTP / fuse — 키 저장의 물리적 잠금

일부 플랫폼은 공개키 대신 digest를 OTP/eFuse에 저장하고, 이미지의 공개키 digest를 비교합니다. 다른 제품은 ROM 키나 별도 키 저장소를 씁니다. 저장 크기·알고리즘·회전/폐기 기능은 SoC별 문서로 확인해야 합니다.

검증 시:

1. 이미지에서 public_key 추출
2. computed_hash = SHA-256(public_key)
3. otp_hash = read_from_otp()
4. computed_hash == otp_hash 확인
5. 통과하면 그 public_key로 signature 검증

다중 digest slot과 키 폐기 기능이 구현된 부품에서는 정책에 따라 키를 교체할 수 있습니다. OTP 슬롯 수와 폐기 절차를 보편 규칙으로 가정하지 않습니다.

## STM32 RDP — 가장 단순한 임베디드 보안

[ST AN5347의 RDP 설명](https://www.st.com/content/st_com/en/technical-documents/an5347-introduction-to-arm-trustzone-features-on-stm32l5-stm32u5-and-stm32u3-mcus-stmicroelectronics_asset/chunk-003-topic-an5347-rdp.html)은 제품과 TrustZone 설정에 따른 debug 접근·regression 조건을 나눕니다. STM32L552/L562의 Level 2 비가역성을 모든 STM32 제품의 규칙으로 확장하지 않습니다. Level 1을 “SRAM은 항상 읽히고 debug도 가능”이라고 단정할 수도 없습니다.

RDP는 debug·메모리 접근 보호이며 image 서명 검증과 별도입니다. 지원 boot 경로, secure/non-secure debug, regression 시 erase 범위와 복구 정책을 실제 부품·revision 문서로 확인합니다. 이 글에서는 option-byte나 fuse를 변경하지 않았습니다.

## NXP HABv4 — i.MX의 산업 표준 secure boot

NXP의 High Assurance Boot(HAB) version 4는 지원하는 i.MX6·i.MX7 및 i.MX8M 계열 등의 secure boot 메커니즘입니다.

키 구조는 PKI(공개키 기반 구조)입니다.

| 키 | 역할 |
|----|------|
| **SRK** (Super Root Key) | root, 4개의 키 가능 — hash가 OTP에 burn |
| └ CSF Key | Command Sequence File에 서명 |
| └ IMG Key | 부트 이미지에 서명 |

HABv4의 SRK table, SRK fuse digest와 revoke 동작은 지원 i.MX SoC 및 CST 문서에 맞춰 구성합니다. 제품별 fuse word와 폐기 비트는 다르므로 일반 명령으로 굳히지 않습니다.

[NXP의 HABv4 자료 안내](https://community.nxp.com/t5/i-MX-Security/i-MX-Security-Features-amp-Collateral/ta-p/1192496)와 실제 SoC의 CST·보안 부트 문서를 함께 확인합니다. i.MX8의 모든 부품이 HABv4인 것은 아니며 AHAB를 쓰는 계열과 구분합니다.

| 단계 | 확인할 산출물 |
|------|------|
| 키·SRK table 생성 | 승인한 알고리즘·certificate·key ownership·보관 정책 |
| Image 구성 | 실제 load address·인증 범위·padding과 CSF 배치 |
| CST 서명 | CST의 CSF 출력과 image 조립을 구분. CSF 출력 파일 자체를 완성 boot image로 오인하지 않음 |
| 개발 상태 검증 | 실제 image로 boot·인증 event와 실패 image 거부 확인 |
| 양산 전환 | board별 fuse map·복구·key 폐기와 승인 절차 |

검증되지 않은 고정 Blocks 주소·길이와 범용 fuse 명령은 제시하지 않습니다. 이 작업에서는 CST 서명·보드 boot·closed 전환을 실행하지 않았습니다.

## ESP32 Secure Boot v2

Secure Boot v2의 알고리즘과 최소 칩 revision은 계열별로 다릅니다. ESP32-C3 공식 문서는 revision 0.3/ECO3 이상에서 RSA-PSS 기반 절차를 설명하며 ECDSA P-256을 이 칩의 Secure Boot v2로 제시하지 않습니다. 아래는 호스트 서명 흐름을 보여주는 문서 예시이며 실행하지 않습니다. 옵션은 사용하는 ESP-IDF 릴리스 문서에서 확인하십시오.

공식 [ESP-IDF v5.1.6 ESP32-C3 Secure Boot V2](https://docs.espressif.com/projects/esp-idf/en/v5.1.6/esp32c3/security/secure-boot-v2.html)는 signature block의 SHA-256·RSA-3072·PSS 조건과 eFuse digest의 연결을 설명합니다. Host 서명 성공, ROM의 signature block 검증, bootloader의 application 검증은 각각 확인해야 합니다. 이 글에서는 키 생성·서명 도구·eFuse provisioning을 실행하지 않았습니다.


eFuse provisioning은 디바이스·계정·키 상태에 영향을 주는 비가역 작업입니다. 제품별 문서와 별도 양산 절차가 필요합니다.

## anti-rollback — 옛 펌웨어로 돌아가는 것을 막기

서명 검증만 있으면, 공격자가 *옛 펌웨어* (취약점이 있는 버전)를 다시 서명된 채로 들이밀 수 있습니다. 옛 펌웨어의 서명도 같은 키로 만들어진 것이므로 검증을 통과합니다. 이를 막는 것이 anti-rollback입니다.

일반적인 anti-rollback 정책은 이미지의 보안 버전을 신뢰된 장치 상태와 비교하지만 저장·증가 방식은 제품별로 다릅니다. OTP 외에 보안 저장소나 플랫폼 API를 쓸 수 있고, 업데이트 실패와 복구 정책도 함께 설계해야 합니다.

**펌웨어 이미지의 metadata:**

- ─ version  = 1.4.2   (사람이 보는 번호)
- ─ sec_ver  = 5       (anti-rollback 카운터)

**디바이스의 신뢰된 상태(구현 예):**

- ─ stored_security_counter = 5 (저장 방식은 제품 구현에 따름)

**검증:**

- if (image.sec_ver < device.stored_security_counter) → reject
- if (image.sec_ver > device.stored_security_counter) → 정책에 따라 상태 갱신; 원자성과 전원 차단 복구를 확인

[MCUboot 설계 문서](https://docs.mcuboot.com/design.html)는 이미지 보안 카운터와 플랫폼의 저장/비교 구현을 사용할 수 있습니다. HAB 및 ESP 계열의 rollback 기능과 상태 저장 단위는 SoC별로 다르므로 동일한 fuse 비트 모델로 일반화하지 않습니다. 보안 카운터 갱신 시점, 전원 차단, 복구와 키 폐기를 제품 문서에 맞춰 설계합니다.

## Measured Boot — TPM과 PCR

서명 검증은 허용되지 않은 이미지 실행을 제한하는 메커니즘입니다. Measured Boot은 정책에 따라 측정값을 기록해 이후 attestation에 사용할 수 있습니다. 둘은 역할이 다릅니다.

핵심은 TPM의 PCR(Platform Configuration Register)입니다. 플랫폼 측정 정책에 따라 부트 단계가 이벤트 digest를 지정된 PCR에 extend합니다.

**PCR_extend(idx, data):**

- new_value = SHA-256(old_PCR_value || SHA-256(data))
- PCR[idx] = new_value

PCR은 일반 정수 카운터가 아니라 extend 연산으로 갱신되는 해시 상태입니다. PCR 초기화/reset 정책은 PCR 종류와 플랫폼에 따라 다릅니다. Attestation 검증자는 선택한 PCR 값과 이벤트 로그, nonce, 정책을 함께 확인해야 합니다.



Linux IMA는 정책에 따라 파일을 측정하고 TPM PCR에 extend할 수 있습니다. 어떤 파일을 측정하고 어느 PCR을 쓰는지는 커널 설정·IMA 정책·템플릿에 따르므로 모든 실행 파일이 항상 PCR10에 들어간다고 가정하지 않습니다.

PCR policy에 맞을 때만 비밀 해제를 허용할 수 있지만, 선택한 PCR과 event log가 보호하려는 모든 상태를 덮는지 확인해야 합니다. 같은 PCR의 이전 값에 event digest를 누적하며, 서로 다른 PCR 번호의 값을 사슬처럼 이어 쓰지 않습니다. PCR 일치만으로 모든 runtime 상태가 안전하다고 판정하지 않습니다.

## ARM Trusted Firmware — 표준 Cortex-A secure boot

Trusted Firmware-A(TF-A)는 Arm A-profile 플랫폼용 참조 펌웨어입니다. 단계 구성과 인증 체인은 플랫폼에 따라 달라지며 BL32는 선택적 secure payload입니다.

| 단계 | 역할 |
|------|------|
| **BL1** | Boot ROM 직후 동작, 보통 ROM 또는 SRAM |
| **BL2** | 후속 단계 로더, eMMC/SD에서 BL31/BL32/BL33 로드 |
| **BL31** | Secure Monitor (EL3 상주). SMC 처리, PSCI 구현 |
| **BL32** | Secure-EL1 payload (보통 OP-TEE) |
| **BL33** | Non-secure entry point (U-Boot, EDK2) |

[TF-A v2.12 Trusted Board Boot](https://trustedfirmware-a.readthedocs.io/en/v2.12.0/design/trusted-board-boot.html)는 platform별 image·key provisioning·ownership과 CoT가 달라짐을 설명합니다. Development ROTPK가 들어간 빌드 성공은 production trust anchor를 장치에 설정했다는 증거가 아닙니다. 실제 platform의 인증 설정·certificate·image packaging과 실패 경로를 함께 시험해야 하며 이 작업에서는 타깃 빌드를 실행하지 않았습니다.

## 자주 하는 실수

- **개발 모드와 양산 모드를 혼동합니다.** 개발 키로 서명된 펌웨어가 양산 디바이스에 절대 들어가지 않게 빌드 시스템에서 분리해야 합니다.
- **OTP 굽기를 너무 일찍 합니다.** 한 번 굽으면 회수 불가입니다. 제품의 검증·provisioning·복구 절차에 맞춰 승인된 시점에 수행합니다.
- **anti-rollback 카운터를 모든 빌드마다 올립니다.** 저장 매체의 수명·counter 의미·recovery 호환성을 확인하고 승인된 보안 버전 정책으로 올립니다.
- **서명 검증만 하고 dm-verity는 안 켭니다.** kernel이 검증돼도 rootfs가 검증 안 되면 SD 카드 스왑으로 우회됩니다. 체인은 *application까지* 이어져야 합니다.
- **검증 실패 시 무엇을 할지 결정하지 않습니다.** 무한 reset, recovery 파티션 부팅, 영구 brick — 모두 정책적 선택입니다. 미리 정해 두지 않으면 양산 후 첫 실패에서 혼란이 옵니다.
- **TRNG 없이 ECDSA 서명을 생성합니다.** ECDSA는 nonce 재사용 시 즉시 private key가 노출됩니다. 빌드 머신에서도 양질의 entropy를 보장해야 하며, 디바이스에서 서명하는 경우 *deterministic ECDSA* (RFC 6979) 또는 Ed25519를 씁니다.

## 정리

- Secure Boot의 핵심은 변경 불가능한 RoT에서 시작하는 *검증 체인*입니다.
- RoT는 mask ROM 코드와 OTP fuse의 공개키 hash, 두 가지 형태로 존재합니다.
- 검증은 hash + asymmetric signature 조합입니다. 알고리즘과 인코딩은 BootROM·image format과 보안 정책이 결정합니다.
- 키 교체·폐기 slot 수와 절차는 해당 부품 문서로 확인합니다.
- STM32 RDP는 디버그·flash 보호이고, 진짜 secure boot은 별도 구현이 필요합니다.
- HABv4·ESP32-C3 Secure Boot V2의 지원 계열과 provisioning·실패 동작은 각각 확인합니다.
- Anti-rollback은 신뢰된 상태와 이미지 보안 버전을 비교하며 저장·복구 방식은 플랫폼별로 확인합니다.
- Measured Boot은 TPM PCR로 부팅 결과를 누적해 원격 attestation의 기반을 제공합니다.

검토 기준은 위 vendor 문서와 [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032)의 서명 형식입니다. [tpm2_pcrextend 문서](https://tpm2-tools.readthedocs.io/en/latest/man/tpm2_pcrextend.1/)도 PCR 번호·bank·digest를 구분합니다. TPM의 실제 bank·measurement profile과 image format parser, 전원 차단·rollback·변조 image 시험은 별도 타깃 검증으로 남습니다.

다음 편은 **Ch 3: MCU 크립토 — HW accelerator**. Secure Boot에서 가정한 AES·SHA·ECC 연산이 실제 MCU에서 어떻게 빨라지는지, 그리고 언제 HW 가속이 진짜 빠른지를 봅니다.

## 관련 항목

- [Ch 1: 임베디드 보안 개요 / 위협 모델](/blog/embedded/embedded-security/chapter01-threat-model)
- [Ch 3: MCU 크립토 — HW accelerator](/blog/embedded/embedded-security/chapter03-mcu-crypto)
- [Ch 4: TrustZone — Cortex-A / Cortex-M](/blog/embedded/embedded-security/chapter04-trustzone)
- [Ch 5: TEE — OP-TEE / ARM CCA](/blog/embedded/embedded-security/chapter05-tee)
- [Ch 6: OTA 업데이트](/blog/embedded/embedded-security/chapter06-ota-update)
- [Practical RTOS Internals — Part 4-11: TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- DO-178C — 항공 SW 보증
