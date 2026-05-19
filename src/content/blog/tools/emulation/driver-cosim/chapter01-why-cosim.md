---
title: "Ch 1: Why Pre-Silicon Driver Verification"
date: 2026-05-17T01:00:00
description: "Silicon 없이 driver 검증 — co-simulation의 의미."
series: "Driver-RTL Co-simulation"
seriesOrder: 1
tags: [cosim, dpi-c, pre-silicon, verification, npu]
draft: true
---

칩이 silicon으로 나오기 전에 그 칩용 driver를 *어떻게 검증하는가*. 이 질문이 이 시리즈의 출발점입니다. NPU·chiplet·SoC 프로젝트에서 driver 팀은 보통 RTL 팀과 *같은 분기 또는 그 다음 분기*에 코드를 내야 하는데, 정작 동작할 silicon은 그로부터 6개월에서 1년 뒤에 도착합니다. 그 사이에 driver를 *어디서* 돌려 보고 *무엇으로* 검증할지가 실전 문제입니다.

이 글은 그 빈 구간을 메우는 도구인 **co-simulation**(cosim)이 왜 필요한지, 다른 방법(QEMU·FPGA prototype·post-silicon test)과 어떻게 다른지를 정리합니다. 이후 챕터들이 다룰 DPI-C·Verilator·CocoTB·SystemC TLM의 *왜*에 해당하는 부분입니다.

## 어떤 문제를 푸는가

NPU 한 세대를 가정합시다. RTL 팀이 register map과 마이크로아키텍처를 확정한 시점에서 driver 팀은 다음을 동시에 진행해야 합니다.

- MMIO register 정의를 헤더로 옮기고 ioctl 인터페이스 설계
- DMA descriptor ring 자료구조 작성
- IRQ 핸들러와 bottom-half 분리
- Linux upstream과 vendor SDK가 보는 sysfs/debugfs 노출
- power management(`runtime PM`) 훅

driver 코드 자체를 *컴파일*하는 건 쉽습니다. 문제는 *돌려 보는 것*. 보통은 다음 셋 중 하나를 씁니다.

| 단계 | 어디서 돌리나 | 언제 가능한가 | 가성비 |
|------|----------------|----------------|--------|
| Post-silicon | 실 chip + 보드 | tape-out 이후 6~12개월 | bug 발견 시 최악 — 칩 다시 굽기 |
| FPGA prototype | Xilinx VCU/U250 등 | RTL 동결 후 합성 가능 시점 | 하드웨어·합성 시간 비쌈, 보드 공유 |
| Functional model | QEMU·SystemC fast model | RTL과 동시 진행 가능 | 빠름, 그러나 *register-level*에 머무름 |

이 세 가지가 채우지 못하는 *cycle-accurate + driver-integrated* 검증 구간이 cosim의 영역입니다.

## 비용 그래프가 알려주는 것

소프트웨어 산업에서 "버그는 일찍 잡을수록 싸다"는 말은 *완만한* 비용 곡선을 가정합니다. 하드웨어는 다릅니다. tape-out을 기점으로 비용이 단절적으로 뛰어 오릅니다.

| 단계에서 버그 발견 | 수정 비용(상대) | 일정 영향 |
|---------------------|-----------------|----------|
| RTL simulation | 1× | 분~시간 |
| Cosim(driver+RTL) | 3× | 시간~일 |
| FPGA prototype | 30× | 일~주 |
| Post-silicon | 1,000× | 월~분기 |
| ECO / metal spin | 10,000× | 분기~년 |

10,000× 차이가 과장처럼 들리지만, 실제로 SoC 한 lot의 spin 비용은 마스크 수정만으로도 수십만 달러, full re-tape-out이라면 수백만 달러대입니다. 이 격차가 cosim에 시간을 *미리* 투자할 동기를 만듭니다.

## Cosim이란 무엇인가

**Co-simulation**은 하나의 simulation 안에서 *서로 다른 모델*이 함께 동작하는 환경을 가리킵니다. 우리 맥락에서는 보통 두 모델이 결합합니다.

- **RTL** — Verilog/SystemVerilog로 기술된 silicon-bound 디자인. cycle accurate.
- **Software** — driver C 코드, firmware, 또는 그 둘의 일부. host CPU에서 실행.

둘 사이의 다리는 **DPI-C**(Direct Programming Interface, SystemVerilog LRM 표준)와 **VPI**/VHPI 같은 simulator hook입니다. driver의 `writel()` 한 줄이 simulation 안의 register write로 *그대로 도달*하고, RTL이 발생시킨 interrupt가 driver의 ISR을 *직접* 깨우는 식이죠.

| 구성 요소 | 역할 |
|-----------|------|
| RTL (Verilator C++ 클래스) | clock·reset·signal toggle — cycle-accurate |
| Driver C 코드 | `writel/readl` MMIO 접근 |
| DPI-C bridge | driver의 함수 호출을 RTL의 wire access로 |
| IRQ injection thread | RTL의 `irq` pin이 driver thread를 깨움 |
| Test runner (pytest) | scenario·assertion·waveform 수집 |

이 구성에서 핵심은 **driver와 RTL이 *같은 프로세스 안에서* 함수 호출 한 번 거리에 있다**는 점입니다. 어떤 register write가 어떤 internal signal을 토글했는지가 waveform에 그대로 찍힙니다. 재현 가능한 testbench가 만들어집니다.

## 다른 방법과 어떻게 다른가

cosim의 자리가 보이려면 인접 방법들과 비교해 봐야 합니다.

### QEMU vs Cosim

QEMU는 *functional model*입니다. 디바이스 모델은 "이 register write가 도착하면 internal state를 이렇게 바꿔라"라는 의미적 동작을 묘사하지, 그 동작이 어떤 cycle에 어떤 internal signal을 거쳐 일어났는지는 다루지 않습니다.

