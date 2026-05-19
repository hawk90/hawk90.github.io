---
title: "DDR Memory Deep Dive — Storyboard"
date: 2026-05-19T00:00:00
description: "시리즈 설계 문서 — 챕터별 깊이·다이어그램·코드·레퍼런스 계획"
tags: [DDR, storyboard, internal]
draft: true
---

# DDR Memory Deep Dive — Storyboard

본 문서는 *DDR Memory Deep Dive* 시리즈의 챕터별 설계 문서다. 본문 작성 전에 깊이·범위·다이어그램·코드·레퍼런스를 미리 합의한다.

## 시리즈 목표 (재정의)

기존 챕터들은 헤더만 있고 본문이 `TODO`로 비어 있다. 본 스토리보드는 각 챕터를 다음 기준으로 채운다.

- **분량**: 챕터당 400~600줄 (한국어 산문 + 표 + 코드 + TikZ 다이어그램)
- **깊이 기준**: JEDEC 스펙 인용, 실제 controller IP/PHY IP의 동작, 리눅스 커널 코드 인용, 실무 디버깅 사례
- **시각 자료**: 챕터당 2~5개의 TikZ 다이어그램 (`_design.tex` 시스템 사용)
- **레퍼런스**: JEDEC 표준 문서 번호, Micron/Samsung 데이터시트, Synopsys/Cadence IP 문서, 커널 소스 경로

## 챕터별 스토리보드

각 챕터의 ✦ 표시는 *반드시 다룰* 핵심 토픽, ◦ 는 *깊이 더할* 보조 토픽.

### Ch 1: 아키텍처 — 셀, Bank, Row, Column, Rank

**의도**: 메모리 계층의 물리적 구조를 정확히 그린다. 이후 모든 챕터의 토대.

- ✦ DRAM 셀(1T1C) 회로 — capacitor + access transistor, leak·refresh 동기
- ✦ Sense Amplifier 동작 — Bitline precharge → ACT → row buffer
- ✦ Mat / Subarray 구조 (실제 die 내부 분할)
- ✦ Bank / Bank Group / Rank / Channel 계층, 각 계층의 병렬도
- ✦ Burst, 데이터 폭(x4/x8/x16) — chip 단위 vs DIMM
- ✦ 주소 매핑 — Physical → (Ch, Rank, BG, Bank, Row, Col) bit field
- ◦ DDR4 vs DDR5 die 구조 비교
- ◦ 3DS / HBM 적층 (간단히)

**다이어그램** (4)
1. 1T1C 셀 회로 + 충전/방전 곡선
2. Bank 내부: row buffer + sense amp 어레이
3. Rank / DIMM / Channel 계층
4. 주소 비트 분해 다이어그램 (예: 64GB DDR4 ECC RDIMM)

**코드**: 주소 매핑 계산 예시 (C, 비트 시프트)
**레퍼런스**: JESD79-4 §4.1, Micron TN-46-12

---

### Ch 2: 명령 — ACT / RD / WR / PRE / REF

**의도**: DRAM이 받는 모든 기본 명령의 전기·논리 동작.

- ✦ ACTIVATE — bank state 전이, tRCD 시작
- ✦ READ / WRITE — column 명령, BL8/BL16, AP 옵션
- ✦ PRECHARGE — auto-PRE vs explicit
- ✦ REFRESH — distributed vs burst, REFab/REFsb (DDR5)
- ✦ Mode Register Set (MRS) — 명령 인코딩 한 표
- ◦ Per-DRAM Addressability (DDR4 RDIMM)
- ◦ ZQCL / ZQCS calibration 명령
- ◦ Bank state machine 전이도

**다이어그램** (4)
1. Bank state machine (Idle / Active / Read / Write / Precharging / Refresh)
2. 명령 인코딩 표 — CKE / CS_n / RAS_n / CAS_n / WE_n
3. ACT → RD 시퀀스 파형 (CK, CMD, ADDR, DQS, DQ)
4. REFRESH 동작 (all-bank vs same-bank)

**코드**: 명령 시퀀스 인코딩 (Verilog snippet 인용)
**레퍼런스**: JESD79-4 §4.6, JESD79-5 §4

---

### Ch 3: 기본 타이밍 — tCL / tRCD / tRP / tRAS

**의도**: 가장 자주 보는 4개 타이밍의 *시간 흐름 그림*.

