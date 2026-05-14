---
title: "NVMe Deep Dive — Storyboard"
date: 2026-09-01T00:00:00
description: "NVMe 시리즈 설계 문서 — 챕터별 깊이·다이어그램·코드·레퍼런스 계획"
tags: [NVMe, storyboard, internal]
draft: true
---

# NVMe Deep Dive — Storyboard

## 시리즈 목표

현재 17개 챕터가 헤더만 있는 스텁 상태. 본 스토리보드는 각 챕터를 다음 기준으로 채운다.

- **분량**: 챕터당 400~600줄
- **깊이 기준**: NVMe-MI / NVMe Base / NVMe Transport 스펙 인용, 실제 SSD 컨트롤러 동작, 리눅스 NVMe 드라이버 코드, 실무 트러블슈팅
- **시각 자료**: 챕터당 2~5개의 TikZ 다이어그램
- **레퍼런스**: NVMe spec 절·항, Linux `drivers/nvme/`, `nvme-cli` 소스

## 챕터별 스토리보드

### Ch 1: 아키텍처 — Host, Controller, Namespace, Drive

**의도**: NVMe 스택의 전체 그림. AHCI/SATA 대비 NVMe가 무엇을 바꿨는지.

- ✦ AHCI vs NVMe 비교 — single queue vs 64K queues
- ✦ Host ↔ Controller ↔ Namespace ↔ NVM 매체 계층
- ✦ NVMe over PCIe vs NVMe over Fabrics (간단히)
- ✦ Form factors — U.2 / M.2 / EDSFF (E1.S, E3) / Add-in card
- ◦ Controller types — I/O vs Admin vs Discovery
- ◦ Lo Lo Latency (Storage Class Memory) 위치

**다이어그램** (4)
1. AHCI vs NVMe 비교 (queue 수, 명령 latency)
2. NVMe stack — host → driver → controller → media
3. Form factor 사진/실측 비교
4. Multipath topology (single host, dual port)

**코드**: `lsblk -d`, `nvme list` 출력 해석
**레퍼런스**: NVMe Base 2.0 §1, NVMe Transport PCIe §1

---

### Ch 2: Controller — Capability, Status, Property Registers

**의도**: PCIe BAR 안의 컨트롤러 레지스터 맵.

- ✦ CAP — Controller Capabilities (MQES, CSS, Doorbell stride)
- ✦ VS — Version (1.0/1.1/1.2/1.3/1.4/2.0/2.1)
- ✦ INTMS / INTMC — Interrupt mask
- ✦ CC / CSTS — Configure / Status (Reset, Enable)
- ✦ AQA / ASQ / ACQ — Admin queue properties
- ✦ Doorbell registers (SQyTDBL, CQyHDBL)
- ◦ NSSRC — Subsystem reset
- ◦ Boot Partition 영역 (CMBLOC / CMBSZ)

**다이어그램** (3)
1. 컨트롤러 레지스터 맵 (offset, 길이)
2. CC 비트 분해 (EN / SHN / IOSQES / IOCQES / MPS / AMS / CSS)
3. Reset 시퀀스 (CC.EN=0 → CSTS.RDY=0 → reconfigure)

**코드**: `nvme show-regs /dev/nvme0`, `drivers/nvme/host/pci.c` 초기화 함수
**레퍼런스**: NVMe Base §3.1 Controller Registers

---

### Ch 3: Namespace — LBA, NSID, Reservation, NS Mgmt

**의도**: SSD의 논리 분할.

- ✦ Namespace ID (NSID) — 1부터 시작, 0xFFFFFFFF=broadcast
- ✦ LBA Format (LBAF) — Data Size + Metadata Size
- ✦ Namespace Identify Data Structure
- ✦ Namespace Management — Create / Delete / Attach
- ✦ Reservations (SCSI persistent reservation 호환)
- ◦ Multi-path I/O — NS shared across controllers
- ◦ ANA (Asymmetric Namespace Access) — Ch 9 보조
- ◦ Boot partition vs regular NS

**다이어그램** (3)
1. Drive → Controller → NS 트리 (다중 NS)
2. LBA Format 비트 분해 (LBADS, MS, end-to-end protection)
3. Reservation state machine

**코드**: `nvme list-ns`, `nvme create-ns`, `nvme id-ns`
**레퍼런스**: NVMe Base §5 Namespace, NVMe Base §8.8 Reservations

---

### Ch 4: Queue 메커니즘 — SQ / CQ / Doorbell

