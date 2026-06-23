---
title: "Ch 1: FPGA Driver 개발의 과제"
date: 2026-05-17T01:00:00
description: "실 보드 없이도 driver 검증 — QEMU + VFIO 워크플로 개관."
tags: [QEMU, fpga, driver, vfio, workflow]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 1
draft: true
---

FPGA driver 개발의 진짜 어려움은 *코드 자체*가 아니라 *환경*에 있습니다. 보드 한 대를 여러 명이 시간대를 나눠 쓰고, bitstream은 자주 바뀌며, 로그는 dmesg 한 줄에 그치고, 시스템이 lock-up되면 재현조차 어렵습니다. 이 시리즈는 그 환경 문제를 푸는 *4단계 워크플로*를 다룹니다 — QEMU에 가짜 FPGA를 만들어 driver를 작성하고, 실 FPGA가 도착하면 VFIO로 그대로 옮기는 흐름.

이 첫 장은 시리즈 전체의 동기와 단계, 대상 하드웨어, 구성 챕터를 한 번에 살펴봅니다.

## FPGA driver 개발 환경의 현실

datacenter에서 FPGA를 쓰는 팀이 매일 마주치는 문제들.

| 어려움 | 결과 |
|--------|------|
| 보드 1대를 여러 명·여러 시간대 공유 | 작업 시간 충돌, 보드 lock 큐 |
| bitstream 변경 시 *수십 분* 합성 | iteration cycle이 일 단위 |
| dmesg 외 로깅 거의 없음 (JTAG 별도) | 디버깅 단서 부족 |
| Lock-up 시 재현 어려움 | 전원 사이클 후에야 복구, race condition 잡기 힘듦 |
| CI 자동화 거의 불가능 | 회귀 테스트가 사실상 수동 |

이런 환경에서 driver 코드를 *처음부터 실 보드에서* 개발하는 건 비효율적입니다. 그러나 *완전히 다른* simulation 환경에서 코드를 짜면 실 보드 도착 후 *전체 다시* 작성해야 하는 위험이 있고요. 둘 사이의 균형이 시리즈의 핵심 질문입니다.

## 4-step 워크플로

이 시리즈가 제안하는 단계.

| 단계 | 도구 | 목적 |
|------|------|------|
| **1. Driver dev** | QEMU + fake FPGA model | driver 작성·단위 테스트, 보드 없이 |
| **2. Passthrough** | VFIO-PCI + 실 FPGA | 같은 driver를 VM에서 실 보드에 |
| **3. Sharing** | SR-IOV·mdev | 한 FPGA를 여러 VM·tenant가 공유 |
| **4. Coherent** | CXL.cache·CCI-P | FPGA가 host cache에 직접 참여 |

핵심은 **단계마다 driver 코드를 *재활용*한다**는 점입니다. fake FPGA의 register layout을 실 FPGA shell(Xilinx XDMA·Intel HSSI)과 *호환되게* 만들면, driver는 거의 그대로 step 2로 넘어갑니다. step 3·4는 driver 자체보다는 *환경 변경*입니다.

## 시리즈 구성

| 장 범위 | 주제 |
|---------|------|
| Ch 1~2 | 동기·아키텍처 review |
| Ch 3~8 | QEMU fake FPGA 만들기·driver 작성 |
| Ch 9~10 | VFIO 기초와 PCI passthrough |
| Ch 11~13 | SR-IOV·mdev·OPAE·XRT 같은 vendor framework |
| Ch 14 | CXL.cache로 가는 미래 |

각 장은 "어떤 문제를 푸는가 → 어떻게 동작하는가 → 코드 예시 → 정리" 흐름을 따릅니다.

## 대상 FPGA

본 시리즈가 가정하는 하드웨어.

- **Xilinx Alveo U200/U250/U280** — datacenter PCIe 카드
- **Xilinx Versal VCK5000** — FPGA + AI Engine, Versal 세대
- **Intel PAC N3000/D5005/IPU** — Intel Programmable Acceleration Card
- **AWS F1/F2** — 클라우드 FPGA (UltraScale+ / Trenz)

driver 개발 관점에서 셋의 공통점이 많습니다 — PCIe + shell + user logic 3-layer 구조, DMA descriptor ring + IRQ, partial reconfiguration. 시리즈는 그 *공통점*에 집중하고, vendor-specific 부분은 Ch 12(OPAE) / Ch 13(XRT)에서 따로 다룹니다.

