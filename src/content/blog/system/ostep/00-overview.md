---
title: "OSTEP 시리즈 개요"
date: 2026-05-13
description: "Operating Systems: Three Easy Pieces 핵심 요약"
series: "Operating Systems: Three Easy Pieces"
seriesOrder: 0
tags: [ostep, operating-systems, virtualization, concurrency, persistence]
---

> **Operating Systems: Three Easy Pieces** 시리즈 개요

## OSTEP이란?

Remzi H. Arpaci-Dusseau와 Andrea C. Arpaci-Dusseau가 쓴 무료 운영체제 교재.

## 세 가지 주제

### 1. 가상화 (Virtualization)

물리적 자원을 추상화:
- **CPU 가상화**: 프로세스, 스케줄링
- **메모리 가상화**: 주소 공간, 페이징

### 2. 동시성 (Concurrency)

동시 실행 관리:
- 스레드
- 락과 동기화
- 동시성 버그

### 3. 영속성 (Persistence)

데이터 저장:
- 파일 시스템
- 디스크와 RAID
- 장애 복구

## 시리즈 구성

### Part 1: CPU 가상화
- [Chapter 1: Introduction](./ch01)
- [Chapter 2: Processes](./ch02)
- [Chapter 3: Process API](./ch03)
- [Chapter 4: Direct Execution](./ch04)
- [Chapter 5: Scheduling](./ch05)
- [Chapter 6: MLFQ](./ch06)

### Part 2: 메모리 가상화
- [Chapter 7: Address Spaces](./ch07)
- [Chapter 8: Memory API](./ch08)
- [Chapter 9: Address Translation](./ch09)
- [Chapter 10: Segmentation](./ch10)
- [Chapter 11: Paging](./ch11)
- [Chapter 12: TLBs](./ch12)
- [Chapter 13: Swapping](./ch13)

### Part 3: 동시성
- [Chapter 14: Threads](./ch14)
- [Chapter 15: Locks](./ch15)
- [Chapter 16: Condition Variables](./ch16)
- [Chapter 17: Semaphores](./ch17)
- [Chapter 18: Concurrency Bugs](./ch18)

### Part 4: 영속성
- [Chapter 19: I/O Devices](./ch19)
- [Chapter 20: Hard Disk Drives](./ch20)
- [Chapter 21: RAID](./ch21)
- [Chapter 22: Files and Directories](./ch22)
- [Chapter 23: File System Implementation](./ch23)
- [Chapter 24: FFS](./ch24)
- [Chapter 25: Crash Consistency](./ch25)
- [Chapter 26: Log-structured File System](./ch26)
- [Chapter 27: Flash-based SSDs](./ch27)
- [Chapter 28: Summary](./ch28)

## 핵심 메시지

> "Three Easy Pieces"는 운영체제의 세 기둥: 가상화, 동시성, 영속성을 이해하기 쉽게 설명한다.

