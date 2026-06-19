---
title: "U-Boot PCIe Enumeration — 부트로더가 디바이스를 찾는 흐름 분석"
date: 2026-06-19T09:01:00
description: "U-Boot PCIe 열거 과정 — Root Complex 초기화·Config Space scan·BAR sizing·resource 할당, CXL DVSEC 인식까지."
series: "Bootloader Internals"
seriesOrder: 34
tags: [embedded, bootloader, u-boot, pcie, enumeration, cxl, root-complex]
---

## 한 줄 요약

> **"PCIe enumeration은 *부트로더가 깨어 있는 동안 한 번만 하는 가장 비싼 트리 탐색*입니다."** — Root Complex가 Bus 0부터 시작해 *config space를 깊이우선*으로 훑고, 디바이스마다 *BAR sizing*과 *resource 할당*을 끝낸 뒤에야 커널이 *완성된 PCIe 토폴로지*를 인계받습니다. CXL 디바이스는 이 흐름의 *마지막 단계*에서 *DVSEC 캡슐*로 자신을 추가 신원합니다.

[Ch 19](/blog/embedded/bootloader/chapter19-kernel-handoff)에서 *부트로더가 커널에 인계*하는 흐름을 봤습니다. 인계 전에 부트로더가 *반드시 끝내야 하는 일* 중 하나가 *PCIe enumeration*입니다. SoC가 *root complex*를 가졌고 *PCIe 디바이스가 슬롯에 꽂혀 있으면*, U-Boot은 *각 디바이스의 BAR을 sizing하고 메모리 공간을 할당*해 *DTB의 ranges 속성*에 기록한 뒤 커널에 넘깁니다.

데이터센터·AI 가속기 서버에서는 *CXL 디바이스가 이 경로*를 타고 인식됩니다. 표준 PCIe enumeration *그 자체*는 변하지 않았지만, *CXL DVSEC을 인식하는 추가 단계*가 *최신 부트로더*에 들어왔습니다. 이 장은 *U-Boot의 PCIe enumeration*을 단계별로 분해하고, *CXL이 어디서 끼어드는지*를 정리합니다.

## Root Complex 초기화

PCIe enumeration은 *Root Complex가 깨어 있는 상태*에서 시작됩니다. SoC마다 *PCIe controller IP*가 다르지만 *공통 시퀀스*가 있습니다.

U-Boot PCIe RC init 시퀀스:

| 단계 | 작업 |
|------|------|
| 1. PCIe controller power-on | PMU에서 power domain 활성화 |
| 2. Reference clock 공급 | 100 MHz |
| 3. PHY 초기화 | PIPE interface, equalization, lane bring-up |
| 4. Link training (LTSSM) | Detect → Polling → Configuration. L0 도달 시 link active. 실패 시 PERST# assert 후 재시도 |
| 5. Speed negotiation | Gen1 → Gen2 → Gen3 → Gen4 → Gen5 |
| 6. Width negotiation | x1·x4·x8·x16 |
| 7. Root Complex Config Space 초기화 | Bus 0, Device 0, Function 0이 RC |

*LTSSM(Link Training and Status State Machine)*이 *L0 상태*에 도달해야 *config space access가 가능*합니다. 이 단계에서 *cable 문제·전원 부족·PHY 설정 오류*가 자주 잡힙니다.

## Config Space Scan — 깊이우선 탐색

LTSSM이 L0에 도달하면 *Bus 0*부터 *config space를 훑기* 시작합니다.

```c
// U-Boot drivers/pci/pci.c (단순화)
int pci_hose_scan_bus(struct pci_controller *hose, int bus)
{
    for (dev = 0; dev < PCI_MAX_DEVICES; dev++) {
        for (func = 0; func < PCI_MAX_FUNCTIONS; func++) {
            bdf = PCI_BDF(bus, dev, func);

            // Vendor ID 읽기 — 0xFFFF면 디바이스 없음
            vid = pci_read_config_word(bdf, PCI_VENDOR_ID);
            if (vid == 0xFFFF)
                continue;

            // Header type — 0x01이면 bridge (재귀)
            htype = pci_read_config_byte(bdf, PCI_HEADER_TYPE);
            if ((htype & 0x7F) == PCI_HEADER_TYPE_BRIDGE) {
                // Secondary bus 번호 할당하고 재귀 scan
                sec_bus = ++max_bus;
                pci_write_config_byte(bdf, PCI_SECONDARY_BUS, sec_bus);
                pci_hose_scan_bus(hose, sec_bus);
            } else {
                // Endpoint — BAR sizing
                pci_size_bars(bdf);
            }
        }
    }
}
```