## Application 시나리오

FPGA driver가 실제로 어디서 동작하는지.

| 도메인 | 예 |
|--------|-----|
| AI 가속 | NPU 가속기, transformer attention kernel |
| 항공우주 | flight control board, sensor fusion |
| 자율주행 | lidar/radar preprocessing |
| 금융 | HFT low-latency engine, FIX-protocol offload |
| 통신 | smartNIC, 5G fronthaul |
| 시뮬레이션 | EDA·반도체 검증 |

이 모든 도메인이 "*보드 없이 driver를 시작하고, 보드 도착 후 같은 코드를 옮기는*" 흐름의 혜택을 봅니다.

## 워크플로 한눈에 보기

step 1에서 step 2로 넘어가는 가장 인상적인 장면을 미리 봅시다.

```bash
# Step 1 — 가짜 FPGA로 driver 개발 (보드 없음)
qemu-system-x86_64 -enable-kvm -m 4G \
    -device fake-fpga,id=fpga0 \
    -kernel vmlinuz -initrd initrd
# guest 안: insmod my_fpga_driver.ko && dmesg
# → driver 로직 검증, 단위 테스트, CI 통합
```

```bash
# Step 2 — 실 FPGA 도착 후 (driver 코드 그대로)
echo 0000:01:00.0 > /sys/bus/pci/drivers/xilinx_xocl/unbind
echo 0000:01:00.0 > /sys/bus/pci/drivers/vfio-pci/bind

qemu-system-x86_64 -enable-kvm -m 4G \
    -device vfio-pci,host=01:00.0 \
    -kernel vmlinuz -initrd initrd
# guest 안: 같은 driver 사용
```

이 두 명령의 *유일한 차이*는 `fake-fpga` → `vfio-pci,host=...`뿐입니다. driver 자체는 *변경 없음*.

## 시리즈의 unique value

한국어로 *fake → passthrough → SR-IOV → CXL* 4단계를 *한 흐름으로* 묶은 자료가 없습니다. 영어로도 단편적 자료(Intel 블로그 + Xilinx 백서 + Linux 문서)를 짜깁기해야 합니다. 이 시리즈는:

- *동기-아키텍처-구현-검증*을 한 자리에 모음
- 각 단계의 *코드*를 실제로 돌릴 수 있는 형태로 제공
- vendor lock-in 없이 *공통점* 중심으로 설명
- 마지막에 *CXL coherent FPGA*까지 전망

자가용으로 학습하든, 팀 onboarding 자료로 쓰든 14장의 흐름을 따라가면 됩니다.

## 정리

- FPGA driver 개발은 *코드*보다 *환경*이 문제입니다 — 보드 부족·합성 시간·로깅 한계·재현성·CI 부재.
- 4-step 워크플로: **QEMU fake → VFIO passthrough → SR-IOV/mdev → CXL coherent**.
- 핵심은 driver 코드의 *재활용*. fake의 register layout을 실 FPGA와 호환되게 만들면 step 2 이후 driver 무수정.
- Xilinx Alveo·Versal·Intel PAC·AWS F1을 *공통 패턴*으로 다루고 vendor-specific은 OPAE(Ch 12)·XRT(Ch 13)에서.
- AI 가속·항공우주·자율주행·HFT·통신 모든 도메인에 적용 가능.
- 한국어로 4단계를 한 흐름에 묶은 첫 자료를 목표로 합니다.

## 다음 장 예고

다음 장에서는 *FPGA 자체의 driver 관점 아키텍처*를 review합니다. PCIe endpoint, shell, user logic의 3-layer 구조와 AXI protocol family — driver가 *무엇을 보게 되는지*를 정리합니다.

## 관련 항목

- [Ch 2: FPGA 아키텍처 Review](/blog/tools/emulation/qemu-fpga-driver/chapter02-fpga-architecture)
- [QEMU Fake Device Driver](/blog/tools/emulation/qemu-fake-device/chapter01-overview) — fake device 만들기 기초
- [Driver-RTL Co-simulation](/blog/tools/emulation/driver-cosim/chapter01-why-cosim) — pre-silicon 검증 인접 영역
- [PCIe Deep Dive](/blog/embedded/hardware/pcie/chapter01-fundamentals) — PCIe 기초
