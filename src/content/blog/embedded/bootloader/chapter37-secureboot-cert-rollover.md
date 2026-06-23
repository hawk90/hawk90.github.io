---
title: "UEFI Secure Boot 인증서 만료 — 2011→2023 CA 롤오버와 PQC 대비"
date: 2026-06-19T09:04:00
description: "2026년 6월부터 시작되는 Microsoft Secure Boot 2011 인증서 만료 — PK·KEK·db·dbx 계층, 2023 CA 체인과 Option ROM CA 분리, 임베디드 기기 영향, 그리고 post-quantum 서명으로의 길."
series: "Bootloader Internals"
seriesOrder: 37
tags: [embedded, bootloader, secure-boot, uefi, post-quantum]
draft: true
---

[Ch 16](/blog/embedded/bootloader/chapter16-verified-boot)에서 U-Boot가 FIT 이미지를 자기 키로 검증하는 흐름을, [Ch 27](/blog/embedded/bootloader/chapter27-chain-of-trust)에서 eFuse PK hash부터 커널 모듈까지 이어지는 전체 chain of trust를 봤습니다. 그 체인은 *키를 신뢰*한다는 전제 위에 서 있습니다. 그런데 키는 영원하지 않습니다. 인증서에는 만료일이 있고, 2026년은 UEFI Secure Boot 생태계가 처음으로 그 만료를 정면으로 마주하는 해입니다.

## 한 줄 요약

> **"2011년부터 쓰인 Microsoft Secure Boot 인증서가 2026년 6월부터 만료됩니다."** — db·KEK에 박힌 *2011 CA*가 *2023 CA*로 교체되는, Secure Boot 역사상 첫 신뢰 사슬 갱신입니다. 갱신을 놓친 기기는 *부팅은 계속*하지만 *부트 단계 보안 업데이트(DBX revocation·Boot Manager·신규 bootkit 완화)*를 더 못 받습니다.

## 왜 2026년이 분기점인가

UEFI Secure Boot가 2012년 Windows 8과 함께 보급될 때, 펌웨어의 신뢰 데이터베이스에는 Microsoft가 2011년에 발급한 인증서들이 들어갔습니다. 이 인증서들의 유효기간이 약 15년이고, 그 시계가 2026년 6월에 처음으로 만료에 도달합니다.

만료가 문제인 이유는 단순합니다. 펌웨어는 db에 들어 있는 인증서로 부트로더 서명을 검증하고, KEK에 들어 있는 인증서로 db·dbx *업데이트 자체*의 서명을 검증합니다. 업데이트를 서명하는 KEK 인증서가 만료되면, 그 이후 발급되는 새 revocation(dbx) 항목을 기기가 신뢰할 근거가 사라집니다. 즉 *부팅이 멈추는 문제가 아니라*, *새로운 위협에 대한 방어를 더 받지 못하는 문제*입니다. 이 차이를 정확히 이해하는 것이 이 장의 목표입니다.

## UEFI Secure Boot 변수 4종 — PK·KEK·db·dbx

먼저 신뢰가 어디에 저장되는지부터 정리합니다. Secure Boot의 신뢰는 펌웨어의 NVRAM에 저장된 네 개의 UEFI 변수로 표현됩니다.

비유하면 회사 출입증 체계와 같습니다. *대표이사 직인*(PK)이 있고, 그 직인으로 임명된 *보안팀장*(KEK)이 있으며, 보안팀장이 관리하는 *출입 허가자 명단*(db)과 *출입 금지자 명단*(dbx)이 있습니다. 누구를 명단에 넣고 빼는지는 보안팀장의 서명이 있어야 바뀝니다.

| 변수 | 이름 | 역할 | 보통 누가 소유 |
|------|------|------|----------------|
| PK | Platform Key | 최상위 키. KEK 갱신을 인가 | OEM(메인보드 제조사) |
| KEK | Key Exchange Key | db·dbx 갱신을 인가하는 키 모음 | Microsoft + OEM |
| db | Signature Database | 부팅을 *허용*할 서명자·해시 | Microsoft CA가 다수 |
| dbx | Forbidden Signatures | 부팅을 *금지*할 서명자·해시(revocation) | Microsoft가 주기적 갱신 |

핵심은 *갱신 권한의 계층*입니다. db·dbx를 바꾸려면 KEK에 있는 키로 서명한 업데이트가 필요하고, KEK을 바꾸려면 PK로 서명한 업데이트가 필요합니다. 그래서 KEK 인증서의 만료는 db·dbx 갱신 능력에 직접 영향을 줍니다.

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
| Microsoft Corporation KEK CA 2011 | 2026-06-24 | 이후 db·dbx 업데이트 신뢰 불가 |
| Microsoft Windows Production PCA 2011 | 2026-10 | 이후 *새로* 서명된 Boot Manager 검증 불가 |
| Microsoft Corporation UEFI CA 2011 | 갱신 진행 | shim·option ROM 서명 체계 전환 |

