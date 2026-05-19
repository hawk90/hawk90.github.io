---
title: "Ch 12: OPAE·DFL Framework"
date: 2026-05-17T12:00:00
description: "Intel FPGA management — Device Feature List·Accelerated Function Unit."
tags: [QEMU, opae, dfl, intel-fpga, afu]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 12
draft: true
---

Intel FPGA(Stratix·Agilex)의 management 스택은 **OPAE**(userspace)와 **DFL**(kernel framework) 둘로 나뉩니다. DFL의 결정적 특징은 *device 자체에 metadata가 들어 있어* driver가 sub-device를 *자동 discovery*한다는 점. PR(Partial Reconfig)·AFU·FME가 모두 표준화돼 있습니다.

## Intel FPGA stack 한눈에

```text
Userspace
   ┌───────────────────────┐
   │   fpgaconf, fpgad,    │
   │   fpgadiag, fpgainfo  │  ← OPAE 도구
   └───────────┬───────────┘
               │
   ┌───────────┴───────────┐
   │   libopae-c           │  ← BSD 라이선스 사용자 라이브러리
   └───────────┬───────────┘
               │ ioctl
   ┌───────────┴───────────┐
   │   DFL kernel modules  │  ← Linux mainline since 5.4
   │   (dfl-pci, dfl-fme,  │
   │    dfl-afu, dfl-port) │
   └───────────┬───────────┘
               │
   ┌───────────┴───────────┐
   │   Intel PAC FPGA      │
   │   (N3000, D5005, IPU) │
   └───────────────────────┘
```

OPAE는 userspace 측, DFL은 커널 측. 둘 다 Apache/BSD 라이선스로 open-source입니다.

## DFL의 핵심 — Feature header chain

**DFL**(Device Feature List)는 *FPGA가 자기 capability를 metadata로 노출*하는 메커니즘. bitstream을 만들 때 *discovery table*을 함께 합성합니다.

```text
PCIe BAR0 0x0000  ┌───────────────────────┐
                  │ Feature Header (FME)  │  type=FME, next=0x40000
                  │ FME registers         │
                  ├───────────────────────┤
PCIe BAR0 0x40000 │ Feature Header (Port) │  type=PORT, next=0x80000
                  │ Port registers        │
                  ├───────────────────────┤
PCIe BAR0 0x80000 │ Feature Header (AFU)  │  type=AFU, next=0 (EOL)
                  │ AFU registers         │
                  └───────────────────────┘
```

driver는 BAR0 시작에서 헤더를 읽고 `next` offset을 따라가며 *모든* sub-device를 자동 등록.

## DFL의 sub-device 종류

| 종류 | 역할 |
|------|------|
| **FME** (FPGA Management Engine) | PR, sensor, error, fabric mgmt |
| **PR engine** | partial reconfiguration |
| **Port** | AFU 컨테이너 — AFU가 port에 attach |
| **AFU** (Accelerated Function Unit) | user workload |
| **HSSI** | High Speed Serial Interface (Ethernet) |

각각 *자기 ioctl interface*를 노출합니다 — `/dev/dfl-fme.0`, `/dev/dfl-port.0`.

## Feature header layout

16-byte 헤더로 표준화.

```c
struct dfl_feature_header {
    uint64_t header_word;
};

#define DFL_HDR_TYPE         GENMASK(63, 60)
#define DFL_HDR_NEXT         GENMASK(59, 36)
#define DFL_HDR_ID           GENMASK(11, 0)
#define DFL_HDR_VERSION      GENMASK(23, 12)
#define DFL_HDR_EOL          BIT(31)
```

driver가 chain을 따라가는 코드.

```c
static int dfl_scan_features(struct dfl_fpga_cdev *cdev, void __iomem *base) {
    u64 hdr = readq(base);
    while (1) {
        u32 type = FIELD_GET(DFL_HDR_TYPE, hdr);
        u32 id   = FIELD_GET(DFL_HDR_ID, hdr);
        u32 next = FIELD_GET(DFL_HDR_NEXT, hdr);

        switch (type) {
        case DFL_FME:  register_fme(cdev, base);  break;
        case DFL_PORT: register_port(cdev, base); break;
        case DFL_AFU:  register_afu(cdev, base);  break;
        }

        if (!next || (hdr & DFL_HDR_EOL)) break;
        base += next;
        hdr = readq(base);
    }
    return 0;
}
```

이 *50줄 코드*가 *어떤* DFL 호환 FPGA의 sub-device든 자동으로 enumerate합니다. bitstream이 새 sub-device를 추가해도 *driver 수정 불필요*.

## OPAE 도구

userspace에서 일상적으로 쓰는 명령들.

```bash
# 카드 정보
fpgainfo fme
# Vendor ID: 0x8086
# Bitstream ID: 0x...
# PR Interface ID: ...

fpgainfo port
# AFU ID: ...
# Power: ...

# Partial Reconfiguration (PR)
fpgaconf -B 0xab -D 0x0 -F 0x0 my-afu.gbs

# diagnostic
fpgadiag mode=lpbk1
```

`fpgad`는 daemon으로 thermal·error event를 감시.

## OPAE C API

userspace 프로그램에서 AFU 사용 예.

```c
#include <opae/fpga.h>

int run_afu(void) {
    fpga_properties props;
    fpga_token tok;
    fpga_handle h;
    fpga_guid afu_id = {  /* AFU UUID 채우기 */  };

    fpgaGetProperties(NULL, &props);
    fpgaPropertiesSetGUID(props, afu_id);

    uint32_t num = 0;
    fpgaEnumerate(&props, 1, &tok, 1, &num);
    fpgaOpen(tok, &h, 0);

    /* MMIO 접근 */
    uint64_t *mmio;
    fpgaMapMMIO(h, 0, &mmio);
    mmio[0] = 0xdeadbeef;

    /* DMA buffer */
    void *buf;
    uint64_t iova, wsid;
    fpgaPrepareBuffer(h, 4096, &buf, &wsid, 0);
    fpgaGetIOAddress(h, wsid, &iova);
    /* AFU에 iova 전달 → DMA 시작 */

    fpgaReleaseBuffer(h, wsid);
    fpgaClose(h);
    fpgaDestroyToken(&tok);
    return 0;
}
```

