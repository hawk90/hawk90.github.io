---
title: "DDR Memory Deep Dive: 시리즈 개요"
date: 2026-08-01T01:00:00
description: "DDR4/DDR5/LPDDR 메모리의 내부 구조부터 트레이닝, ECC, 리눅스 서브시스템까지 다루는 시리즈 개요"
series: "DDR Memory Deep Dive"
seriesOrder: 0
tags: [DDR, memory, embedded, hardware, JEDEC]
draft: true
---

DDR 메모리는 현대 컴퓨팅의 핵심이다. CPU가 아무리 빨라도 메모리가 병목이면 성능은 제자리다. 이 시리즈는 DDR의 내부 구조, 타이밍, 트레이닝, ECC, 그리고 리눅스 커널의 메모리 서브시스템까지 깊이 있게 다룬다.

## 시리즈 목표

이 시리즈를 마치면 다음을 이해할 수 있다:

- DDR 메모리의 물리적 구조(셀, Bank, Rank)와 명령 체계
- 타이밍 파라미터의 의미와 최적화 방법
- 메모리 트레이닝(Write Leveling, Read Training)의 원리
- ECC와 On-die ECC의 동작 방식
- DDR 컨트롤러의 스케줄링과 인터리빙
- 리눅스 커널의 메모리 관리와 EDAC 서브시스템
- 메모리 문제 디버깅 실무

## 대상 독자

- 임베디드 시스템 개발자
- 커널/드라이버 개발자
- 하드웨어 검증 엔지니어
- 시스템 아키텍트
- 성능 최적화 엔지니어

DDR의 기본 개념(SDRAM이 무엇인지)은 알고 있다고 가정한다.

## DDR 세대 비교

| 항목 | DDR4 | DDR5 | LPDDR5 |
|------|------|------|--------|
| 데이터 레이트 | 1600–3200 MT/s | 3200–8400 MT/s | 6400–8533 MT/s |
| 프리페치 | 8n | 16n | 16n |
| 뱅크 그룹 | 4 BG × 4 Bank | 8 BG × 4 Bank | 4 BG × 4 Bank |
| 버스트 길이 | BL8 | BL16 | BL16/BL32 |
| 채널 | 1 (64bit) | 2 × 32bit | 2 × 16bit |
| VDD | 1.2V | 1.1V | 1.05V |
| On-die ECC | 없음 | 필수 | 필수 |
| PMIC | 외부 | 내장 | 내장 |

## JEDEC 스펙 기준

이 시리즈는 다음 JEDEC 표준을 참조한다:

| 표준 | 문서 번호 | 설명 |
|------|-----------|------|
| DDR4 SDRAM | JESD79-4 | DDR4 기본 사양 |
| DDR5 SDRAM | JESD79-5 | DDR5 기본 사양 |
| LPDDR5 | JESD209-5 | 모바일용 저전력 DDR |
| SPD | JESD21-C | Serial Presence Detect |
| DDR4 RCD | JESD82-31 | Registering Clock Driver |

## 실무 도구 레퍼런스

| 도구 | 용도 | 플랫폼 |
|------|------|--------|
| `dmidecode` | DIMM 정보 조회 (Type 17) | Linux |
| `decode-dimms` | SPD 데이터 파싱 | Linux |
| `edac-util` | ECC 에러 조회 | Linux |
| `mcelog` | Machine Check 로그 | Linux |
| `memtester` | 유저스페이스 메모리 테스트 | Linux |
| `memtest86+` | 부팅 전 메모리 테스트 | Standalone |
| `ipmitool` | BMC를 통한 메모리 에러 조회 | Linux |
| `lshw -C memory` | 메모리 토폴로지 조회 | Linux |

## 로드맵

### Part 1: 기초 아키텍처 (Ch 1–2)

DDR 메모리의 물리적 구조와 기본 명령어를 다룬다. 셀, Bank, Row, Column, Rank의 계층 구조를 이해하고, ACT, READ, WRITE, PRE, REF 명령의 동작을 살펴본다.

### Part 2: 타이밍 (Ch 3–4)

메모리 타이밍 파라미터를 상세히 분석한다. CAS Latency부터 Refresh Interval까지, 각 파라미터가 성능과 안정성에 미치는 영향을 다룬다.

### Part 3: 초기화와 트레이닝 (Ch 5–8)

DDR 메모리가 동작하기까지의 초기화 시퀀스와 트레이닝 과정을 다룬다. Write Leveling, Read Training, CA Training의 원리와 구현을 살펴본다.

### Part 4: 신뢰성 (Ch 9–10)

ECC, On-die ECC, Memory Scrubbing 등 데이터 무결성 보장 메커니즘을 다룬다. 전력 관리(Self-Refresh, Power-Down)도 함께 다룬다.

### Part 5: 컨트롤러와 시스템 (Ch 11–13)

DDR 컨트롤러의 내부 구조, 리눅스 커널의 메모리 관리, EDAC 서브시스템을 다룬다.

### Part 6: DDR5와 최신 기술 (Ch 14)

DDR5의 새로운 기능—듀얼 채널, DFE, 향상된 RAS—을 DDR4와 비교하며 살펴본다.

### Part 7: 실무 (Ch 15–16)

메모리 문제 디버깅 사례와 Mode Register, SPD 레지스터 맵을 다룬다.

## 관련 자료

- [JEDEC](https://www.jedec.org/) — 메모리 표준 제정 기관
- [Micron DDR4 Datasheet](https://www.micron.com/) — 상용 DDR4 사양서
- [Samsung DDR5 White Paper](https://semiconductor.samsung.com/) — DDR5 기술 문서
- [Linux Kernel mm/ Documentation](https://www.kernel.org/doc/html/latest/mm/) — 커널 메모리 관리 문서

## 다음 장 예고

Chapter 1에서는 DDR 메모리의 기본 아키텍처를 다룬다. 메모리 셀의 구조부터 Bank, Row, Column, Rank의 계층 구조까지 살펴본다.

## 관련 항목

- [Ch 1: 아키텍처](/blog/embedded/hardware/ddr/chapter01-architecture) — 셀, Bank, Row, Column, Rank