만료일 자체가 기기를 벽돌로 만들지는 않습니다. *그 인증서로 이미 검증을 통과한* 부트로더는 계속 부팅합니다. 문제는 만료 *이후에 새로 서명*되는 컴포넌트와, 만료된 KEK으로는 더 못 받는 *새 dbx 항목*입니다.

## 2023 인증서 체인 — 무엇이 바뀌나

교체용으로 들어오는 것은 2023년 발급 인증서들입니다.

| 2011 | → 2023 교체 |
|------|-------------|
| Microsoft Corporation KEK CA 2011 | Microsoft Corporation KEK CA 2023 |
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

즉 보안 관점에서는 *서서히 무방비*가 되는 시나리오입니다. 부팅은 되지만 부트 단계 방어가 2026년 시점에 동결됩니다.

## 임베디드·OEM 관점 — 우리 기기는 영향이 있나

이 시리즈의 독자에게 가장 중요한 질문입니다. 영향 여부는 *기기가 누구의 키를 신뢰하느냐*로 갈립니다.

**영향이 거의 없는 경우 — 자체 키 기반 Secure Boot.** ARM 임베디드 다수는 UEFI db/KEK이 아니라 [Ch 27](/blog/embedded/bootloader/chapter27-chain-of-trust)에서 본 *자체 PK hash + ROTPK* 체계를 씁니다. U-Boot verified boot, TF-A trusted boot, NXP HABv4, Rockchip secure boot 모두 *제조사 자체 키*로 닫힌 체인입니다. Microsoft 2011 인증서를 신뢰 데이터베이스에 두지 않으므로 이 만료와 무관합니다.

**영향이 있는 경우 — Microsoft 신뢰 데이터베이스를 쓰는 x86 엣지 기기.** 표준 UEFI 펌웨어 위에서 Linux 배포판을 shim으로 부팅하는 산업용 x86 게이트웨이·엣지 서버·키오스크는 `Microsoft Corporation UEFI CA 2011`을 신뢰합니다. add-in 카드의 option ROM도 마찬가지입니다. 이런 기기는 *현장에 나가 있는 동안* 2023 CA로의 db·KEK 갱신이 들어가야 합니다.

**가장 까다로운 경우 — 펌웨어 업데이트 경로가 없는 현장 기기.** OTA 펌웨어 업데이트 채널이 없는 임베디드 기기가 Microsoft 신뢰 체계를 쓰고 있다면, 만료 이후 새 dbx를 받을 길이 막힙니다. 이 경우 [Ch 20](/blog/embedded/bootloader/chapter20-rauc-swupdate)에서 본 펌웨어 업데이트 인프라가 *보안 요구사항*으로 격상됩니다.

## db·dbx 업데이트는 어떻게 들어오나

현재 신뢰 데이터베이스 상태를 확인하는 것부터 시작합니다. Linux에서는 efitools·mokutil로 변수를 덤프할 수 있습니다.

아래는 PK·KEK·db·dbx에 어떤 인증서가 들어 있는지 읽는 명령입니다.

```bash
# efitools — 각 변수의 인증서 목록 덤프
efi-readvar -v PK
efi-readvar -v KEK
efi-readvar -v db
efi-readvar -v dbx

# mokutil — db/kek/pk 요약과 shim MOK 목록
mokutil --db | grep -i "CA 20"
mokutil --kek | grep -i "CA 20"
mokutil --list-enrolled
```

출력에서 `... CA 2011`만 보이고 `... CA 2023`이 없다면, 그 기기는 아직 갱신 전입니다. 다음은 KEK에 2011만 있는 전형적인 미갱신 상태입니다.

```text
KEK: List of certificates
Microsoft Corporation KEK CA 2011
  Subject: CN=Microsoft Corporation KEK CA 2011
  Expires: 2026-06-24
```

업데이트는 *KEK으로 서명된 db·dbx 변경*으로 들어옵니다. Windows에서는 OS가 펌웨어 NVRAM에 `SetVariable`을 호출해 2023 인증서를 db·KEK에 추가하고, 이 변경 자체가 기존 KEK 키로 서명되어 검증됩니다. Linux·임베디드에서는 펌웨어 캡슐 업데이트(`fwupd`/UEFI Capsule)나 제조사 도구가 같은 역할을 합니다. 어느 경로든 *기존 신뢰가 살아 있을 때* 새 신뢰를 주입해야 하므로, 만료 *전*에 갱신을 끝내는 것이 핵심입니다.

## Post-Quantum 전망 — 왜 인증서 수명 관리가 더 중요해지나

이번 롤오버가 주는 더 큰 교훈은 *Secure Boot의 키 수명 관리가 일회성이 아니라는 점*입니다. 그리고 다음 큰 전환이 이미 보입니다. NIST가 표준화한 post-quantum 서명(ML-DSA, FIPS 204)과 키 캡슐화(ML-KEM, FIPS 203)가 부트 체인으로 내려오고 있습니다.