AFU UUID로 *원하는 가속기*를 찾고, MMIO·DMA를 *vendor-agnostic*하게 다루는 게 OPAE의 매력입니다.

## Sub-device hot-add — PR 후

partial reconfig가 끝나면 *새 AFU sub-device*가 자동으로 추가됩니다.

```bash
$ ls /dev/dfl-*
/dev/dfl-fme.0
/dev/dfl-port.0

$ fpgaconf my-afu.gbs   # PR

$ ls /dev/dfl-*
/dev/dfl-fme.0
/dev/dfl-port.0
/dev/dfl-afu.0          # 새 AFU hot-add됨
```

driver는 PR 완료 후 *feature chain을 다시 scan*해 새 AFU를 등록. userspace 프로그램이 *재시작 없이* 새 AFU 사용 가능.

## DFL vs XRT 비교

다음 장(Ch 13)에서 다룰 Xilinx XRT와 비교.

| 항목 | DFL/OPAE (Intel) | XRT (Xilinx) |
|------|-------------------|---------------|
| 표준화 | bitstream 안 metadata로 | XCLBIN format으로 |
| Discovery | 자동(chain walk) | XCLBIN parse |
| Mainline kernel | 5.4+ | 별도 (out-of-tree xocl) |
| 라이선스 | Apache | Apache |
| Vendor | Intel 전용 | Xilinx 전용 |
| 진화 | Linux mainline 통합 | AMD 인수 후 ROCm 통합 진행 |

DFL이 *kernel 표준*이라는 점에서 *장기 안정성*에 유리합니다.

## ASE — AFU Simulation Environment

OPAE에는 *RTL simulator + opae stub*인 **ASE**(AFU Simulation Environment)가 포함되어 있습니다. driver-cosim 시리즈의 패턴과 같은 발상 — AFU RTL을 *실 보드 없이* OPAE userspace에서 검증.

```bash
# ASE 환경에서 AFU 실행
cd opae-sdk/build/samples/hello_afu
./ase_app
```

driver/RTL 통합 검증이 *cosim 환경에서* 가능합니다.

## DFL FPGA region 통합

DFL은 *fpga_region*(Ch 8)·*fpga_mgr*(Ch 7) subsystem과 자연스럽게 통합됩니다.

- FME → fpga_manager (PR을 수행)
- Port → fpga_region (DFX 영역)
- AFU → user-visible device

userspace ioctl로 *PR + region 활성*이 한 번에 일어납니다.

## Use case — Intel PAC + NPU

Intel PAC N3000/D5005를 NPU 가속기로 쓰는 시나리오.

1. AFU 회로(NPU operator)를 RTL/HLS로 작성
2. Quartus로 bitstream(`.gbs`) 합성, AFU UUID 포함
3. `fpgaconf my_npu.gbs`로 production 시스템에 load
4. application이 OPAE API로 AFU open, NPU 가속 호출

이 흐름이 NPU vendor·startup에서 Intel FPGA를 *evaluation platform*으로 쓰는 표준 패턴.

## 흔한 함정

- **AFU UUID 부재** — bitstream에 UUID 안 넣으면 OPAE가 enumerate 못 함.
- **DFL kernel module 없음** — old kernel(5.3 이전)에서는 빌드 필요.
- **PR interface ID 불일치** — shell version과 partial bitstream interface ID가 안 맞으면 reject.
- **DMA region 부족** — `fpgaPrepareBuffer`가 -ENOMEM. host의 hugepage 설정 확인.

## 정리

- Intel FPGA management는 **OPAE**(userspace) + **DFL**(kernel) 스택.
- DFL의 핵심: bitstream 안의 *feature header chain*으로 driver가 sub-device(FME·Port·AFU·HSSI)를 *자동 discovery*.
- 50줄 driver 코드가 *모든* DFL 호환 FPGA에 동작. bitstream에 새 device 추가해도 driver 수정 불필요.
- **OPAE 도구**: `fpgainfo`·`fpgaconf`·`fpgadiag`. C API는 `fpgaOpen/MMIO/PrepareBuffer/Close`.
- PR 후 AFU sub-device가 *hot-add* — userspace 재시작 불필요.
- DFL은 Linux **mainline**(5.4+), XRT는 out-of-tree. 장기 안정성에서 DFL 유리.
- **ASE**(AFU Simulation Environment)로 RTL을 OPAE 위에서 cosim — driver-cosim 시리즈와 같은 발상.

## 다음 장 예고

다음 장은 *Xilinx 스택*인 **XRT**(Xilinx Runtime). xocl·xclmgmt 두 kernel module 위에 libxrt가 올라가는 구조와 XCLBIN format을 봅니다.

## 관련 항목

- [Ch 11: SR-IOV·mdev](/blog/tools/emulation/qemu-fpga-driver/chapter11-sriov-mdev)
- [Ch 13: Xilinx XRT 스택](/blog/tools/emulation/qemu-fpga-driver/chapter13-xilinx-xrt)
- [Ch 7: 비트스트림 로딩](/blog/tools/emulation/qemu-fpga-driver/chapter07-bitstream-loading) — fpga_mgr
- [Ch 8: Partial Reconfiguration](/blog/tools/emulation/qemu-fpga-driver/chapter08-partial-reconfig) — fpga_region
