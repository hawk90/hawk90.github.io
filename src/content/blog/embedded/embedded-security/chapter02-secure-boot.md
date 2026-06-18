---
title: "Secure Boot 분석 — 부트 체인 서명 검증과 RoT 구축"
date: 2026-05-21T09:02:00
description: "ROM → bootloader → kernel → app. 각 단계 서명 검증. Root of Trust."
tags: [Secure Boot, Root of Trust, Cryptography]
series: "Embedded Security"
seriesOrder: 2
draft: false
---

## 한 줄 요약

> **"Secure Boot는 ROM에서 application까지 이어지는 검증 체인입니다."** — 변경 불가능한 ROM이 다음 단계의 서명을 검증하고, 검증된 단계가 또 그 다음을 검증합니다. 사슬의 어느 한 고리라도 끊기면 전체가 무너집니다.

## 왜 ROM에서부터 시작하는가

Ch 1의 위협 모델 표에서 "RoT 공개키 변조"가 DREAD 9.0으로 최상위였습니다. 이유는 단순합니다. *부팅이 검증되지 않으면* 그 위에서 동작하는 어떤 보안 기능도 의미가 없습니다. 공격자가 부트로더를 자기 것으로 바꾸면 TrustZone도, TEE도, secure storage도 그가 통제합니다.

따라서 보안은 *변경 불가능한 출발점*이 필요합니다. 이 출발점이 Root of Trust(RoT)입니다. RoT는 다음 두 가지 형태로 존재합니다.

- **Immutable code RoT** — 칩 제조 시 mask ROM에 새겨지는 부트 코드. 영구히 바뀌지 않습니다.
- **Immutable data RoT** — OTP fuse에 한 번 굽힌 공개키 hash. 한 번 굽으면 다시 못 굽힙니다.

이 둘이 만나면 다음과 같은 *짧은 신뢰 체인*이 만들어집니다. mask ROM 코드가 OTP에서 공개키 hash를 읽고, 외부 flash의 부트로더 이미지에 붙은 서명을 그 공개키로 검증합니다. 검증 통과하면 부트로더에 제어를 넘기고, 부트로더는 같은 패턴으로 다음 단계를 검증합니다.

## 부트 체인의 일반적인 모양

ARM Cortex-A 리눅스 시스템의 표준 부트 체인입니다.

```text
[BootROM in mask ROM]                ─ chip 내장, 변경 불가
        │  ECDSA 검증 (OTP 공개키)
        ▼
[SBL — Second-stage bootloader]      ─ flash 외부
        │  e.g. SPL (U-Boot), ATF BL2
        │
        │  ECDSA / RSA 검증 (chain CA)
        ▼
[BL31 — ARM Trusted Firmware]        ─ EL3 secure monitor
        │
        │  서명 검증
        ▼
[U-Boot / EFI]                       ─ 일반 부트로더
        │
        │  FIT image signature
        ▼
[Linux kernel + initrd + dtb]
        │
        │  dm-verity / fs-verity
        ▼
[rootfs] → [systemd / application]
```

Cortex-M의 MCU는 더 단순합니다. 보통 두세 단계입니다.

```text
[BootROM]
   │  ECDSA 또는 SHA-256 hash 검증
   ▼
[Application image in internal flash]
```

또는 dual-bank OTA 구조면 다음과 같습니다.

```text
[BootROM]
   │
   ▼
[MCUboot — secondary stage]
   │  ECDSA 검증 + rollback counter 검사
   ▼
[Application slot A 또는 B]
```

체인의 각 단계가 하는 일은 똑같습니다. *다음 단계 이미지의 서명을 검증하고, 통과하면 제어를 넘기고, 실패하면 멈춥니다*. 검증 알고리즘과 키 저장 방식만 단계마다 다릅니다.

## 서명 검증의 핵심 — hash + asymmetric signature

이미지 전체에 직접 서명하지 않습니다. *이미지의 hash*에 서명합니다. 검증 절차는 다음과 같습니다.

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

