---
title: "임베디드 Chain of Trust — 다단계 서명 검증의 전체 흐름"
date: 2026-05-19T09:27:00
description: "BootROM PK hash → BL2 signed by ROTPK → BL31/BL33 signed by trusted key → kernel signed by FIT key의 chain을 끝까지."
series: "Bootloader Internals"
seriesOrder: 27
tags: [embedded, bootloader, secure-boot, chain-of-trust, signing]
draft: false
---

[Ch 16](/blog/embedded/bootloader/chapter16-verified-boot)에서 U-Boot의 FIT verified boot 한 단계를 봤습니다. 이 장에서는 시야를 넓혀 *전체 체인*을 끝에서 끝까지 따라갑니다. eFuse에 박힌 PK hash에서 시작해 BootROM, BL1·BL2·BL31, U-Boot Proper, 커널, 그리고 커널 모듈까지. 각 단계가 *어떤 키로* *무엇을 검증*하는지, 한 단계라도 깨지면 어디서 어떻게 거부되는지 봅니다.

## 한 줄 요약

**신뢰 체인은 변경 불가능한 eFuse PK hash에서 출발해 BootROM → BL1 → BL2 → BL31 → BL33 → 커널 → 모듈로 *수직 인계*됩니다. 각 단계가 다음 단계의 서명을 검증하고, 한 번이라도 매치가 깨지면 부팅이 끊깁니다.**

## Root of Trust — eFuse부터 시작

신뢰 체인은 *변경 불가능한 한 곳*에서 출발해야 합니다. 그렇지 않으면 공격자가 그 시작점을 바꿔 체인 전체를 뒤집을 수 있습니다. SoC 입장에서 변경 불가능한 자리는 두 가지뿐입니다. 하나는 mask ROM(BootROM 코드 자체), 다른 하나는 eFuse(한 번 굽고 나면 못 되돌리는 비트). 키를 박는 자리는 *eFuse*입니다. mask ROM은 SoC 출고 시 굳어지지만, 키는 *제품마다 달라야* 하기 때문입니다.

eFuse에 *키 자체*를 넣지는 않습니다. 키는 보통 2048비트 RSA public key라 수백 바이트인데, eFuse는 비싸서 256비트가 한계입니다. 대신 *public key의 SHA-256 hash*를 넣습니다. BootROM은 다음 단계 이미지에 *함께 실려 오는 public key*를 읽고, 그 SHA-256을 계산해 eFuse의 hash와 비교합니다. 일치하면 그 키로 이미지의 서명을 검증합니다.

이 *hash 비교* 한 줄이 체인의 *닻*입니다. 공격자가 자신의 키로 이미지에 서명하더라도, 그 키의 hash가 eFuse 값과 다르므로 BootROM이 거부합니다. eFuse는 한 번 굽혀 있어 *바꿀 수 없으니* 닻은 빠지지 않습니다.

eFuse에 박는 이 hash를 NXP는 *SRK hash*(Super Root Key), Rockchip은 *PK hash*, TI는 *ROTPK hash*(Root Of Trust Public Key)라 부릅니다. 이름은 다르지만 *역할은 같습니다*. [Ch 23](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp-efuse-otp)에서 eFuse의 물리적 구조를 다뤘다면, 이 장은 그 위에 *키*가 어떻게 얹히는지 봅니다.

## 단계별 검증 흐름

전체 체인을 *수직 인계* 구조로 펼치면 다음과 같습니다.

![Chain of Trust — eFuse PK hash(RoT) → BootROM이 SPL 검증 → BL1→BL2→BL31/32/33 단계별 RSA 서명 검증 → U-Boot이 FIT 검증 → 커널이 모듈 서명 검증 → user space는 dm-verity로 rootfs 무결성](/images/blog/bootloader/diagrams/ch27-chain-of-trust.svg)

각 단계가 *다음 단계의 서명*을 *자기 키*로 검증합니다. 한 단계라도 *키가 없거나*, *서명이 깨졌거나*, *anti-rollback 카운터가 옛 버전*이면 부팅이 즉시 끊깁니다.

