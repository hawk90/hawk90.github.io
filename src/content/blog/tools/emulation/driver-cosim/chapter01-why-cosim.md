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

칩이 silicon으로 나오기 전에 그 칩용 driver를 *어떻게 검증하는가*. 이 질문이 이 시리즈의 출발점입니다. NPU·chiplet·SoC 프로젝트에서 driver 팀이 RTL과 병행해 개발해야 하는 시점에는 실행할 silicon이 없을 수 있습니다. 그 사이에 driver를 *어디서* 돌려 보고 *무엇으로* 검증할지가 실전 문제입니다.

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
| Post-silicon | 실 chip + 보드 | 사용 가능한 silicon·보드 도착 후 | 수정 경로가 firmware 우회·ECO·재제작 중 무엇인지 확인 |
| FPGA prototype | Xilinx VCU/U250 등 | RTL 동결 후 합성 가능 시점 | 하드웨어·합성 시간 비쌈, 보드 공유 |
| Functional model | QEMU·SystemC fast model | RTL과 동시 진행 가능 | transaction·기능 모델로 상위 stack 검증; 모델 범위는 구현에 따름 |

이 세 가지가 채우지 못하는 *cycle-accurate + driver-integrated* 검증 구간이 cosim의 영역입니다.

## 먼저 검증할 경계와 증거

버그 수정 비용은 제품·계약·수정 가능성에 따라 달라집니다. 출처 없는 1배/1000배 비용표 대신 지금 관찰할 수 있는 실패를 각 모델의 책임에 연결합니다.

| 경계 | 주입할 실패 | 남길 관찰 | 이 관찰만으로 알 수 없는 것 |
| --- | --- | --- | --- |
| MMIO encoding | 틀린 offset·reserved bit | 요청 trace와 실제 register 변화 | 물리 bus timing·cache ordering |
| IRQ | 다른 bit가 이미 켜진 동안 새 bit 설정 | cycle별 pending mask와 ISR 순서 | 실제 interrupt controller와 OS 진입 |
| DMA | 범위 초과·잘못된 descriptor | BFM 응답 오류와 buffer 변화 | IOMMU/cache 일관성·실제 bandwidth |
| reference | 비대칭 입력·overflow | 독립 golden vector와 오류 정책 | 동일 reference를 공유한 공통 bug |

RTL·software·BFM의 revision과 simulator/compiler 옵션을 함께 고정해야 실패를 재현할 수 있습니다. host 단위 검증, RTL simulation, Linux 통합, board 실험은 서로 다른 증거 단계로 기록합니다.

## Cosim이란 무엇인가

**Co-simulation**은 하나의 simulation 안에서 *서로 다른 모델*이 함께 동작하는 환경을 가리킵니다. 우리 맥락에서는 보통 두 모델이 결합합니다.

- **RTL** — Verilog/SystemVerilog로 기술된 silicon-bound 디자인. cycle accurate.
- **Software** — driver C 코드, firmware, 또는 그 둘의 일부. host CPU에서 실행.

둘 사이의 다리는 **DPI-C**(Direct Programming Interface, SystemVerilog LRM 표준)와 **VPI**/VHPI 같은 simulator hook입니다. 공유 가능한 driver 핵심의 MMIO 추상 함수를 BFM transaction으로 바꾸고, RTL의 interrupt 신호를 harness가 ISR callback에 전달하도록 설계할 수 있습니다. Linux kernel module 자체가 host 프로세스에서 그대로 실행되는 것은 아닙니다.

| 구성 요소 | 역할 |
|-----------|------|
| RTL (Verilator C++ 클래스) | clock·reset·signal toggle — cycle-accurate |
| Driver C 코드 | `writel/readl` MMIO 접근 |
| DPI-C bridge | driver의 함수 호출을 RTL의 wire access로 |
| IRQ injection thread | RTL의 `irq` pin이 driver thread를 깨움 |
| Test runner (pytest) | scenario·assertion·waveform 수집 |

