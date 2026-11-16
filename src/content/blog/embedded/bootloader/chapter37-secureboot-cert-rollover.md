---
title: "UEFI Secure Boot 인증서 만료 — 2011→2023 CA 롤오버와 PQC 대비"
slug: "embedded/bootloader/chapter37-secureboot-cert-rollover"
date: 2026-06-19T09:04:00
description: "2026년 6월부터 시작되는 Microsoft Secure Boot 2011 인증서 만료 — PK·KEK·db·dbx 계층, 2023 CA 체인과 Option ROM CA 분리, 임베디드 기기 영향, 그리고 post-quantum 서명으로의 길."
series: "Bootloader Internals"
seriesOrder: 37
tags: [embedded, bootloader, secure-boot, uefi, post-quantum]
draft: false
topics: ["embedded"]
---

[Ch 16](/blog/embedded/bootloader/chapter16-verified-boot)에서는 U-Boot가 FIT 이미지를 자기 키로 검증하는 흐름을, [Ch 27](/blog/embedded/bootloader/chapter27-chain-of-trust)에서는 root key부터 커널 모듈까지 이어지는 chain of trust를 봤습니다. 그 체인은 *키를 신뢰한다*는 전제 위에 서 있습니다. UEFI Secure Boot에서 가장 널리 신뢰되는 키는 Microsoft의 2011년 인증서들이고, 이 인증서들은 2026년 6월과 10월에 만료됐습니다.

## 한 줄 요약

인증서 파일에서 직접 읽은 만료일은 KEK CA 2011이 2026-06-24, UEFI CA 2011이 2026-06-27, Windows Production PCA 2011이 2026-10-19입니다. 세 날짜가 모두 지난 2026-11-15(게스트 시계 기준)에 Secure Boot를 켠 EDK2에서 Debian 13을 부팅했습니다. db에 만료된 UEFI CA 2011만 있어도, 2023 CA만 있어도 부팅됐습니다. Debian shim이 두 CA로 이중 서명돼 있기 때문입니다. db에 Windows UEFI CA 2023만 넣었을 때만 펌웨어가 shim을 `Access Denied`로 거부했습니다. 즉 갈림길은 만료일이 아니라 *db에 어떤 CA가 있고, 이미지가 누구의 서명을 달고 있느냐*입니다.

## 실험 환경

| 항목 | 값 |
| --- | --- |
| QEMU | 11.1.3, `-M virt -cpu max -smp 2 -m 2G` |
| 펌웨어 | Debian 13 `qemu-efi-aarch64` 2025.02-8+deb13u1의 `AAVMF_CODE.secboot.fd` (deb SHA256 `a00b2411…5276ed`) |
| 변수 저장소 | 같은 패키지의 `AAVMF_VARS.fd`(빈 템플릿)에 `virt-fw-vars` 26.9로 PK·KEK·db를 넣어 생성 |
| 인증서 | `virt-firmware` 26.9에 들어 있는 Microsoft 인증서 PEM 8개 |
| 게스트 | Debian 13 nocloud arm64, 커널 `6.12.116+deb13-arm64`, shim `shimaa64.efi` |

QEMU에 기본으로 들어 있는 `edk2-aarch64-code.fd`로는 이 실험을 할 수 없었습니다. db를 채운 변수 저장소로 부팅해도 SecureBoot 변수가 없었고, 커널이 "Secure boot disabled"를 냈습니다. Windows CA만 넣은 db로도 shim이 그대로 부팅됐습니다. Secure Boot가 빠진 빌드이기 때문입니다. Debian 패키지가 secboot 빌드와 no-secboot 빌드(`AAVMF_CODE.fd`는 `AAVMF_CODE.no-secboot.fd`의 링크)를 따로 내는 이유입니다.

## PK·KEK·db·dbx

Secure Boot의 신뢰는 펌웨어 NVRAM의 네 UEFI 변수에 저장됩니다.