단계별로 어떤 키가 어떤 자리에 있는지 표로 정리합니다.

| 단계 | 검증 주체 | 검증 대상 | 키 위치 | 키 종류 |
|------|----------|----------|---------|---------|
| 0 | BootROM | BL1/SPL | eFuse (hash) + 이미지 묶음 (full key) | PK / SRK / ROTPK |
| 1 | BL1 | BL2 | BL1 안에 임베드 또는 FIP 인증서 | trusted boot firmware key |
| 2 | BL2 | BL31 / BL32 / BL33 | FIP의 X.509 cert chain | trusted key (intermediate) |
| 3 | U-Boot (BL33) | kernel + DT + initramfs (FIT) | U-Boot control DT의 `/signature` 노드 | FIT signing key |
| 4 | kernel | kernel module (`.ko`) | `.builtin_trusted_keys` 키링 (vmlinux 임베드) | MODULE_SIG_KEY |
| 5 | user space | rootfs blocks | DT 또는 FIT에 박힌 root-hash | dm-verity |

## 키와 인증서의 계층

각 단계가 *키 하나*를 들고 있지 않습니다. *X.509 cert chain*으로 *키 계층*을 만듭니다. ROM이 root key 하나만 알고, root key가 *중간 키*를 인증하고, 중간 키가 *이미지별 키*를 인증하는 구조입니다. 이렇게 두면 *이미지별 키 하나가 노출돼도* root key는 안 다칩니다.

ARM TF-A의 *Trusted Boot Boot Sequence* 표준은 다음 인증서 계층을 정의합니다.

```text
[ROTPK]  ← eFuse hash로 닻
    │
    ├── trusted-boot-fw-cert.crt   (BL2 서명)
    │       └── BL2 이미지 hash
    │
    ├── trusted-key-cert.crt       (중간 키)
    │       │
    │       ├── soc-fw-key-cert.crt → soc-fw-content-cert.crt (BL31 hash)
    │       ├── tos-fw-key-cert.crt → tos-fw-content-cert.crt (BL32 hash)
    │       └── nt-fw-key-cert.crt  → nt-fw-content-cert.crt  (BL33 hash)
```

ROTPK이 *trusted-boot-fw-cert*와 *trusted-key-cert* 둘을 직접 서명합니다. 그 아래로 *soc-fw / tos-fw / nt-fw* 세 갈래가 갈라지고, 각 갈래가 *key cert + content cert* 두 단을 가집니다. content cert가 *이미지의 SHA-256 hash*를 담고, key cert가 *그 content cert에 서명한 키*의 정보를 담습니다.

이 분할은 *키 회전 비용*을 줄입니다. BL33만 갱신했다면 *nt-fw-content-cert*만 다시 서명하면 됩니다. ROTPK은 절대 안 건드립니다.

## HABv4 — NXP i.MX 패턴

NXP HABv4(High Assurance Boot v4)는 *i.MX 6 / 7 / 8M*에서 쓰이는 BootROM 검증 시스템입니다. 키 계층은 *SRK*(Super Root Key) 1 ~ 4개, *CSF Key*, *Image Key*의 3단입니다. SRK 4개의 hash가 eFuse에 박히고, 활성 SRK가 *CSF Key*를 인증하고, CSF Key가 *Image Key*를 인증하고, Image Key가 *실제 이미지의 hash*를 서명합니다. SRK 4개를 둔 이유는 *키 회전*입니다. SRK1이 노출되면 SRK1만 revoke하고 SRK2로 옮길 수 있습니다.

서명 흐름은 NXP의 *Code Signing Tool*(`cst`)이 묶어 줍니다. 입력은 *CSF input file*이고 출력은 *CSF binary*입니다. CSF binary는 *IVT*(Image Vector Table)를 통해 이미지 뒤에 붙습니다.

```bash
# CSF input 작성 후 cst로 서명
cst -i csf_uboot.txt -o csf_uboot.bin

# 서명된 CSF binary를 U-Boot 이미지 뒤에 붙이기
cat u-boot-dtb.imx csf_uboot.bin > u-boot-signed.imx
```