**의도**: NVMe의 핵심 차별점. 64K queue × 64K depth.

- ✦ SQ Entry 64B, CQ Entry 16B 구조
- ✦ Producer/Consumer 모델 — head/tail, wrap
- ✦ Doorbell — host writes tail, controller writes head
- ✦ Submission → Completion 흐름 step-by-step
- ✦ Interrupt 결합 — MSI/MSI-X, Coalescing
- ✦ Phase Tag — completion 식별
- ◦ Queue allocation (Admin Set Features 0x07)
- ◦ CMB (Controller Memory Buffer) backed queue

**다이어그램** (4)
1. SQ/CQ 링버퍼 + 헤드/테일
2. SQE 64B 비트 분해
3. CQE 16B 분해 (Status Field 포함)
4. Submission → Completion sequence diagram

**코드**: `drivers/nvme/host/core.c` nvme_setup_io_queues, doorbell write
**레퍼런스**: NVMe Base §3.3 Queue Models, §4.1 Submission/Completion

---

### Ch 5: Admin 명령

**의도**: 관리용 17+개 명령.

- ✦ Identify — Controller (CNS=01) / Namespace (CNS=00) / NS List (CNS=02)
- ✦ Get/Set Features — APST, Power State, IRQ Coalescing, Temperature Threshold
- ✦ Get Log Page — SMART/Health, Error Information, Firmware Slot, Telemetry
- ✦ Asynchronous Event Request (AER)
- ✦ Format NVM
- ✦ Firmware Commit / Image Download
- ✦ Namespace Management / Attachment
- ◦ Sanitize, Security Send/Receive
- ◦ Self-Test (Ch 15와 연결)

**다이어그램** (3)
1. Admin 명령 분류 트리
2. Identify Controller Data 4KB 영역도
3. AER 흐름 — controller가 host에게 알림

**코드**: `nvme id-ctrl`, `nvme smart-log`, `nvme set-feature`
**레퍼런스**: NVMe Base §5 Admin Command Set

---

### Ch 6: I/O 명령 — Read / Write / Compare / Dataset Mgmt

**의도**: 실제 데이터 전송 명령.

- ✦ Read / Write — DPTR(PRP/SGL), NLB, FUA, LR
- ✦ Compare — atomicity
- ✦ Write Zeroes — TRIM 대체
- ✦ Dataset Management — Deallocate(TRIM), context attributes
- ✦ Flush — write cache 강제
- ✦ Write Uncorrectable — bad block 표식
- ◦ Verify — read 없이 ECC 검증
- ◦ Copy — same-namespace LBA-to-LBA
- ◦ Zoned Namespace 명령 (Append, Reset Zone)

**다이어그램** (3)
1. Write 명령 SQE 필드 (CDW10~CDW15 의미)
2. Dataset Management Range 구조 (16B 단위)
3. Flush vs FUA 비교

**코드**: `nvme read`, `nvme write`, `nvme dsm` — fio NVMe ioengine
**레퍼런스**: NVMe Base §6 NVM Command Set

---

### Ch 7: PRP vs SGL — Data Transfer 메커니즘

**의도**: 4KB 단위 산재 메모리를 DMA로 어떻게 보내는가.

- ✦ Physical Region Page (PRP) — entry, list, chained list
- ✦ PRP1, PRP2 두 필드의 의미 (1 entry / 2 entries / pointer to list)
- ✦ Page alignment 요구사항
- ✦ Scatter-Gather List (SGL) — Data Block / Bit Bucket / Last
- ✦ SGL descriptor types
- ✦ PRP vs SGL 트레이드오프
- ◦ Address Hints — host LBA prefetch
- ◦ KeyedSGL (NVMe-oF RDMA)

**다이어그램** (4)
1. PRP — single page (PRP1만)
2. PRP — 2 pages (PRP1, PRP2 direct)
3. PRP list (PRP2 → list page)
4. SGL chained descriptors

**코드**: `mm/dma-direct.c` 호출 흐름, NVMe driver PRP 빌드 함수
**레퍼런스**: NVMe Base §4.3 PRP, §4.4 SGL

---

### Ch 8: Completion — Status Field, Error Codes

**의도**: completion entry 읽기 + 에러 분류.