PQC가 부트로더에 주는 부담은 [Ch 16](/blog/embedded/bootloader/chapter16-verified-boot)의 RSA 서명과 비교하면 분명합니다.

- **서명·키 크기 증가** — ML-DSA 서명은 RSA-2048 서명보다 한 자릿수 이상 큽니다. db·dbx 변수, FIT signature 노드, eFuse에 박는 키 해시 예산이 모두 늘어납니다.
- **검증 시간** — 자원이 제한된 MCU에서 lattice 연산은 RSA보다 무겁습니다. 부팅 지연 예산에 직접 영향을 줍니다.
- **하이브리드 전환기** — 한동안은 *classical + PQC 이중 서명*이 현실적입니다. 검증 코드가 두 알고리즘을 모두 지원해야 합니다.

임베디드에서 유력한 패턴은 *외부 secure element가 펌웨어 서명을 PQC로 검증*한 뒤에야 시스템에 키를 풀어주는 방식입니다. 메인 SoC의 내부 구조를 바꾸지 않고도 PQC 신뢰를 추가할 수 있기 때문입니다. 2026년 인증서 롤오버를 *키 수명 관리 인프라를 점검할 계기*로 삼으면, PQC 전환도 같은 인프라 위에서 진행할 수 있습니다.

## 자주 하는 실수

- **"만료되면 기기가 안 켜진다"** — 아닙니다. 부팅은 계속됩니다. 막히는 것은 *새 보안 업데이트*입니다. 이 구분을 못 하면 불필요한 공포나 반대로 안일함으로 빠집니다.
- **자체 키 기기까지 영향이 있다고 오해** — UEFI db/KEK을 쓰지 않는 ARM 자체 키 체계는 무관합니다. 우리 기기가 *어떤 신뢰 데이터베이스*를 쓰는지부터 확인해야 합니다.
- **PK/KEK 갱신을 OS만의 일로 간주** — OTA 경로가 없는 현장 임베디드 기기는 OS 업데이트로 자동 해결되지 않습니다. 펌웨어 업데이트 채널 설계가 선행되어야 합니다.
- **만료 후 갱신 시도** — 신뢰 갱신은 *기존 신뢰가 유효할 때* 서명·검증됩니다. 만료를 넘기면 갱신 주입 자체가 까다로워집니다.

## 정리

- UEFI Secure Boot의 신뢰는 PK·KEK·db·dbx 네 변수에 저장되고, 갱신 권한은 PK → KEK → db·dbx로 계층화됩니다.
- 2011년 발급 Microsoft 인증서가 2026년 6월(KEK CA 2011, 6/24)부터, 10월(Windows Production PCA 2011)까지 순차 만료됩니다.
- 교체용 2023 CA는 서드파티 부트로더와 option ROM을 *별도 CA*로 분리해 신뢰를 세분화합니다.
- 미갱신 기기는 부팅은 유지하되 DBX revocation·Boot Manager·신규 bootkit 완화를 더 못 받습니다.
- ARM 자체 키 Secure Boot는 무관, Microsoft 신뢰 데이터베이스를 쓰는 x86 엣지 기기는 *현장 갱신*이 필요합니다.
- 이 롤오버는 키 수명 관리의 첫 사례일 뿐이며, 다음 전환은 ML-DSA·ML-KEM 기반 post-quantum 서명입니다.

## 다음 장 예고

다음 장에서는 이 신뢰 데이터베이스가 *런타임에 어떻게 측정·기록*되는지로 넘어갑니다. TPM PCR과 Measured Boot — 각 부트 단계가 자신을 PCR에 확장(extend)하고, 그 측정값으로 remote attestation을 구성하는 흐름을 추적합니다.

## 관련 항목

- [Ch 16: Verified Boot — RSA 서명과 public key 임베딩](/blog/embedded/bootloader/chapter16-verified-boot)
- [Ch 18: U-Boot의 EFI 호환 — bootefi와 EFI loader](/blog/embedded/bootloader/chapter18-efi-in-uboot)
- [Ch 27: 임베디드 Chain of Trust — 다단계 서명 검증](/blog/embedded/bootloader/chapter27-chain-of-trust)
- [Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init)
- [원문 — Microsoft: Windows Secure Boot certificate expiration and CA updates](https://support.microsoft.com/en-us/topic/windows-secure-boot-certificate-expiration-and-ca-updates-7ff40d33-95dc-4c3c-8725-a9b95457578e)
- [원문 — Microsoft: Secure Boot playbook for certificates expiring in 2026](https://techcommunity.microsoft.com/blog/windows-itpro-blog/secure-boot-playbook-for-certificates-expiring-in-2026/4469235)
- [원문 — UEFI Specification (Secure Boot, 변수 db/dbx/KEK)](https://uefi.org/specifications)
