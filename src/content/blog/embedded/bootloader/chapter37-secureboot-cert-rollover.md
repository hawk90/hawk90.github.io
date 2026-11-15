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

[Ch 16](/blog/embedded/bootloader/chapter16-verified-boot)에서 U-Boot가 FIT 이미지를 자기 키로 검증하는 흐름을, [Ch 27](/blog/embedded/bootloader/chapter27-chain-of-trust)에서 root key부터 커널 모듈까지 이어지는 chain of trust를 봤습니다. 그 체인은 *키를 신뢰*한다는 전제 위에 서 있습니다. 인증서에는 만료일이 있고, 2026년은 Microsoft의 2011 인증서에서 2023 인증서로 전환해야 하는 해입니다.

## 한 줄 요약

> **"2011년부터 쓰인 Microsoft Secure Boot 인증서가 2026년 6월부터 만료됩니다."** — db·KEK에 박힌 *2011 CA*가 *2023 CA*로 교체되는, Microsoft가 배포한 신뢰 인증서의 세대 전환입니다. 갱신을 놓친 기기는 *부팅은 계속*하지만 *부트 단계 보안 업데이트(DBX revocation·Boot Manager·신규 bootkit 완화)*를 더 못 받습니다.

## 왜 2026년이 분기점인가

UEFI Secure Boot가 2012년 Windows 8과 함께 보급될 때, 펌웨어의 신뢰 데이터베이스에는 Microsoft가 2011년에 발급한 인증서들이 들어갔습니다. 이 인증서들의 유효기간이 약 15년이고, 그 시계가 2026년 6월에 처음으로 만료에 도달합니다.