- ✦ CQE 16B — DW0 (cmd specific), DW1 (specific), SQHD, SQID, CID, Status
- ✦ Status Field 분해 — Status Code Type (SCT) + Status Code (SC)
- ✦ Generic Command Status (SCT=0) — Success / Invalid Field / Internal Error
- ✦ Command Specific (SCT=1) — Conflicting Attributes / Invalid Format
- ✦ Media and Data Integrity (SCT=2) — Read Error, Unrecovered Read
- ✦ Path Related (SCT=3) — Path errors (multi-path)
- ✦ Vendor Specific (SCT=7)
- ◦ DNR (Do Not Retry), More bit
- ◦ Phase Tag 토글

**다이어그램** (3)
1. CQE 16B 비트 분해
2. Status Field — SCT/SC 그룹 표
3. CQE → IRQ → driver completion path

**코드**: `nvme_handle_cqe` in driver, error code → errno 매핑
**레퍼런스**: NVMe Base §4.2 Status

---

### Ch 9: Multi-Queue / IRQ — Per-CPU Queue, ANA

**의도**: 64K queue를 어떻게 활용하는가.

- ✦ Per-CPU SQ/CQ pair — locality 보존
- ✦ blk-mq integration
- ✦ MSI-X — per-queue vector, IRQ affinity
- ✦ Polled queues (`io_uring NVMe`, queue_irq_disable)
- ✦ ANA (Asymmetric Namespace Access) — Optimized/Non-optimized/Inaccessible
- ✦ Multi-path — native NVMe MP vs dm-multipath
- ◦ Queue priority (Strict / Round-Robin)
- ◦ Submission Queue WRR Class (Urgent/High/Medium/Low)

**다이어그램** (4)
1. blk-mq → NVMe SQ 매핑
2. Per-CPU queue allocation diagram
3. ANA 상태 전이
4. Multi-path failover

**코드**: `drivers/nvme/host/multipath.c`, `drivers/nvme/host/pci.c` queue init
**레퍼런스**: NVMe Base §8.1 Async I/O Submission Queue Arbitration

---

### Ch 10: Error Handling — Timeout, Retry, AER, Reset

**의도**: 명령 실패·하드웨어 에러·복구.

- ✦ Command timeout — 기본 30s, blk-mq timeout
- ✦ Abort 명령 (host → controller)
- ✦ Reset 단계 — controller reset (CC.EN=0), subsystem reset (NSSR), function-level reset
- ✦ Async Event Notifications — Error, SMART, Notice 등
- ✦ TR/AER 페어링
- ✦ Lockup detection — Watchdog, kernel CPU stalls
- ◦ End-to-End Data Protection (PI Type 1/2/3, DIF/DIX)
- ◦ Sanitize 후 recovery

**다이어그램** (4)
1. Error escalation — soft → controller reset → subsystem reset
2. AER lifecycle (post → event → re-post)
3. End-to-End Protection 데이터 흐름 (8B PI prepend)
4. Timeout → abort → reset sequence

**코드**: `nvme_timeout`, AER handler in driver
**레퍼런스**: NVMe Base §9 Error Recovery, §8.9 Sanitize

---

### Ch 11: 리눅스 NVMe 드라이버 개요

**의도**: 커널 NVMe 스택의 구조.

- ✦ `nvme-core` — protocol-agnostic core
- ✦ `nvme-pci` — PCIe transport driver
- ✦ `nvme-rdma`, `nvme-tcp`, `nvme-fc` — Fabrics transports
- ✦ blk-mq 통합 — request queues per NS
- ✦ sysfs hierarchy (`/sys/class/nvme/`)
- ✦ uevent — hot-add/remove, controller state
- ◦ nvme-fabrics user-space cli
- ◦ NVMe Target (`nvmet-*`) — server side

**다이어그램** (3)
1. NVMe driver 계층 (core / transport / target)
2. sysfs 트리
3. uevent flow

**코드**: `drivers/nvme/host/Kconfig`, `core.c`, `pci.c`
**레퍼런스**: kernel.org NVMe documentation

---

### Ch 12: 리눅스 I/O Path — block → bio → request → nvme

**의도**: 한 read/write 시스콜이 어떻게 NVMe 명령이 되는지.

- ✦ syscall (read/write/pread) → VFS → page cache
- ✦ Direct I/O 경로 (O_DIRECT) — page cache 우회
- ✦ bio → request → struct nvme_command
- ✦ blk-mq dispatch
- ✦ Queue depth, plug/unplug
- ✦ io_uring zero-copy path
- ◦ AIO (libaio) vs io_uring 비교
- ◦ Splice / sendfile path

**다이어그램** (4)
1. read() 시스콜 → NVMe SQE 전체 흐름
2. blk-mq plugging
3. io_uring submission queue
4. Direct I/O DMA mapping