위 in-process 구성에서는 driver 핵심과 RTL 모델이 한 프로세스에서 연결됩니다. 다른 cosim은 IPC·socket·별도 CPU/OS 모델을 사용할 수도 있으므로 같은 프로세스가 cosim 정의의 필수조건은 아닙니다. 어떤 register write가 어떤 internal signal을 토글했는지가 waveform에 그대로 찍힙니다. 재현 가능한 testbench가 만들어집니다.

## 다른 방법과 어떻게 다른가

cosim의 자리가 보이려면 인접 방법들과 비교해 봐야 합니다.

### QEMU vs Cosim

QEMU는 *functional model*입니다. 디바이스 모델은 "이 register write가 도착하면 internal state를 이렇게 바꿔라"라는 의미적 동작을 묘사하지, 그 동작이 어떤 cycle에 어떤 internal signal을 거쳐 일어났는지는 다루지 않습니다.

| 항목 | QEMU device model | Cosim (RTL + driver) |
|------|--------------------|----------------------|
| 정확도 | functional (event 단위) | cycle-accurate |
| 속도 | CPU/device 모델·workload에 의존 | RTL 크기·trace·compile 옵션·workload에 의존 |
| 검증 대상 | driver API · OS 통합 · 상위 stack | driver-RTL boundary · timing |
| RTL 필요 | device 기능 모델이면 불필요 | RTL을 검증하는 이 구성에서는 필요; 합성 불가능 testbench도 사용 가능 |
| 가장 잘 잡는 버그 | API 오용 · 자료구조 · concurrency | register encoding · IRQ timing · DMA race |

cosim은 QEMU를 *대체*하지 않습니다. *보완*합니다. QEMU로는 OS 통합·user-space API를 검증하고, cosim으로는 register-level 인터페이스의 cycle-accurate 동작을 검증합니다.

### FPGA prototype vs Cosim

FPGA prototype은 RTL을 *실제 게이트에 합성*해 보드에서 돌립니다. 속도가 빠르고(MHz 영역) 실 system bandwidth로 test 가능합니다. 그러나 합성 시간이 길고(수십 분~시간), 보드 수가 적어 공유 병목이 생기며, internal signal에 직접 접근하기 어렵습니다.

RTL simulation 속도는 설계와 옵션에 따라 달라집니다. trace 설정으로 선택한 signal을 waveform에 남길 수 있고, **CI에 그대로 통합**되며, **bitstream 같은 가공 비용 없이** 코드 push마다 돌릴 수 있습니다.

| 항목 | FPGA prototype | Cosim |
|------|-----------------|-------|
| 속도 | mapping·clock constraint·환경에 의존 | RTL·host·옵션·trace에 의존 |
| Internal observability | probe·capture 설정 필요 | trace/public 설정·최적화·보호된 IP 범위에 의존 |
| Iteration time | 수십 분(합성) | 분(컴파일) |
| CI 친화도 | 낮음 | 높음 |
| 비용 | 보드 + 라이선스 | open-source 가능 |

두 도구는 보완 관계입니다. **cosim에서 빠른 iteration으로 큰 버그를 잡고**, **FPGA에서 long-running stress와 throughput을 본다**는 분담이 일반적입니다.

### Post-silicon vs Cosim

Post-silicon은 진짜입니다. 모든 변수가 정확합니다. 그러나 도착했을 땐 RTL이 *동결*되어 있고, register encoding 같은 근본적 실수는 metal spin 외에 고칠 길이 없습니다. cosim의 목적은 *그 단계에서 발견될 버그를 그 이전으로 끌어오는 것*입니다.

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

2026-10-22 확인은 위 문서와 시리즈 예제의 계약 검토입니다. 이 도입 글에서 실제 RTL·Linux·board 실행이나 도입 비용을 측정하지 않았습니다.

## 관련 항목

- [Ch 2: SystemVerilog DPI-C 기초](/blog/tools/emulation/driver-cosim/chapter02-dpi-c-basics)
- [Ch 8: 통합 검증 경계](/blog/tools/emulation/driver-cosim/chapter08-end-to-end) — host 계약과 RTL·OS 검증의 구분