- ✦ tCL (Column Access) — CAS Latency, 클럭 vs 시간
- ✦ tRCD (Row to Column) — ACT 후 첫 RD/WR 가능 시점
- ✦ tRP (Row Precharge) — PRE 후 다음 ACT 가능 시점
- ✦ tRAS (Row Active) — ACT 후 PRE 가능 시점
- ✦ 타이밍 표기 — "CL-tRCD-tRP-tRAS" 16-18-18-36 의미
- ✦ tRC = tRAS + tRP (row cycle)
- ◦ Page Hit / Miss / Empty 시 latency 비교
- ◦ DDR3 vs DDR4 vs DDR5 타이밍 수치 비교

**다이어그램** (3)
1. ACT–RD–PRE–ACT 한 사이클 timing chart (모든 타이밍 마킹)
2. Page Hit/Miss/Empty 시 latency 막대 비교
3. 타이밍 vs 주파수 트레이드오프 (CL 늘면 freq 가능)

**코드**: 메모리 컨트롤러 timing register 설정 예시 (DesignWare uMCTL2 인용)
**레퍼런스**: JESD79-4 §Timing Parameters

---

### Ch 4: 고급 타이밍 — tRFC / tREFI / tWR / tWTR / tRTP / tFAW

**의도**: refresh + write·read 간 race.

- ✦ tRFC — refresh 사이클 시간, density에 따라 증가
- ✦ tREFI — 평균 refresh 간격, 평균 64ms / # rows
- ✦ tWR — write recovery, 마지막 데이터 도착 후 PRE까지
- ✦ tWTR — write→read 전환, BL과 무관한 고정 시간
- ✦ tRTP — read→precharge, in-flight read 보호
- ✦ tFAW — 4-activate window, 전류 제한 (소비전력)
- ◦ Refresh management — RFM 명령 (DDR5 Row Hammer 대응)
- ◦ Postponing refresh (deferred), refresh 누적 한계
- ◦ Fine Granularity Refresh (2x / 4x)

**다이어그램** (3)
1. tRFC 동안 bank 상태 (전체 bank busy)
2. tWTR 시퀀스 — write 종료 → preamble → read
3. tFAW window — 4개 ACT 카운트

**코드**: tREFI 자동 계산 (Python, density 별)
**레퍼런스**: JESD79-4 §13, JESD209-5 §LPDDR5 refresh

---

### Ch 5: 초기화 — Power-up 시퀀스, MRS, ZQ Cal

**의도**: 부팅 시 BIOS/부트로더가 DDR을 어떻게 깨우는지.

- ✦ Power-up 전원 ramp 순서 (VDD, VDDQ, VPP, VTT)
- ✦ Reset_n 해제 → CKE 진입 → MRS 시퀀스
- ✦ Mode Register 0~6 (DDR4) / 0~13 (DDR5) 핵심 필드
- ✦ ZQ Calibration — long (ZQCL) vs short (ZQCS), 240Ω 기준
- ✦ Training의 순서 (CA → Write Leveling → Read DQS → Per-bit)
- ◦ LPDDR4/5 초기화 차이 (no CK during reset, etc.)
- ◦ BIOS·U-Boot·EDK2의 DDR init 책임

**다이어그램** (3)
1. Power-up 시퀀스 timeline (전원 / 클럭 / CKE / 명령)
2. MRS 명령 인코딩 표 (DDR4 MR0~MR6)
3. ZQ Calibration 회로 (ZQ 핀, 240Ω, RTT/RON 보정)

**코드**: U-Boot의 DDR init 코드 인용 (e.g., `drivers/ddr/fsl/`)
**레퍼런스**: JESD79-4 §3.3 Initialization

---

### Ch 6: Write Leveling

**의도**: DQS-CK skew 보정. PHY 트레이닝의 첫 단계.

- ✦ T-topology vs Fly-by — fly-by가 write leveling을 강제하는 이유
- ✦ Write Leveling 동작 — DQ에 CK 상태 샘플 후 returnedQS
- ✦ Coarse + Fine 두 단계, delay-line 1 step = ~5ps
- ✦ Per-byte 독립 보정 (DQ8 단위)
- ✦ MR1 / MR2 활성 비트, 진입·종료 시퀀스
- ◦ Write Leveling 실패 케이스 (DQS noise, bad routing)
- ◦ DDR5 differential DQS 차이
- ◦ Loopback mode 활용

