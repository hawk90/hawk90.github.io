---
title: "Ch 10: 전력 관리 — Self-Refresh, Power-Down"
date: 2026-08-01T11:00:00
description: "DDR 메모리의 전력 관리: Self-Refresh, Power-Down 모드, LPDDR 저전력 기법"
series: "DDR Memory Deep Dive"
seriesOrder: 10
tags: [DDR, memory, power, self-refresh, low-power]
draft: true
---

메모리는 시스템 전력의 상당 부분을 차지한다. DDR은 다양한 저전력 모드를 제공하여 유휴 시 전력 소모를 줄인다. 이 장에서는 Self-Refresh, Power-Down, LPDDR의 저전력 기법을 다룬다.

## DDR 전력 소모 구성

TODO: 내용 작성

- Active Power (Read/Write 동작)
- Standby Power (Idle)
- Refresh Power
- I/O Power

## Power-Down 모드

TODO: 내용 작성

- Active Power-Down
- Precharge Power-Down
- CKE 비활성화
- 진입/탈출 레이턴시

## Self-Refresh

TODO: 내용 작성

- CKE + CS 비활성화
- DRAM 내부 리프레시
- 데이터 유지, 외부 접근 불가
- 진입/탈출 시퀀스

## LPDDR 저전력 기법

TODO: 내용 작성

- Deep Power-Down
- Partial Array Self-Refresh (PASR)
- Temperature Compensated Self-Refresh (TCSR)
- Dynamic Frequency Scaling

## 시스템 레벨 전력 관리

TODO: 내용 작성

- Linux memory power management
- Runtime PM과 메모리
- Suspend-to-RAM (S3)

## 정리

- Power-Down은 CKE를 낮춰 빠르게 진입/탈출 가능한 저전력 모드다
- Self-Refresh는 DRAM이 자체 리프레시하여 데이터를 유지한다
- LPDDR은 PASR, Deep Power-Down 등 추가 저전력 기법을 제공한다
- 시스템 레벨에서 메모리 전력 관리는 OS/펌웨어가 조율한다

## 다음 장 예고

Chapter 11에서는 DDR 컨트롤러의 내부 구조를 다룬다. Arbiter, Scheduler, Interleaving 전략을 살펴본다.

## 관련 항목

- [Ch 9: ECC](/blog/embedded/hardware/ddr/chapter09-ecc) — ECC, On-die ECC, Scrubbing
- [Ch 11: 컨트롤러](/blog/embedded/hardware/ddr/chapter11-controller) — Arbiter, Scheduler, Interleaving
