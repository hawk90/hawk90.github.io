---
title: "U-Boot PCIe Enumeration — 장치 발견·BAR 할당과 CXL 메모리의 구분"
slug: "embedded/bootloader/chapter34-pcie-enumeration"
date: 2026-06-19T09:01:00
description: "U-Boot PCI driver model의 probe·bind와 BAR 자원 배치를 살펴보고, PCI MMIO window와 CXL.mem의 HDM decoder 주소 공간을 구분합니다."
series: "Bootloader Internals"
seriesOrder: 34
tags: [embedded, bootloader, u-boot, pcie, enumeration, cxl, root-complex]
topics: ["embedded"]
---

## 한 줄 요약

PCIe 열거는 장치를 찾고 BAR·bridge window를 배치하는 과정입니다. **CXL.mem 용량은 PCI BAR의 크기와 다릅니다.** BAR로 제어 레지스터에 접근할 수 있어도, 메모리를 사용하려면 별도의 host physical address 범위와 HDM decoder 경로가 필요합니다.

[Ch 19](/blog/embedded/bootloader/chapter19-kernel-handoff)의 커널 인계 전에 PCIe를 어디까지 준비할지는 부팅 장치와 플랫폼에 달려 있습니다. U-Boot이 NVMe에서 커널을 읽는 경우에는 PCI 지원이 필요하지만, 모든 보드가 모든 PCI 장치를 부트로더에서 초기화해야 하는 것은 아닙니다. 이 글은 U-Boot **v2025.01 driver model 문서**의 탐색 방식과 CXL의 주소 공간 구분을 기준으로 설명합니다.

## Root Complex 초기화

controller의 power·clock·reset·PHY·link 설정은 SoC 드라이버와 보드 구성이 담당합니다. downstream 장치의 config space 접근에는 동작하는 link가 필요하지만, RC 자체의 로컬 레지스터 접근까지 link-up 이후에만 가능하다는 뜻은 아닙니다.

| 확인 단계 | 확인할 근거 |
| --- | --- |
| 전원·reference clock·reset | 보드 회로와 controller의 순서·지연 조건 |
| PHY와 link training | 해당 드라이버의 상태 레지스터와 실제 로그 |
| speed·width | 양쪽 장치가 지원하고 협상한 값 |
| config access | controller의 config mapping과 bus 번호 설정 |

항상 Gen1부터 Gen5까지 차례로 올라가거나 RC가 모든 플랫폼에서 00:00.0이라는 가정을 두지 않습니다. link 실패와 config read 오류를 먼저 구분해야 이후의 resource 문제를 제대로 조사할 수 있습니다.

## Config Space Scan — Driver Model 경로

U-Boot 문서에서 PCI bus는 요청에 따라 probe되며, bus probe가 장치를 탐색하고 드라이버에 bind합니다. 따라서 전원 인가 직후 전체 PCI 트리를 반드시 한 번 탐색한다고 일반화할 수 없습니다. PCI 버스의 driver-model 트리와 커널에 전달하는 flattened DT도 구분해야 합니다.

bridge 아래를 탐색할 때는 primary·secondary·subordinate bus 번호와 forwarding window를 함께 관리합니다. secondary 번호만 쓴 뒤 재귀하는 축약 함수는 완성된 열거 구현이 아닙니다. multifunction 처리, config 접근 실패, 64-bit BAR와 자원 부족도 실제 구현이 처리해야 합니다.

타깃 U-Boot에서 지원 명령부터 확인하는 읽기용 예시는 다음과 같습니다. 명령 지원과 출력은 해당 빌드 설정에 달려 있습니다.

```text
=> version
=> help pci
=> pci
=> dm tree
```

보드·defconfig·U-Boot commit과 함께 출력 전체를 보존합니다. 이 글에는 위 명령을 실행한 타깃 로그나 열거 시간 실측이 없습니다.

## BAR Sizing

memory BAR의 size probe는 주소 비트의 구현 마스크를 이용합니다. I/O BAR는 하위 비트 해석이 다르고, 64-bit memory BAR는 두 DWORD가 한 쌍입니다. 실제 장치에 probe write를 할 때는 decode와 장치 상태, 원래 BAR 및 command 값의 보존·복구를 해당 PCI 구현에 맡겨야 합니다.

다음은 **이미 수집한 memory BAR 마스크의 산술만** 검사하는 예제입니다. 장치 레지스터를 읽거나 쓰지 않습니다. 0 주소 마스크는 미구현과 전체 폭 크기를 이 입력만으로 구별하지 못하므로 거부하는 정책을 택합니다.

```js title="memory-bar-size.mjs"
export function memoryBarSize(rawMask, width = 32) {
  if (![32, 64].includes(width) || typeof rawMask !== 'bigint')
    throw new RangeError('width or mask');
  const all = (1n << BigInt(width)) - 1n;
  if (rawMask < 0n || rawMask > all || (rawMask & 1n) !== 0n ||
      (rawMask & 6n) !== (width === 64 ? 4n : 0n))
    throw new RangeError('memory BAR encoding');
  const address = rawMask & (all ^ 15n);
  if (address === 0n) throw new RangeError('ambiguous zero mask');
  const size = ((~address) & all) + 1n;
  if (size < 16n || (size & (size - 1n)) !== 0n)
    throw new RangeError('non-contiguous mask');
  return size;
}
```

32-bit 마스크 0xFFF00000은 0x100000, 즉 1 MiB입니다. 64-bit memory BAR의 두 DWORD를 합친 0xFFFFFFFF00000004는 4 GiB를 나타냅니다. 하위 type 비트를 제거하기 전에 BAR 종류와 폭을 확인하며, 이 계산을 그대로 CXL.mem 용량 계산으로 사용하지 않습니다.

