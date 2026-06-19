---
title: "Ch 15: Performance — 레이턴시와 대역폭"
date: 2026-05-16T16:00:00
description: "PCIe 성능 분석 — 레이턴시 측정, 대역폭 최적화, 프로파일링, 병목 분석"
series: "PCIe Deep Dive"
seriesOrder: 15
tags: [pcie, performance, latency, bandwidth, profiling]
draft: true
---

PCIe 성능은 대역폭과 레이턴시 두 축으로 측정된다. 이 장에서는 성능 측정 방법과 최적화 기법을 다룬다.

## 이론적 대역폭

TODO: 내용 작성

| Gen | Lane Rate | x16 단방향 | x16 양방향 |
|-----|-----------|-----------|-----------|
| 3.0 | 8 GT/s | 16 GB/s | 32 GB/s |
| 4.0 | 16 GT/s | 32 GB/s | 64 GB/s |
| 5.0 | 32 GT/s | 64 GB/s | 128 GB/s |
| 6.0 | 64 GT/s | 128 GB/s | 256 GB/s |

- 인코딩 오버헤드
- 실효 대역폭 계산

## TLP 오버헤드

TODO: 내용 작성

- 헤더 오버헤드 (12-16 바이트)
- Sequence Number, LCRC
- Framing Symbol
- Max Payload Size 영향
- 효율적인 Payload 크기

## Max Payload Size

TODO: 내용 작성

- MPS 설정
- 128/256/512/1024/2048/4096 바이트
- DevCap/DevCtl
- 시스템 전체 일관성
- Linux에서 확인/설정

## Max Read Request Size

TODO: 내용 작성

- MRRS 설정
- Split Transaction 영향
- 대역폭 vs 레이턴시 트레이드오프
- 큰 전송에 유리

## 레이턴시 구성 요소

TODO: 내용 작성

- Transaction Layer 처리
- Data Link Layer 처리
- Physical Layer 전파
- 디바이스 응답 시간
- Root Complex 지연

## 레이턴시 측정

TODO: 내용 작성

- 왕복 시간 (Round-Trip)
- Completion 레이턴시
- 하드웨어 타임스탬프
- 소프트웨어 측정 오버헤드

## 대역폭 측정

TODO: 내용 작성

- `fio` (NVMe)
- `iperf` (네트워크)
- 벤더 벤치마크 도구
- perf PMU 카운터
- `lspci` Link Status

## 성능 최적화

TODO: 내용 작성

- MPS/MRRS 조정
- ASPM 비활성화 (레이턴시)
- Relaxed Ordering
- No Snoop
- Read Combining

## 병목 분석

TODO: 내용 작성

- CPU vs PCIe vs 디바이스
- Flow Control Credit
- Posted vs Non-Posted 비율
- Completion 지연
- 프로파일링 도구

## 정리

- 이론적 대역폭과 실효 대역폭은 TLP 오버헤드로 차이가 난다
- MPS와 MRRS 설정이 성능에 큰 영향을 미친다
- 레이턴시는 여러 계층의 지연 합이다
- 체계적인 프로파일링으로 병목을 찾는다

## 다음 장 예고

[Chapter 16: Register Maps](/blog/embedded/hardware/pcie/chapter18-register-maps)에서 Configuration Space의 상세 비트필드를 정리한다. 레퍼런스로 활용할 수 있다.

## 관련 항목

- [Chapter 2: TLP](/blog/embedded/hardware/pcie/chapter02-tlp)
- [Chapter 6: Power Management](/blog/embedded/hardware/pcie/chapter06-power-management)
- [Chapter 14: Troubleshooting](/blog/embedded/hardware/pcie/chapter16-troubleshooting)