`csf_uboot.txt`는 *서명할 영역*과 *어떤 키를 쓸지*를 기술합니다. 핵심은 `Authenticate Data`의 `Blocks` 한 줄입니다. *시작 주소* + *오프셋* + *크기* + *파일명* 4개로 "이 범위를 이 키로 서명한다"를 기술합니다.

```text
[Header]
    Version = 4.3
    Hash Algorithm = sha256
    Engine = CAAM
[Install SRK]
    File = "../crts/SRK_1_2_3_4_table.bin"
    Source index = 0
[Install CSFK]
    File = "../crts/CSF1_1_sha256_4096_65537_v3_usr_crt.pem"
[Authenticate CSF]
[Install Key]
    Verification index = 0
    Target index = 2
    File = "../crts/IMG1_1_sha256_4096_65537_v3_usr_crt.pem"
[Authenticate Data]
    Verification index = 2
    Blocks = 0x877FF400 0x00000000 0x0009E000 "u-boot-dtb.imx"
```

IVT 구조는 C struct로 보면 한눈에 들어옵니다.

```c
struct ivt {
    uint32_t header;           // 0x402000D1 (tag, length, version)
    uint32_t entry;            // U-Boot 진입 주소
    uint32_t reserved1;
    uint32_t dcd_ptr;          // Device Configuration Data 위치
    uint32_t boot_data_ptr;    // boot_data struct 위치
    uint32_t self;             // IVT 자신의 절대 주소
    uint32_t csf;              // CSF binary 위치 (서명 데이터)
    uint32_t reserved2;
};
```

BootROM은 *header tag(0x402000D1)*를 보고 IVT를 인식한 뒤, `csf` 필드를 따라가 *CSF binary*를 읽어 서명을 검증합니다. SRK fuse를 굽고 *HAB_TYPE*을 `closed`로 설정하면 그때부터 서명되지 않은 이미지는 BootROM이 거부합니다. fuse를 굽기 전에는 *open* 모드라 안 잠긴 상태로 동작합니다.

## Rockchip secure boot

Rockchip은 *loader1*(MiniLoader / TPL+SPL)과 *loader2*(U-Boot Proper)를 RSA-2048 키 한 쌍으로 서명합니다. 도구는 `rkdeveloptool`과 `rk_sign_tool`입니다.

```bash
# RSA 키 쌍 생성
openssl genrsa -out rk_priv.pem 2048
openssl rsa -in rk_priv.pem -pubout -out rk_pub.pem

# loader1 서명
rk_sign_tool sign --key rk_priv.pem \
    --image rk356x_spl_loader.bin \
    --output rk356x_spl_loader_signed.bin

# eFuse에 public key hash 굽기 (irreversible)
rkdeveloptool wf 0x10 rk_pub_hash.bin
rkdeveloptool wf 0x20 efuse_secure_enable.bin
```

마지막 두 줄이 *완전 비가역*입니다. 한 번 wf(write fuse)로 *secure enable*까지 켜면 그 보드는 영원히 이 키 외에 안 받습니다. 양산 라인에서 *키 백업이 안 된 상태*로 이걸 굽는 사고가 가끔 일어납니다. 그 보드는 폐기입니다. Rockchip은 *FIT 호환*이라 loader2 이후는 U-Boot 표준 verified boot 흐름과 같습니다.

## TI K3 SECDEV

TI K3 (AM62 / AM64 / J7)는 *SECDEV* 빌드 시스템과 *SYSFW signing*을 씁니다. 키 계층이 4단으로 가장 복잡합니다.

| 키 | 용도 | 보관 |
|----|------|------|
| ROTPK | Root, eFuse hash | HSM |
| BMPK | Boot Manager (보드별) | HSM |
| SMPK | Secondary Manufacturing (벤더) | 양산 라인 HSM |
| INTPK | Intermediate (이미지별) | 빌드 서버 |

ROTPK가 BMPK·SMPK 인증서에 서명하고, BMPK/SMPK가 INTPK 인증서에 서명하고, INTPK가 *실제 이미지*(SYSFW, tiboot3, tispl, u-boot)에 서명합니다. 빌드는 `tisdk-secure` 환경에서 다음 흐름으로 진행됩니다.

