---
title: "Ch 4: BAR & MMIO — Device 자원의 호스트 주소 매핑"
slug: "embedded/hardware/pcie/chapter04-bar-mmio"
date: 2026-05-19T09:04:00
description: "Base Address Register — Memory·I/O·64-bit·Prefetchable·size 결정·ReBAR·SR-IOV VF BAR."
series: "PCIe Deep Dive"
seriesOrder: 4
tags: [pcie, bar, mmio, rebar, sr-iov]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"BAR은 *device가 host address space에 자기 자원을 광고*하는 register입니다."** — Type 0 header에 *6개 BAR 슬롯*이 있고, *Memory (32/64-bit, prefetchable 여부)·I/O*의 4 종류. *Size는 BAR에 all-1s 쓰고 읽어 mask로 결정*. ReBAR는 지원하는 크기 중 BAR aperture를 선택합니다. SR-IOV의 VF Stride는 MMIO 간격이 아니라 Routing ID 간격입니다.

[Ch 3 Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space)에서 *BAR 슬롯이 0x10~0x24 6개*임을 봤습니다. 이 장은 *BAR의 동작 원리·size negotiation·ReBAR·VF BAR*을 본격적으로 분해합니다.

## BAR — 4 종류

각 BAR는 *Bit 0~2*가 *type 표시*:

| Type | bit 0 | bit 1~2 | 추가 비트 | 사용 |
|------|-------|---------|----------|------|
| **Memory BAR 32-bit** | 0 | 00 | Prefetchable (bit 3) | MMIO 32-bit |
| **Memory BAR 64-bit** | 0 | 10 | Prefetchable (bit 3) | MMIO 64-bit, *BAR 2개 슬롯 사용* |
| **I/O BAR** | 1 | — | reserved | Legacy I/O space |
| **Reserved** | 0 | 01·11 | — | — |

I/O BAR는 I/O address space를 요청하며, 플랫폼의 지원 범위도 확인해야 합니다. 현대 device는 *거의 안 씀*. 대부분 *Memory BAR*만 사용.

## BAR Size 결정 — Probing

OS·firmware는 BAR decode를 안전하게 멈춘 enumeration 문맥에서 size를 probe합니다. 아래는 알고리즘 설명이며 실행 명령이 아닙니다. 동작 중인 장치에 all-1s를 직접 쓰면 안 됩니다. 64-bit BAR는 상·하위 값을 함께 다룹니다.

| 단계 | 동작 |
|------|------|
| 1 | BAR에 *원래 값* 읽어 저장 |
| 2 | BAR에 *all-1s (0xFFFFFFFF)* write |
| 3 | BAR 다시 read |
| 4 | 읽은 값에서 *type 비트 (0~2 또는 0~3) mask out* |
| 5 | *bitwise NOT + 1* → BAR size (power of 2) |
| 6 | 원래 값 *복원* |

예: BAR에 all-1s 쓰고 읽었더니 *0xFFF00000*. mask out 후 *NOT + 1 = 0x00100000 (1 MB)*. 즉 *이 BAR이 1 MB 자원*임.

*device가 "내 BAR은 N byte"라고 광고*하는 메커니즘. host가 *그 size만큼 address range를 할당*.

## 64-bit BAR

*64-bit Memory BAR*는 *2개 BAR 슬롯 사용*:

| 슬롯 | 의미 |
|------|------|
| BAR N | 하위 32-bit + type 비트 |
| BAR N+1 | 상위 32-bit |

BAR0·BAR1가 *하나의 64-bit BAR*이면 BAR2·BAR3·BAR4·BAR5만 *남은 4 슬롯*. *GPU·NPU 같은 대용량 device*는 *64-bit BAR 필수* — *4 GB 이상 자원*은 *32-bit BAR 표현 불가*.

## Prefetchable

*Prefetchable bit (Memory BAR의 bit 3)*가 *2가지 의미*:

| 비트 | 의미 |
|------|------|
| 1 | RC가 *speculative prefetch 가능*. side-effect 없음 보장 |
| 0 | speculative read 등 prefetchable 속성에 의존하지 말아야 함. 반드시 부작용이 있다는 뜻은 아님 |