**다이어그램** (3)
1. T-topology vs Fly-by 비교 (CK arrival time)
2. Write Leveling 회로 — flip-flop, DQ readback
3. Delay-line 보정 (coarse / fine step)

**코드**: Synopsys uPHY trainer write leveling FSM (의사 코드)
**레퍼런스**: JESD79-4 §5.6, Synopsys DesignWare uPHY databook

---

### Ch 7: Read Training — DQS Gate / Centering / Per-bit

**의도**: 가장 복잡한 PHY 트레이닝. 3단계 break-down.

- ✦ DQS Gate Training — 어디부터 DQS를 “듣기” 시작할지
- ✦ Read Leveling (DQS centering) — eye 중앙 sampling
- ✦ Per-bit Deskew — DQ 8개 비트의 개별 보정
- ✦ Vref Training (DDR4 from MR6)
- ✦ MPR (Multi-Purpose Register) 패턴 활용
- ◦ Read DBI (Data Bus Inversion) 활성 시 영향
- ◦ Temperature 변화 → periodic retraining
- ◦ Read DLL (Delay Lock Loop)

**다이어그램** (4)
1. DQS Gate window — too-early / too-late / ok
2. Eye diagram + DQ-DQS centering 시각화
3. Per-bit skew — 8 비트 시간 어긋남
4. Vref sweep + BER 곡선

**코드**: Read training 알고리즘 의사 코드 (binary search delay)
**레퍼런스**: JESD79-4 §6.6, JESD79-4A errata

---

### Ch 8: CA Training (LPDDR 중심)

**의도**: LPDDR4/5의 추가 트레이닝, command/address도 트레이닝 필요.

- ✦ DDR vs LPDDR CA 인터페이스 차이 (SDR vs DDR)
- ✦ CA Training Mode 진입 (FSP 진입과 함께)
- ✦ CA Training 패턴 — 마치 Read Training처럼 eye 찾기
- ✦ Vref(CA) Training — DDR5 server에도 도입
- ◦ FSP1/FSP2 dual frequency, 동시 보정
- ◦ DRAM 측 CA buffer 동작

**다이어그램** (2)
1. LPDDR CA bus + chip select 토폴로지
2. CA eye + Vref 2D sweep

**코드**: CA training 의사 코드
**레퍼런스**: JESD209-5 §LPDDR5 CA training

---

### Ch 9: ECC — SECDED / ChipKill / On-die ECC

**의도**: 메모리 신뢰성. 코드 단위·시스템 단위·DRAM 내부 단위.

- ✦ SECDED Hamming + parity — 72/64 비트 (DIMM ECC)
- ✦ ChipKill (Intel SDDC / IBM Chipkill) — bus 단위 보정
- ✦ On-die ECC (DDR5) — internal SECDED, hidden from controller
- ✦ Memory Scrubbing — patrol / on-demand
- ✦ MCA (Machine Check Architecture) 보고 경로
- ◦ Page Retire, Bad Page Offlining
- ◦ Reed-Solomon based codes
- ◦ Row Hammer + RFM

**다이어그램** (3)
1. SECDED 72/64 — parity matrix
2. ChipKill 동작 (one DRAM down)
3. ODECC 흐름 — DRAM 내부 보정, MR로 syndrome 노출

**코드**: SECDED 인코더/디코더 (C 비트 연산)
**레퍼런스**: JESD79-5 §On-die ECC, IBM Chipkill paper

---

### Ch 10: 전력 관리

**의도**: Power-Down / Self-Refresh / LPDDR 저전력 모드 정리.

- ✦ Active Power (IDD) breakdown — IDD0 ~ IDD7
- ✦ Power-Down Mode (CKE=L during idle)
- ✦ Self-Refresh — DRAM 내부 timer 사용
- ✦ LPDDR Active / Idle / Self-Refresh / Deep-Power-Down
- ✦ Dynamic Voltage/Frequency Scaling — VDDQ training point
- ◦ DDR5 PMIC — DIMM 위에서 1.1V 생성
- ◦ Temperature compensated refresh
- ◦ Per-DIMM power gating

**다이어그램** (3)
1. IDD 상태별 막대 그래프 (실제 수치)
2. Self-Refresh 진입/탈출 시퀀스
3. LPDDR 상태 머신

**코드**: 리눅스 cpuidle 연관 메모리 PD trigger
**레퍼런스**: JESD79-4 §IDD specifications, JEP106

---

### Ch 11: 컨트롤러 — Arbiter / Scheduler / Interleaving