```bash
# K3 SECDEV 환경에서 이미지 서명
export TI_SECURE_DEV_PKG=/path/to/k3-image-gen
make -C ${TI_SECURE_DEV_PKG} K3_HSFS_KEY=int.pem \
    K3_HSFS_TYPE=signed \
    SOC=am64x \
    HS=1 \
    tiboot3.bin

# 결과: tiboot3-am64x-hs-evm.bin (signed)
```

SYSFW는 *Cortex-M3 Device Management Security Controller* 위에서 동작하는 *시스템 펌웨어*인데, 이것 자체도 서명되어야 합니다. SYSFW가 *부트 chain의 첫 단계*에 합세하기 때문에 SYSFW 서명을 빠뜨리면 그 위의 모든 단계가 *secure 부팅 모드*에서 거부됩니다.

K3는 HSM 강제도 가장 엄격합니다. ROTPK·BMPK는 *반드시* HSM에서 동작하고, 빌드 서버는 *INTPK 키만* 접근할 수 있게 권한을 설계합니다.

## U-Boot FIT — verified boot

U-Boot 단계는 [Ch 16](/blog/embedded/bootloader/chapter16-verified-boot)에서 자세히 다뤘으니 핵심만 요약합니다. `mkimage`가 *FIT 서명*과 *control DT에 public key embed*를 한 번에 수행합니다.

```bash
mkimage -f boot.its \
        -k keys \
        -K u-boot.dtb \
        -r \
        -G keys/dev.key \
        boot.itb
```

`.its` 파일의 signature 노드는 *configuration 단위*입니다. *이미지 단위*가 아닙니다.

```text
configurations {
    default = "conf-1";
    conf-1 {
        description = "boardX boot";
        kernel = "kernel-1";
        fdt = "fdt-1";
        ramdisk = "ramdisk-1";

        hash-1 { algo = "sha256"; };

        signature-1 {
            algo = "sha256,rsa2048";
            key-name-hint = "dev";
            sign-images = "kernel", "fdt", "ramdisk";
            required = "conf";
        };
    };
};
```

`required = "conf"`가 *체인의 마지막 못*입니다. 이 표시가 없으면 U-Boot이 *서명 안 된 FIT도* 허용해 체인이 풀립니다. 부팅 로그에서 `+ OK`가 보이면 검증 성공, `- Bad` 또는 `error!`가 보이면 거부입니다.

## kernel module signing

체인은 user space까지 가야 닫힙니다. 커널을 검증해도 *런타임에 임의의 모듈*을 `insmod`로 불러올 수 있다면 root 권한을 얻은 공격자가 커널 메모리를 자유롭게 만질 수 있습니다. *모듈 서명 강제*가 그 구멍을 막습니다.

```text
CONFIG_MODULE_SIG=y
CONFIG_MODULE_SIG_FORCE=y
CONFIG_MODULE_SIG_ALL=y
CONFIG_MODULE_SIG_SHA256=y
CONFIG_MODULE_SIG_KEY="certs/signing_key.pem"
```

`CONFIG_MODULE_SIG_FORCE=y`가 *런타임 강제*입니다. 서명 안 된 모듈은 `insmod`가 `-EKEYREJECTED`로 실패합니다. `CONFIG_MODULE_SIG_KEY`는 빌드 시 *자동으로* 모듈에 서명할 키 경로입니다. 빌드가 끝나면 `vmlinux`의 `.builtin_trusted_keys` 키링에 해당 키의 public 부분이 박힙니다. out-of-tree 모듈이나 vendor 드라이버는 `scripts/sign-file`로 수동 서명합니다.

```bash
scripts/sign-file sha256 \
    certs/signing_key.pem \
    certs/signing_key.x509 \
    drivers/my_module.ko
```

서명이 끝나면 `.ko` 파일 끝에 *PKCS#7 서명 블록*과 *magic string `~Module signature appended~`*이 추가됩니다. `CONFIG_LOCKDOWN_LSM`까지 켜면 서명 없이는 `/dev/mem`·kexec·BPF kprobe도 막혀 체인의 마지막 한 줄이 닫힙니다.

