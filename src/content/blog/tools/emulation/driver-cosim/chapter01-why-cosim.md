---
title: "Pre-Silicon Driver Verification — RTL Co-simulation이 푸는 문제"
slug: "tools/emulation/driver-cosim/chapter01-why-cosim"
date: 2026-05-22T09:01:00
description: "Silicon 없이 driver 검증 — co-simulation의 의미."
series: "Driver-RTL Co-simulation"
seriesOrder: 1
tags: [cosim, dpi-c, pre-silicon, verification, npu]
draft: false
topics: ["tools", "tools/emulation"]
---

칩이 silicon으로 나오기 전에 그 칩용 driver를 *어떻게 검증하는가*. 이 질문이 이 시리즈의 출발점입니다. NPU·chiplet·SoC 프로젝트에서 driver 팀은 RTL과 같은 시기에 일을 시작하고, 그 시점에는 실행할 silicon이 없습니다. 그 사이에 driver를 *어디서* 돌려 보고 *무엇으로* 검증할지가 실전 문제입니다.

이 글은 그 빈 구간을 메우는 도구인 **co-simulation**(cosim)이 왜 필요한지, 다른 방법(QEMU·FPGA prototype·post-silicon test)과 어떻게 다른지를 정리합니다. 이후 챕터들이 다룰 DPI-C·Verilator·CocoTB·SystemC TLM의 *왜*에 해당하는 부분입니다.

## 어떤 문제를 푸는가

NPU 한 세대를 가정합시다. RTL 팀이 register map과 마이크로아키텍처를 확정한 시점에서 driver 팀은 다음을 동시에 진행해야 합니다.

- MMIO register 정의를 헤더로 옮기고 ioctl 인터페이스 설계
- DMA descriptor ring 자료구조 작성
- IRQ 핸들러와 bottom-half 분리
- Linux upstream과 vendor SDK가 보는 sysfs/debugfs 노출
- power management(`runtime PM`) 훅

driver 코드 자체를 *컴파일*하는 건 쉽습니다. 문제는 *돌려 보는 것*입니다. silicon 말고 driver를 실행할 수 있는 자리는 다음 세 가지입니다.

| 단계 | 어디서 돌리나 | 언제 가능한가 | 무엇이 보이고 무엇이 안 보이나 |
|------|----------------|----------------|--------|
| Post-silicon | 실 chip + 보드 | silicon·보드 도착 후 | 모든 동작이 진짜입니다. 이 시리즈에서는 다루지 않습니다 |
| FPGA prototype | FPGA 보드 | RTL을 FPGA에 합성할 수 있게 된 뒤 | clock이 실제 hardware에서 돌지만, 내부 signal은 디버그용으로 고른 net만 봅니다(AMD UG908) |
| Functional model | QEMU·SystemC TLM model | RTL과 동시에 | register 의미와 상위 stack은 보이지만 cycle 단위 동작은 모델에 없습니다 |

이 세 가지가 채우지 못하는 *cycle-accurate + driver-integrated* 검증 구간이 cosim의 영역입니다.

## 먼저 검증할 경계와 증거

"silicon에서 찾은 버그는 RTL에서 찾은 버그보다 몇 배 비싸다"는 비용표가 자주 돌지만, 이 글은 출처를 확인할 수 없는 배수를 쓰지 않습니다. 대신 지금 관찰할 수 있는 실패를 어느 모델이 책임지는지 표로 연결합니다.

| 경계 | 주입할 실패 | 남길 관찰 | 이 관찰만으로 알 수 없는 것 |
| --- | --- | --- | --- |
| MMIO encoding | 틀린 offset·reserved bit | 요청 trace와 실제 register 변화 | 물리 bus timing·cache ordering |
| IRQ | 다른 bit가 이미 켜진 동안 새 bit 설정 | cycle별 pending mask와 ISR 순서 | 실제 interrupt controller와 OS 진입 |
| DMA | 범위 초과·잘못된 descriptor | BFM 응답 오류와 buffer 변화 | IOMMU/cache 일관성·실제 bandwidth |
| reference | 비대칭 입력·overflow | 독립 golden vector와 오류 정책 | 동일 reference를 공유한 공통 bug |