**의도**: 컨트롤러 IP 내부 — 요청 들어와서 명령 나가기까지.

- ✦ Front-end (AXI/CHI/AMBA) + 요청 큐
- ✦ Arbiter — multi-master QoS
- ✦ Read/Write Reorder Buffer, conflict detection
- ✦ Command Scheduler — FR-FCFS, page-hit aware
- ✦ Address Interleaving — channel / rank / bank
- ✦ Bank parallelism 활용 (4·8개 bank 동시 추적)
- ✦ Open-page vs Close-page policy + auto-precharge
- ◦ Read·Write switching minimization (turnaround penalty)
- ◦ Bandwidth budget · pressure based scheduling
- ◦ Refresh 스케줄링 — postpone / pullin

**다이어그램** (5)
1. 컨트롤러 블록 다이어그램 (front-end / queue / scheduler / PHY)
2. FR-FCFS 의사 흐름
3. Address interleaving 비트 매핑 (XOR hash 예시)
4. Page-hit vs miss latency 비교
5. Read/write turnaround 비용

**코드**: Synopsys uMCTL2 register 설정 예시 (DBICTL, SCHED), Linux `drivers/memory/`
**레퍼런스**: Synopsys DesignWare uMCTL2 databook, Cadence Denali

---

### Ch 12 (NEW): PHY 아키텍처 — Digital / Analog 블록

**의도**: 컨트롤러 ↔ DRAM 사이의 PHY IP를 깊이 본다.

- ✦ Digital PHY: control logic, training FSM, FIFO, BIST
- ✦ Analog PHY: IO 드라이버·리시버, DLL, PLL
- ✦ Clock distribution — root clock → fan-out → per-byte
- ✦ DLL (Delay Locked Loop) — duty cycle correction, deskew
- ✦ PLL (Phase Locked Loop) — frequency synthesis
- ✦ PHY Floorplan (digital core 가운데, analog 바깥)
- ◦ DRAM-PHY-controller 클럭 도메인 (CK·DfiClk·HclkAxi)
- ◦ PHY IP 벤더 — Synopsys uPHY, Cadence DDR PHY, Rambus

**다이어그램** (4)
1. PHY 블록 다이어그램 (digital · analog · IO)
2. Clock tree — PLL → octant → byte lane
3. DLL fine/coarse delay line
4. PHY floorplan (top-down view)

**코드**: PHY 트레이닝 FSM 의사 코드 (Verilog snippet)
**레퍼런스**: Synopsys DDR PHY databook, IEEE ISSCC papers

---

### Ch 13 (NEW): DFI — DDR PHY Interface

**의도**: 컨트롤러 ↔ PHY 표준 신호 규격.

- ✦ DFI 5.0 spec — Command, Write, Read, Status 채널
- ✦ Phase-based 신호 (dfi_phase) — 2:1, 4:1 ratio
- ✦ dfi_init_start / dfi_init_complete 핸드셰이크
- ✦ Read/Write 데이터 phase 매핑
- ✦ Update / Calibration interface (LP-DDR PHY pin update)
- ✦ Low Power 인터페이스 — dfi_lp_*
- ◦ DFI 5.1 / 5.2 추가 사항
- ◦ Vendor-specific extensions

**다이어그램** (3)
1. DFI 채널 별 핀 그룹 (Command / Write / Read / Status / LP)
2. dfi_phase 2:1 시각화 — 1 ctrl clock = 2 PHY clocks
3. Read data return — dfi_rddata_valid + dfi_rddata

**코드**: 간단한 DFI Master verilog (의사 코드)
**레퍼런스**: DFI 5.0 specification (Cadence/Synopsys/Micron joint)

---

### Ch 14 (NEW): Signal Integrity — DQ/DQS / Eye / ODT / DBI

**의도**: PHY 출력 이후의 보드 신호 무결성.

- ✦ DQ/DQS 차동 신호 — preamble, postamble
- ✦ Eye Diagram — 측정 방법, mask
- ✦ ODT (On-Die Termination) — write/read 별 RTT 값
- ✦ ZQ Calibration → RON/RTT 결정
- ✦ DBI (Data Bus Inversion) — write/read 모두, transition 최소화
- ✦ ISI (Inter-Symbol Interference), CTLE / DFE (DDR5)
- ◦ Cross-talk between DQ lanes
- ◦ PCB routing 가이드 — length-matching, via stitching
- ◦ Channel modeling (S-parameter) 간단 소개

