---
title: "NVMe Deep Dive: 시리즈 개요"
date: 2026-07-01T01:00:00
description: "NVMe 스펙의 핵심 개념부터 Linux 드라이버 구조, 실무 도구 활용까지 체계적으로 다루는 시리즈 개요"
series: "NVMe Deep Dive"
seriesOrder: 0
tags: [nvme, storage, pcie, linux, embedded]
draft: true
---

NVMe(Non-Volatile Memory Express)는 PCIe 버스 위에서 동작하는 고성능 스토리지 프로토콜이다. SATA/AHCI 시대의 병목을 제거하고 플래시 스토리지의 잠재력을 최대한 끌어내기 위해 설계되었다. 이 시리즈는 NVMe 스펙의 핵심 개념부터 Linux 커널 드라이버 구조, 실무 도구 활용까지 체계적으로 다룬다.

## 시리즈 목표

이 시리즈를 완독하면 다음을 할 수 있다.

- NVMe 스펙 문서를 읽고 컨트롤러 동작을 이해한다
- Submission Queue / Completion Queue 메커니즘을 설명한다
- Linux nvme 드라이버의 I/O 경로를 추적한다
- nvme-cli로 디바이스를 진단하고 관리한다
- 성능 병목을 분석하고 튜닝 포인트를 찾는다

## 대상 독자

- 스토리지 드라이버 개발자
- 임베디드/시스템 엔지니어
- 고성능 I/O가 필요한 서버 운영자
- NVMe 하드웨어를 설계하거나 검증하는 엔지니어

기본적인 PCIe 지식과 Linux 커널 구조에 대한 이해가 있으면 좋다.

## 기준 스펙 버전

이 시리즈는 **NVMe Base Specification 1.4**를 주 기준으로 하고, **NVMe 2.0**에서 추가된 주요 변경 사항도 함께 다룬다. 특정 버전에서만 유효한 내용은 명시적으로 표기한다.

| 스펙 | 버전 | 비고 |
|------|------|------|
| NVMe Base | 1.4 / 2.0 | 핵심 명령어, 큐 메커니즘 |
| NVMe-MI | 1.2 | Management Interface (참고) |
| NVMe-oF | 1.1 | Over Fabrics (참고) |

## 실무 도구 레퍼런스

| 도구 | 용도 | 설치 |
|------|------|------|
| `nvme-cli` | NVMe 디바이스 관리, 진단 | `apt install nvme-cli` |
| `fio` | I/O 성능 벤치마크 | `apt install fio` |
| `blktrace` | 블록 I/O 추적 | `apt install blktrace` |
| `perf` | 커널 프로파일링 | `apt install linux-tools` |
| `bpftrace` | eBPF 기반 동적 트레이싱 | `apt install bpftrace` |
| `smartctl` | S.M.A.R.T. 정보 조회 | `apt install smartmontools` |

## 로드맵

시리즈는 6개 파트, 17개 챕터로 구성된다.

### Part 1: NVMe 아키텍처 (Ch 1-3)

NVMe의 전체 구조와 핵심 개념을 다룬다.

- **Ch 1**: NVMe vs AHCI, 전체 아키텍처
- **Ch 2**: Controller Capabilities, Identify 구조체
- **Ch 3**: Namespace, Multi-path I/O

### Part 2: 큐 메커니즘 (Ch 4-5)

NVMe 성능의 핵심인 큐 구조를 상세히 분석한다.

- **Ch 4**: SQ/CQ, Doorbell, Phase Bit
- **Ch 5**: Admin Commands (Identify, Create Queue, Features)

### Part 3: I/O 명령어 (Ch 6-8)

실제 데이터 전송을 담당하는 I/O 명령어를 다룬다.

- **Ch 6**: Read/Write/Flush/Dataset Management
- **Ch 7**: PRP List, SGL Segment
- **Ch 8**: Completion Queue Entry, Status Code

### Part 4: 고급 주제 (Ch 9-10)

멀티큐 활용과 에러 처리를 다룬다.

- **Ch 9**: 멀티큐 전략, WRR, CPU Affinity
- **Ch 10**: Status Code 분류, 복구 전략, AER 연동

### Part 5: Linux 드라이버 (Ch 11-13)

Linux 커널의 NVMe 드라이버 구조를 분석한다.

- **Ch 11**: nvme-core, nvme-pci 모듈 구조
- **Ch 12**: blk-mq → nvme_cmd → completion 경로
- **Ch 13**: Admin Queue 처리, Identify, Features

### Part 6: 실무 활용 (Ch 14-17)

도구 사용법과 성능 튜닝을 다룬다.

- **Ch 14**: nvme-cli 완전 정복
- **Ch 15**: Queue Depth, 폴링 모드, NUMA 최적화
- **Ch 16**: Firmware 업데이트, Format, Secure Erase
- **Ch 17**: Controller Register Map (CAP/VS/CC/CSTS/AQA/ASQ/ACQ)

## 관련 자료

- [NVMe Express 공식 사이트](https://nvmexpress.org/)
- [NVMe Base Specification 다운로드](https://nvmexpress.org/specifications/)
- [Linux NVMe 드라이버 소스](https://github.com/torvalds/linux/tree/master/drivers/nvme)
- [nvme-cli GitHub](https://github.com/linux-nvme/nvme-cli)

## 다음 장 예고

Ch 1에서는 AHCI와 NVMe의 근본적인 차이를 비교하고, NVMe 아키텍처의 전체 그림을 그린다.

## 관련 항목

- [Ch 1: NVMe 아키텍처](/blog/embedded/hardware/nvme/chapter01-architecture)
