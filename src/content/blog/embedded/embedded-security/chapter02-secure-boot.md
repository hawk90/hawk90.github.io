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

다음은 Cortex-A/Linux 부트 체인을 단계별로 나눈 표입니다. TF-A를 쓰는 AArch64 플랫폼이라면 [TF-A v2.15.0 `firmware-design.rst`](https://github.com/TrustedFirmware-A/trusted-firmware-a/blob/da738d5eae93af342fdc4995dd3c05acb4c9d757/docs/design/firmware-design.rst#L50-L56)가 이 구간을 BL1(AP Trusted ROM) → BL2(Trusted Boot Firmware) → BL31(EL3 Runtime Software) → BL32(Secure-EL1 Payload, 선택) → BL33(Non-trusted Firmware)의 다섯 단계로 나눕니다.

| 구성 예 | 신뢰 전달에서 확인할 것 |
|------|------|
| BootROM → 초기 loader | ROM이 지원하는 인증 형식과 신뢰 anchor |
| 초기 loader → TF-A·일반 bootloader | 어느 단계가 어떤 image·certificate를 인증하는지 |
| U-Boot·UEFI → kernel·initrd·DTB | 실행에 쓰는 모든 보안 관련 입력의 인증 |
| Kernel → rootfs·application | verity의 root hash와 서명·실행 정책이 이전 신뢰 경계에 연결되는지 |
| MCUboot → application slot | image 서명·보안 counter·test/confirm·fallback 정책 |

서명 없는 SHA-256 digest는 공격자가 이미지와 digest를 함께 바꿀 수 있으면 인증이 아닙니다. Hash 비교를 신뢰하려면 기준 digest 자체가 보호돼 있어야 합니다.

체인이 꼭 "각 단계가 바로 다음 단계를 검증"하는 직선은 아닙니다. TF-A의 [Trusted Board Boot Sequence](https://github.com/TrustedFirmware-A/trusted-firmware-a/blob/da738d5eae93af342fdc4995dd3c05acb4c9d757/docs/design/trusted-board-boot.rst#L209-L260)에서 BL1은 BL2만 검증하고, BL31·BL32·BL33(U-Boot 등)의 key·content certificate는 모두 BL2가 검증합니다. BL31은 U-Boot를 검증하지 않습니다. 같은 문서는 실패 정책도 정해 둡니다. 어느 단계든 실패하면 시스템은 panic합니다(212행). 복구 이미지로 넘어가는 동작은 이 문서의 범위가 아니라 플랫폼 port가 따로 구현해야 합니다.

## 서명 검증의 핵심 — hash + asymmetric signature

RSA-PSS와 ECDSA는 이미지의 digest에 서명합니다. Ed25519는 다릅니다. [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032) §5.1의 Ed25519(PureEdDSA)는 메시지 전체를 받아 내부에서 SHA-512를 두 번 돌리므로 서명 API에 digest가 아니라 이미지 자체를 넘깁니다. 미리 hash한 값을 넘기려면 별도 알고리즘인 Ed25519ph를 써야 합니다. 아래는 digest 기반 흐름입니다.

**1. 펌웨어 빌드 시:**

- ─ image_hash = SHA-256(firmware_image)
- ─ signature  = sign(private_key, image_hash)
- ─ firmware_image + signature + public_key_cert 를 묶어 배포

**2. 부팅 시:**

- ─ ROM 또는 이전 단계가 firmware_image를 flash에서 읽어 hash 다시 계산
- ─ public_key_cert가 OTP의 hash와 일치하는지 검증
- ─ signature를 public_key로 verify
- ─ verify(public_key, image_hash, signature) == true 이면 jump

크기는 OpenSSL 4.1.0으로 키를 만들고 1 KB 합성 이미지에 서명해서 쟀습니다. ECDSA DER 서명 길이는 같은 키로 1,000번 서명한 분포입니다.

```bash
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out p256.pem
openssl pkeyutl -sign -inkey p256.pem -rawin -digest sha256 -in fw.bin | wc -c
openssl pkeyutl -sign -inkey rsa2048.pem -rawin -digest sha256 \
  -pkeyopt rsa_padding_mode:pss -in fw.bin | wc -c
```

| 알고리즘 | 서명 | 공개키 (SubjectPublicKeyInfo DER) | 메모 |
|---|---:|---:|---|
| RSA-2048 PSS | 256 B | 294 B | 서명 길이 = modulus 길이 |
| RSA-3072 PSS | 384 B | 422 B | |
| ECDSA P-256 | DER 69~72 B (1,000회 중 70 B 261회, 71 B 484회, 72 B 253회, 69 B 2회) | 91 B | 공개점은 비압축 65 B, raw r‖s 서명은 64 B |
| ECDSA P-384 | DER 101~104 B | 120 B | 비압축 공개점 97 B, raw r‖s 96 B |
| Ed25519 | 64 B | 44 B | 공개키 본체 32 B |

ECDSA의 DER 서명은 r·s의 상위 bit와 앞자리 0에 따라 길이가 바뀝니다. 그래서 고정 크기 슬롯에 서명을 넣는 부트 포맷은 raw r‖s를 쓰거나 최대 길이(P-256이면 72 B)로 자리를 잡아 둡니다. 어느 알고리즘을 쓸지는 BootROM이 지원하는 목록이 먼저 정합니다. 아래 ESP32-C3는 RSA-3072만, HABv4 예제는 RSA-2048 SRK를 씁니다.

## OTP / fuse — 키 저장의 물리적 잠금

OTP는 비싸서 공개키 대신 digest를 굽는 SoC가 많습니다. i.MX HABv4는 SRK table의 hash를 `SRK_HASH[255:0]` fuse(256 bit)에 굽고([U-Boot v2024.04 `introduction_habv4.txt`](https://github.com/u-boot/u-boot/blob/v2024.04/doc/imx/habv4/introduction_habv4.txt#L234-L240)), ESP32-C3는 최대 3개의 RSA-3072 공개키 digest를 eFuse key block에 둡니다. 이미지에 실린 공개키의 hash를 그 값과 비교하는 방식입니다.

검증 시:

1. 이미지에서 public_key 추출
2. computed_hash = SHA-256(public_key)
3. otp_hash = read_from_otp()
4. computed_hash == otp_hash 확인
5. 통과하면 그 public_key로 signature 검증

Digest를 여러 개 둘 수 있으면 키를 폐기하고 다음 키로 넘어갈 수 있습니다. HABv4는 SRK table 하나에 SRK를 최대 4개 넣고, ESP32-C3는 digest 3개 각각에 `KEY_REVOKE` eFuse bit를 둡니다. 슬롯이 하나뿐인 부품에서는 서명키가 유출되면 이미 출하한 장치의 신뢰 기준을 바꿀 방법이 없습니다.

## STM32 RDP — 가장 단순한 임베디드 보안

STM32L5 HAL([stm32l5xx-hal-driver v1.0.7 `stm32l5xx_hal_flash.h`](https://github.com/STMicroelectronics/stm32l5xx-hal-driver/blob/8a45ae313e26ff92273fbaee75275b191c3bb81e/Inc/stm32l5xx_hal_flash.h#L278-L283))은 option byte 값을 Level 0 = `0xAA`, 0.5 = `0x55`, 1 = `0xBB`, 2 = `0xCC`로 두고, Level 2에는 Level 1·0으로 돌아갈 수 없다는 경고를 붙입니다.

RDP는 debug·flash 읽기 보호이고 image 서명 검증이 아닙니다. RDP Level 2로 잠근 STM32도 flash에 들어 있는 코드가 무엇이든 그대로 실행합니다. 실행할 이미지를 검증하려면 그 위에 MCUboot 같은 서명 검증 부트로더를 따로 올려야 합니다. 이 글에서는 option byte를 바꾸지 않았습니다.

## NXP HABv4 — i.MX의 산업 표준 secure boot

NXP의 High Assurance Boot(HAB) version 4는 i.MX의 BootROM이 제공하는 secure boot입니다. U-Boot v2024.04 문서는 지원 SoC를 i.MX 50, i.MX 53, i.MX 6, i.MX 7, i.MX 8M, i.MX 8MM으로 적습니다([`introduction_habv4.txt`](https://github.com/u-boot/u-boot/blob/v2024.04/doc/imx/habv4/introduction_habv4.txt#L14-L15)).

키 구조는 PKI(공개키 기반 구조)입니다.

| 키 | 역할 |
|----|------|
| **SRK** (Super Root Key) | root. CST의 `hab4_pki_tree.sh`가 최대 4개 생성, SRK table hash를 fuse에 burn |
| └ CSF Key | Command Sequence File에 서명 |
| └ IMG Key | 부트 이미지에 서명 |

HAB v4.1.2부터는 CSF key·IMG key 없이 SRK 하나로 CSF와 이미지를 함께 인증하는 "fast authentication" PKI tree도 쓸 수 있습니다(같은 문서 194행). 장치를 잠그는 fuse 위치는 SoC마다 다릅니다. U-Boot의 [`mx6_mx7_secure_boot.txt`](https://github.com/u-boot/u-boot/blob/v2024.04/doc/imx/habv4/guides/mx6_mx7_secure_boot.txt#L240-L265)는 `SEC_CONFIG[1]`를 i.MX6에서 bank 0 word 6의 `0x00000002`, i.MX7D/S에서 bank 1 word 3의 `0x02000000`, i.MX7ULP에서 bank 29 word 6의 `0x80000000`으로 적습니다. 이 bit를 구우면 올바른 PKI tree로 서명하지 않은 이미지는 load되지 않습니다. 문서는 그 전에 `hab_status`가 "No HAB Events Found!"를 내는지 먼저 확인하라고 합니다.

i.MX 8·8X 계열(i.MX 8QM 등)은 HABv4가 아니라 SECO를 호출하는 AHAB를 씁니다([U-Boot `mx8_mx8x_encrypted_boot.txt`](https://github.com/u-boot/u-boot/blob/v2024.04/doc/imx/ahab/guides/mx8_mx8x_encrypted_boot.txt#L1-L25)).

| 단계 | 확인할 산출물 |
|------|------|
| 키·SRK table 생성 | 승인한 알고리즘·certificate·key ownership·보관 정책 |
| Image 구성 | 실제 load address·인증 범위·padding과 CSF 배치 |
| CST 서명 | CST의 CSF 출력과 image 조립을 구분. CSF 출력 파일 자체를 완성 boot image로 오인하지 않음 |
| 개발 상태 검증 | 실제 image로 boot·인증 event와 실패 image 거부 확인 |
| 양산 전환 | board별 fuse map·복구·key 폐기와 승인 절차 |

이 글에서는 CST 서명, 보드 부팅, closed 전환을 실행하지 않았습니다. 위 fuse 값은 U-Boot 문서에서 옮긴 것입니다.

## ESP32 Secure Boot v2

공식 [ESP-IDF v5.1.6 ESP32-C3 Secure Boot V2](https://docs.espressif.com/projects/esp-idf/en/v5.1.6/esp32c3/security/secure-boot-v2.html) 문서의 조건은 다음과 같습니다.

| 항목 | 문서의 값 |
|---|---|
| 서명 방식 | RSA-PSS, RSA-3072 (이 문서에는 RSA-PSS만 기술됨) |
| 최소 칩 revision | ECO3(Rev 3) 이상, `CONFIG_ESP32C3_REV_MIN` ≥ 3 |
| eFuse에 두는 공개키 digest | 1~3개, 각각 `KEY_REVOKE` bit로 폐기 |
| Signature block | 4 KB 정렬된 별도 flash sector에서 시작, 1,216 B |
| 원격 서명 명령 | `espsecure.py sign_data BINARY_FILE --version 2 --keyfile PRIVATE_SIGNING_KEY` |

문서는 aggressive revocation(검증에 실패한 키를 즉시 폐기)을 켜면 모든 키가 폐기돼 장치가 영구히 부팅하지 못할 수 있다고 경고합니다. eFuse는 되돌릴 수 없으므로 이 설정은 양산 절차에서 정합니다. 이 글에서는 키 생성·서명·eFuse provisioning을 실행하지 않았습니다.

## anti-rollback — 옛 펌웨어로 돌아가는 것을 막기

서명 검증만 있으면, 공격자가 *옛 펌웨어* (취약점이 있는 버전)를 다시 서명된 채로 들이밀 수 있습니다. 옛 펌웨어의 서명도 같은 키로 만들어진 것이므로 검증을 통과합니다. 이를 막는 것이 anti-rollback입니다.

Anti-rollback은 이미지에 실린 보안 버전과 장치가 신뢰 저장소에 들고 있는 값을 비교합니다. 저장소는 OTP일 수도 있고, MCUboot처럼 플랫폼이 구현하는 인터페이스 뒤의 non-volatile 저장소일 수도 있습니다.

**펌웨어 이미지의 metadata:**

- ─ version  = 1.4.2   (사람이 보는 번호)
- ─ sec_ver  = 5       (anti-rollback 카운터)

**디바이스의 신뢰된 상태(구현 예):**

- ─ stored_security_counter = 5

**검증:**

- if (image.sec_ver < device.stored_security_counter) → reject
- if (image.sec_ver > device.stored_security_counter) → 정책에 따라 상태 갱신; 원자성과 전원 차단 복구를 확인

[MCUboot v2.1.0 `design.md`](https://github.com/mcu-tools/mcuboot/blob/9c99326b9756dbcc35b524636d99ed5f3e6cb29b/docs/design.md#L1290-L1307)는 보안 카운터를 protected TLV에 넣고(`imgtool -s`), `MCUBOOT_HW_ROLLBACK_PROT`를 켜면 플랫폼이 `security_cnt.h`의 `boot_nv_security_counter_get()`·`boot_nv_security_counter_update()`를 구현하게 합니다. 같은 문서는 카운터를 image version과 따로 두는 이유도 적습니다. 릴리스마다 올릴 필요가 없고, 카운터 값이 같은 옛 이미지로는 내려갈 수 있기 때문입니다. [Ch 6](/blog/embedded/embedded-security/chapter06-ota-update)에서 실제 `imgtool`로 이 TLV를 만들어 봅니다.

## Measured Boot — TPM과 PCR

서명 검증은 허용되지 않은 이미지의 실행을 막습니다. Measured Boot은 실행한 것을 기록만 하고, 그 기록을 나중에 원격 검증자(attestation)나 TPM의 비밀 봉인 정책이 판단합니다. 하나는 문지기이고 다른 하나는 출입 기록부입니다.

기록부는 TPM의 PCR(Platform Configuration Register)입니다. 부트 단계가 이벤트 digest를 PCR에 extend합니다.

**PCR_extend(idx, data):**

- new_value = SHA-256(old_PCR_value || SHA-256(data))
- PCR[idx] = new_value

Debian 13 VM에서 swtpm 0.7.1(TPM 2.0 simulator)과 tpm2-tools 5.7로 이 식을 확인했습니다. Debug용으로 reset이 허용된 PCR 16을 썼습니다.

```text
$ openssl dgst -sha256 -r event.bin
e9d7d58f685e9d6815c52b411fe425278cca12717c35691e597e0a03791cd9c8 *event.bin
$ tpm2_pcrextend 16:sha256=e9d7d58f685e9d6815c52b411fe425278cca12717c35691e597e0a03791cd9c8
$ tpm2_pcrread sha256:16
  sha256:
    16: 0xA32EFEAC09EB06CE55AFFCA2478CFEC7EFCC871F4E256489E18D3BA62AFBC745
$ tpm2_pcrreset 16
$ tpm2_pcrreset 0
ERROR: Esys_PCR_Reset(0x907) - tpm:warn(2.0): bad locality
```

32바이트 0과 event digest를 이어 붙여 OpenSSL로 SHA-256을 계산하면 `a32efeac…afbc745`로 TPM이 낸 값과 같습니다. 같은 digest를 한 번 더 extend하면 값은 `0x8ABE17DC…EE94FF`로 또 바뀝니다. PCR은 카운터가 아니라 순서까지 담는 hash 사슬입니다. Reset도 PCR마다 다릅니다. PCR 16은 0으로 돌아갔지만 PCR 0은 "bad locality"로 거부됐습니다. 부팅 측정이 들어가는 PCR은 운영체제가 지울 수 없어야 하기 때문입니다.

Linux IMA는 커널 설정 `CONFIG_IMA_MEASURE_PCR_IDX`(v6.12 Kconfig에서 range 8~14, default 10)의 PCR에 측정을 extend합니다. 무엇을 잴지는 정책이 정합니다. 같은 Debian 13 VM(커널 6.12.116, `CONFIG_IMA=y`, `CONFIG_IMA_MEASURE_PCR_IDX=10`)을 `ima_policy=` 없이 부팅하니 `/sys/kernel/security/ima/ascii_runtime_measurements`에는 `boot_aggregate` 한 줄만 있었습니다. 실행 파일까지 재려면 `ima_policy=tcb` 같은 정책을 따로 줘야 합니다.

PCR policy에 맞을 때만 비밀 해제를 허용할 수 있지만, 선택한 PCR과 event log가 보호하려는 모든 상태를 덮는지 확인해야 합니다. 같은 PCR의 이전 값에 event digest를 누적하며, 서로 다른 PCR 번호의 값을 사슬처럼 이어 쓰지 않습니다. PCR 일치만으로 모든 runtime 상태가 안전하다고 판정하지 않습니다.

## ARM Trusted Firmware — 표준 Cortex-A secure boot

Trusted Firmware-A(TF-A)는 Arm A-profile 플랫폼용 참조 펌웨어입니다. 아래 표는 v2.15.0 `firmware-design.rst`의 AArch64 다섯 단계입니다. AArch32에서는 BL31이 없고 BL32가 EL3 Runtime Software 역할을 합니다.

| 단계 | 역할 |
|------|------|
| **BL1** | AP Trusted ROM. Arm 개발 플랫폼에서는 reset vector에서 바로 실행 |
| **BL2** | 후속 단계 로더, eMMC/SD에서 BL31/BL32/BL33 로드 |
| **BL31** | Secure Monitor (EL3 상주). SMC 처리, PSCI 구현 |
| **BL32** | Secure-EL1 payload(선택). v2.15.0 `services/spd/`에 OP-TEE(`opteed`)·TSP·TLK·Trusty·ProvenCore dispatcher가 있음 |
| **BL33** | Non-secure entry point (U-Boot, EDK2) |

[TF-A v2.15.0 `trusted-board-boot.rst`](https://github.com/TrustedFirmware-A/trusted-firmware-a/blob/da738d5eae93af342fdc4995dd3c05acb4c9d757/docs/design/trusted-board-boot.rst#L38-L46)는 trust anchor를 ROTPK 또는 그 hash로 정합니다. Arm 개발 플랫폼은 ROTPK hash(기본 SHA-256)를 trusted root-key storage register에 두고, 그 대신 development ROTPK의 hash를 BL1·BL2 이미지에 박아 넣는 방식도 "개발 목적으로만" 허용합니다. 그 development 키의 private key가 source tree의 `plat/arm/board/common/rotpk/`에 `arm_rotprivk_rsa.pem`·`arm_rotprivk_ecdsa.pem` 등으로 공개돼 있습니다. 이 키로 빌드한 이미지는 누구나 서명할 수 있으므로 서명 검증이 켜져 있어도 보호 효과가 없습니다. 이 글에서는 TF-A 타깃 빌드를 실행하지 않았습니다.

## 자주 하는 실수

- **개발 모드와 양산 모드를 혼동합니다.** 개발 키로 서명된 펌웨어가 양산 디바이스에 절대 들어가지 않게 빌드 시스템에서 분리해야 합니다.
- **OTP 굽기를 너무 일찍 합니다.** 한 번 굽으면 회수 불가입니다. U-Boot HABv4 가이드도 `hab_status`가 "No HAB Events Found!"를 낸 뒤에만 `SEC_CONFIG[1]`를 구우라고 합니다.
- **anti-rollback 카운터를 모든 빌드마다 올립니다.** MCUboot 설계 문서는 카운터를 version과 분리해 두면 릴리스마다 올릴 필요가 없고, 카운터 값이 같은 옛 이미지로는 내려갈 수 있다고 설명합니다. 올리는 순간 그보다 낮은 이미지로는 돌아갈 수 없으므로 보안 수정이 들어간 릴리스에서만 올립니다.
- **서명 검증만 하고 dm-verity는 안 켭니다.** kernel이 검증돼도 rootfs가 검증 안 되면 SD 카드 스왑으로 우회됩니다. 체인은 *application까지* 이어져야 합니다.
- **검증 실패 시 무엇을 할지 결정하지 않습니다.** 무한 reset, recovery 파티션 부팅, 영구 brick — 모두 정책적 선택입니다. 미리 정해 두지 않으면 양산 후 첫 실패에서 혼란이 옵니다.
- **TRNG 없이 ECDSA 서명을 생성합니다.** ECDSA는 nonce 재사용 시 즉시 private key가 노출됩니다. 빌드 머신에서도 양질의 entropy를 보장해야 하며, 디바이스에서 서명하는 경우 *deterministic ECDSA* (RFC 6979) 또는 Ed25519를 씁니다.

## 정리

- Secure Boot의 핵심은 변경 불가능한 RoT에서 시작하는 *검증 체인*입니다.
- RoT는 mask ROM 코드와 OTP fuse의 공개키 hash, 두 가지 형태로 존재합니다.
- 검증은 hash + asymmetric signature 조합입니다. 알고리즘과 인코딩은 BootROM·image format과 보안 정책이 결정합니다.
- 키 폐기 slot은 HABv4가 SRK 4개, ESP32-C3가 digest 3개입니다. Slot이 하나면 키 유출을 복구할 수 없습니다.
- STM32 RDP는 디버그·flash 보호이고, 이미지 검증은 MCUboot 같은 별도 부트로더가 합니다.
- TF-A에서는 BL2가 BL31·BL32·BL33을 모두 검증하고, 실패하면 panic합니다.
- Anti-rollback 카운터는 image version과 분리해 보안 수정 때만 올립니다.
- PCR extend는 SHA-256(old ‖ digest)이며 swtpm에서 같은 값이 나왔습니다. 부팅 PCR 0은 OS에서 reset되지 않습니다.

출처는 본문에 링크한 TF-A v2.15.0·U-Boot v2024.04·ESP-IDF v5.1.6·MCUboot v2.1.0 문서와 [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032)(Ed25519), [tpm2_pcrextend 문서](https://tpm2-tools.readthedocs.io/en/latest/man/tpm2_pcrextend.1/)입니다. 실행한 것은 OpenSSL 크기 측정과 swtpm PCR 시험, Debian VM의 IMA 설정 확인입니다. 실제 보드의 BootROM 검증, 전원 차단 중 rollback 시험은 하지 않았습니다.

다음 편은 **Ch 3: MCU 크립토 — HW accelerator**. Secure Boot에서 가정한 AES·SHA·ECC 연산이 실제 MCU에서 어떻게 빨라지는지, 그리고 언제 HW 가속이 진짜 빠른지를 봅니다.

## 관련 항목

- [Ch 1: 임베디드 보안 개요 / 위협 모델](/blog/embedded/embedded-security/chapter01-threat-model)
- [Ch 3: MCU 크립토 — HW accelerator](/blog/embedded/embedded-security/chapter03-mcu-crypto)
- [Ch 4: TrustZone — Cortex-A / Cortex-M](/blog/embedded/embedded-security/chapter04-trustzone)
- [Ch 5: TEE — OP-TEE / ARM CCA](/blog/embedded/embedded-security/chapter05-tee)
- [Ch 6: OTA 업데이트](/blog/embedded/embedded-security/chapter06-ota-update)
- [Practical RTOS Internals — Part 4-11: TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- DO-178C — 항공 SW 보증