*GPU VRAM·RAM 영역*은 *prefetchable*. *MMIO control register*는 *non-prefetchable*. 64-bit 여부와 prefetchable 여부는 별도 비트입니다. Non-prefetchable 64-bit BAR도 가능하지만, Type 1 bridge의 non-prefetchable memory window 등 경로의 주소 제약을 함께 확인해야 합니다.

## Resource Enumeration — BIOS·OS 역할

| 단계 | 행위 |
|------|------|
| 1 | UEFI/BIOS가 *enumeration* — 모든 BAR size probe·tentative address 할당 |
| 2 | RC·switch의 *MMIO window* 설정 |
| 3 | Linux PCI subsystem이 *재할당 시도* — `pci_assign_resource` |
| 4 | `/sys/bus/pci/devices/.../resource`에 *최종 할당된 BAR 정보* 노출 |
| 5 | Driver가 *MMIO mapping* — `pci_iomap()`·`ioremap()` |

*Resource conflict*가 흔한 문제. *BAR size > 사용 가능 MMIO window*면 *device 비활성화*. `dmesg | grep "BAR.*can't"`로 진단.

## Expansion ROM BAR

*offset 0x30 (Type 0)·0x38 (Type 1)*에 *Option ROM BAR*. *device boot ROM 자원*:

| 항목 | 의미 |
|------|------|
| bit 0 | ROM Enable (0이면 access 안 됨) |
| bit 1~10 | reserved |
| bit 11~31 | ROM base address |

NIC·GPU의 *legacy BIOS Option ROM*이 이 영역에 매핑. *UEFI Secure Boot*에서 *서명 검증*. Option ROM은 플랫폼의 부팅 정책에 따라 처리됩니다. 모든 PC의 최초 실행 지점이라는 뜻은 아닙니다.

## Resizable BAR (ReBAR)

기존 BAR은 *device가 광고한 size 그대로 사용*. ReBAR는 장치가 지원하는 크기 중 aperture를 선택하게 합니다. [Linux v6.12 setup-res.c](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/pci/setup-res.c)의 `pci_resize_resource()`는 resource 할당·decode 상태 등 조건을 검사합니다. 사용 중인 매핑을 유지한 채 임의 resize할 수 있다는 뜻은 아닙니다.

| 항목 | 의미 |
|------|------|
| Capability ID | 0x0015 (Extended Cap) |
| Sizes 지원 | 해당 capability 판과 supported-size 비트에 따라 결정 |
| 협상 | BIOS·driver가 *device가 광고한 지원 size 중 선택* |

BAR aperture는 지원된 크기·가용 MMIO 공간·driver 정책으로 정합니다. 실제 VRAM 용량과 반드시 같지 않으며, 24 GiB처럼 BAR의 power-of-two 크기와 다른 용량도 있습니다. ReBAR 활성화만으로 데이터 복사 제거·zero-copy·성능 향상을 보장하지 않습니다.

플랫폼 firmware·bridge window·장치·OS driver의 지원 조건을 확인합니다. 특정 GPU 플랫폼의 설정을 ReBAR 프로토콜 전체의 필수 조건으로 일반화하지 않습니다.

## SR-IOV VF BAR

*SR-IOV (ID 0x0010)*는 *Physical Function (PF)*이 *여러 Virtual Function (VF)*를 광고하는 메커니즘. *VF BAR*는 *별도 layout*:

| 필드 | 의미 |
|------|------|
| VF BAR0~5 | 각 VF가 가질 BAR 정의 (template) |
| VF Stride | 연속 VF 사이의 Routing ID 간격 |
| NumVFs | 활성 VF 수 (PF가 *런타임에 설정*) |
| First VF Offset | PF Routing ID에서 첫 VF Routing ID까지의 간격 |

같은 VF BAR 자원 안에서 VF별 aperture는 개별 VF BAR 크기에 따라 배치됩니다. 예를 들어 VF당 4 KiB인 aperture 8개에는 32 KiB가 필요하지만, 이 4 KiB를 VF Stride register 값으로 쓰지는 않습니다. [Linux v6.12 iov.c](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/pci/iov.c)의 RID 계산과 `barsz` 기반 resource 배치를 구분하세요.