| 알고리즘 | 키 크기 | 검증 시간 (Cortex-M4 @ 100MHz) | 공간 | 메모 |
|---|---|---|---|---|
| RSA-2048 | 256 bytes | 약 400~600 ms | 검증 코드 ~10 KB | 검증은 빠르고 서명은 느림. 산업계 호환성 높음. |
| RSA-3072 | 384 bytes | 약 1.2~1.8 s | ~12 KB | NIST 2030년 이후 권장. |
| ECDSA P-256 | 64 bytes | 약 100~200 ms | ~15 KB | 키와 서명이 작아 임베디드에 적합. |
| ECDSA P-384 | 96 bytes | 약 250~400 ms | ~18 KB | 고보안 등급. CNSA 권장. |
| Ed25519 | 64 bytes | 약 80~150 ms | ~8 KB | 결정적 서명, 사이드채널 저항. |

대부분의 새 임베디드 설계는 ECDSA P-256 또는 Ed25519를 선택합니다. RSA-2048은 *기존 IT 인프라와의 호환성*이 중요할 때만 쓰입니다.

## OTP / fuse — 키 저장의 물리적 잠금

공개키 자체를 OTP에 저장하지는 않습니다. 공개키는 수백 바이트 또는 더 길어서 OTP 공간(보통 수 KB 이하)에 비싸기 때문입니다. 대신 *공개키의 SHA-256 hash* (32 bytes)만 OTP에 굽고, 공개키 자체는 부트 이미지에 동봉합니다.

검증 시:

1. 이미지에서 public_key 추출
2. computed_hash = SHA-256(public_key)
3. otp_hash = read_from_otp()
4. computed_hash == otp_hash 확인
5. 통과하면 그 public_key로 signature 검증

이 구조의 장점은 *키 회전*이 가능하다는 점입니다. 보통 OTP에 2~4개의 hash slot을 두고, 한 키가 노출되면 그 slot을 *revoke* (별도의 revocation fuse 굽기)하고 다른 slot의 키로 전환합니다.

## STM32 RDP — 가장 단순한 임베디드 보안

ST의 STM32 시리즈는 Read-Out Protection(RDP) 세 단계로 부팅 보안의 *기본*을 제공합니다.

- **RDP Level 0 (기본)**
  - 모든 디버그 인터페이스 열림
  - 양산 출하용이 아니라 *개발용*
- **RDP Level 1**
  - JTAG/SWD에서 internal flash 읽기 불가
  - SRAM은 읽힘. 하지만 디버그 자체는 가능
  - RDP를 다시 Level 0으로 되돌리면 *flash 전체 자동 erase*
- **RDP Level 2 (영구)**
  - JTAG/SWD 완전 비활성화
  - 한 번 설정하면 *영구* — 칩 회수 불가
  - 양산 출하 시 적용

Option byte 한 줄 변경입니다. STM32CubeProgrammer에서 설정하거나 코드에서 굽습니다.

```c
// HAL 코드 예 — 양산 라인의 마지막 단계에서만 실행
#include "stm32h7xx_hal.h"

static HAL_StatusTypeDef LockToRdp2(void) {
    FLASH_OBProgramInitTypeDef ob = {0};
    ob.OptionType = OPTIONBYTE_RDP;
    ob.RDPLevel   = OB_RDP_LEVEL_2;   // 영구 잠금

    if (HAL_FLASH_OB_Unlock() != HAL_OK) return HAL_ERROR;
    if (HAL_FLASHEx_OBProgram(&ob)  != HAL_OK) return HAL_ERROR;
    if (HAL_FLASH_OB_Launch()       != HAL_OK) return HAL_ERROR;
    HAL_FLASH_OB_Lock();
    return HAL_OK;
}
```

RDP Level 2가 secure boot은 아닙니다. *디버그 차단*과 *flash 읽기 차단*입니다. 즉 펌웨어 추출은 막지만, *외부에서 flash를 다시 굽는 공격*은 막지 못합니다. 진짜 secure boot은 STM32H7의 RSS(Root Secure Service)나 STM32L5의 TF-M 기반 boot loader를 켜야 합니다.