**다이어그램** (5)
1. DQ/DQS preamble/postamble
2. Eye diagram + mask 통과 / 실패
3. ODT 회로 — switched RTT, controller가 enable
4. DBI 동작 — 9비트로 8비트 인코딩
5. DFE 회로 (DDR5) — equalizer block

**코드**: SPICE/IBIS 모델 호출 예시 (개념적), PHY DBI enable register
**레퍼런스**: JESD79-5 §Signal Integrity, IEEE 802.3 SI 논문

---

### Ch 15 (renumber): 리눅스 메모리 관리

**의도**: mm/ 서브시스템 — 가상 페이지 → 물리 DDR로 닿는 경로.

- ✦ Zone (DMA / Normal / Highmem) — DDR vs IO
- ✦ Buddy Allocator + per-CPU page lists
- ✦ NUMA — node 간 latency, autobinding
- ✦ Page Migration · Compaction
- ✦ Memory Hot-plug — DIMM 추가/제거
- ◦ ZONE_MOVABLE, CMA (Contiguous Memory Allocator)
- ◦ THP (Transparent Huge Pages) 관계

**다이어그램** (3)
1. 가상 → 물리 → DDR controller 경로
2. NUMA topology + interconnect latency
3. Buddy allocator order 트리

**코드**: `mm/page_alloc.c`, `mm/numa.c` 핵심 함수 인용
**레퍼런스**: kernel.org mm doc, ULK 책

---

### Ch 16 (renumber): 리눅스 EDAC — 에러 보고

**의도**: 메모리 에러가 발생하면 OS가 어떻게 알리고 기록하는지.

- ✦ MCA / MCE → EDAC subsystem 경로
- ✦ edac_mc 드라이버, CSROW / CHANNEL 매핑
- ✦ correctable / uncorrectable 분류
- ✦ sysfs interface (/sys/devices/system/edac/mc)
- ✦ mcelog / rasdaemon — DIMM 단위 통계
- ◦ Memory Failure Recovery (MCE recovery)
- ◦ Predictive Failure Analysis (PFA)

**다이어그램** (3)
1. MCE flow — DRAM → controller → MCA → IRQ → EDAC
2. CSROW 매핑 — physical row → DIMM slot
3. rasdaemon SQLite 스키마

**코드**: `drivers/edac/edac_mc_sysfs.c` 인용
**레퍼런스**: Linux EDAC Documentation/admin-guide/ras.rst

---

### Ch 17 (renumber): DDR5 차이점 심층

**의도**: DDR4 대비 무엇이 바뀌었는가, 왜.

- ✦ DIMM 내 듀얼 채널 (2×32bit) — burst 16
- ✦ On-die ECC 필수화 — density 증가 + leak 영향
- ✦ DFE / CTLE — Gbps 영역 대응
- ✦ PMIC on-DIMM — 1.1V 자체 생성
- ✦ Same-Bank Refresh (SBR) — bank-level parallelism
- ✦ Refresh Management (RFM) — Row Hammer 대응
- ✦ DCA (Decision Feedback Equalizer Configuration Adapter)
- ◦ DDR5 → CXL.mem (참고)

**다이어그램** (4)
1. DIMM 구조 비교 (DDR4 single 64b vs DDR5 dual 32b)
2. DDR5 ECC 흐름 (controller ECC + on-die ECC stacked)
3. DFE 회로 + open eye 효과
4. RFM 명령 시퀀스

**코드**: DDR5 MRn 인코딩 / PMIC I3C 인터페이스
**레퍼런스**: JESD79-5, Micron DDR5 TN, JEDEC DDR5 Workshop slides

---

### Ch 18 (renumber): 디버깅 — 실패 모드와 대응

**의도**: 실제 보드/시스템에서 메모리 문제 시 무엇을 보는가.

- ✦ 메모리 인식 불가 — SPD 읽기 실패, CA training fail
- ✦ Training fail logs — controller 의 fail counter
- ✦ Intermittent data error — eye 마진 부족, thermal
- ✦ ECC 에러 — CE storm, UE 후 처리
- ✦ Row Hammer — TRR, RFM, mitigation
- ✦ Boot scope: BIOS → OS 이후 trace 확보
- ◦ JTAG / Trace32 로 PHY register 직접 보기
- ◦ Memtester / Memtest86+ 의 패턴

