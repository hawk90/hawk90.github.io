---
title: "Ch 8: Completion"
date: 2026-07-01T09:00:00
description: "NVMe Completion Queue Entry 구조와 Status Code 체계를 분석한다"
series: "NVMe Deep Dive"
seriesOrder: 8
tags: [nvme, completion, status-code, error]
draft: true
---

모든 NVMe 명령은 Completion Queue Entry로 결과를 반환한다. 이 장에서는 CQ Entry 구조와 Status Code 체계를 분석한다.

## Completion Queue Entry 구조

TODO: 내용 작성

- DW0: Command Specific
- DW1: Reserved
- DW2: SQ Head Pointer, SQ Identifier
- DW3: Status Field, Command Identifier, Phase Tag

## Status Field 구조

TODO: 내용 작성

- P (Phase Tag)
- SC (Status Code)
- SCT (Status Code Type)
- CRD (Command Retry Delay)
- M (More)
- DNR (Do Not Retry)

## Status Code Type (SCT)

TODO: 내용 작성

| SCT | 의미 |
|-----|------|
| 0h | Generic Command Status |
| 1h | Command Specific Status |
| 2h | Media and Data Integrity Errors |
| 3h | Path Related Status |
| 7h | Vendor Specific |

## 주요 Status Code

TODO: 내용 작성

### Generic Command Status (SCT=0)

- Successful Completion (00h)
- Invalid Command Opcode (01h)
- Invalid Field in Command (02h)
- Data Transfer Error (04h)
- Internal Error (06h)

### Media and Data Integrity (SCT=2)

- Write Fault (80h)
- Unrecovered Read Error (81h)

## Do Not Retry (DNR)

TODO: 내용 작성

- DNR=0: 재시도 가능
- DNR=1: 재시도 무의미
- 드라이버의 재시도 정책

## 정리

- CQ Entry는 16바이트이며 명령 결과를 담는다
- Status Field는 SCT와 SC로 에러 유형을 분류한다
- Phase Tag로 Entry 유효성을 판단한다
- DNR 비트로 재시도 가능 여부를 결정한다

## 다음 장 예고

Ch 9에서는 멀티큐 전략, Weighted Round Robin, CPU Affinity를 다룬다.

## 관련 항목

- [Ch 7: PRP와 SGL](/blog/embedded/hardware/nvme/chapter07-prp-sgl)
- [Ch 9: 멀티큐](/blog/embedded/hardware/nvme/chapter09-multiqueue)