**코드**: `block/blk-mq.c::blk_mq_submit_bio`, NVMe queue_rq
**레퍼런스**: kernel.org block layer docs, io_uring man pages

---

### Ch 13: 리눅스 NVMe Admin / nvme-cli

**의도**: 운영자 관점 — 어떤 명령으로 무엇을 보고 무엇을 바꾸는가.

- ✦ `nvme list / id-ctrl / id-ns / show-regs`
- ✦ `nvme smart-log` — Critical Warning, Temperature, Wear
- ✦ `nvme error-log`, `nvme fw-log`
- ✦ `nvme format` — LBAF, secure erase
- ✦ `nvme fw-download / fw-commit`
- ✦ `nvme set-feature` — APST, IRQ Coalescing, Temperature Threshold
- ◦ `nvme self-test`
- ◦ `nvme sanitize` (block discard / overwrite / crypto-erase)

**다이어그램** (2)
1. nvme-cli 명령 군 분류
2. SMART/Health Log 4KB 페이지 영역도

**코드**: `nvme-cli` 자체 소스 (linux-nvme/nvme-cli on GitHub)
**레퍼런스**: nvme-cli man pages, NVMe Base spec command tables

---

### Ch 14: nvme-cli 심층 — 자주 쓰는 케이스북

**의도**: 운영 실무 시나리오.

- ✦ 새 드라이브 받아 검수 — id-ctrl/id-ns, format
- ✦ Wear monitoring — `nvme smart-log` percent_used, available_spare
- ✦ Firmware 업데이트 — fw-download + commit + reset
- ✦ Drive lockup 대응 — admin abort, controller reset
- ✦ Telemetry 수집 — `nvme telemetry-log`
- ✦ Secure Erase — sanitize crypto-erase
- ◦ Boot partition write
- ◦ NVMe-MI through PCIe VDM

**다이어그램** (2)
1. Wear monitoring 흐름
2. Firmware update 시퀀스 + rollback

**코드**: Shell 스크립트 예시 (모니터링 cron)
**레퍼런스**: nvme-cli examples, vendor admin guides

---

### Ch 15: 성능 — IOPS / Throughput / Latency

**의도**: 측정·튜닝.

- ✦ Random 4K vs Sequential 128K vs 1M
- ✦ Queue Depth(QD) 효과 — 1 / 32 / 128 / 256
- ✦ fio 워크로드 작성 — libaio vs io_uring
- ✦ APST(Autonomous Power State Transition) tradeoff (latency↑ vs power↓)
- ✦ IRQ affinity, numactl
- ✦ NVMe over Fabrics 성능 (TCP/RDMA) — 간단히
- ◦ ZNS Append throughput
- ◦ CMB-backed SQ effect

**다이어그램** (4)
1. fio job 흐름 (job → ioengine → kernel → NVMe)
2. QD-IOPS scaling 그래프
3. Latency distribution (P50/P99/P99.99)
4. APST 단계 (PS0~PS4) 전류·latency

**코드**: fio job 파일들, `nvme set-feature -f 0x0C -v 0` (APST 끄기)
**레퍼런스**: SNIA NVMe Performance White Papers, Hyperscaler benchmarks

---

### Ch 16: Firmware — 컨트롤러 펌웨어와 업데이트

**의도**: SSD 내부 펌웨어 구조와 운영.

- ✦ Firmware slots — 1~7 슬 + 1 boot slot
- ✦ Commit Action — 0 (replace) / 1 (replace+activate) / 2 (activate existing) / 3 (replace+activate immediate)
- ✦ Subsystem reset vs controller reset 트리거
- ✦ Rollback 전략
- ✦ Vendor unique opcodes (간단히)
- ◦ Sanitize during firmware boot
- ◦ Manufacturing mode / vendor MI

**다이어그램** (2)
1. Firmware slot diagram
2. Commit action flow chart

**코드**: `nvme fw-download / fw-commit` with safety wrappers
**레퍼런스**: NVMe Base §5.11 Firmware Commit, vendor MI specs

---

### Ch 17: 레지스터·자료구조 맵

**의도**: 참조용 챕터.

- ✦ Controller Registers (offset / size / default / RW) 표
- ✦ CC / CSTS / AQA / ASQ / ACQ 비트 표
- ✦ SQE 64B 모든 DW 의미
- ✦ CQE 16B 모든 필드
- ✦ Identify Controller Data 4KB byte map
- ✦ SMART/Health Log Page byte map
- ◦ Firmware Slot Information Log
- ◦ Telemetry Log header

