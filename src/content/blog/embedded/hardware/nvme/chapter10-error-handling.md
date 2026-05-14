---
title: "Ch 10: 에러 처리"
date: 2026-07-01T11:00:00
description: "NVMe Status Code 분류, 복구 전략, AER(Asynchronous Event Reporting) 연동을 분석한다"
series: "NVMe Deep Dive"
seriesOrder: 10
tags: [nvme, error, aer, recovery]
draft: true
---

스토리지 시스템에서 에러 처리는 데이터 무결성과 가용성의 핵심이다. 이 장에서는 NVMe의 에러 분류와 복구 전략, AER 메커니즘을 분석한다.

## Status Code 분류

TODO: 내용 작성

- Generic vs Command Specific vs Media
- Transient vs Permanent
- DNR (Do Not Retry) 의미

## 재시도 전략

TODO: 내용 작성

- Transient 에러 재시도
- 지수 백오프
- 재시도 횟수 제한

## Controller 리셋

TODO: 내용 작성

- CC.EN=0 → CC.EN=1 시퀀스
- 리셋 후 Queue 재생성
- 미완료 명령 처리

## AER (Asynchronous Event Request)

TODO: 내용 작성

- AER 명령 개요
- Event Type (Error, S.M.A.R.T., Notice)
- 이벤트 처리 흐름

## 주요 AER 이벤트

TODO: 내용 작성

| Event Type | Event Info | 의미 |
|------------|------------|------|
| Error | Invalid SQ | 잘못된 SQ 참조 |
| S.M.A.R.T. | Temperature | 온도 임계값 초과 |
| Notice | Namespace Attribute Changed | NS 속성 변경 |

## Error Log Page

TODO: 내용 작성

- Get Log Page (LID=01h)
- Error Log Entry 구조
- 에러 이력 분석

## 정리

- Status Code의 DNR 비트로 재시도 가능 여부를 판단한다
- Transient 에러는 재시도로 복구 가능하다
- AER로 비동기 이벤트를 수신한다
- Error Log Page로 에러 이력을 조회한다

## 다음 장 예고

Ch 11에서는 Linux 커널의 NVMe 드라이버 구조 (nvme-core, nvme-pci)를 분석한다.

## 관련 항목

- [Ch 9: 멀티큐](/blog/embedded/hardware/nvme/chapter09-multiqueue)
- [Ch 11: Linux 드라이버 개요](/blog/embedded/hardware/nvme/chapter11-linux-overview)
