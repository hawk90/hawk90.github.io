---
title: "Ch 7: PRP와 SGL"
date: 2026-07-01T08:00:00
description: "NVMe의 데이터 버퍼 지정 방식인 PRP List와 SGL Segment를 분석한다"
series: "NVMe Deep Dive"
seriesOrder: 7
tags: [nvme, prp, sgl, dma]
draft: true
---

NVMe 명령은 호스트 메모리의 데이터 버퍼 위치를 Controller에 알려야 한다. 이 장에서는 두 가지 버퍼 지정 방식인 PRP(Physical Region Page)와 SGL(Scatter Gather List)를 분석한다.

## PRP (Physical Region Page)

TODO: 내용 작성

- PRP Entry 구조 (8바이트)
- Page Offset
- PRP1, PRP2 필드

## PRP List

TODO: 내용 작성

- 대용량 전송 시 PRP List 사용
- PRP List Pointer
- 체이닝 규칙
- 메모리 레이아웃 예시

## SGL (Scatter Gather List)

TODO: 내용 작성

- SGL Descriptor 유형
- Data Block Descriptor
- Segment Descriptor
- Last Segment Descriptor

## PRP vs SGL 비교

TODO: 내용 작성

| 특성 | PRP | SGL |
|------|-----|-----|
| 정렬 요구 | 페이지 경계 | 유연함 |
| 오버헤드 | 낮음 | 중간 |
| 지원 필수 | 예 | 선택 |

## MDTS와 버퍼 크기

TODO: 내용 작성

- Maximum Data Transfer Size 제약
- PRP List / SGL 분할

## Controller 지원 확인

TODO: 내용 작성

- Identify Controller의 SGL Support 필드
- SGLS (SGL Support) 비트맵

## 정리

- PRP는 페이지 단위 정렬이 필요하지만 오버헤드가 낮다
- SGL은 더 유연하지만 선택적 지원이다
- MDTS를 초과하면 명령을 분할해야 한다
- Admin 명령은 PRP만 사용한다

## 다음 장 예고

Ch 8에서는 Completion Queue Entry 구조와 Status Code 체계를 분석한다.

## 관련 항목

- [Ch 6: I/O Commands](/blog/embedded/hardware/nvme/chapter06-io-commands)
- [Ch 8: Completion](/blog/embedded/hardware/nvme/chapter08-completion)
