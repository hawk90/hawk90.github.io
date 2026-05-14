---
title: "Ch 13: 리눅스 EDAC — 에러 리포팅"
date: 2026-08-01T14:00:00
description: "리눅스 EDAC 서브시스템: 메모리 에러 감지, 리포팅, RAS 데몬"
series: "DDR Memory Deep Dive"
seriesOrder: 13
tags: [DDR, Linux, EDAC, ECC, RAS]
draft: true
---

EDAC (Error Detection And Correction)은 리눅스 커널의 메모리 에러 리포팅 서브시스템이다. ECC 메모리의 에러를 사용자 공간에 노출하고 RAS(Reliability, Availability, Serviceability)를 지원한다.

## EDAC 아키텍처

TODO: 내용 작성

- edac_core 모듈
- 메모리 컨트롤러별 드라이버
- /sys/devices/system/edac/ 인터페이스
- 에러 카운터와 로그

## 메모리 에러 타입

TODO: 내용 작성

- CE (Correctable Error)
- UE (Uncorrectable Error)
- 에러 위치 정보 (DIMM, Rank, Bank, Row, Column)

## edac-util 사용법

TODO: 내용 작성

- edac-util --status
- edac-util --report
- CE/UE 카운터 조회
- 에러 위치 해석

## mcelog와 rasdaemon

TODO: 내용 작성

- Machine Check Exception (MCE)
- mcelog 데몬
- rasdaemon: 현대적 대안
- ras-mc-ctl

## sysfs 인터페이스

TODO: 내용 작성

- /sys/devices/system/edac/mc/
- mc0/csrow0/ 구조
- 에러 카운터 읽기
- 디버깅용 injection

## 정리

- EDAC은 리눅스에서 메모리 에러를 수집하고 리포팅한다
- sysfs를 통해 에러 카운터와 위치 정보를 조회할 수 있다
- edac-util과 rasdaemon이 에러 모니터링을 지원한다
- CE 누적 시 예방적 DIMM 교체를 고려해야 한다

## 다음 장 예고

Chapter 14에서는 DDR5의 새로운 기능을 다룬다. DDR4와의 차이점, 듀얼 채널, DFE 등을 살펴본다.

## 관련 항목

- [Ch 12: 리눅스 메모리 관리](/blog/embedded/hardware/ddr/chapter12-linux-memory) — mm/, Page Allocator, NUMA
- [Ch 14: DDR5](/blog/embedded/hardware/ddr/chapter14-ddr5) — DDR5 차이점, DFE, 듀얼 채널
