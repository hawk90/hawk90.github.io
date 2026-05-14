---
title: "PCIe Deep Dive: 시리즈 개요"
date: 2026-06-01T01:00:00
description: "PCIe 5.0/6.0 스펙 기반 딥다이브 시리즈 — 계층 구조부터 Linux 드라이버, 디버깅까지"
series: "PCIe Deep Dive"
seriesOrder: 0
tags: [pcie, hardware, embedded, linux, driver]
draft: true
---

PCIe(Peripheral Component Interconnect Express)는 현대 컴퓨터 시스템의 핵심 인터커넥트다. GPU, NVMe SSD, 네트워크 카드 등 고성능 주변장치가 모두 PCIe 버스 위에서 동작한다. 이 시리즈는 PCIe 스펙의 핵심 개념을 체계적으로 정리하고, Linux 환경에서의 드라이버 개발과 디버깅 실무까지 다룬다.

## 시리즈 목표

이 시리즈를 완독하면 다음을 할 수 있다.

- PCIe 계층 구조(Transaction, Data Link, Physical)를 설명할 수 있다
- TLP/DLLP 패킷 구조를 분석하고 해석할 수 있다
- Configuration Space와 Capability 구조를 이해하고 레지스터를 읽을 수 있다
- BAR, MMIO, DMA의 동작 원리를 설명할 수 있다
- Linux pci_driver 프레임워크로 드라이버를 작성할 수 있다
- lspci, setpci, devmem2로 실시간 디버깅을 할 수 있다
- 성능 병목과 에러 상황을 분석할 수 있다

## 대상 독자

- 임베디드/시스템 엔지니어
- Linux 디바이스 드라이버 개발자
- 하드웨어/펌웨어 엔지니어
- PCIe 디바이스 검증 엔지니어

PCIe를 처음 접하는 독자도 따라올 수 있도록 기초부터 시작하지만, C 언어와 Linux 기본 지식은 전제한다.

## 기준 스펙 버전

| 버전 | 대역폭 (x16) | 인코딩 | 비고 |
|------|-------------|--------|------|
| PCIe 3.0 | 32 GB/s | 128b/130b | 현재 가장 보편적 |
| PCIe 4.0 | 64 GB/s | 128b/130b | NVMe Gen4 |
| PCIe 5.0 | 128 GB/s | 128b/130b | 최신 서버/워크스테이션 |
| PCIe 6.0 | 256 GB/s | 1b/1b (PAM4) | 2024+ 도입 시작 |

이 시리즈는 **PCIe 5.0 스펙**을 기준으로 하되, 6.0의 주요 변경점(PAM4 시그널링, FLIT 모드)도 언급한다.

## 실무 도구 레퍼런스

| 도구 | 용도 | 예시 |
|------|------|------|
| `lspci` | 디바이스 열거, Capability 확인 | `lspci -vvv -s 01:00.0` |
| `setpci` | Config Space 읽기/쓰기 | `setpci -s 01:00.0 COMMAND` |
| `devmem2` | MMIO 레지스터 직접 접근 | `devmem2 0xfe000000 w` |
| `pcitree` | 토폴로지 시각화 | `pcitree` |
| `/sys/bus/pci` | sysfs 인터페이스 | `cat /sys/bus/pci/devices/*/config` |
| `perf` | PCIe 성능 프로파일링 | `perf stat -e uncore_iio_*` |

## 시리즈 로드맵

### Part 1: 아키텍처 기초 (Ch 1-5)

PCIe의 계층 구조, 패킷 포맷, 설정 공간, 메모리 매핑, 인터럽트 메커니즘을 다룬다.

| 장 | 제목 | 핵심 내용 |
|----|------|----------|
| 1 | Fundamentals | 계층 구조, 토폴로지, 포인트-투-포인트 |
| 2 | TLP | Transaction Layer Packet 구조 |
| 3 | Config Space | Type 0/1, Capability 체인 |
| 4 | BAR & MMIO | BAR 타입, Address Translation |
| 5 | Interrupts | Legacy, MSI, MSI-X |

### Part 2: 전력과 에러 (Ch 6-7)

전력 관리(ASPM)와 에러 핸들링(AER)을 다룬다.

| 장 | 제목 | 핵심 내용 |
|----|------|----------|
| 6 | Power Management | ASPM, L-states, D-states |
| 7 | Error Handling | AER, Correctable/Uncorrectable |

### Part 3: 하위 계층 (Ch 8-9)

Data Link Layer와 Physical Layer의 동작을 다룬다.

| 장 | 제목 | 핵심 내용 |
|----|------|----------|
| 8 | DLLP | Ack/Nak, Flow Control, Replay |
| 9 | Physical Layer | LTSSM, 링크 트레이닝, Equalization |

### Part 4: Linux 드라이버 (Ch 10-12)

Linux 커널의 PCIe 서브시스템과 드라이버 개발을 다룬다.

| 장 | 제목 | 핵심 내용 |
|----|------|----------|
| 10 | Linux Basics | pci_driver, probe/remove |
| 11 | Linux DMA | DMA API, Coherent/Streaming |
| 12 | Linux Advanced | SR-IOV, VFIO, P2P |

### Part 5: 실무 (Ch 13-16)

디버깅 도구, 트러블슈팅, 성능 최적화, 레지스터 레퍼런스를 다룬다.

| 장 | 제목 | 핵심 내용 |
|----|------|----------|
| 13 | Tools | lspci/setpci 실전 |
| 14 | Troubleshooting | 링크 다운, 에러 분석 |
| 15 | Performance | 레이턴시, 대역폭 측정 |
| 16 | Register Maps | Config Space 비트필드 |

## 관련 자료

- [PCI-SIG 공식 사이트](https://pcisig.com/)
- [Linux Kernel PCIe Documentation](https://www.kernel.org/doc/html/latest/PCI/)
- [MindShare PCIe 3.0 Technology](https://www.mindshare.com/) — 상세한 참고서
- [PCIe 6.0 Specification](https://pcisig.com/pci-express-6.0-specification) — PAM4, FLIT

## 다음 장 예고

[Chapter 1: Fundamentals](/blog/embedded/hardware/pcie/chapter01-fundamentals)에서 PCIe의 계층 구조와 토폴로지를 살펴본다. 포인트-투-포인트 아키텍처가 PCI의 공유 버스와 어떻게 다른지, Root Complex, Switch, Endpoint가 어떻게 연결되는지 다룬다.
