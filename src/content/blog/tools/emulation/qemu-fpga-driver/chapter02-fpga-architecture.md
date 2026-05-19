---
title: "Ch 2: FPGA 아키텍처 Review"
date: 2026-05-17T02:00:00
description: "Shell·user logic·AXI·PCIe bridge — driver가 봐야 할 layer."
tags: [QEMU, fpga, shell, axi, pcie-bridge]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 2
draft: true
---

Driver 개발자가 FPGA 내부 회로 전체를 알 필요는 없습니다. 그러나 *driver가 보게 될 layer* — PCIe endpoint, shell, user logic, AXI 인터페이스 — 는 명확히 알아야 합니다. 이 장은 FPGA를 *driver 관점*으로 3-layer로 분해해 정리합니다.

이 어휘가 잡혀 있어야 다음 장부터 QEMU에 가짜 FPGA를 만들 때 *무엇을 무엇 위에 올리는지*가 보입니다.

## Driver 관점의 3-layer

FPGA를 driver가 보면 다음 세 층으로 나뉩니다.

| Layer | 역할 | 누가 만드나 |
|-------|------|-------------|
| **PCIe endpoint** | host와의 통신 인터페이스(BAR, MSI-X) | Vendor IP |
| **Shell** | DMA, QSFP, HBM controller, clock, reset | Vendor 제공 정적 회로 |
| **User logic** | bitstream에 들어가는 *알고리즘 회로*(NPU, codec, HFT engine 등) | 개발자 |

Driver가 *공통으로* 다루는 부분은 PCIe endpoint + shell이고, *device-specific* 처리가 필요한 부분은 user logic입니다. 좋은 driver 설계는 이 둘을 깔끔히 분리합니다.

## Shell — 항상 같은 부분

shell은 *bitstream에 상관없이 동일한* 회로 묶음입니다. vendor가 검증한 *고정 IP*로 들어 있고, 다음을 포함합니다.

- DMA engine (host ↔ device 데이터 이동)
- PCIe controller
- 메모리 컨트롤러 (DDR, HBM)
- 클락·리셋·power 관리
- QSFP/네트워크 인터페이스 (해당 카드)
- 디버그 인프라

vendor별 shell 이름:

| Vendor | Shell |
|--------|-------|
| Xilinx Alveo | XDMA shell |
| Xilinx Versal | QDMA shell, Block Design |
| Intel PAC | AFU framework, PR region |
| AWS F1 | Shell + Custom Logic 분리 (CL) |

shell을 *공통으로* 다루는 driver layer가 있다면, user logic만 swap하며 같은 driver를 재사용할 수 있습니다.

## User logic — 알고리즘 회로

bitstream마다 *달라지는* 부분입니다. 다음 같은 구현이 들어갑니다.

- NPU (matrix multiply, activation, attention)
- Video codec (H.265 encoder, AV1 decoder)
- HFT engine (orderbook + alpha + risk)
- DNA sequence alignment
- 신호 처리 (radar, lidar, 5G PHY)
- Database accelerator (filter, hash join)

driver는 user logic의 *register map*을 통해 이 회로를 *제어*합니다. user logic이 무엇을 하는지는 알 필요 없고, *어떻게 시작·정지·결과 회수*하는지만 알면 됩니다.

## AXI protocol family

shell과 user logic을 잇는 *내부 protocol*이 **AXI**(ARM AMBA AXI)입니다. 세 가지 variant.

| Variant | 용도 | 특징 |
|---------|------|------|
| **AXI4 (Full)** | high-bandwidth memory-mapped | burst·out-of-order |
| **AXI4-Stream** | streaming data (DMA) | 주소 없음, 단방향 stream |
| **AXI4-Lite** | low-bandwidth control | single beat, simple |

driver가 *직접 보지는 않습니다* — host에서는 PCIe TLP가 도착하면 shell의 *PCIe ↔ AXI bridge*가 AXI 트랜잭션으로 변환합니다. 그러나 *원리*를 알면 latency 특성이나 throughput 분석에 도움이 됩니다.

### AXI 채널

AXI는 *5개 채널*로 read/write를 분리합니다.

| 채널 | 약자 | 방향 | 의미 |
|------|------|------|------|
| Read Address | AR | M→S | 읽기 주소 |
| Read Data | R | S→M | 읽기 데이터 |
| Write Address | AW | M→S | 쓰기 주소 |
| Write Data | W | M→S | 쓰기 데이터 |
| Write Response | B | S→M | 쓰기 완료 |

read와 write가 *분리*되어 동시에 진행할 수 있고, 각 채널이 VALID/READY handshake를 따로 합니다. 이것이 AXI의 throughput 우위입니다.

## PCIe ↔ AXI bridge

driver가 보는 register write 한 줄이 FPGA 내부에서 어떻게 *AXI 트랜잭션*이 되는지.

```text
host driver: writel(0x1, mmio + 0x40);
    │
    ▼
host PCIe controller: TLP MemWr32 (addr=BAR0+0x40, data=0x1)
    │
    ▼
FPGA PCIe endpoint: TLP 수신
    │
    ▼
PCIe ↔ AXI bridge: AXI4-Lite 변환
    AW: addr=0x40
    W:  data=0x1, strb=0xF
    B:  resp=OK
    │
    ▼
Shell register block: 해당 register에 값 적용
    │ (또는)
    ▼
User logic register: bitstream 안 회로 동작
```