RTL·software·BFM의 revision과 simulator/compiler 옵션을 함께 고정해야 실패를 재현할 수 있습니다. host 단위 검증, RTL simulation, Linux 통합, board 실험은 서로 다른 증거 단계로 기록합니다.

## Cosim이란 무엇인가

**Co-simulation**은 하나의 simulation 안에서 *서로 다른 모델*이 함께 동작하는 환경을 가리킵니다. 이 시리즈에서는 두 모델을 결합합니다.

- **RTL** — Verilog/SystemVerilog로 기술된 silicon-bound 디자인. cycle accurate.
- **Software** — driver C 코드, firmware, 또는 그 둘의 일부. host CPU에서 실행.

둘 사이의 다리는 **DPI-C**(Direct Programming Interface, IEEE 1800 SystemVerilog의 일부)와 **VPI**/VHPI 같은 simulator hook입니다. Verilator 5.054가 배포하는 `svdpi.h`는 첫머리에 "IEEE 1800-2023 Annex I"에서 가져온 파일이라고 적고 있습니다. 공유 가능한 driver 핵심의 MMIO 추상 함수를 BFM transaction으로 바꾸고, RTL의 interrupt 신호를 harness가 ISR callback에 전달하도록 설계할 수 있습니다. Linux kernel module 자체가 host 프로세스에서 그대로 실행되는 것은 아닙니다.

| 구성 요소 | 역할 |
|-----------|------|
| RTL (Verilator C++ 클래스) | clock·reset·signal toggle — cycle-accurate |
| Driver C 코드 | `writel/readl` MMIO 접근 |
| DPI-C bridge | driver의 함수 호출을 RTL의 wire access로 |
| IRQ injection thread | RTL의 `irq` pin이 driver thread를 깨움 |
| Test runner (pytest) | scenario·assertion·waveform 수집 |

위 in-process 구성에서는 driver 핵심과 RTL 모델이 한 프로세스에서 연결됩니다. IPC·socket으로 별도 CPU/OS 모델과 잇는 cosim도 있으므로, 같은 프로세스는 cosim의 정의가 아니라 이 시리즈가 고른 구성입니다. 이 구성에서는 어떤 register write가 어떤 internal signal을 토글했는지가 waveform에 그대로 찍히고, 같은 입력이면 같은 waveform이 나오는 testbench가 됩니다.

## 다른 방법과 어떻게 다른가

cosim의 자리가 보이려면 인접 방법들과 비교해 봐야 합니다.

### QEMU vs Cosim

QEMU는 *functional model*입니다. 디바이스 모델은 "이 register write가 도착하면 internal state를 이렇게 바꿔라"라는 의미적 동작을 묘사하지, 그 동작이 어떤 cycle에 어떤 internal signal을 거쳐 일어났는지는 다루지 않습니다.

QEMU 11.1.0 소스의 교육용 PCI 디바이스 `edu`가 이 구조를 그대로 보여 줍니다. MMIO 접근은 `include/system/memory.h:292-303`의 `MemoryRegionOps`에 등록한 `read`/`write` callback 한 번으로 처리됩니다. `hw/misc/edu.c:306-308`이 `edu_mmio_read`·`edu_mmio_write`를 이 구조체에 넣습니다. DMA는 command register에 쓰는 순간 `edu.c:191`의 `timer_mod(..., qemu_clock_get_ms(QEMU_CLOCK_VIRTUAL) + 100)`로 가상 시간 100 ms 뒤의 timer를 걸고, `edu.c:142`의 `edu_dma_timer`가 그때 `pci_dma_read`/`pci_dma_write`로 buffer 전체를 한 번에 복사하고, command에 `EDU_DMA_IRQ` bit가 있으면 IRQ를 올립니다(`edu.c:168-173`). 전송 길이가 4 byte든 4 KiB든 완료 시점은 같고, bus beat나 handshake는 모델 어디에도 없습니다. driver의 descriptor 처리 순서와 IRQ 처리는 이 모델로 확인되지만, RTL의 handshake·backpressure 버그는 원천적으로 나타나지 않습니다.