## Resource 할당

BAR는 크기에 맞는 정렬과 주소 제약을 만족하는 window에 배치해야 합니다. 다음은 256 MiB window를 가정한 계산 예제이며 실장치의 resource dump가 아닙니다. 범위는 끝 주소를 포함하지 않습니다.

| 항목 | 크기 | 배치 예 |
| --- | --- | --- |
| RC MMIO window | 256 MiB | [0x40000000, 0x50000000) |
| Endpoint A BAR | 64 MiB | [0x40000000, 0x44000000) |
| Endpoint B BAR | 1 MiB | [0x44000000, 0x44100000) |
| Endpoint C BAR | 4 GiB | 이 window에는 배치 불가 |

자원 배치 실패가 곧 장치의 Vendor ID도 읽지 못했다는 뜻은 아닙니다. bus 탐색 성공·BAR 배치·드라이버 사용 가능 여부를 각각 확인합니다. bridge window와 CPU↔PCI 주소 변환도 맞아야 합니다.

## CXL DVSEC과 HDM Decoder

DVSEC은 PCIe **extended capability**입니다. 존재 여부뿐 아니라 vendor·DVSEC ID·revision·length와 register locator를 해석해야 CXL 기능을 식별할 수 있습니다. 표준 capability 탐색과 extended capability 탐색은 다른 경로입니다.

QEMU CXL 문서는 BAR가 register·mailbox 접근에 쓰이고, Type 3 메모리의 HDM decoder는 host physical address를 device physical address로 변환한다고 구분합니다. **256 GiB CXL 메모리가 있다고 256 GiB BAR가 필요한 것은 아닙니다.** CXL protocol 지원도 PCIe 세대나 RC 기능만으로 따라오지 않습니다.

U-Boot 전체에 공통인 pci_cxl.c·DVSEC scan 후 CEDT 자동 생성 흐름을 전제하지 않습니다. 그런 기능을 설명하려면 실제 fork·commit·빌드 설정과 table 생성 코드를 제시해야 합니다. ACPI 기반 Linux의 CXL 발견 과정은 [다음 장](/blog/embedded/bootloader/chapter35-uefi-cxl-init)에서 다룹니다.

## DTB·ACPI로 인계할 정보

DT의 PCI host ranges는 PCI 주소와 CPU 주소 사이 window를 기술합니다. 개별 endpoint BAR 배치를 모두 기록하는 일반 목록이 아닙니다. U-Boot 문서는 discoverable PCI 장치라도 추가 보드 정보를 주기 위한 DT 노드를 허용하며, 무조건 동적 노드만 쓰라고 권하지 않습니다.

ACPI의 CEDT는 host bridge와 CXL fixed memory window 등을 기술합니다. 각 endpoint마다 임의의 cxl,memory-device DT 노드를 추가하거나 DVSEC 발견마다 CEDT 항목을 하나 만든다는 규칙은 없습니다. 타깃 플랫폼의 DT binding 또는 ACPI 계약을 먼저 확인해야 합니다.

## 실패 구간을 나누어 조사하기

| 증상 | 다음 확인 |
| --- | --- |
| link가 올라오지 않음 | 전원·reset·clock·PHY·케이블과 양쪽 link 상태 |
| config read 실패 | bus 번호·config mapping·link 및 접근 오류 |
| BAR 자원 부족 | 크기·정렬·32/64-bit 제한·bridge/RC window |
| PCI 장치는 보이나 CXL 메모리가 없음 | CXL protocol·ACPI·decoder·region·driver 상태 |
| 부팅 뒤 새 장치가 보이지 않음 | OS와 플랫폼의 hotplug 지원·자원·정책 |

prefetchable window를 임의로 512 GiB까지 늘리는 처방은 피합니다. 실제 BAR 요구와 SoC 주소 공간을 확인해야 하며, CXL memory window는 별도 문제입니다. hotplug 역시 U-Boot이 절대로 처리할 수 없다는 규칙이 아니라 해당 펌웨어와 OS가 제공하는 기능의 범위로 판단합니다.

## 정리

- PCIe link 준비·장치 발견·BAR 배치·드라이버 활성화는 서로 다른 확인 단계입니다.
- U-Boot driver model의 probe 시점은 요청과 설정에 달려 있습니다.
- BAR probe는 type·폭·decode·복구를 포함한 구현을 사용해야 합니다.
- CXL.mem 용량과 제어 레지스터 BAR 크기를 혼동하지 않습니다.
- DT ranges·ACPI CEDT·HDM decoder의 역할을 각각 확인합니다.

## 다음 편

[Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init)에서는 CEDT와 decoder 설정을 나누고, firmware가 준비할 정보와 Linux가 구성할 자원을 구분합니다.

## 근거 자료

- [U-Boot v2025.01 PCI with Driver Model](https://docs.u-boot.org/en/v2025.01/develop/driver-model/pci-info.html): probe·bind·DT의 PCI 노드.
- [QEMU CXL 문서](https://www.qemu.org/docs/master/system/devices/cxl.html): BAR register·mailbox와 HDM decoder 구분.
- [Linux CXL BIOS/EFI Configuration](https://docs.kernel.org/driver-api/cxl/platform/bios-and-efi.html): firmware 정보와 runtime decoder 설정의 경계.

## 관련 항목

- [Ch 19: Linux Boot ABI](/blog/embedded/bootloader/chapter19-kernel-handoff)
- [Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init)
- [Ch 36: 부트 시 메모리 토폴로지](/blog/embedded/bootloader/chapter36-boot-memory-topology)
- [Modern Embedded Recipes: PCIe에서 CXL로](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
- [Modern Embedded Recipes: Linux CXL 드라이버](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver)