**다이어그램** (3)
1. Controller Register 메모리 맵
2. Identify Ctrl Data 4KB 영역도 (구역 색칠)
3. SMART Log 512B 영역도

**코드**: 헤더 인용 (`include/uapi/linux/nvme_ioctl.h`, `drivers/nvme/host/nvme.h`)
**레퍼런스**: NVMe Base 모든 register/struct 표

---

## 챕터별 분량 계획

| 챕터 | 목표 줄수 | 다이어그램 |
|------|-----------|-----------|
| 1 architecture | 450 | 4 |
| 2 controller | 500 | 3 |
| 3 namespace | 400 | 3 |
| 4 queue-mechanism | 600 | 4 |
| 5 admin-commands | 500 | 3 |
| 6 io-commands | 450 | 3 |
| 7 prp-sgl | 500 | 4 |
| 8 completion | 400 | 3 |
| 9 multiqueue | 500 | 4 |
| 10 error-handling | 550 | 4 |
| 11 linux-overview | 400 | 3 |
| 12 linux-io-path | 550 | 4 |
| 13 linux-admin | 400 | 2 |
| 14 nvme-cli | 450 | 2 |
| 15 performance | 600 | 4 |
| 16 firmware | 400 | 2 |
| 17 register-maps | 450 | 3 |
| **합계** | **~8100줄** | **55** |

## 레퍼런스

### NVMe 표준 (1차)

| 문서 | 활용 챕터 |
|------|-----------|
| NVMe Base Specification 2.0c (2024) | 전 챕터 |
| NVMe Command Set Specification (NVM / ZNS / KV) | 6, 10 |
| NVMe Transport — PCIe | 2, 4, 7 |
| NVMe Transport — TCP | 9, 11 |
| NVMe Transport — RDMA | 9, 11 |
| NVMe Management Interface (MI) 1.2 | 13, 16 |
| NVMe Boot Specification | 2, 16 |

NVMe spec은 nvmexpress.org에서 무료. 항상 최신 base + transport + command set 묶음으로 본다.

### 책 / 화이트페이퍼

- **NVM Express Architectural Overview** — NVMe consortium 공식 백서
- **The Linux NVMe Driver — Architecture and Performance** — Verma et al.
- *Storage Networking Industry Association (SNIA)* NVMe tutorials
- *Hyperscale Storage* (Optane / SLC tier) 백서

### 벤더

| 출처 | 활용 |
|------|------|
| Samsung NVMe SSD Series Tech Brief | wear, telemetry — Ch 13, 14 |
| Intel Optane DC Series briefs | latency 비교 — Ch 1, 15 |
| Micron NAND SSD Whitepapers | ECC, FTL — Ch 10, 16 |
| Solidigm (former Intel SSD) tech notes | enterprise SSD 운영 — Ch 14, 15 |

### 리눅스 커널

| 경로 | 활용 |
|------|------|
| `drivers/nvme/host/core.c` | 11, 12 |
| `drivers/nvme/host/pci.c` | 4, 7, 11 |
| `drivers/nvme/host/multipath.c` | 9 |
| `drivers/nvme/target/` | 11 (간단 언급) |
| `include/uapi/linux/nvme_ioctl.h` | 13 |
| `block/blk-mq*.c` | 9, 12 |

### 도구

- `nvme-cli` (linux-nvme.org / GitHub) — Ch 13, 14
- `fio` — Ch 15
- `bcc-tools` (biolatency, biotop, nvmecmd) — Ch 12, 15
- `blktrace`, `btt` — Ch 12, 15

### 학술·발표

- *FAST conference* — File and Storage Tech 매년
- *USENIX OSDI* SSD 관련 페이퍼
- *FMS* (Flash Memory Summit) — 매년 NVMe 새 기능 발표
- *Linux Plumbers Conference* — NVMe 트랙

## 작성 순서 권장

1. 스토리보드 사용자 검토
2. Ch 4 (queue) → Ch 7 (PRP/SGL) → Ch 8 (completion) — NVMe의 데이터 평면 셋
3. Ch 1, 2, 3 — 토대
4. Ch 11, 12 — 리눅스 통합
5. 나머지

## 검증

- 챕터 1편 작성 후 사용자 검토 → OK면 다음.
- 다이어그램 `scripts/detect-text-overlap.py`로 overlap 검증.
