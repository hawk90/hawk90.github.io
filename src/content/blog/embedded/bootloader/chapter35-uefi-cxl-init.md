---
title: "EFI·UEFI에서 CXL 초기화 — CEDT 인계와 HDM Decoder 설정의 경계"
slug: "embedded/bootloader/chapter35-uefi-cxl-init"
date: 2026-06-19T09:02:00
description: "CXL firmware가 인계하는 CEDT의 CHBS·CFMWS 정보와 HDM decoder·region의 runtime 설정을 구분하고, QEMU와 Linux guest에서 확인할 범위를 정리합니다."
series: "Bootloader Internals"
seriesOrder: 35
tags: [embedded, bootloader, uefi, edk2, cxl, cedt, acpi, hdm-decoder]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

CXL 플랫폼 firmware는 OS가 사용할 host bridge·주소 window·메모리 속성을 일관되게 기술해야 합니다. **CEDT가 존재한다고 endpoint decoder 설정과 Linux System RAM online까지 끝난 것은 아닙니다.** HDM decoder는 firmware가 미리 설정할 수도, Linux 드라이버가 나중에 구성할 수도 있습니다.

[Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)에서 PCI BAR와 CXL 메모리 주소 공간을 구분했습니다. 이 장은 ACPI 기반 Linux CXL 문서를 기준으로 firmware 인계의 책임을 설명합니다. 특정 OEM의 EDK II fork나 상용 BIOS 실행 경로를 재현한 분석은 아닙니다.

## UEFI와 U-Boot의 차이

UEFI는 firmware 인터페이스 규격이고 U-Boot은 그 인터페이스 일부를 구현할 수 있는 부트로더입니다. 따라서 두 이름을 상호 배타적인 제품 유형이나 CXL 지원 등급으로 비교하면 안 됩니다. DT와 ACPI의 사용 여부, 실제 CXL 지원은 해당 플랫폼의 구현과 OS 계약에 달려 있습니다.

| 확인 항목 | 필요한 자료 |
| --- | --- |
| 부팅 인터페이스 | EFI loader 지원과 OS 진입 경로 |
| 하드웨어 기술 | 실제 전달한 DT 또는 ACPI tables |
| CXL 지원 | host·port·device의 protocol 지원과 driver |
| 부팅 시 메모리 사용 | memory map·decoder·OS 정책 |

PCIe 5.0이나 UEFI라는 이름만으로 CXL 기능이 보장되지는 않습니다. boot device를 찾는 PCI 탐색과 CXL 메모리를 page allocator에 연결하는 과정도 각각 확인합니다.

## EDK II에서 확인할 구현 범위

EDK II 기반이라는 설명만으로 공통 CXL bus DXE·memory DXE·CEDT generator가 모두 포함됐다고 볼 수 없습니다. 구현을 분석하려면 repository·tag/commit·platform DSC/FDF와 실제 포함된 INF, table 설치 코드를 먼저 확보해야 합니다.

| 역할 | 코드·실행에서 확인할 것 |
| --- | --- |
| PCI 장치 발견 | 실제 bus driver와 DVSEC 접근 경로 |
| 정적 host 정보 | host bridge UID·component register·주소 window |
| decoder 설정 | 누가 설정하고 commit·lock하는지 |
| ACPI 인계 | 어떤 코드가 CEDT와 관련 tables를 설치하는지 |
| OS 사용 | driver probe·region 구성·DAX 또는 RAM online 상태 |

이 자료가 없는 상태에서 모든 platform이 같은 순서로 DXE 모듈을 실행한다고 단정하지 않습니다. 아래에서는 모듈명을 추정하는 대신 커널이 소비하는 정보의 의미를 확인합니다.

## CEDT 구조

CEDT는 **CXL Early Discovery Table**입니다. UEFI라는 이름 자체가 세부 CXL table format을 정하는 것은 아니며, 사용 중인 CXL·ACPI 관련 규격 revision과 OS parser를 함께 확인해야 합니다. 여기서는 Linux 문서가 설명하는 CHBS와 CFMWS에 범위를 한정합니다.

| 구조 | 역할 |
| --- | --- |
| CHBS, type 0 | host bridge의 UID와 component register 정보 등 |
| CFMWS, type 1 | host physical address window·host bridge target·interleave·허용 용도 등 |

