---
title: "CXL Link Training 디버깅 — LTSSM 상태와 Protocol Analyzer 활용"
date: 2026-06-18T09:01:00
description: "CXL 링크가 안 올라올 때 LTSSM 상태 분석, Protocol Analyzer 캡처, lspci·cxl-cli·dmesg 진단 흐름."
series: "Embedded Debugging"
seriesOrder: 8
tags: [cxl, link-training, ltssm, protocol-analyzer, debugging]
draft: false
---

## 왜 어려운가

CXL 링크 문제는 *원인이 여러 층*에 흩어집니다. PCIe PHY·LTSSM·Flex Bus·CXL 프로토콜·DVSEC·CEDT 어디서든 막힐 수 있고, 각 층의 *진단 도구가 다릅니다*. *링크가 안 올라옴*이라는 한 증상으로 *최소 5가지 원인 후보*가 나옵니다.

이 장은 *증상별 진단 흐름*을 정리합니다.

## LTSSM 상태 — 어디서 멈췄나

LTSSM(Link Training and Status State Machine)이 *L0에 도달*하지 못하면 *config space access 자체가 불가능*합니다. 멈춘 상태가 어디인지를 먼저 알아야 합니다.

```text
[LTSSM 상태 진행]

Detect        ← 슬롯에 디바이스 있는지 확인
  ↓
Polling       ← TS1/TS2 ordered set 교환
  ↓
Configuration ← Lane 번호 정렬, link width 협상
  ↓
L0            ← 정상 동작
  ↓
Recovery      ← 일시 오류, 재training
  ↓
L0s/L1/L2     ← 전력 절감 상태
```

| 멈춘 상태 | 의심 원인 |
|----------|----------|
| Detect | 디바이스 미인식 — 슬롯 불량·디바이스 전원 없음·reset 잘못 |
| Polling | TS1/TS2 못 받음 — PHY 설정 오류·신호 무결성·equalization 실패 |
| Configuration | Lane reverse·width mismatch·polarity 문제 |
| Recovery 반복 | 신호 marginal — eye margin 부족, retimer 필요 |

SoC의 *PCIe controller register*가 *LTSSM_STATE 필드*를 노출합니다. Linux에서:

```bash
$ devmem 0x10000000 32 0x40   # vendor별 offset
0x0000000B   # 11 = L0 도달
0x00000006   # 6  = Configuration 멈춤
```

## Protocol Analyzer 캡처

물리적 디버깅의 *마지막 무기*가 *protocol analyzer*입니다.

| 도구 | 회사 | 가격대 | 용도 |
|------|------|--------|------|
| LeCroy Summit T516 | Teledyne | $$$$ | CXL 2.0 / PCIe 5.0 wire-level |
| ASMedia Probe | ASMedia | $$$ | PCIe 4.0/5.0, retimer 디버깅 |
| Keysight U4154A | Keysight | $$$$$ | 고급 multi-link 동시 캡처 |
| 가짜 device on FPGA | self-built | $$ | CXL.io level만 — production 디버깅에는 한계 |

캡처할 항목:
- *TS1·TS2 ordered set* — Polling 단계 분석
- *Flit 흐름* — CXL.mem M2S·S2M sequence
- *DVSEC negotiation* — 호스트가 CXL 지원 확인하는 메시지

## 호스트 측 진단 명령

```bash
# 1. 디바이스가 PCIe로 보이는지
$ lspci -nn | grep -i cxl
5e:00.0 Memory controller [0508]: ...

# 안 보이면 — LTSSM Detect 단계에서 멈춘 것

# 2. Link 속도/폭 확인
$ lspci -vvv -s 5e:00.0 | grep -E "LnkSta|LnkCap"
LnkCap: Speed 32GT/s, Width x16
LnkSta: Speed 32GT/s, Width x16, TrErr- Train- SlotClk+

# Width 차이가 나면 — Configuration 멈춤

# 3. CXL DVSEC 발견 여부
$ lspci -vvv -s 5e:00.0 | grep -A 5 DVSEC
Capabilities: [60] Designated Vendor-Specific: Vendor=1e98 ID=0000
    Compute Express Link

# 없으면 — CXL 호환 디바이스 아니거나 firmware 문제

# 4. CXL 서브시스템 등록
$ ls /sys/bus/cxl/devices/

# 비어 있으면 — CEDT 누락 또는 cxl_acpi 미로딩
$ dmesg | grep -i cxl
$ lsmod | grep cxl
```

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `lspci`에 안 보임 | LTSSM Detect 실패. 슬롯·전원·reset 점검 |
| `lspci`엔 있는데 cxl 디렉터리 비어 있음 | CEDT 누락 — BIOS 업데이트 |
| Link width x16인데 실측 x4 | Polarity inversion 또는 PHY equalization 실패 |
| LinkSta "Train+" 깜빡임 | Recovery 반복 — eye margin 부족·retimer 필요 |
| `cxl list`엔 보이는데 region 생성 실패 | HDM Decoder 프로그래밍 실패 — UEFI 또는 cxl-cli 권한 |
| Cold boot에 보이는데 warm reboot 안 보임 | PERST# timing 문제 — vendor BSP 패치 |
| CXL.cache 트래픽 없음 | Type 1/2 모드 미협상 — DVSEC config 확인 |
| `dmesg` "AER Bad TLP" | 신호 무결성 또는 BIOS CXL config 오류 |
| `cxl-cli` "no devices" | kernel < 6.0 또는 cxl 모듈 미로딩 |
| Hot-plug 안 됨 | Slot Power Limit 또는 hot-plug 지원 비활성 |

## 디버깅 체크리스트

1. `lspci -nn`에 디바이스 보이는가 → 없으면 LTSSM 멈춤
2. `lspci -vvv`의 LnkSta가 정상인가 → Recovery 반복이면 신호 문제
3. DVSEC이 있는가 → 없으면 CXL 미지원 디바이스
4. `/sys/bus/cxl/devices/`에 등록되었는가 → 비면 CEDT 또는 드라이버 문제
5. `cxl list -RT`로 토폴로지 확인 → 누락 노드 있으면 enumeration 문제
6. Protocol analyzer 캡처 (마지막 수단)

## 정리

- CXL 링크 디버깅은 *원인이 PHY·LTSSM·Flex Bus·DVSEC·CEDT·드라이버* 여러 층에 흩어집니다.
- *LTSSM 상태*를 먼저 확인해 *어느 단계에서 멈췄는지* 파악합니다.
- *lspci → cxl-cli → dmesg* 순으로 *호스트 측 진단*을 진행합니다.
- 신호 무결성 의심이면 *protocol analyzer*가 *마지막 무기*입니다.

## 다음 장 예고

Ch 9 — CXL 디바이스 트러블슈팅. RAS 이벤트·poison list·media error를 추적하는 흐름.

## 관련 항목

- [Ch 2: JTAG·SWD·CoreSight 분석](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight)
- [Bootloader Internals Ch 34: U-Boot PCIe Enumeration](/blog/embedded/bootloader/chapter34-pcie-enumeration)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Modern Embedded Recipes Ch 149: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