**다이어그램** (3)
1. Boot 시점별 fail 종류 매핑 (POST / Linux boot / runtime)
2. Eye 마진 부족 → BER 증가
3. Row Hammer 동작 + TRR/RFM 대응

**코드**: edac sysfs 디버깅 스크립트, rasdaemon 쿼리
**레퍼런스**: Intel CPU/Memory Errata, AMD PPR documents

---

### Ch 19 (renumber): 레지스터 맵 — Mode Register / SPD

**의도**: 참조용 챕터. 자주 보는 비트 위치 한 자리.

- ✦ DDR4 MR0~MR6 비트 표
- ✦ DDR5 MR0~MR79 (확장) — 새 필드
- ✦ SPD (DDR4 256B, DDR5 1024B) 필드 표
- ✦ SPD 읽기 — i2c, `decode-dimms`
- ◦ XMP / EXPO 영역
- ◦ Vendor-specific (Hub register, RCD)

**다이어그램** (2)
1. DDR4 SPD 256B 맵 (그룹별)
2. MR0 비트 분해 (CL / BL / WR 등)

**코드**: SPD 파싱 Python, MR write 시퀀스
**레퍼런스**: JESD21-C SPD Annex, JEDEC DDR5 SPD Specs

---

## 챕터별 분량 계획

| 챕터 | 목표 줄수 | 다이어그램 | 신규/기존 |
|------|-----------|-----------|----------|
| 1 architecture | 500 | 4 | 기존 |
| 2 commands | 450 | 4 | 기존 |
| 3 timing-basic | 400 | 3 | 기존 |
| 4 timing-advanced | 450 | 3 | 기존 |
| 5 initialization | 500 | 3 | 기존 |
| 6 write-leveling | 500 | 3 | 기존 |
| 7 read-training | 550 | 4 | 기존 |
| 8 ca-training | 400 | 2 | 기존 |
| 9 ecc | 600 | 3 | 기존 |
| 10 power-management | 450 | 3 | 기존 |
| 11 controller | 600 | 5 | 기존 |
| **12 phy-architecture** | **550** | **4** | **신규** |
| **13 dfi** | **450** | **3** | **신규** |
| **14 signal-integrity** | **600** | **5** | **신규** |
| 15 linux-memory | 500 | 3 | 기존(renumber) |
| 16 linux-edac | 450 | 3 | 기존(renumber) |
| 17 ddr5 | 600 | 4 | 기존(renumber) |
| 18 debugging | 550 | 3 | 기존(renumber) |
| 19 register-maps | 400 | 2 | 기존(renumber) |
| **합계** | **~9550줄** | **68** | |

## 신규/리넘버 영향

- 신규 챕터 3편 (ch12 phy-architecture / ch13 dfi / ch14 signal-integrity)
- 기존 ch12~16을 ch15~19로 리넘버
- 내부 cross-link 9곳 갱신

## 작성 순서 권장

1. 스토리보드 사용자 검토·승인
2. 신규 ch12~14(PHY 3편) 작성 — 가장 빠진 부분
3. 리넘버
4. 기존 챕터 깊이 채우기 — 우선순위:
   - ch01 (토대) → ch11 (controller, PHY와 연결) → ch07 (read training, 가장 어려움) → 나머지

## 검증

- 챕터 한 편 작성 후 톤·깊이·다이어그램 양을 사용자에게 보여 OK 받은 뒤 다음 챕터.
- 다이어그램은 `scripts/detect-text-overlap.py`로 overlap 검증.
- 빌드: `npm run diagrams` + 시각 확인.

---

## 레퍼런스 자료

### JEDEC 표준 (1차 출처)

| 문서 | 제목 | 활용 챕터 |
|------|------|-----------|
| JESD79-4D | DDR4 SDRAM | 1–11, 17, 19 |
| JESD79-5C | DDR5 SDRAM | 1, 9, 14, 17, 19 |
| JESD209-5 | LPDDR5 / LPDDR5X | 5, 8, 10, 17 |
| JESD21-C | SPD Specification | 5, 19 |
| JESD82-31 | DDR4 RCD (Registering Clock Driver) | 1, 11 |
| JESD82-505 | DDR5 RCD | 11, 17 |
| JESD250 | NVDIMM-N | (보조) |

JEDEC 문서는 jedec.org에서 무료 다운로드(회원 가입 필요). 항상 *최신 errata 포함 버전*을 사용한다.

### 컨소시엄 표준