CHBS의 UID는 ACPI host bridge 식별과 맞아야 합니다. register base·length를 모든 장치에서 같은 값으로 가정하지 않으며 version 필드도 규격의 encoding으로 해석합니다. endpoint별 용량 목록이나 SPDM 인증 성공 목록으로 읽으면 안 됩니다.

## CFMWS — Fixed Memory Window

CFMWS는 하나 이상의 host bridge에 연결되는 host physical address 범위를 기술합니다. window 전체가 현재 설치된 메모리이거나 이미 online된 RAM이라는 뜻은 아닙니다. host bridge 사이 interleave와 bridge 아래 decoder의 interleave 설정도 서로 구분합니다.

Linux CEDT 문서의 Restrictions 비트는 다음과 같습니다. 비트가 하나 이상 켜질 수 있으므로 이름에 무조건 “only”를 붙이지 않습니다.

| 비트 | 허용·제약 정보 |
| --- | --- |
| 0 | CXL Type 2 memory |
| 1 | CXL Type 3 memory |
| 2 | volatile memory |
| 3 | persistent memory |
| 4 | fixed configuration |

예를 들어 0x06은 이 필드에서 Type 3와 volatile 비트가 설정된 값입니다. 실제 region 구성에는 window·target·decoder·메모리 종류 등 전체 조건이 맞아야 하며, 이 값 하나만 바꿔 장치 호환성을 만들 수는 없습니다.

## HDM Decoder 사전 설정과 Runtime 설정

Linux BIOS/EFI 문서는 **decoder와 switch port의 사전 programming을 필수로 요구하지 않습니다.** firmware가 static topology와 window 정보를 준비하고 CXL 드라이버가 runtime에 decoder를 구성하는 경로가 있습니다. 특정 플랫폼은 미리 설정하거나 잠글 수 있으므로 그 조건과 Linux 지원을 별도로 검증해야 합니다.

| 구성 | 확인할 경계 |
| --- | --- |
| firmware가 미리 설정 | 경로 전체 decoder 일관성·commit·lock·OS의 자동 region 인식 |
| OS가 runtime 구성 | 가용 window·device capacity·interleave·region 생성 권한과 정책 |
| RAM으로 노출 | memory map 또는 driver 경로와 실제 online 상태 |

commit과 lock은 다른 상태입니다. firmware가 commit했다는 사실만으로 모든 runtime 조작이 금지된다고 할 수 없습니다. 사용 중인 region과 메모리 수명을 확인하지 않은 채 재설정하는 명령을 실행해서도 안 됩니다.

## SRAT·HMAT·SLIT과의 관계

CEDT가 말하는 window, SRAT가 말하는 proximity domain과 memory affinity, HMAT의 접근 성능 정보, SLIT의 상대 거리는 서로 다른 정보입니다. [Ch 36](/blog/embedded/bootloader/chapter36-boot-memory-topology)에서 이 정보가 NUMA·tier·RAM online 상태로 연결되는 과정을 다룹니다.

여기에 고정된 CXL latency나 distance 범위를 넣어 모든 플랫폼에 적용하지 않습니다. HMAT가 있다고 DAMON이 애플리케이션의 hot/cold 데이터를 자동 식별하고 이동시키는 것도 아닙니다. 커널 버전과 실제 메모리 관리 정책이 더 필요합니다.

## SPDM 인증과 인계 정보

장치 인증과 IDE 적용은 해당 platform의 보안 설계·지원 장치·firmware/OS 정책에 달려 있습니다. CEDT의 CHBS·CFMWS는 장치 인증 성공 여부를 나열하는 범용 active/disabled 목록이 아닙니다. 인증 실패가 항상 CEDT 삭제로 표현된다고 가정하지 않습니다.

보안 경로를 분석하려면 실제 SPDM requester/responder·인증 정책·실패 로그·IDE 설정 주체를 추적해야 합니다. Secure Boot의 firmware 이미지 서명 검증과 장치 attestation도 다른 확인 대상입니다.

## QEMU와 Guest에서 확인할 것

QEMU의 CXL 모델은 topology와 driver의 **기능 검증**에 유용합니다. firmware·machine version·device 옵션·guest kernel을 함께 고정해야 하며, 물리 link timing·신호 무결성·실장치 보안을 대신 검증하지는 않습니다. 사용 중인 빌드에서 제공하는 옵션은 다음처럼 확인할 수 있습니다.