| 변수 | 이름 | 역할 |
|------|------|------|
| PK | Platform Key | 최상위 키. KEK 갱신을 인가 |
| KEK | Key Exchange Key | db·dbx 갱신을 인가하는 키 목록 |
| db | Signature Database | 부팅을 허용할 서명자 인증서·해시 |
| dbx | Forbidden Signatures | 부팅을 금지할 서명자·해시(revocation) |

UEFI 2.10 32장(Secure Boot and Driver Signing)에 따르면 User Mode의 KEK 갱신은 현재 PK의 private key로 서명해야 합니다. db·dbx 갱신은 등록된 KEK 또는 PK의 private key로 인가합니다. 그래서 db에 새 CA를 넣으려면 KEK에 있는 키의 서명이 필요하고, KEK에 새 키를 넣으려면 PK 소유자(보통 OEM)의 서명이 필요합니다. 이 글의 실험은 변수 저장소를 부팅 전에 직접 만들었으므로 이 인가 절차를 거치지 않았습니다. 운영 중인 기기에서는 이 경로가 막혀 있습니다.

부팅 후 게스트에서 읽은 상태 변수입니다. efivarfs 파일의 앞 4바이트는 속성(0x06 = BOOTSERVICE_ACCESS | RUNTIME_ACCESS)이고 마지막 바이트가 값입니다.

```text
# mokutil --sb-state
SecureBoot enabled
# od -A n -t x1 /sys/firmware/efi/efivars/SecureBoot-8be4df61-93ca-11d2-aa0d-00e098032b8c
 06 00 00 00 01
# od -A n -t x1 /sys/firmware/efi/efivars/SetupMode-8be4df61-93ca-11d2-aa0d-00e098032b8c
 06 00 00 00 00
```

SecureBoot=1, SetupMode=0입니다. PK가 등록된 User Mode에서 검증이 강제된 상태입니다.

## 인증서 파일에서 읽은 만료일

`virt-firmware`에 들어 있는 Microsoft 인증서를 `openssl x509 -subject -issuer -startdate -enddate`로 읽었습니다.

| 인증서 (CN) | 들어가는 변수 | 발급자 | notAfter |
|--------|------|------|------|
| Microsoft Corporation KEK CA 2011 | KEK | Third Party Marketplace Root | 2026-06-24 20:51:29 GMT |
| Microsoft Corporation UEFI CA 2011 | db | Third Party Marketplace Root | 2026-06-27 21:32:45 GMT |
| Microsoft Windows Production PCA 2011 | db | Microsoft Root Certificate Authority 2010 | 2026-10-19 18:51:42 GMT |
| Microsoft Corporation KEK 2K CA 2023 | KEK | Microsoft RSA Devices Root CA 2021 | 2038-03-02 |
| Microsoft UEFI CA 2023 | db | Microsoft RSA Devices Root CA 2021 | 2038-06-13 |
| Microsoft Option ROM UEFI CA 2023 | db | Microsoft RSA Devices Root CA 2021 | 2038-10-26 |
| Windows UEFI CA 2023 | db | Microsoft Root Certificate Authority 2010 | 2035-06-13 |

2011 인증서 세 개는 모두 발급 후 15년, 2023 인증서는 대체로 15년(Windows UEFI CA 2023은 12년)입니다. 날짜는 Microsoft 안내의 일정과 같습니다. 이 표의 인증서 파일로 sha256 fingerprint도 확인할 수 있습니다. 예를 들어 UEFI CA 2011은 `48:E9:9B:99:…:24:85:07`입니다.

2011 체계에서는 `Microsoft Corporation UEFI CA 2011` 하나가 서드파티 부트로더(shim 등)와 option ROM을 함께 서명했습니다. 2023 체계는 이를 `Microsoft UEFI CA 2023`과 `Microsoft Option ROM UEFI CA 2023` 둘로 나눕니다. add-in 카드의 option ROM은 신뢰하되 서드파티 부트로더는 신뢰하지 않으려면, db에 Option ROM CA만 넣으면 됩니다.

## Debian shim은 누구의 서명을 달고 있나