| 항목 | QEMU device model | Cosim (RTL + driver) |
|------|--------------------|----------------------|
| 정확도 | functional (event 단위) | cycle-accurate |
| 속도 | 이 시리즈에서 측정하지 않음 | 32-bit counter 하나를 Apple M2 Pro에서 trace 없이 16.6~19.6 Mcycle/s, VCD trace 2.8~2.9 Mcycle/s ([3장](/blog/tools/emulation/driver-cosim/chapter03-verilator) 측정) |
| 검증 대상 | driver API · OS 통합 · 상위 stack | driver-RTL boundary · timing |
| RTL 필요 | device 기능 모델이면 불필요 | RTL을 검증하는 이 구성에서는 필요; 합성 불가능 testbench도 사용 가능 |
| 가장 잘 잡는 버그 | API 오용 · 자료구조 · concurrency | register encoding · IRQ timing · DMA race |

cosim은 QEMU를 *대체*하지 않습니다. *보완*합니다. QEMU로는 OS 통합·user-space API를 검증하고, cosim으로는 register-level 인터페이스의 cycle-accurate 동작을 검증합니다.

### FPGA prototype vs Cosim

FPGA prototype은 RTL을 *FPGA의 logic에 합성*해 보드에서 돌립니다. 소프트웨어 simulation과 달리 clock이 실제 hardware에서 돌기 때문에 긴 workload를 실 system bandwidth로 시험할 수 있습니다. 대신 내부 signal은 미리 고른 net에만 보입니다. AMD Vivado의 디버그 문서 UG908은 ILA(Integrated Logic Analyzer) core를 "the selected set of nets to debug"에 맞춰 만든다고 설명하고(Netlist Insertion Debug Probing Flow 절), probe를 바꾸는 것도 "applied to a placed and routed design by re-implementing the design"이라고 적습니다(Incremental Compile with Debug Core (ILA) Modifications 절). 보드 대수만큼만 동시에 돌릴 수 있다는 점도 다릅니다. 이 시리즈는 FPGA 합성을 실행하지 않았으므로 합성 시간이나 FPGA clock 수치를 적지 않습니다.

RTL simulation은 반대 성질을 가집니다. 3장의 counter 예제는 `verilator --build`가 C++ 생성부터 link까지 2.46초(wall)에 끝났고, trace를 켜면 모든 signal이 waveform에 남습니다. hardware가 필요 없으니 **CI에 그대로 통합**되고, **bitstream 같은 가공 단계 없이** 코드 push마다 돌릴 수 있습니다.

| 항목 | FPGA prototype | Cosim |
|------|-----------------|-------|
| 속도 | 이 시리즈에서 측정하지 않음 | 3장 counter 기준 Mcycle/s 단위(위 표) |
| Internal observability | ILA로 고른 net만 (UG908) | trace를 켠 모든 signal (`--trace-depth`로 제한 가능) |
| 관찰 신호를 바꿔 다시 돌리기까지 | probe만 바꿔도 배치·배선된 설계를 다시 implement (UG908, 시간은 측정하지 않음) | 3장 counter의 `verilator --build` 2.46초 |
| CI runner에서 실행 | FPGA 보드가 연결된 runner 필요 | hardware 없이 가능 |

두 도구는 보완 관계입니다. 이 시리즈는 **짧은 시나리오의 register·IRQ·DMA 경계 버그는 cosim에서**, **긴 stress와 throughput은 FPGA에서** 보는 것으로 역할을 나눕니다. 위 표에서 counter 하나가 Mcycle/s 단위였으니, 실제 NPU 규모 RTL에서 수 초 분량의 hardware 시간을 cosim으로 돌리는 것은 현실적이지 않습니다.

### Post-silicon vs Cosim

Post-silicon은 진짜입니다. 모든 변수가 정확합니다. 그러나 silicon은 이미 제조된 RTL로 만들어졌으므로, 그때 발견한 register encoding 실수는 RTL 수정만으로는 그 silicon에서 고쳐지지 않습니다. cosim의 목적은 *그 단계에서 발견될 버그를 그 이전으로 끌어오는 것*입니다.

## 도입 판단과 유지 비용

도구 도입은 재사용할 register/transaction 계약, CI 실행 시간, waveform 저장량, protocol checker와 누가 유지할지를 함께 정해야 합니다. 첫 구축 비용이 모든 세대에 그대로 재사용된다고 가정하면 register map·IP·toolchain 변경 비용을 놓칩니다. 안전 요구가 있는 제품도 cosim 결과만으로 특정 표준 인증을 충족했다고 결론내리지 않고 적용한 검증 목표와 도구 근거를 따로 남깁니다.