- **DFI 5.0 / 5.1 / 5.2** (Synopsys + Cadence + Micron + others 공동) — Ch 13 핵심
- **PIPE 6.0** (간접 참조, PHY 일반 모델) — Ch 12 보조

### 핵심 책 (반드시)

| 책 | 저자 | 활용 |
|------|------|------|
| Memory Systems: Cache, DRAM, Disk | Bruce Jacob, Spencer Ng, David Wang (2008) | DRAM 토대·구조, 컨트롤러 — Ch 1, 3, 4, 11 |
| DRAM Circuit Design: Fundamental & High-Speed Topics | Brent Keeth, R. Jacob Baker (IEEE Press, 2008) | 셀·sense amp·PHY 회로 — Ch 1, 6, 7, 12, 14 |
| High Bandwidth Memory (HBM) Standard | (보조) | 적층 메모리 비교 |

### 벤더 자료 (실전)

| 출처 | 어떤 챕터에서 어떻게 쓰는가 |
|------|---------------------------|
| Micron TN-46-12 (DDR4 Memory Subsystem) | 시스템 통합, ECC — Ch 9, 11 |
| Micron TN-46-32 (Initialization & Training) | 초기화 시퀀스 — Ch 5, 6, 7 |
| Micron Data Sheet (e.g., MT40A1G16) | 실수치 — Ch 3, 4 |
| Samsung DDR5 White Paper | DDR5 PMIC, DFE — Ch 17 |
| SK Hynix DDR5 Brief | 17 |
| Synopsys DesignWare uMCTL2 Databook | 컨트롤러 레지스터 — Ch 11 |
| Synopsys DesignWare uPHY Databook | PHY 트레이닝 FSM — Ch 6, 7, 12 |
| Cadence Denali / DDR Controller IP | 비교용 — Ch 11 |
| Rambus DDR5 PHY brief | Ch 12, 14 |

벤더 데이터시트는 NDA 영역이 많아 공개된 *technical brief* 위주로 인용. 인용 시 출처 명시.

### 학술·산업 논문

- **Onur Mutlu (CMU)** group — Row Hammer, refresh, DRAM scaling. 모든 페이퍼 공개. Ch 4, 9, 17, 18.
- **ISSCC** (International Solid-State Circuits Conference) — DRAM/PHY 회로 매년. Ch 12, 14.
- **DAC / DATE** — 컨트롤러·스케줄러. Ch 11.
- "Mining and Reading DRAM Specifications" (Bains, JEDEC, 2019) — 스펙 해석 가이드.
- "Architecting and Programming Phase-Change Memory" (배경 참고)

### 리눅스 커널

| 경로 | 활용 |
|------|------|
| `Documentation/mm/` | Ch 15 |
| `Documentation/admin-guide/ras.rst` | Ch 16 |
| `drivers/memory/` (controller drivers) | Ch 11 |
| `drivers/edac/` (EDAC core + per-platform) | Ch 16 |
| `mm/page_alloc.c`, `mm/numa.c` | Ch 15 |
| `arch/x86/kernel/cpu/mce/` (MCE 처리) | Ch 16 |

특정 SoC: NXP Layerscape `drivers/ddr/fsl/`, Marvell, Allwinner u-boot DRAM init 코드는 *공개 부트로더* 인용에 유용. Ch 5.

### 분석·디버깅 도구 문서

- Teledyne LeCroy *DDR Detective* — 프로토콜 분석기 docs
- Keysight *DDR Compliance Test Software* — eye 측정
- *memtester*, *memtest86+* — 패턴 알고리즘
- *rasdaemon* — RHEL/Fedora 메모리 RAS daemon

### 강의·발표 (보조 학습)

- Onur Mutlu **Computer Architecture** lectures (YouTube, CMU/ETH)
- JEDEC DDR5 Workshop slides (jedec.org 공개)
- HotChips DRAM/CPU sessions (memory-coherent NIC, CXL.mem 등)

### 인용 원칙

- JEDEC 문서: §, 표 번호까지 명기 ("JESD79-4D §6.6.2 Table 78").
- 책: 챕터·페이지 ("Memory Systems §7.3").
- 데이터시트: 모델명·revision ("Micron MT40A1G16 Rev. F p. 23").
- 코드 인용: 커널 path + 함수명 + 버전 ("`mm/page_alloc.c::__alloc_pages_nodemask`, v6.6").
- 페이퍼: 저자·연도·콘퍼런스 ("Kim et al., ISCA 2014").