Debian 이미지의 ESP(FAT, LBA 2048부터 127 MiB)에서 `EFI/debian/shimaa64.efi`와 `grubaa64.efi`를 꺼냈습니다. PE optional header의 Certificate Table(data directory 4번)을 따라가 `WIN_CERTIFICATE`를 하나씩 잘라 `openssl pkcs7 -print_certs`로 읽었습니다.

```text
### shimaa64
cert table off 0xfdfe0 size 19360
entry 0 len 9792 rev 0x200 type 0x2
entry 1 len 9568 rev 0x200 type 0x2
subject=C=US, ST=Washington, L=Redmond, O=Microsoft Corporation, CN=Microsoft Windows UEFI Driver Publisher
issuer=C=US, ST=Washington, L=Redmond, O=Microsoft Corporation, CN=Microsoft Corporation UEFI CA 2011
subject=C=US, ST=Washington, L=Redmond, O=Microsoft Corporation, CN=Microsoft Corporation UEFI CA 2011
issuer=C=US, ST=Washington, L=Redmond, O=Microsoft Corporation, CN=Microsoft Corporation Third Party Marketplace Root
subject=C=US, ST=Washington, L=Redmond, O=Microsoft Corporation, CN=Microsoft UEFI CA 2023 signer
issuer=C=US, O=Microsoft Corporation, CN=Microsoft UEFI CA 2023
subject=C=US, O=Microsoft Corporation, CN=Microsoft UEFI CA 2023
issuer=C=US, O=Microsoft Corporation, CN=Microsoft RSA Devices Root CA 2021
### grubaa64
cert table off 0x2b9000 size 1472
entry 0 len 1472 rev 0x200 type 0x2
subject=CN=Debian Secure Boot Signer 2022 - grub2
issuer=CN=Debian Secure Boot CA
```

type 0x2는 `WIN_CERT_TYPE_PKCS_SIGNED_DATA`(Authenticode)입니다. shim에는 서명이 두 개 있습니다. 하나는 UEFI CA 2011 체인, 다른 하나는 UEFI CA 2023 체인입니다. grub은 Microsoft가 아니라 Debian 자신의 CA로 서명돼 있습니다. 펌웨어 db는 shim까지만 검증하고, shim은 자기 안에 내장한 Debian CA로 grub과 커널을 검증합니다. 부팅 로그에 그 키가 따로 등록되는 것이 보입니다.

```text
[    1.658375] integrity: Loaded X.509 cert 'Debian Secure Boot CA: 6ccece7e4c6c0d1f6149f3dd27dfcc5cbb419ea1'
```

## 네 가지 db로 부팅하기

PK는 `virt-fw-vars --enroll-generate`로 만든 테스트 키 하나로 고정했습니다. KEK에는 그 테스트 키와 Microsoft KEK 2011·2023을 모두 넣었습니다. db만 바꿔 가며 같은 디스크를 부팅했습니다.

| 구성 | db 내용 | 결과 |
| --- | --- | --- |
| A | UEFI CA 2011만 (만료됨) | 부팅. `SecureBoot enabled` |
| B | UEFI CA 2023만 | 부팅. `SecureBoot enabled` |
| C | Windows UEFI CA 2023만 | 펌웨어가 shim 거부 |
| D | Debian 패키지의 `AAVMF_VARS.ms.fd` 그대로 | 부팅. `SecureBoot enabled` |

구성 A의 게스트 로그입니다. 커널은 db의 인증서를 platform keyring에 올리며 그 이름을 남깁니다.

```text
Sun Nov 15 23:52:23 UTC 2026
SecureBoot enabled
[    0.000000] Kernel is locked down from EFI Secure Boot; see man kernel_lockdown.7
[    0.000000] secureboot: Secure boot enabled
[    1.600331] integrity: Loaded X.509 cert 'Microsoft Corporation UEFI CA 2011: 13adbf4309bd82709c8cd54f316ed522988a1bd4'
[    1.601369] integrity: secureboot mode enabled
...
```