*Driver는 PF + VF 별도*. Mellanox NIC·Intel 100 GbE 등이 *SR-IOV 채택*.

## BAR Mapping — Linux 측

`/sys/bus/pci/devices/<BDF>/resource` 파일의 *각 줄이 한 BAR*:

| 컬럼 | 의미 |
|------|------|
| start | BAR base physical address |
| end | last physical address |
| flags | type·prefetchable 등 |

`pci_iomap(pdev, bar_num, max_size)`이 *driver가 BAR에 ioremap 적용*. Returns *virtual address* — *kernel space에서 readl/writel로 access*.

장치의 register 정의 없이 임의 offset에 enable 값을 쓰면 안 됩니다. 실제 driver는 resource 요청·크기·타입과 mapping 실패를 검사하고, `__iomem` accessor를 사용하며 remove·실패 경로에서 해제합니다. 이 글에서는 실제 BAR write나 driver load를 실행하지 않았습니다.

추가로 v6.12의 실제 VF RID 계산 함수를 수정 없이 추출해 host 구조체와 연결했습니다. Bus·devfn·VF 조합 1,048,576개와 PF가 아닌 경우의 거부를 ASan·UBSan으로 확인했습니다. 이는 RID 산술 검증이며 실제 VF 생성이나 BAR 매핑 시험은 아닙니다.

## 자주 하는 실수

### "BAR Size = device 메모리 크기"

*BAR Size는 device가 광고한 자원 크기*이지 *실제 사용 용량*과 다를 수 있음. 일부 device는 *BAR 영역의 일부만 valid*. driver가 *layout 명확히 알고 access*.

### "Memory BAR면 prefetchable"

*Control register 영역*은 *non-prefetchable*. *RAM/VRAM 영역*은 *prefetchable*. *모든 Memory BAR가 prefetchable 아님*. *RC의 deeper power state 진입*에 영향.

### "ReBAR이 자동"

장치 capability와 플랫폼 자원 할당, driver의 선택 결과를 확인해야 합니다. 지원 capability만으로 현재 aperture가 바뀌었다고 할 수 없습니다.

### "VF BAR이 단독 BAR"

*VF BAR은 PF의 SR-IOV Cap에 template*. *NumVFs 설정 안 하면 매핑 안 됨*. *VF는 별도 BDF·별도 driver*지만 VF Stride는 BDF/RID 배치에 쓰며, MMIO aperture 간격은 별도로 계산합니다.

### "BAR 6개면 충분"

*64-bit BAR*은 *2 슬롯 사용*. *4 GB 이상 자원이 3개*면 BAR 6개 다 사용. *복잡 device*는 *내부 mailbox·doorbell 영역 분리*로 BAR 다수 사용.

## 정리

- BAR은 *device가 host address space에 자원 광고*하는 register. *Type 0 header*에 *6 슬롯*.
- 4 종류: *Memory 32-bit·Memory 64-bit·I/O·reserved*. *I/O는 현대 거의 unused*.
- *Size는 all-1s 쓰고 read해서 mask로 결정*.
- *64-bit BAR은 2 슬롯 사용*. *prefetchable bit*가 *speculative 안전성* 보장.
- *Resource enumeration*은 *BIOS → Linux PCI subsystem*. `/sys/.../resource`로 확인.
- *Expansion ROM BAR*에 *device boot ROM* (Option ROM·UEFI GOP).
- ReBAR는 지원된 aperture 크기를 선택하며, 전체 VRAM 매핑이나 성능 향상을 자동 보장하지 않습니다.
- SR-IOV는 VF별 BAR aperture와 Routing ID offset·stride를 별도로 관리합니다.

## 다음 편

[Ch 5: Interrupts — INTx·MSI·MSI-X](/blog/embedded/hardware/pcie/chapter05-interrupts)에서 *PCIe 인터럽트 전송 메커니즘 3가지*와 *per-vector masking·APIC redirection*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space)
- [Ch 10: Linux PCI Basics](/blog/embedded/hardware/pcie/chapter10-linux-basics) — pci_iomap·driver matching
- [Ch 12: Virtualization I — SR-IOV·VFIO](/blog/embedded/hardware/pcie/chapter12-virtualization-1)

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