## NXP HABv4 — i.MX의 산업 표준 secure boot

NXP의 High Assurance Boot(HAB) version 4는 i.MX6, i.MX7, i.MX8 시리즈의 secure boot 메커니즘입니다.

키 구조는 PKI(공개키 기반 구조)입니다.

| 키 | 역할 |
|----|------|
| **SRK** (Super Root Key) | root, 4개의 키 가능 — hash가 OTP에 burn |
| └ CSF Key | Command Sequence File에 서명 |
| └ IMG Key | 부트 이미지에 서명 |

OTP에는 SRK 4개의 *전체 hash* (SHA-256, 32 bytes)가 굽힙니다. SRK 중 하나가 노출되면 *SRK_REVOKE* fuse를 굽혀 그 slot을 비활성화합니다.

빌드 시 절차는 다음과 같습니다.

```bash
# CST (Code Signing Tool) 으로 키 생성
cst --keygen --srk-key srk1.pem --type rsa3072

# CSF (Command Sequence File) 작성
cat > sign.csf <<EOF
[Header]
    Version = 4.3
    Hash Algorithm = sha256
    Engine = CAAM
    Engine Configuration = 0
    Certificate Format = X509
    Signature Format = CMS

[Install SRK]
    File = "SRK_1_2_3_4_table.bin"
    Source index = 0

[Install CSFK]
    File = "CSF1_1.pem"

[Authenticate CSF]

[Install Key]
    Verification index = 0
    Target index = 2
    File = "IMG1_1.pem"

[Authenticate Data]
    Verification index = 2
    Blocks = 0x877FF400 0x00000000 0x0009BC00 "u-boot-signed.imx"
EOF

# 서명 적용
cst --i sign.csf --o u-boot-signed.imx
```

이 명령으로 만들어진 `u-boot-signed.imx`는 BootROM이 검증해 부팅합니다. 검증 실패 시 BootROM이 USB serial download 모드로 빠지거나(개발 모드), 정지합니다(closed 모드).

OTP를 *closed* 상태로 바꾸는 fuse 굽기는 양산 직전의 *돌이킬 수 없는 단계*입니다. 보통 다음 명령으로 합니다.

```bash
# i.MX U-Boot 환경에서
=> fuse prog -y 0 6 0x2     # SEC_CONFIG[1] = 1 (closed)
```

## ESP32 Secure Boot v2

ESP32-S3, ESP32-C3 등의 Secure Boot v2는 RSA-PSS-3072 또는 ECDSA P-256을 씁니다. 키 hash가 eFuse에 굽힙니다.

```bash
# 키 생성 (RSA-3072)
espsecure.py generate_signing_key --version 2 \
    --scheme rsa3072 secure_boot_signing_key.pem

# 부트로더 서명
espsecure.py sign_data --version 2 \
    --keyfile secure_boot_signing_key.pem \
    --output bootloader-signed.bin \
    bootloader.bin

# 키의 SHA-256 digest를 eFuse에 굽기
espefuse.py burn_key BLOCK_KEY0 \
    secure_boot_signing_key_digest.bin \
    SECURE_BOOT_DIGEST0

# Secure Boot 활성화 eFuse 굽기
espefuse.py burn_efuse SECURE_BOOT_EN 1
```

마지막 두 줄은 *영구*입니다. eFuse는 한 방향으로만 굽힙니다. 양산 출하 전 마지막 단계에 들어갑니다.

## anti-rollback — 옛 펌웨어로 돌아가는 것을 막기

서명 검증만 있으면, 공격자가 *옛 펌웨어* (취약점이 있는 버전)를 다시 서명된 채로 들이밀 수 있습니다. 옛 펌웨어의 서명도 같은 키로 만들어진 것이므로 검증을 통과합니다. 이를 막는 것이 anti-rollback입니다.

기본 아이디어는 *단조 증가 카운터*입니다. 각 펌웨어 빌드에 *security counter*를 박고, 디바이스도 OTP의 별도 fuse 비트로 같은 카운터를 유지합니다.