## 키 rollover와 revocation

키는 *언젠가 노출됩니다*. 양산 라인 도구가 털리거나, 빌드 서버가 침해되거나, 퇴사한 엔지니어가 USB를 들고 나가거나. 키가 *언제 노출돼도* *그 키를 무효화하고 새 키로 옮길 수 있어야* 합니다. 두 가지 매커니즘이 있습니다.

첫째, **eFuse의 키 revocation 비트**입니다. NXP HABv4는 SRK 4개와 *revocation fuse 4비트*를 따로 둡니다. SRK2가 노출됐다면 그 비트를 굽고 SRK3으로 옮깁니다. ROTPK은 손대지 않고 운영 키만 회전합니다.

둘째, **anti-rollback counter**입니다. 노출된 키로 서명된 *옛 펌웨어*를 공격자가 다시 flash해서 과거의 취약점을 재활용하는 공격을 막습니다. eFuse에 *monotonic counter*를 두고 펌웨어마다 *최소 허용 버전*을 박은 뒤, 부팅 시 *eFuse 카운터 ≥ 펌웨어 버전*인지 확인합니다.

```text
[펌웨어 v1] → eFuse counter = 1
[펌웨어 v2] → eFuse counter = 2  ← 한 번 굽힘
[펌웨어 v1] flash 시도 → counter 1 < 2 → BootROM이 거부
```

OTP 갱신은 *부팅 성공이 며칠 검증된 뒤* 적용하는 것이 안전합니다. 새 펌웨어가 부팅하자마자 카운터를 올렸다가 *그 펌웨어에 큰 버그가 있어* 롤백해야 한다면, 이미 카운터가 올라가서 *영영 되돌릴 수 없습니다*.

## 단계별 failure 진단

서명 체인이 깨지면 *어디서 깨졌는지*가 중요합니다. 단계마다 *고유한 에러 메시지*가 떨어집니다.

| 단계 | 실패 시 메시지 | 원인 |
|------|---------------|------|
| BootROM | (보통 침묵, USB recovery 모드 진입) | eFuse hash와 이미지 키 불일치, 또는 서명 없음 |
| BootROM (i.MX) | `HAB Event: 0xdb, 0x00, ...` | HAB가 이미지 거부, `hab_status` 명령으로 분석 |
| BL1 → BL2 | `BL1: Failed to authenticate BL2` | FIP 안 trusted-boot-fw-cert 서명 깨짐 |
| BL2 → BL31 | `Authentication failure for image id 6` | content cert hash mismatch |
| U-Boot FIT | `Bad Data Hash` 또는 `Verifying Hash Integrity ... error!` | FIT image hash mismatch |
| U-Boot FIT | `No signature found in image` | 서명이 아예 없음, `-r` 빠뜨림 |
| kernel module | `insmod: ERROR: could not insert module ...: Required key not available` | `.ko`에 서명 없음 또는 trusted_keys에 키 없음 |
| kernel module | `Module verification failed: signature and/or required key missing` | `CONFIG_MODULE_SIG_FORCE=y` 강제 모드 |

U-Boot FIT 단계의 전형적인 거부 로그입니다.

```text
=> bootm 0x40000000
## Loading kernel from FIT Image at 40000000 ...
   Using 'conf-1' configuration
   Verifying Hash Integrity ... sha256,rsa2048:dev error!
Bad Data Hash
ERROR: can't get kernel image!
```

`sha256,rsa2048:dev error!` 한 줄이 결정적입니다. 서명 알고리즘은 인식했고 키 이름도 찾았는데, *hash가 안 맞는다*는 뜻입니다. `mkimage` 단계에서 *서명 후 이미지를 또 건드린* 경우(예: 다른 `mkimage`로 wrap을 한 번 더 함)가 가장 흔한 원인입니다.

i.MX HAB 거부는 *침묵* 또는 *recovery 모드 진입*이라 더 까다롭습니다. U-Boot 콘솔까지 도달했다면 `hab_status`로 *HAB event log*를 덤프해 분석합니다.

