---
title: "Ch 6: I/O Commands"
date: 2026-07-01T07:00:00
description: "NVMe I/O Commands (Read, Write, Flush, Dataset Management)를 분석한다"
series: "NVMe Deep Dive"
seriesOrder: 6
tags: [nvme, read, write, flush, trim]
draft: true
---

I/O Commands는 실제 데이터 전송을 담당한다. 이 장에서는 Read, Write, Flush, Dataset Management 명령을 분석한다.

## Read 명령

TODO: 내용 작성

- Opcode (02h)
- SLBA (Starting LBA)
- NLB (Number of Logical Blocks)
- PRINFO (Protection Information)
- FUA (Force Unit Access)

## Write 명령

TODO: 내용 작성

- Opcode (01h)
- SLBA, NLB
- DTYPE (Directive Type)
- FUA, LR (Limited Retry)

## Flush 명령

TODO: 내용 작성

- Opcode (00h)
- 휘발성 Write Cache 동기화
- 전원 손실 대비

## Compare 명령

TODO: 내용 작성

- Opcode (05h)
- 원자적 비교 연산
- 활용 시나리오

## Dataset Management (Trim/Deallocate)

TODO: 내용 작성

- Opcode (09h)
- Range Definition
- AD (Attribute Deallocate)
- Trim 최적화

## Write Zeroes

TODO: 내용 작성

- Opcode (08h)
- Deallocate와의 차이

## 명령 옵션 플래그

TODO: 내용 작성

| 플래그 | 의미 |
|--------|------|
| FUA | Force Unit Access |
| LR | Limited Retry |
| DTYPE | Directive Type |

## 정리

- Read/Write는 SLBA와 NLB로 범위를 지정한다
- Flush는 휘발성 캐시를 비휘발성 미디어로 동기화한다
- Dataset Management (Trim)는 SSD에 삭제 힌트를 제공한다
- FUA 플래그로 캐시 우회 쓰기가 가능하다

## 다음 장 예고

Ch 7에서는 데이터 버퍼를 지정하는 PRP와 SGL 메커니즘을 다룬다.

## 관련 항목

- [Ch 5: Admin Commands](/blog/embedded/hardware/nvme/chapter05-admin-commands)
- [Ch 7: PRP와 SGL](/blog/embedded/hardware/nvme/chapter07-prp-sgl)