게스트 시계는 UEFI CA 2011의 notAfter(2026-06-27)를 넉 달 넘긴 시점입니다. 이 실행에서 펌웨어는 만료된 CA로 이어지는 shim 서명을 받아들였습니다. 구성 B에서는 같은 자리에 `Microsoft UEFI CA 2023: 81aa6b3244c935bce0d6628af39827421e32497d`가 올라갔고, 나머지 로그는 같았습니다.

구성 C는 로그인 프롬프트까지 가지 못했습니다.

```text
UEFI firmware (version 2025.02-8+deb13u1 built at 18:06:17 on Nov  8 2025)
BdsDxe: loading Boot0001 "UEFI Misc Device" from PciRoot(0x0)/Pci(0x1,0x0)
BdsDxe: failed to load Boot0001 "UEFI Misc Device" from PciRoot(0x0)/Pci(0x1,0x0): Access Denied
BdsDxe: No bootable option or device was found.
BdsDxe: Press any key to enter the Boot Manager Menu.
```

Windows UEFI CA 2023은 Windows 부트 관리자용이고, shim의 두 서명 어느 쪽 체인에도 없습니다. "Windows만 신뢰하는" db는 Linux shim을 막습니다.

구성 D, 즉 Debian 13이 "Microsoft 키가 등록된" 프로파일로 배포하는 변수 저장소의 내용은 이렇습니다.

```text
name=KEK guid=guid:EfiGlobalVariable size=2565 time=2026-01-04 18:11:43+00:00
    subject CN=Debian UEFI Secure Boot (PK/KEK key)
    subject CN=Microsoft Corporation KEK CA 2011
name=PK guid=guid:EfiGlobalVariable size=1005 time=2026-01-04 18:11:43+00:00
    subject CN=Debian UEFI Secure Boot (PK/KEK key)
name=db guid=guid:EfiImageSecurityDatabase size=3143 time=2026-01-04 18:11:43+00:00
  siglist type=guid:EfiCertX509 count=1
    subject CN=Microsoft Windows Production PCA 2011
  siglist type=guid:EfiCertX509 count=1
    subject CN=Microsoft Corporation UEFI CA 2011
```

(`virt-fw-vars -p -v` 출력에서 PK·KEK·db 부분 발췌)

변수 timestamp가 2026-01-04인데도 KEK와 db에는 2011 인증서만 있고 2023 CA는 없습니다. 지금 이 템플릿으로 VM을 만들면 2011 인증서만 가진 기기와 같은 상태가 됩니다. 오늘 부팅되는 것은 shim이 2011 체인 서명도 함께 달고 있어서입니다.

## 무엇이 깨지고, 무엇이 안 깨지나

위 결과와 Microsoft 안내를 함께 놓으면 다음과 같이 정리됩니다.

- **이미 서명된 이미지의 부팅:** 이 실행에서는 만료 후에도 구성 A가 부팅했습니다. Microsoft 안내도 새 인증서를 받지 않은 Windows 기기가 계속 시작·동작한다고 설명합니다.
- **새로 서명되는 이미지:** 만료된 CA로는 새 서명을 하지 않습니다. 앞으로 나오는 shim이 2023 체인 서명만 단다면, db에 2011 CA만 있는 기기(구성 A·D)는 그 shim을 구성 C처럼 거부합니다. 지금 Debian shim이 이중 서명이라는 사실이 그 시점을 늦추고 있을 뿐입니다.
- **db·dbx 갱신:** 새 dbx(취약 부트로더 폐기)나 db에 2023 CA를 추가하는 업데이트는 KEK의 키로 서명돼야 합니다. KEK에 2023 KEK가 없는 기기는 2023 KEK로 서명된 갱신을 받지 못합니다. 그 KEK를 넣으려면 PK 소유자가 서명한 KEK 갱신이 먼저 필요합니다.

Microsoft 안내가 미갱신 기기의 영향으로 꼽는 것(새 DBX revocation, Boot Manager 갱신, 새 bootkit 완화를 받지 못함)은 이 세 번째 항목에 해당합니다. 이 글의 실험은 db·dbx 갱신 자체를 실행하지 않았습니다.

## 임베디드·OEM 관점

