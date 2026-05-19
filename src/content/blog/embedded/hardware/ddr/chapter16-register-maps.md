---
title: "Ch 16: 레지스터 맵 — Mode Register, SPD"
date: 2026-05-16T17:00:00
description: "DDR 메모리의 레지스터: Mode Register 설정, SPD(Serial Presence Detect) 구조"
series: "DDR Memory Deep Dive"
seriesOrder: 16
tags: [DDR, memory, register, MRS, SPD]
draft: true
---

DDR 메모리의 동작 파라미터는 Mode Register에 설정되고, DIMM 정보는 SPD EEPROM에 저장된다. 이 장에서는 두 레지스터 체계의 구조와 내용을 상세히 다룬다.

## Mode Register 개요

TODO: 내용 작성

- Mode Register Set (MRS) 명령
- DDR4: MR0–MR6
- DDR5: MR0–MR63+ (확장)
- LPDDR: MR0–MR41+

## DDR4 Mode Register

TODO: 내용 작성

| MR | 주요 내용 |
|----|-----------|
| MR0 | Burst Length, CAS Latency, DLL Reset |
| MR1 | DLL Enable, Output Driver, AL, Write Leveling |
| MR2 | CAS Write Latency, RTT_WR |
| MR3 | MPR, Fine Granularity Refresh |
| MR4 | Temperature Sensor, Max Power Down |
| MR5 | CA Parity, CRC, Read/Write DBI |
| MR6 | VrefDQ Training Value |

## DDR5 Mode Register 확장

TODO: 내용 작성

- MR 개수 대폭 증가
- Per-DRAM Addressability (PDA)
- RCD/DB 관련 레지스터
- 새로운 RAS 기능 설정

## SPD (Serial Presence Detect)

TODO: 내용 작성

- I2C/SMBus 인터페이스
- EEPROM 구조
- JEDEC SPD 표준 (JESD21-C)
- 바이트별 필드 의미

## SPD 주요 필드

TODO: 내용 작성

| 오프셋 | 내용 |
|--------|------|
| 0 | SPD Device Size, Type |
| 2 | Key Byte / DRAM Type |
| 4 | SDRAM Density, Banks |
| 5 | Row/Column Address |
| 11–12 | tCK (min) |
| 18 | CAS Latencies Supported |
| ... | ... |

## SPD 읽기 도구

TODO: 내용 작성

- decode-dimms (Linux)
- CPU-Z, Thaiphoon Burner (Windows)
- i2c-tools로 raw 읽기
- SPD Hub (DDR5)

## 정리

- Mode Register는 DRAM의 동작 파라미터를 설정한다
- DDR4는 MR0–MR6, DDR5는 64개 이상의 MR을 갖는다
- SPD는 DIMM 정보를 담은 EEPROM으로 BIOS/컨트롤러가 읽는다
- decode-dimms로 SPD 내용을 파싱하여 DIMM 사양을 확인할 수 있다

## 시리즈 마무리

이 시리즈에서는 DDR 메모리의 물리적 구조부터 타이밍, 트레이닝, ECC, 컨트롤러, 리눅스 서브시스템, DDR5 신기능, 디버깅까지 다뤘다. 메모리 문제 해결과 시스템 최적화에 이 지식이 도움이 되길 바란다.

## 관련 항목

- [Ch 15: 디버깅](/blog/embedded/hardware/ddr/chapter15-debugging) — 메모리 안 뜸, 트레이닝 실패, ECC 에러

## 외부 참조

- [JEDEC](https://www.jedec.org/) — 공식 표준 문서
- [decode-dimms](https://github.com/groeck/i2c-tools) — SPD 파싱 도구
- [Micron Technical Notes](https://www.micron.com/support/tools-and-utilities/power-calc) — DDR 기술 문서