이 한 장면이 FPGA driver의 *근본*입니다. 모든 register access가 같은 흐름을 따릅니다.

## Driver-visible register map

driver가 신경 쓸 register 종류는 보통 네 가지로 분류됩니다.

| 종류 | 용도 | 예 |
|------|------|-----|
| Control(CSR) | start/stop, enable, mode | `CTRL_REG`(bit 0 = enable) |
| Status | error, ready, IRQ pending | `STATUS_REG`(bit 0 = busy) |
| Queue | descriptor ring head/tail (doorbell) | `H2C_HEAD`, `C2H_TAIL` |
| Data | DMA buffer pointer | `SRC_ADDR_LO/HI`, `LEN` |

이 분류는 *모든* FPGA shell에 거의 동일하게 적용됩니다. 그래서 driver의 *상위 구조*를 한 번 짜 두면 device를 갈아도 register offset만 바뀌고 로직은 유지됩니다.

## Code — Shell + User logic 분리 매핑

xilinx XDMA 호환 layout을 예로.

```c
/* Shell이 노출하는 표준 레지스터 (예: Xilinx XDMA) */
#define XDMA_REG_IDENT     0x0000   /* "XLNX" magic */
#define XDMA_REG_CTRL      0x0004
#define XDMA_REG_STATUS    0x0040
#define XDMA_REG_IRQ_MASK  0x0094
#define XDMA_REG_H2C_SQH   0x4000   /* host→card descriptor SQ head */
#define XDMA_REG_C2H_CQT   0x5000   /* card→host completion tail */

/* User logic은 BAR2 또는 BAR4에 따로 매핑 */
#define USER_REG_VERSION   0x0000
#define USER_REG_START     0x0004
#define USER_REG_INPUT_LEN 0x0008
#define USER_REG_OUTPUT_LEN 0x000C
```

driver probe에서 두 영역을 *별도로* mapping합니다.

```c
static int my_fpga_probe(struct pci_dev *pdev, ...) {
    struct my_fpga *f = devm_kzalloc(&pdev->dev, sizeof(*f), GFP_KERNEL);

    pci_enable_device(pdev);
    pci_set_master(pdev);

    /* BAR0 = shell (XDMA) */
    f->shell_mmio = pci_iomap(pdev, 0, 0);
    if (readl(f->shell_mmio + XDMA_REG_IDENT) != 0x584c4e58) {
        dev_err(&pdev->dev, "Not a valid FPGA shell\n");
        return -ENODEV;
    }

    /* BAR2 = user logic */
    f->user_mmio = pci_iomap(pdev, 2, 0);
    dev_info(&pdev->dev, "User logic version: 0x%x\n",
             readl(f->user_mmio + USER_REG_VERSION));

    return 0;
}
```

이 분리가 다음 장에서 만들 fake FPGA와 step 2의 실 FPGA가 *같은 코드*로 동작하는 기반입니다.

## 카드별 차이 정리

| 카드 | Shell | User logic 인터페이스 |
|------|--------|------------------------|
| Alveo U250 | XDMA shell | AXI MM + AXI Stream |
| Versal VCK5000 | QDMA shell | AXI4 + AI Engine NoC |
| Intel PAC D5005 | AFU framework | AXI-Lite + CCI-P |
| AWS F1 | Custom Shell | AXI MM |

shell은 다르지만 *driver의 시각에서는* "PCIe endpoint + 표준 register block + DMA engine + user logic 영역"으로 같습니다.

## 정리

- driver가 보는 FPGA는 **PCIe endpoint + shell + user logic** 3-layer.
- **Shell**은 bitstream에 무관한 정적 회로(DMA·메모리 controller·QSFP). vendor가 검증.
- **User logic**은 bitstream마다 달라지는 알고리즘 회로. driver는 register map으로 제어.
- **AXI**(AXI4·AXI4-Lite·AXI4-Stream)가 내부 protocol. driver는 직접 보지 않지만 원리는 알아야 latency 분석 가능.
- driver register는 **Control·Status·Queue·Data** 4분류 — 모든 FPGA에 거의 공통.
- shell layer와 user layer를 *별도 BAR로 mapping*하면 같은 driver 구조를 다양한 user logic에 재사용 가능.

## 다음 장 예고

다음 장부터 *실 빌드*가 시작됩니다. QEMU에 가짜 FPGA(`fake-fpga`)를 PCI device로 만들고, BAR 3개(CSR·DMA·user logic)를 노출시키는 minimal device를 작성합니다.

## 관련 항목

- [Ch 1: FPGA Driver 개발의 과제](/blog/tools/emulation/qemu-fpga-driver/chapter01-fpga-driver-challenge)
- [Ch 3: QEMU Fake FPGA 디바이스](/blog/tools/emulation/qemu-fpga-driver/chapter03-qemu-fake-fpga)
- [QEMU Fake Device — Register Bank](/blog/tools/emulation/qemu-fake-device/chapter13-register-bank)
- [Driver-RTL Co-simulation — BFM](/blog/tools/emulation/driver-cosim/chapter06-bfm) — AXI handshake 캡슐화