영향은 기기가 누구의 키를 신뢰하느냐로 갈립니다.

- **자체 키 Secure Boot:** [Ch 27](/blog/embedded/bootloader/chapter27-chain-of-trust)처럼 제품 root key에서 시작하고 Microsoft 인증서를 db에 두지 않는 체계는 이 CA 교체의 직접 대상이 아닙니다. 구성 C가 보여 주듯, 그런 기기는 애초에 Microsoft 서명 shim을 부팅하지 않습니다.
- **Microsoft 서드파티 CA를 신뢰하는 Linux 기기:** 표준 UEFI 펌웨어에서 shim으로 배포판을 부팅하는 x86·arm64 게이트웨이와 엣지 서버가 여기에 해당합니다. db에 `Microsoft UEFI CA 2023`이 있는지, 부팅하는 shim이 어느 체인으로 서명됐는지 둘 다 확인해야 합니다. 위의 PE 인증서 테이블 읽기가 두 번째 확인입니다.
- **VM 이미지와 펌웨어 템플릿:** 구성 D처럼 배포판의 펌웨어 템플릿이 2011 인증서만 담고 있을 수 있습니다. 템플릿으로 만든 VM은 출하 시점의 db를 그대로 갖습니다.
- **펌웨어 갱신 경로가 없는 현장 기기:** KEK·db 갱신은 PK 소유자와 KEK 소유자의 서명을 거쳐야 하므로 OS 업데이트만으로 끝나지 않을 수 있습니다. [Ch 20](/blog/embedded/bootloader/chapter20-rauc-swupdate)의 펌웨어 업데이트 인프라가 보안 요구사항이 됩니다.

## 현재 상태를 읽는 방법

이 글에서 쓴 읽기 방법을 정리하면 다음과 같습니다. 모두 읽기만 합니다.

```bash title="secureboot-inventory.sh"
# 게스트: Secure Boot 상태와 커널이 읽은 db 인증서
mokutil --sb-state
dmesg | grep -E "secureboot|integrity: Loaded X.509"

# 호스트: 펌웨어 변수 저장소 파일의 PK·KEK·db 목록 (virt-firmware)
virt-fw-vars -i VARS.fd -p -v

# 호스트: 인증서 만료일과 fingerprint
openssl x509 -in cert.pem -noout -subject -enddate -fingerprint -sha256
```

EFI 바이너리의 서명자는 PE Certificate Table에서 `WIN_CERTIFICATE`를 잘라 `openssl pkcs7 -inform DER -print_certs`로 읽었습니다. 인증서 subject 문자열만 grep해서 갱신 완료를 판정하지 말고, fingerprint와 이미지의 실제 서명 체인을 함께 대조합니다. shim의 MOK 목록(`mokutil --list-enrolled`)은 펌웨어 db와 별개의 신뢰 계층입니다.

## Post-Quantum 서명과의 관계

이번 전환은 알고리즘 전환이 아닙니다. 위 표의 KEK·UEFI CA·Windows CA를 `openssl x509 -text`로 보면 2011과 2023 인증서가 모두 RSA 2048비트 공개키입니다. 다만 이 경험은 서명 알고리즘을 바꿀 때 무엇이 필요한지 미리 보여 줍니다.