*깊이 우선*으로 *bridge를 만나면 secondary bus를 할당하고 재귀*합니다. *endpoint를 만나면 BAR sizing*을 끝냅니다. 이 과정이 *수십~수백 ms* 걸립니다 — 디바이스 수와 link 안정성에 따라.

## BAR Sizing

각 endpoint의 *BAR*은 *디바이스가 요청하는 메모리 크기*를 알려 줍니다.

```c
// BAR sizing 절차
uint32_t orig = pci_read_config_dword(bdf, PCI_BAR0);
pci_write_config_dword(bdf, PCI_BAR0, 0xFFFFFFFF);
uint32_t mask = pci_read_config_dword(bdf, PCI_BAR0);
pci_write_config_dword(bdf, PCI_BAR0, orig);

// 크기 계산
uint32_t size = (~(mask & 0xFFFFFFF0)) + 1;
// 예: mask=0xFFF00000 → size=0x100000 (1 MB)
```

*BAR에 모두 1을 쓰고 다시 읽으면* *하위 R/W bit는 0으로 굳고 상위는 1로 남는* 형태가 됩니다. 이 *반전된 마스크*가 *BAR이 차지하는 영역 크기*입니다.

64-bit BAR이면 *BAR0과 BAR1을 합쳐* sizing합니다. CXL 디바이스의 *HDM Decoder는 64-bit BAR*로 노출되어 *512 GB~2 TB DRAM*을 매핑합니다.

## Resource 할당

모든 endpoint의 BAR 크기가 수집되면, *RC가 가진 memory window*를 *분할*해 할당합니다.

```text
[U-Boot pci_setup_resources 흐름]

RC memory window: 0x40000000 ~ 0x4FFFFFFF (256 MB)

Endpoint 1: 64 MB 요구 → 0x40000000 ~ 0x43FFFFFF
Endpoint 2: 1 MB 요구 → 0x44000000 ~ 0x440FFFFF
Endpoint 3: 4 GB 요구 → ✗ window 부족! → enumeration 실패
```

*4 GB·512 GB 같은 큰 BAR*은 *RC의 prefetchable window*가 *그만큼 커야* 합니다. CXL 메모리 디바이스는 보통 *64-bit prefetchable BAR*로 매핑되며, *DTB의 ranges 속성*이 *충분히 큰 window를 정의*해 줘야 합니다.

```dts
// arch/arm64/boot/dts/example-board.dts
pcie@30000000 {
    compatible = "vendor,pcie-rc";
    reg = <0x0 0x30000000 0x0 0x10000>;
    ranges = <
        0x82000000 0x0 0x40000000 0x0 0x40000000 0x0 0x10000000  // 32-bit MMIO 256 MB
        0xc3000000 0x0 0x80000000 0x80 0x0 0x80 0x0              // 64-bit prefetch 512 GB
    >;
};
```

*마지막 항목*이 *0x80_00000000 ~ 0x100_00000000 (512 GB)*의 *prefetchable window*를 정의합니다. CXL.mem 디바이스가 *256 GB*를 요청해도 이 안에 들어갑니다.

## CXL DVSEC 인식

Modern U-Boot (2024+)은 *PCIe enumeration 끝에 DVSEC scan*을 추가합니다. CXL 디바이스는 *Vendor=0x1e98(CXL Consortium)*의 *DVSEC*을 가집니다.