## 시리즈 로드맵

이 시리즈가 다룰 8장의 흐름입니다.

| 장 | 주제 | 무엇을 얻나 |
|----|------|--------------|
| 1 (이 글) | Why cosim | 동기·비교·비용 |
| 2 | DPI-C 기초 | SV ↔ C 다리의 표준 |
| 3 | Verilator | open-source simulator로 RTL을 C++ 클래스로 |
| 4 | CocoTB | Python testbench로 생산성 ↑ |
| 5 | SystemC TLM | transaction-level virtual platform |
| 6 | BFM | bus protocol-aware adapter |
| 7 | UVM + C model | 검증·driver 양쪽의 single source |
| 8 | End-to-end | Verilator + DPI-C + Linux driver 통합 |

매 장은 "어떤 문제를 푸는가 → 어떻게 동작하는가 → 어떻게 쓰는가 → 한계"의 흐름으로 구성됩니다. 8장이 끝나면 *내 NPU prototype을 위한 cosim 환경*을 설계할 수 있는 어휘가 모입니다.

## 정리

- 칩 silicon 도착 *전*에 driver를 어디서 검증할지가 실전 문제고, **cosim**이 그 빈 구간을 메우는 도구입니다.
- 비용 배수 대신 MMIO·IRQ·DMA·reference의 주입 실패와 관찰 가능한 증거를 계획합니다.
- 이 시리즈의 in-process 구성은 driver 핵심과 RTL을 BFM/DPI로 연결하며, OS·board 계약은 별도 검증합니다.
- QEMU(functional)·FPGA prototype(가속)과 *대체* 관계가 아닌 *보완* 관계. 각자가 잡는 버그 종류가 다릅니다.
- 선택한 모델의 관찰 범위와 생략한 실제 hardware 동작을 함께 기록합니다.
- 구축 뒤에도 IP·register·simulator·CI 변경에 따른 유지 비용을 계산합니다.

## 다음 장 예고

다음 장에서는 cosim의 *언어*에 해당하는 **SystemVerilog DPI-C**를 다룹니다. import/export 선언, data type 매핑, context vs pure function의 의미, simulator별 차이까지. driver C 코드가 RTL과 어떻게 손을 잡는지를 가장 낮은 층에서 봅니다.

## 1차 자료와 확인 범위

- [Verilator 모델 연결](https://verilator.org/guide/latest/connecting.html) — host harness와 RTL model 경계
- [cocotb 2.0 timing model](https://docs.cocotb.org/en/v2.0.0/timing_model.html) — simulator scheduling과 관찰 시점
- QEMU 11.1.0 소스(`git clone --depth 1 --branch v11.1.0`) — `include/system/memory.h:292-303`, `hw/misc/edu.c:142`, `:168-173`, `:191`, `:306-308`
- Verilator 5.054 배포판 `include/vltstd/svdpi.h` 첫머리 주석 — IEEE 1800-2023 Annex I 출처 표기
- [AMD UG908: Using the Netlist Insertion Debug Probing Flow](https://docs.amd.com/r/en-US/ug908-vivado-programming-debugging/Using-the-Netlist-Insertion-Debug-Probing-Flow), [UG908 2023.2: Incremental Compile with Debug Core (ILA) Modifications](https://docs.amd.com/r/2023.2-English/ug908-vivado-programming-debugging/Incremental-Compile-with-Debug-Core-ILA-Modifications)

Verilator 수치는 2026-11-16 macOS 27.2.1(Apple M2 Pro)에서 Homebrew Verilator 5.054로 3장의 counter를 빌드·실행한 결과입니다. FPGA 합성, post-silicon 보드, Linux 통합은 이 글에서 실행하지 않았고 도입 비용도 측정하지 않았습니다.

## 관련 항목

- [Ch 2: SystemVerilog DPI-C 기초](/blog/tools/emulation/driver-cosim/chapter02-dpi-c-basics)
- [Ch 8: 통합 검증 경계](/blog/tools/emulation/driver-cosim/chapter08-end-to-end) — host 계약과 RTL·OS 검증의 구분