[NIST FIPS 204](https://csrc.nist.gov/pubs/fips/204/final)의 ML-DSA는 디지털 서명이고, [FIPS 203](https://csrc.nist.gov/pubs/fips/203/final)의 ML-KEM은 키 캡슐화입니다. 펌웨어 이미지 서명에 해당하는 것은 ML-DSA 쪽입니다. 위 shim처럼 서명을 여러 개 다는 방식은 전환 기간의 호환성을 주지만, 그것은 검증하는 펌웨어가 두 서명 중 하나라도 이해할 때의 이야기입니다. 새 알고리즘이 들어오려면 db에 그 알고리즘의 인증서를 넣는 KEK·PK 경로와, 그 서명을 해석하는 펌웨어 verifier가 함께 바뀌어야 합니다. 이 글은 PQC 서명 검증을 실행하지 않았습니다.

## 자주 하는 실수

- **"만료되면 기기가 안 켜진다"** — 이 실행에서는 만료된 CA만 있는 db로도 부팅됐습니다. 막히는 것은 새로 서명되는 이미지와 새 db·dbx 갱신입니다.
- **만료일만 보고 판단** — 구성 B와 C는 둘 다 2023 인증서였지만 결과가 반대였습니다. 어느 CA가 db에 있고, 이미지가 어느 체인으로 서명됐는지가 결정합니다.
- **배포판 펌웨어 템플릿이 최신 키를 담았다고 가정** — Debian 13의 2026년 1월 템플릿도 2011 인증서만 가졌습니다.
- **Secure Boot가 켜졌다고 가정** — QEMU 기본 EDK2는 db를 채워도 검증하지 않았습니다. `SecureBoot` 변수와 커널 로그로 확인합니다.

## 정리

- 2011 Microsoft 인증서의 notAfter는 KEK 2026-06-24, UEFI CA 2026-06-27, Windows PCA 2026-10-19이고, 모두 지났습니다.
- Debian 13 shim은 UEFI CA 2011과 2023 두 체인으로 이중 서명돼 있어, db에 둘 중 하나만 있어도 Secure Boot로 부팅했습니다.
- db에 Windows UEFI CA 2023만 있으면 펌웨어가 shim을 `Access Denied`로 거부합니다.
- Debian 13의 Microsoft 프로파일 변수 템플릿은 2011 인증서만 담고 있습니다.
- KEK·db·dbx 갱신에는 PK·KEK 소유자의 서명이 필요하므로, 2023 CA로의 전환은 기기의 펌웨어 갱신 경로에 달려 있습니다.

## 다음 확인

이 장은 현재 공개된 시리즈의 마지막 편입니다. [Ch 27: Chain of Trust](/blog/embedded/bootloader/chapter27-chain-of-trust)로 돌아가 제품이 실제로 사용하는 root key와 각 단계의 업데이트·복구 권한을 대조하면 인증서 전환 범위를 구체화할 수 있습니다.

## 근거 자료

- [Microsoft 인증서 만료·CA 갱신 안내](https://support.microsoft.com/en-us/servicing/os/secure-boot/2025/06/windows-secure-boot-certificate-expiration-and-ca-updates): 일정, 새 CA 명칭, 미갱신 Windows 기기의 영향.
- [UEFI 2.10 32장 Secure Boot and Driver Signing](https://uefi.org/specs/UEFI/2.10/32_Secure_Boot_and_Driver_Signing.html?highlight=authenticated+variable): KEK과 db·dbx 갱신 인가.
- Debian 13 `qemu-efi-aarch64` 2025.02-8+deb13u1: `AAVMF_CODE.secboot.fd`, `AAVMF_VARS.fd`, `AAVMF_VARS.ms.fd`.
- `virt-firmware` 26.9: `virt-fw-vars`와 `virt/firmware/certs/microsoft.com/*.pem`.
- [NIST FIPS 204](https://csrc.nist.gov/pubs/fips/204/final), [FIPS 203](https://csrc.nist.gov/pubs/fips/203/final): 서명과 키 캡슐화의 역할.

## 관련 항목

- [Ch 16: Verified Boot — RSA 서명과 public key 임베딩](/blog/embedded/bootloader/chapter16-verified-boot)
- [Ch 18: U-Boot의 EFI 호환 — bootefi와 EFI loader](/blog/embedded/bootloader/chapter18-efi-in-uboot)
- [Ch 27: 임베디드 Chain of Trust — 다단계 서명 검증](/blog/embedded/bootloader/chapter27-chain-of-trust)
- [Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init)
- [원문 — Microsoft: Secure Boot playbook for certificates expiring in 2026](https://techcommunity.microsoft.com/blog/windows-itpro-blog/secure-boot-playbook-for-certificates-expiring-in-2026/4469235)
- [원문 — UEFI Specification (Secure Boot, 변수 db/dbx/KEK)](https://uefi.org/specifications)