```c
// U-Boot drivers/pci/pci_cxl.c (개념적)
int pci_scan_cxl_dvsec(pci_dev_t bdf)
{
    int cap_offset = pci_find_ext_capability(bdf, PCI_EXT_CAP_ID_DVSEC);
    while (cap_offset) {
        uint16_t vid = pci_read_config_word(bdf, cap_offset + 4);
        uint16_t dvsec_id = pci_read_config_word(bdf, cap_offset + 8);

        if (vid == PCI_VENDOR_ID_CXL_CONSORTIUM) {
            switch (dvsec_id) {
                case CXL_DVSEC_DEVICE:
                    printf("CXL device found at %02x:%02x.%x\n",
                           PCI_BUS(bdf), PCI_DEV(bdf), PCI_FUNC(bdf));
                    add_cedt_entry(bdf);
                    break;
                case CXL_DVSEC_PORT:
                    register_cxl_port(bdf);
                    break;
            }
        }
        cap_offset = pci_find_next_ext_capability(bdf, cap_offset, PCI_EXT_CAP_ID_DVSEC);
    }
}
```

*CXL DVSEC을 발견*하면 *부트로더가 ACPI CEDT(CXL Early Discovery Table)에 항목을 추가*해 *커널에 인계*합니다. 커널은 *CEDT를 보고 cxl_acpi 드라이버를 활성화*합니다.

[Modern Embedded Recipes Ch 151](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver)에서 *cxl_acpi → cxl_pci → cxl_mem* 의존성 체인을 볼 수 있습니다.

## DTB로 결과 인계

U-Boot은 enumeration 결과를 *DTB의 ranges와 device node*로 인계합니다.

```dts
// 부트로더가 update한 후의 DTB (예시)
pcie@30000000 {
    ranges = <...>;     // RC window 그대로
    bus-range = <0x0 0x20>;  // U-Boot이 찾은 max bus

    cxl-mem@5e000000 {  // U-Boot이 추가한 노드
        compatible = "cxl,memory-device";
        reg = <0x80 0x00000000 0x40 0x00000000>;  // 256 GB
        cxl,dvsec-rev = <1>;
    };
};
```

*수동 DTB*에는 *PCIe 디바이스 노드를 미리 정의 안 함*이 권장됩니다 — *enumeration 결과로 부트로더가 동적 추가*하는 게 *권장 흐름*입니다.

## 임베디드에서 PCIe·CXL을 만나는 자리

*임베디드 SoC*는 보통 *root complex* 없이 *endpoint*로 동작하는 경우가 많습니다. 그러나 *AI Edge·Industrial Gateway·NVR* 같은 *상위 SoC*들이 *PCIe 5.0 RC*를 갖추면서 *CXL device attach*가 가능해졌습니다.

| 임베디드 시나리오 | RC 또는 EP | 부트로더 enumeration |
|------------------|-----------|---------------------|
| MCU + Sensor | 없음 | N/A |
| AI Edge box (Jetson Orin 등) | RC | NVMe·CXL.mem 인식 |
| NVR·NAS | RC | NVMe storage 인식 |
| 5G RU·DU | RC | accelerator (FPGA/NPU) 인식 |
| Automotive ADAS | RC + EP | inter-ECU PCIe·CXL fabric |

부트로더의 PCIe enumeration은 *commercial 서버만의 일이 아닙니다*.

## 자주 하는 실수

### Link Training 실패를 enumeration 실패로 오인

```text
[U-Boot 로그]
pcie@30000000: link not up after 100ms, giving up
pcie@30000000: no devices found
```

이 메시지는 *LTSSM이 L0에 도달 못 한 것*입니다. *enumeration이 실패한 게 아니라 link 자체가 안 올라온* 상태입니다. PHY 설정·전원·신호 무결성을 먼저 점검해야지 enumeration 코드를 뒤져선 안 됩니다.

### Prefetchable Window가 작아 큰 BAR 매핑 실패

```text
pcie@30000000: out of mem space for device 02:00.0 (req 0x40000000 bytes)
```