**펌웨어 이미지의 metadata:**

- ─ version  = 1.4.2   (사람이 보는 번호)
- ─ sec_ver  = 5       (anti-rollback 카운터)

**디바이스의 OTP fuse:**

- ─ rollback_fuse = 1111100... (현재 5비트 굽힘 → sec_ver 5 통과)

**검증:**

- if (image.sec_ver < device.fuse_count) → reject
- if (image.sec_ver > device.fuse_count) → 부팅 후 fuse 추가 굽기

NXP HAB, MCUboot, ESP32 Secure Boot 모두 이 패턴을 지원합니다. 주의할 점은 fuse의 *총 비트 수가 유한*하다는 것입니다. 256비트짜리 fuse라면 256번까지만 sec_ver 증가가 가능합니다. 따라서 sec_ver은 *보안 수정에만* 증가시키고, 일반 기능 업데이트에는 그대로 둡니다.

## Measured Boot — TPM과 PCR

서명 검증은 *부적합한 부팅을 막는* 메커니즘입니다. Measured Boot은 *부팅한 결과가 무엇이었는지 증명하는* 메커니즘입니다. 둘은 보완 관계입니다.

핵심은 TPM의 PCR(Platform Configuration Register)입니다. 각 부트 단계가 *다음 단계의 hash*를 PCR에 *extend*합니다.

**PCR_extend(idx, data):**

- new_value = SHA-256(old_PCR_value || SHA-256(data))
- PCR[idx] = new_value

PCR은 *증가만* 가능하고 *되돌릴 수 없습니다*. 시스템이 부팅된 후 PCR 값들이 어떤 시퀀스인지를 *원격 서버에 attestation*으로 보고하면, 서버가 "이 PCR 조합은 우리가 아는 정상 부트와 일치한다"를 확인합니다.

```text
ROM        ─extends→ PCR0 = H(bootloader_hash)
Bootloader ─extends→ PCR1 = H(PCR0 || kernel_hash)
Kernel     ─extends→ PCR2 = H(PCR1 || rootfs_hash)
...
```

리눅스의 IMA(Integrity Measurement Architecture)는 PCR10을 사용해 *런타임에 실행되는 모든 binary*의 hash를 누적합니다.

TPM 2.0의 흔한 명령:

```bash
# PCR 읽기
tpm2_pcrread sha256:0,1,2,3,7

# 정책 봉인 — 특정 PCR 값일 때만 비밀 해제
tpm2_createpolicy --policy-pcr -l sha256:0,1,2,3 -L policy.bin
tpm2_create -C parent.ctx -L policy.bin -i secret.bin ...
```

이 패턴으로 *부팅이 정상일 때만* disk 암호화 키가 해제되는 시스템을 만들 수 있습니다. dm-crypt + TPM2 봉인이 그 예입니다.

## ARM Trusted Firmware — 표준 Cortex-A secure boot

ARM Trusted Firmware(ATF, 또는 TF-A)는 ARMv8 Cortex-A를 위한 *오픈 소스 참조 secure boot 구현*입니다. 4단계 부트로더로 구성됩니다.

| 단계 | 역할 |
|------|------|
| **BL1** | Boot ROM 직후 동작, 보통 ROM 또는 SRAM |
| **BL2** | 후속 단계 로더, eMMC/SD에서 BL31/BL32/BL33 로드 |
| **BL31** | Secure Monitor (EL3 상주). SMC 처리, PSCI 구현 |
| **BL32** | Secure-EL1 payload (보통 OP-TEE) |
| **BL33** | Non-secure entry point (U-Boot, EDK2) |

빌드 명령은 다음과 같습니다.

```bash
make CROSS_COMPILE=aarch64-linux-gnu- \
     PLAT=rk3399 \
     BL33=/path/to/u-boot.bin \
     BL32=/path/to/optee/tee.bin \
     TRUSTED_BOARD_BOOT=1 \
     GENERATE_COT=1 \
     ARM_ROTPK_LOCATION=devel_rsa \
     ROT_KEY=plat/arm/board/common/rotpk/arm_rotprivk_rsa.pem \
     fip all
```