Microsoft의 [공식 안내](https://support.microsoft.com/en-us/servicing/os/secure-boot/2025/06/windows-secure-boot-certificate-expiration-and-ca-updates)는 새 인증서를 받지 않은 Windows 기기가 계속 시작·동작하고 일반 업데이트도 설치되지만, 새로운 초기 부팅 보안 보호를 받는 데 제한이 생긴다고 설명합니다. 이 안내를 “UEFI가 현재 날짜를 검사하여 만료된 KEK 서명을 전부 거부한다”는 규격 규칙으로 바꾸면 안 됩니다. 인증서 만료, 인증 변수 갱신 권한, dbx 폐기, 새 부트 이미지의 서명 체계는 구분해야 합니다.

따라서 날짜만 확인하는 대신 실제 등록 인증서·배포 상태·firmware 지원과 사용하는 boot image를 함께 확인합니다. 이 글의 Microsoft 일정과 명칭은 2026-10-22에 공식 문서를 대조한 내용이며, 실제 기기에서 인증서 갱신을 실행한 기록은 아닙니다.

## UEFI Secure Boot 변수 4종 — PK·KEK·db·dbx

먼저 신뢰가 어디에 저장되는지부터 정리합니다. Secure Boot의 신뢰는 펌웨어의 NVRAM에 저장된 네 개의 UEFI 변수로 표현됩니다.

비유하면 회사 출입증 체계와 같습니다. *대표이사 직인*(PK)이 있고, 그 직인으로 임명된 *보안팀장*(KEK)이 있으며, 보안팀장이 관리하는 *출입 허가자 명단*(db)과 *출입 금지자 명단*(dbx)이 있습니다. 누구를 명단에 넣고 빼는지는 보안팀장의 서명이 있어야 바뀝니다.

| 변수 | 이름 | 역할 | 보통 누가 소유 |
|------|------|------|----------------|
| PK | Platform Key | 최상위 키. KEK 갱신을 인가 | OEM(메인보드 제조사) |
| KEK | Key Exchange Key | db·dbx 갱신을 인가하는 키 모음 | Microsoft + OEM |
| db | Signature Database | 부팅을 *허용*할 서명자·해시 | Microsoft CA가 다수 |
| dbx | Forbidden Signatures | 부팅을 *금지*할 서명자·해시(revocation) | Microsoft가 주기적 갱신 |

핵심은 *갱신 권한의 계층*입니다. UEFI 2.10 §32.3.5에서 User Mode의 KEK 갱신은 현재 PK의 private key로 서명해야 합니다. §32.6.3에서 db·dbx 갱신은 등록된 KEK 또는 PK의 private key로 인가할 수 있습니다. Setup Mode는 인증 검증 조건이 다르지만 변수 형식 계약은 여전히 따릅니다. OS가 SetVariable을 호출한다는 사실만으로 이 권한 검증을 건너뛸 수는 없습니다.

## 2011 인증서 체인 — 지금 db·KEK에 박혀 있는 것

표준 Windows PC의 펌웨어에는 대체로 다음 2011 인증서들이 들어 있습니다.

| 인증서 | 들어가는 변수 | 무엇을 검증하나 |
|--------|---------------|------------------|
| Microsoft Corporation KEK CA 2011 | KEK | db·dbx 업데이트 서명 |
| Microsoft Windows Production PCA 2011 | db | Windows 부트로더(bootmgfw 등) |
| Microsoft Corporation UEFI CA 2011 | db | 서드파티 — shim, 일부 option ROM |

여기서 `Microsoft Corporation UEFI CA 2011`은 *서드파티 CA*입니다. Linux 진영의 shim 부트로더, 그리고 일부 add-in 카드의 option ROM이 이 CA로 서명됩니다. 그래서 이 CA의 거취는 Windows뿐 아니라 *Linux·임베디드 x86 기기*에도 직접 영향을 줍니다.

## 만료 타임라인

Microsoft 공식 가이드에 따르면 만료는 단일 시점이 아니라 인증서별로 나뉘어 진행됩니다.

| 인증서 | 만료 | 영향 |
|--------|------|------|
| Microsoft Corporation KEK CA 2011 | 2026-06-24 | db·dbx 갱신용 새 KEK 전환 대상 |
| Microsoft Windows Production PCA 2011 | 2026-10-19 | Windows UEFI CA 2023으로 서명자 전환 |
| Microsoft Corporation UEFI CA 2011 | 2026-06-27 | 서드파티 loader·option ROM용 2023 CA로 전환 |

만료일 도달 자체가 부팅 중단을 뜻하지는 않습니다. 다만 새 이미지의 신뢰 여부와 이후 업데이트 가능 여부는 등록된 키·dbx·서명·firmware와 배포 정책에 따라 확인해야 합니다. 과거에 한 번 부팅에 성공했다는 사실이 이후 dbx 갱신까지 포함한 영구 허용을 보장하지도 않습니다.

## 2023 인증서 체인 — 무엇이 바뀌나

교체용으로 들어오는 것은 2023년 발급 인증서들입니다.

| 2011 | → 2023 교체 |
|------|-------------|
| Microsoft Corporation KEK CA 2011 | Microsoft Corporation KEK 2K CA 2023 |
| Microsoft Windows Production PCA 2011 | Windows UEFI CA 2023 |
| Microsoft Corporation UEFI CA 2011 | Microsoft UEFI CA 2023 + **Microsoft Option ROM UEFI CA 2023** |

가장 의미 있는 구조 변화는 *서드파티 CA의 분리*입니다. 2011 체계에서는 하나의 `UEFI CA 2011`이 서드파티 부트로더(shim)와 option ROM을 *모두* 서명했습니다. 2023 체계는 이를 둘로 나눕니다.

- **Microsoft UEFI CA 2023** — 서드파티 부트로더(shim 등)
- **Microsoft Option ROM UEFI CA 2023** — option ROM 전용

분리의 이점은 신뢰의 *세분화*입니다. 예를 들어 add-in GPU의 option ROM은 신뢰하되 서드파티 부트로더는 신뢰하지 않으려는 기기는, Option ROM CA만 db에 넣고 부트로더 CA는 빼면 됩니다. 2011 체계에서는 불가능했던 정책입니다.

## 무엇이 깨지고, 무엇이 안 깨지나

이 전환에서 가장 오해가 많은 부분입니다. 정리하면 다음과 같습니다.

깨지지 *않는* 것:

- 이미 부팅 중인 기기는 계속 부팅합니다.
- 일반 Windows·OS 업데이트는 계속 설치됩니다.
- 사용자 데이터·애플리케이션은 영향이 없습니다.

받지 *못하게* 되는 것(2023 CA 미적용 시):

- 새 **DBX revocation** — 새로 발견된 취약 부트로더를 막는 항목.
- 새로 서명된 **Boot Manager** 업데이트.
- 신규 **bootkit 완화** — BlackLotus 계열처럼 펌웨어 단계에서 작동하는 위협에 대한 방어.

위 항목은 Microsoft가 안내하는 미갱신 Windows 기기의 운영상 영향입니다. 모든 자체 키 시스템에 적용되는 암호학적 금지 규칙이나 특정 날짜 이후 복구 불가능하다는 뜻으로 확장하지 않습니다.

## 임베디드·OEM 관점 — 우리 기기는 영향이 있나

이 시리즈의 독자에게 가장 중요한 질문입니다. 영향 여부는 *기기가 누구의 키를 신뢰하느냐*로 갈립니다.

**Microsoft 인증서에 의존하지 않는 경우 — 자체 키 기반 Secure Boot.** [Ch 27](/blog/embedded/bootloader/chapter27-chain-of-trust)의 제품별 root key에서 시작하는 체계가 Microsoft 2011 인증서를 쓰지 않는다면 그 CA 교체의 직접 대상은 아닙니다. 다만 ROM·firmware·EFI loader가 함께 있는 제품은 단계마다 신뢰 주체가 다를 수 있으므로 전체 체인을 확인합니다.

**영향을 확인할 경우 — Microsoft 신뢰 데이터베이스를 쓰는 엣지 기기.** 표준 UEFI 펌웨어 위에서 Linux 배포판을 shim으로 부팅하는 산업용 x86 게이트웨이·엣지 서버·키오스크는 `Microsoft Corporation UEFI CA 2011`을 신뢰합니다. add-in 카드의 option ROM도 마찬가지입니다. 이런 기기는 architecture만으로 판단하지 않고 실제 db·KEK과 loader 서명자를 확인해야 합니다. Microsoft 인증서를 쓰는 ARM64 UEFI 기기도 같은 전환을 검토할 수 있습니다.

**가장 까다로운 경우 — 펌웨어 업데이트 경로가 없는 현장 기기.** OTA 펌웨어 업데이트 채널이 없는 임베디드 기기가 Microsoft 신뢰 체계를 쓰고 있다면, 필요한 인증서·firmware 갱신을 지원된 경로로 전달할 수 있는지 확인해야 합니다. 이 경우 [Ch 20](/blog/embedded/bootloader/chapter20-rauc-swupdate)에서 본 펌웨어 업데이트 인프라가 *보안 요구사항*으로 격상됩니다.

## db·dbx 업데이트는 어떻게 들어오나

현재 신뢰 데이터베이스 상태를 확인하는 것부터 시작합니다. Linux에서는 efitools·mokutil로 변수를 덤프할 수 있습니다.

아래는 PK·KEK·db·dbx에 어떤 인증서가 들어 있는지 읽는 명령입니다.

```bash title="efi-variables-read.sh"
# efitools — 각 변수의 인증서 목록 덤프
efi-readvar -v PK
efi-readvar -v KEK
efi-readvar -v db
efi-readvar -v dbx

# mokutil: firmware db/KEK and separate shim MOK list
mokutil --db
mokutil --kek
mokutil --list-enrolled
```

각 명령의 지원 옵션과 권한은 설치 버전으로 확인합니다. 인증서 subject 문자열만 grep해서 갱신 완료를 판정하면 안 됩니다. firmware의 실제 변수, 인증서 fingerprint, 필요한 bootloader·option ROM 서명자, OS/OEM의 배포 상태를 함께 대조합니다. shim MOK 목록은 firmware db 자체와 별도의 신뢰 계층입니다.

업데이트 전달 수단도 인가 주체와 구분합니다. Windows·fwupd·제조사 도구가 파일을 전달하거나 SetVariable을 호출해도, KEK 갱신에는 PK 인가가 필요하고 db·dbx에는 PK 또는 KEK 인가가 필요합니다. UEFI Capsule 지원만으로 모든 기기에서 Secure Boot 변수 갱신이 자동 지원되는 것은 아닙니다.

운영에서는 OEM과 OS가 제공하는 기기별 절차로 인증서·boot image 전환 순서와 복구 매체를 검증합니다. 이미 만료일이 지났다면 “이제 서명을 넣을 수 없다”고 단정하는 대신 지원되는 사후 갱신·복구 경로를 확인합니다. 여기서는 firmware 변수를 쓰거나 키를 삭제하는 명령을 제공하지 않습니다.

## Post-Quantum 전망 — 왜 인증서 수명 관리가 더 중요해지나

이번 롤오버는 *Secure Boot의 키 수명 관리가 일회성이 아니라는 점*을 보여 줍니다. post-quantum 알고리즘을 검토할 때도 기존 verifier와 신뢰 갱신 경로의 지원 범위를 먼저 확인해야 합니다.

[NIST FIPS 204](https://csrc.nist.gov/pubs/fips/204/final)의 ML-DSA는 디지털 서명이고, [FIPS 203](https://csrc.nist.gov/pubs/fips/203/final)의 ML-KEM은 키 캡슐화입니다. ML-KEM을 firmware 이미지 서명 알고리즘으로 부르면 안 됩니다. 표준이 존재한다는 사실만으로 UEFI·FIT·ROM verifier가 해당 알고리즘을 지원하는 것도 아닙니다.

- **이미지와 변수 저장 공간:** 공개키·서명·인증서 format과 상한을 실제 verifier로 검토합니다. 더 큰 공개키가 반드시 같은 비율의 eFuse 공간을 요구하지는 않습니다. 고정 길이 hash를 저장하는 root라면 hash algorithm과 인코딩 계약이 별도입니다.
- **검증 비용:** 구현·가속기·parameter set·메모리에 따라 부팅 시간과 stack·RAM을 측정합니다. lattice 연산이 모든 MCU에서 RSA 검증보다 느리다는 범용 결론은 두지 않습니다.
- **전환 정책:** hybrid 또는 새 형식을 도입하려면 모든 boot stage의 parser·서명 검증·fallback·복구가 지원하는지 확인합니다. 이중 서명을 붙이는 것만으로 기존 ROM을 바꿀 수는 없습니다.

외부 secure element 역시 특정 제품이 지원하는 알고리즘과 신뢰 경로를 확인해야 합니다. 이 글에서는 PQC firmware·secure element·hybrid boot를 실행하지 않았으며, 2023 Microsoft CA 갱신 자체를 PQC 전환으로 설명하지 않습니다.

## 자주 하는 실수

- **"만료되면 기기가 안 켜진다"** — 아닙니다. 부팅은 계속됩니다. 막히는 것은 *새 보안 업데이트*입니다. 이 구분을 못 하면 불필요한 공포나 반대로 안일함으로 빠집니다.
- **자체 키 기기까지 영향이 있다고 오해** — UEFI db/KEK을 쓰지 않는 ARM 자체 키 체계는 무관합니다. 우리 기기가 *어떤 신뢰 데이터베이스*를 쓰는지부터 확인해야 합니다.
- **PK/KEK 갱신을 OS만의 일로 간주** — OTA 경로가 없는 현장 임베디드 기기는 OS 업데이트로 자동 해결되지 않습니다. 펌웨어 업데이트 채널 설계가 선행되어야 합니다.
- **만료 후 복구 불가라고 단정** — 지원되는 OEM·OS 절차와 현재 등록 상태를 확인합니다. 만료일·변수 갱신 인가·dbx 폐기는 서로 다른 조건입니다.

## 정리

- UEFI Secure Boot의 신뢰는 PK·KEK·db·dbx 네 변수에 저장되고, 갱신 권한은 PK → KEK → db·dbx로 계층화됩니다.
- 2011년 발급 Microsoft 인증서가 2026-06-24(KEK)·06-27(UEFI CA)·10-19(Windows Production PCA)에 각각 만료됩니다.
- 교체용 2023 CA는 서드파티 부트로더와 option ROM을 *별도 CA*로 분리해 신뢰를 세분화합니다.
- 미갱신 기기는 부팅은 유지하되 DBX revocation·Boot Manager·신규 bootkit 완화를 더 못 받습니다.
- 자체 키 체계와 Microsoft 인증서 의존성을 구분하고, x86·ARM64 모두 실제 신뢰 DB와 loader를 확인합니다.
- ML-DSA 서명과 ML-KEM 키 캡슐화는 다른 역할이며, PQC 부팅 지원은 구현별로 검증해야 합니다.

## 다음 확인

이 장은 현재 공개된 시리즈의 마지막 편입니다. [Ch 27: Chain of Trust](/blog/embedded/bootloader/chapter27-chain-of-trust)로 돌아가 제품이 실제로 사용하는 root key와 각 단계의 업데이트·복구 권한을 대조하면 인증서 전환 범위를 구체화할 수 있습니다.

## 근거 자료

- [Microsoft 인증서 만료·CA 갱신 안내](https://support.microsoft.com/en-us/servicing/os/secure-boot/2025/06/windows-secure-boot-certificate-expiration-and-ca-updates): 날짜·새 CA 명칭·Windows 운영상 영향.
- [UEFI 2.10 §32.3.5·§32.6.3](https://uefi.org/specs/UEFI/2.10/32_Secure_Boot_and_Driver_Signing.html?highlight=authenticated+variable): KEK과 db·dbx 갱신 인가.
- [NIST FIPS 204](https://csrc.nist.gov/pubs/fips/204/final), [FIPS 203](https://csrc.nist.gov/pubs/fips/203/final): 서명과 키 캡슐화의 역할.

## 관련 항목

- [Ch 16: Verified Boot — RSA 서명과 public key 임베딩](/blog/embedded/bootloader/chapter16-verified-boot)
- [Ch 18: U-Boot의 EFI 호환 — bootefi와 EFI loader](/blog/embedded/bootloader/chapter18-efi-in-uboot)
- [Ch 27: 임베디드 Chain of Trust — 다단계 서명 검증](/blog/embedded/bootloader/chapter27-chain-of-trust)
- [Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init)
- [원문 — Microsoft: Windows Secure Boot certificate expiration and CA updates](https://support.microsoft.com/en-us/topic/windows-secure-boot-certificate-expiration-and-ca-updates-7ff40d33-95dc-4c3c-8725-a9b95457578e)
- [원문 — Microsoft: Secure Boot playbook for certificates expiring in 2026](https://techcommunity.microsoft.com/blog/windows-itpro-blog/secure-boot-playbook-for-certificates-expiring-in-2026/4469235)
- [원문 — UEFI Specification (Secure Boot, 변수 db/dbx/KEK)](https://uefi.org/specifications)