*1 GB 이상 BAR*을 요청하는 디바이스(GPU·CXL.mem)가 *작은 prefetchable window*에 안 들어가는 경우입니다. DTB의 `ranges`를 *충분히 큰 window*로 정의해야 합니다. *최소 64 GB* 권장 — CXL 디바이스를 고려하면 *512 GB 이상*도 흔합니다.

### BAR Sizing 후 원래 값 복원 안 함

```c
// 잘못된 sizing
pci_write_config_dword(bdf, PCI_BAR0, 0xFFFFFFFF);
mask = pci_read_config_dword(bdf, PCI_BAR0);
// orig 복원 안 함! → 디바이스가 비정상 BAR 값으로 동작
```

*BAR에 0xFFFFFFFF를 쓰면* 그 사이 *디바이스가 잘못된 주소를 본다*고 생각할 수 있습니다. *반드시 원래 값을 복원*한 뒤 *resource 할당 단계*에서 *새 주소를 다시 씁니다*.

### CXL DVSEC을 표준 PCIe Capability로 처리

```c
// 잘못 — DVSEC은 Extended Capability지 표준 Cap 아님
int cap = pci_find_capability(bdf, PCI_CAP_ID_DVSEC);  // 항상 0 리턴

// 올바름 — Extended Capability (offset 0x100+)에서 찾아야 함
int cap = pci_find_ext_capability(bdf, PCI_EXT_CAP_ID_DVSEC);
```

DVSEC은 *PCIe 4 KB extended config space*에 있습니다. *256 byte 표준 config space*에서는 찾을 수 없습니다.

### Hot-plug Device를 모름 enumeration

```text
[부팅 후 hot-plug]
pcie@30000000: hot-plug event ignored
```

*U-Boot의 enumeration*은 *부팅 시 한 번*만입니다. *부팅 후 슬롯에 끼운 디바이스*는 *커널의 PCIe hot-plug 메커니즘*이 담당합니다. 부트로더에서 처리 시도 자체가 *책임 위반*입니다.

## 정리

- U-Boot PCIe enumeration은 *Root Complex가 LTSSM L0에 도달*한 뒤 *Bus 0부터 깊이우선*으로 진행됩니다.
- 각 endpoint의 *BAR sizing*은 *0xFFFFFFFF write/read 반전 마스크*로 *요청 크기*를 알아냅니다.
- *Resource 할당*은 *RC가 가진 memory window를 분할*해 endpoint마다 *실 주소*를 부여합니다.
- 큰 BAR(GPU·CXL.mem)을 위해 *DTB의 prefetchable window를 충분히 크게* 정의해야 합니다.
- *CXL 디바이스는 DVSEC을 가집니다*. Modern U-Boot은 *enumeration 끝에 DVSEC scan*해 *ACPI CEDT에 항목을 추가*합니다.
- enumeration 결과는 *DTB의 ranges와 동적 노드*로 *커널에 인계*되며, 커널은 *cxl_acpi 드라이버*로 CXL을 인식합니다.
- 임베디드 SoC도 *Jetson Orin·NVR·5G DU 같은 상위 시스템*은 *PCIe 5.0 RC + CXL device attach*가 *현실*입니다.

## 다음 편

[Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init)에서는 *EDK II 기반 BIOS·UEFI*가 *CEDT(CXL Early Discovery Table)를 생성*하고 *HDM Decoder를 사전 설정*해 *커널이 깨어났을 때 즉시 메모리를 인식*하게 하는 흐름을 분해합니다.

## 관련 항목

- [Ch 19: Linux Boot ABI — ARM/ARM64 커널 진입 규약 추적](/blog/embedded/bootloader/chapter19-kernel-handoff)
- [Ch 25: ARM Trusted Firmware-A 통합](/blog/embedded/bootloader/chapter25-tfa-optee)
- [Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init) (다음 편)
- [Ch 36: 부트 시 메모리 토폴로지 결정 — DDR + CXL.mem 통합 인식](/blog/embedded/bootloader/chapter36-boot-memory-topology)
- [Modern Embedded Recipes Ch 149: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
- [Modern Embedded Recipes Ch 151: Linux CXL 드라이버 분석](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver)