`TRUSTED_BOARD_BOOT=1`이 secure boot 활성화, `GENERATE_COT=1`이 Chain of Trust 인증서 자동 생성, `ROT_KEY`가 root key입니다. 빌드 결과 `fip.bin` 안에 모든 BL과 인증서가 packed됩니다.

## 자주 하는 실수

- **개발 모드와 양산 모드를 혼동합니다.** 개발 키로 서명된 펌웨어가 양산 디바이스에 절대 들어가지 않게 빌드 시스템에서 분리해야 합니다.
- **OTP 굽기를 너무 일찍 합니다.** 한 번 굽으면 회수 불가입니다. 양산 검사 라인의 *마지막* 단계로 미룹니다.
- **anti-rollback 카운터를 모든 빌드마다 올립니다.** fuse 비트가 빨리 고갈됩니다. *보안 수정*에만 올립니다.
- **서명 검증만 하고 dm-verity는 안 켭니다.** kernel이 검증돼도 rootfs가 검증 안 되면 SD 카드 스왑으로 우회됩니다. 체인은 *application까지* 이어져야 합니다.
- **검증 실패 시 무엇을 할지 결정하지 않습니다.** 무한 reset, recovery 파티션 부팅, 영구 brick — 모두 정책적 선택입니다. 미리 정해 두지 않으면 양산 후 첫 실패에서 혼란이 옵니다.
- **TRNG 없이 ECDSA 서명을 생성합니다.** ECDSA는 nonce 재사용 시 즉시 private key가 노출됩니다. 빌드 머신에서도 양질의 entropy를 보장해야 하며, 디바이스에서 서명하는 경우 *deterministic ECDSA* (RFC 6979) 또는 Ed25519를 씁니다.

## 정리

- Secure Boot의 핵심은 변경 불가능한 RoT에서 시작하는 *검증 체인*입니다.
- RoT는 mask ROM 코드와 OTP fuse의 공개키 hash, 두 가지 형태로 존재합니다.
- 검증은 hash + asymmetric signature 조합입니다. 임베디드에서는 ECDSA P-256 또는 Ed25519가 표준입니다.
- 키 회전을 위해 OTP에는 보통 2~4개의 공개키 hash slot과 revocation fuse를 둡니다.
- STM32 RDP는 디버그·flash 보호이고, 진짜 secure boot은 별도 구현이 필요합니다.
- NXP HABv4, ESP32 Secure Boot v2는 양산 단계에서 SEC_CONFIG·SECURE_BOOT_EN fuse를 굽는 *영구 잠금* 모델입니다.
- Anti-rollback은 단조 증가 카운터로 옛 펌웨어 복귀를 막고, 보안 수정에만 카운터를 올립니다.
- Measured Boot은 TPM PCR로 부팅 결과를 누적해 원격 attestation의 기반을 제공합니다.

다음 편은 **Ch 3: MCU 크립토 — HW accelerator**. Secure Boot에서 가정한 AES·SHA·ECC 연산이 실제 MCU에서 어떻게 빨라지는지, 그리고 언제 HW 가속이 진짜 빠른지를 봅니다.

## 관련 항목

- [Ch 1: 임베디드 보안 개요 / 위협 모델](/blog/embedded/embedded-security/chapter01-threat-model)
- [Ch 3: MCU 크립토 — HW accelerator](/blog/embedded/embedded-security/chapter03-mcu-crypto)
- [Ch 4: TrustZone — Cortex-A / Cortex-M](/blog/embedded/embedded-security/chapter04-trustzone)
- [Ch 5: TEE — OP-TEE / ARM CCA](/blog/embedded/embedded-security/chapter05-tee)
- [Ch 6: OTA 업데이트](/blog/embedded/embedded-security/chapter06-ota-update)
- [Practical RTOS Internals — Part 4-11: TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- [DO-178C — 항공 SW 보증](/blog/embedded/aerospace-standards/do-178c)