```bash title="cxl-qemu-help.sh"
qemu-system-x86_64 --version
qemu-system-x86_64 -machine q35,help
qemu-system-x86_64 -device cxl-type3,help
```

QEMU 공식 문서의 실행 예와 그 버전이 요구하는 firmware를 사용합니다. 확인하지 않은 CXL_ENABLED=TRUE를 OVMF의 공통 build switch로 제시하지 않으며, 상용 BIOS와 동일한 실행 경로라고 주장하지 않습니다.

다음은 **별도로 부팅한 Linux guest**에서 ACPICA 도구와 읽기 권한이 있을 때 사용하는 수집 예제입니다. 새 작업 디렉터리에서 실행하며 실제 결과를 파일로 보존합니다.

```bash title="cedt-dump.sh"
set -eu
acpidump -b -n CEDT
iasl -d cedt.dat
cat cedt.dsl
```

table이 나오지 않으면 명령 권한·도구 버전·guest firmware·QEMU ACPI 생성·topology 옵션부터 확인합니다. CEDT가 없다는 증상 하나만으로 BIOS 업데이트를 정답으로 결정할 수 없습니다. 이 글에서는 QEMU나 guest 수집을 실행하지 않았습니다.

## 실패 구간별 다음 확인

| 관찰 | 다음 확인 |
| --- | --- |
| PCI 장치만 발견됨 | CXL protocol·ACPI·driver probe 상태 |
| CEDT는 있으나 region 없음 | target UID·window·decoder·가용 capacity와 커널 로그 |
| region은 있으나 RAM 증가 없음 | DAX mode·memory block·online 정책 |
| region 수정 거부 | 실제 commit·lock·사용 상태와 지원 명령 |
| 인증 문제 의심 | platform 보안 로그와 해당 인증 구현 |

kernel log 문구와 cxl-cli 오류를 만들어 실제 출력처럼 제시하지 않습니다. 기대한 경계와 실제 원시 로그를 대조해야 firmware table 문제와 OS 구성 문제를 구분할 수 있습니다.

## 정리

- CEDT의 정적 window 정보와 endpoint decoder·region·RAM online은 구분해야 합니다.
- EDK II라는 이름만으로 공통 CXL DXE 모듈과 실행 순서가 정해지지는 않습니다.
- Linux는 runtime decoder 구성을 지원하며 firmware 사전 설정은 플랫폼별로 검토합니다.
- CEDT를 장치 인증 상태 목록으로 해석하지 않습니다.
- QEMU는 기능 검증 범위를 제공하며 실제 firmware·hardware 검증과 실행 기록은 따로 필요합니다.

## 다음 편

[Ch 36: 부트 시 메모리 토폴로지 결정](/blog/embedded/bootloader/chapter36-boot-memory-topology)에서 SRAT·HMAT·SLIT과 Linux의 NUMA·tier·zone 결정 주체를 나눠 살펴봅니다.

## 근거 자료

- [Linux CXL CEDT](https://docs.kernel.org/driver-api/cxl/platform/acpi/cedt.html): CHBS·CFMWS와 Restrictions.
- [Linux CXL BIOS/EFI Configuration](https://docs.kernel.org/driver-api/cxl/platform/bios-and-efi.html): firmware와 runtime programming의 책임.
- [Linux CXL Driver Operation](https://docs.kernel.org/driver-api/cxl/linux/cxl-driver.html): decoder·region과 자동 발견.
- [QEMU CXL 문서](https://www.qemu.org/docs/master/system/devices/cxl.html): 모델의 범위와 실행 구성 예시.

## 관련 항목

- [Ch 18: U-Boot의 EFI 호환](/blog/embedded/bootloader/chapter18-efi-in-uboot)
- [Ch 34: U-Boot PCIe Enumeration](/blog/embedded/bootloader/chapter34-pcie-enumeration)
- [Ch 36: 부트 시 메모리 토폴로지](/blog/embedded/bootloader/chapter36-boot-memory-topology)
- [Embedded Security: SPDM과 CMA](/blog/embedded/embedded-security/chapter12-spdm-cma)
- [Modern Embedded Recipes: QEMU CXL Type 3 에뮬레이션](/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation)