```text
=> hab_status
Secure boot enabled
HAB Configuration: 0xcc, HAB State: 0x99
--------- HAB Event 1 -----------------
STS = HAB_FAILURE (0x33)
RSN = HAB_INV_SIGNATURE (0x18)
CTX = HAB_CTX_COMMAND (0xc0)
```

`HAB_INV_SIGNATURE`가 결정적입니다. 이미지의 서명이 *그 보드의 SRK*와 짝이 안 맞습니다. 양산 키와 개발 키를 헷갈려서 굽거나, SRK fuse를 굽기 전에 *open* 모드에서 빌드한 이미지를 *closed* 보드에 올리면 이 메시지가 떨어집니다.

## 정리

- 신뢰 체인의 시작점은 *변경 불가능한 eFuse PK hash*입니다. 키 자체가 아니라 SHA-256 hash만 박습니다.
- BootROM이 BL1을 검증하고, BL1이 BL2를, BL2가 BL31·BL32·BL33을, BL33(U-Boot)이 FIT을, 커널이 모듈을, dm-verity가 rootfs를 검증합니다. *수직 인계* 구조입니다.
- X.509 cert chain으로 *root key는 손대지 않고* 중간 키 / 이미지 키를 *회전*할 수 있습니다. ROTPK은 영원, 나머지는 노출되면 교체합니다.
- NXP HABv4는 SRK 4개와 CSF / Image Key 3단을, Rockchip은 단일 RSA-2048을, TI K3는 ROTPK·BMPK·SMPK·INTPK 4단을 씁니다. 키 계층 깊이와 HSM 강제 수준이 다릅니다.
- U-Boot FIT은 *configuration 단위*로 서명해야 mix-and-match 공격을 막을 수 있습니다. `required = "conf"`가 강제 표시입니다.
- 커널 모듈도 체인에 포함됩니다. `CONFIG_MODULE_SIG_FORCE=y`가 없으면 user space에서 임의 모듈로 체인을 깰 수 있습니다.
- anti-rollback counter가 *유효한 서명이 박힌 옛 펌웨어*로의 롤백 공격을 막습니다. 카운터 갱신은 *부팅 검증 후* 신중하게 합니다.
- 단계별 실패 메시지가 다르므로 *어디서 깨졌는지* 구분할 수 있습니다. `HAB_INV_SIGNATURE`, `Bad Data Hash`, `Required key not available`이 대표적입니다.

## 다음 장 예고

체인이 닫혀도 *어디에 무엇을 둘지*가 정해지지 않으면 부팅 자체가 안 됩니다. 다음 장에서는 SPL·U-Boot·FIT·환경 변수·rootfs·A/B 슬롯을 *eMMC / SPI flash에 어떻게 배치*할지, partition table과 offset 설계 패턴을 봅니다.

## 관련 항목

- [Ch 15: FIT 이미지 — 한 묶음으로 부팅하기](/blog/embedded/bootloader/chapter15-fit-image)
- [Ch 16: Verified Boot — RSA 서명과 public key 임베딩](/blog/embedded/bootloader/chapter16-verified-boot)
- [Ch 23: BootROM · eFuse · OTP — SoC의 0단계](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp-efuse-otp)
- [Ch 25: ARM TF-A 통합 — BL1·BL2·BL31·BL32·BL33](/blog/embedded/bootloader/chapter25-tfa-optee)
- [Ch 28: Flash layout 설계 — partition과 offset](/blog/embedded/bootloader/chapter28-flash-layout)
- [Buildroot Ch 18: CVE 추적과 SBOM](/blog/embedded/buildroot/chapter18-security-cve) — 키와 함께 추적할 취약점 관리
- [원문 — NXP HABv4 RM (i.MX Reference Manual, HAB chapter)](https://www.nxp.com/docs/en/application-note/AN4581.pdf)
- [원문 — ARM TF-A Trusted Boot](https://trustedfirmware-a.readthedocs.io/en/latest/design/trusted-board-boot.html)
- [원문 — Linux Kernel Module Signing Facility](https://www.kernel.org/doc/html/latest/admin-guide/module-signing.html)