| 항목 | QEMU device model | Cosim (RTL + driver) |
|------|--------------------|----------------------|
| 정확도 | functional (event 단위) | cycle-accurate |
| 속도 | 거의 native | 수십~수백 cycle/s |
| 검증 대상 | driver API · OS 통합 · 상위 stack | driver-RTL boundary · timing |
| 합성 RTL 필요 | 아님 | 필수 |
| 가장 잘 잡는 버그 | API 오용 · 자료구조 · concurrency | register encoding · IRQ timing · DMA race |

cosim은 QEMU를 *대체*하지 않습니다. *보완*합니다. QEMU로는 OS 통합·user-space API를 검증하고, cosim으로는 register-level 인터페이스의 cycle-accurate 동작을 검증합니다.

### FPGA prototype vs Cosim

FPGA prototype은 RTL을 *실제 게이트에 합성*해 보드에서 돌립니다. 속도가 빠르고(MHz 영역) 실 system bandwidth로 test 가능합니다. 그러나 합성 시간이 길고(수십 분~시간), 보드 수가 적어 공유 병목이 생기며, internal signal에 직접 접근하기 어렵습니다.

cosim은 느립니다(Hz~kHz). 대신 **모든 internal signal이 waveform으로 노출**되고, **CI에 그대로 통합**되며, **bitstream 같은 가공 비용 없이** 코드 push마다 돌릴 수 있습니다.

| 항목 | FPGA prototype | Cosim |
|------|-----------------|-------|
| 속도 | MHz | Hz~kHz |
| Internal observability | 제한적(probe 설정 필요) | 완전(waveform) |
| Iteration time | 수십 분(합성) | 분(컴파일) |
| CI 친화도 | 낮음 | 높음 |
| 비용 | 보드 + 라이선스 | open-source 가능 |

두 도구는 보완 관계입니다. **cosim에서 빠른 iteration으로 큰 버그를 잡고**, **FPGA에서 long-running stress와 throughput을 본다**는 분담이 일반적입니다.

### Post-silicon vs Cosim

Post-silicon은 진짜입니다. 모든 변수가 정확합니다. 그러나 도착했을 땐 RTL이 *동결*되어 있고, register encoding 같은 근본적 실수는 metal spin 외에 고칠 길이 없습니다. cosim의 목적은 *그 단계에서 발견될 버그를 그 이전으로 끌어오는 것*입니다.

## 누가 쓰나 — 산업에서의 표준 도구화

10년 전만 해도 cosim은 일부 IP vendor와 대형 fabless의 *내부 도구*였습니다. 지금은 그렇지 않습니다.

- **NPU vendor** — Tenstorrent·Tachyum·SambaNova 등은 cosim 환경을 사내 표준으로 공개·반공개합니다. pre-silicon driver 개발이 곧 제품 일정에 영향을 주기 때문입니다.
- **Chiplet 생태계** — UCIe·BoW 인터커넥트가 도입되며 *partner IP*와 자사 IP 사이의 boundary를 검증할 필요가 커졌습니다. cosim에 BFM을 끼워 link-level 시나리오를 돌립니다.
- **Open-source SoC** — Chipyard·OpenTitan·SiFive Freedom은 Verilator cosim을 기본 검증 흐름으로 둡니다.
- **자동차/항공** — DO-178C/ISO-26262 같은 안전 표준에서 *조기 검증* 항목을 cosim 결과로 채우는 사례가 늘고 있습니다.

처음 도입할 때 흔히 듣는 반론은 "cosim 환경 깔기 자체가 1인-월이다"입니다. 맞는 말이지만, *그 한 번의 투자가 모든 후속 chip generation에 재사용*됩니다. 그래서 한 세대만 보면 의문스럽지만, 로드맵 3년을 보면 명확히 흑자입니다.

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
- 버그 수정 비용은 단계마다 단절적으로 뛰어 오릅니다(1× → 1,000×). cosim은 그 비탈을 거꾸로 올라갑니다.
- cosim은 *driver C 코드와 RTL을 같은 프로세스에 결합*해 cycle-accurate 검증을 만듭니다. 다리는 DPI-C·VPI.
- QEMU(functional)·FPGA prototype(가속)과 *대체* 관계가 아닌 *보완* 관계. 각자가 잡는 버그 종류가 다릅니다.
- NPU·chiplet·open-source SoC에서 이미 표준 도구로 자리잡았고, 안전 표준에서도 조기 검증 자료로 인용되기 시작했습니다.
- 도입 비용은 1회성이고, 이후 모든 chip generation에 재사용됩니다.

## 다음 장 예고

다음 장에서는 cosim의 *언어*에 해당하는 **SystemVerilog DPI-C**를 다룹니다. import/export 선언, data type 매핑, context vs pure function의 의미, simulator별 차이까지. driver C 코드가 RTL과 어떻게 손을 잡는지를 가장 낮은 층에서 봅니다.

## 관련 항목

- [Ch 2: SystemVerilog DPI-C 기초](/blog/tools/emulation/driver-cosim/chapter02-dpi-c-basics)
- [QEMU Fake Device Driver](/blog/tools/emulation/qemu-fake-device/chapter01-overview) — functional 모델로 driver 개발
- [FPGA Driver via QEMU+VFIO](/blog/tools/emulation/qemu-fpga-driver/chapter01-fpga-driver-challenge) — QEMU와 실 FPGA를 4-step으로 잇기
- [CXL 4.0 Spec Full Review](/blog/embedded/hardware/cxl-spec/chapter01-overview) — chiplet 인터커넥트의 검증 시나리오
