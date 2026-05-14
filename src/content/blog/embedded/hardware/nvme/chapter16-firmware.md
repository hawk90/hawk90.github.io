---
title: "Ch 16: Firmware와 Format"
date: 2026-07-01T17:00:00
description: "NVMe Firmware 업데이트, Format NVM, Secure Erase 절차를 분석한다"
series: "NVMe Deep Dive"
seriesOrder: 16
tags: [nvme, firmware, format, secure-erase]
draft: true
---

NVMe 디바이스의 펌웨어 업데이트와 포맷은 운영 중 필요한 관리 작업이다. 이 장에서는 안전한 절차와 주의사항을 다룬다.

## Firmware Slot

TODO: 내용 작성

- 다중 슬롯 구조
- 활성 슬롯 vs 다음 부팅 슬롯
- Identify Controller의 FRMW 필드

## Firmware Download

TODO: 내용 작성

- Firmware Image Download 명령
- 오프셋 기반 전송
- 이미지 크기 제한

## Firmware Commit

TODO: 내용 작성

- Commit Action
  - 0: 다음 리셋 시 활성화
  - 1: 즉시 활성화
  - 2: 다음 리셋 시 활성화 (슬롯 변경 없이)
  - 3: 즉시 활성화 (슬롯 변경 없이)

## Firmware 업데이트 절차

TODO: 내용 작성

```bash
# 1. 현재 펌웨어 확인
nvme fw-log /dev/nvme0

# 2. 펌웨어 다운로드
nvme fw-download /dev/nvme0 --fw=firmware.bin

# 3. 커밋 (즉시 활성화)
nvme fw-commit /dev/nvme0 --slot=1 --action=1

# 4. 확인
nvme fw-log /dev/nvme0
```

## Format NVM

TODO: 내용 작성

- LBA Format 선택
- Secure Erase Settings (SES)
- Protection Information

## Secure Erase

TODO: 내용 작성

| SES | 의미 |
|-----|------|
| 0 | No secure erase |
| 1 | User Data Erase |
| 2 | Cryptographic Erase |

## 주의사항

TODO: 내용 작성

- 데이터 백업 필수
- 전원 안정성 확보
- Format 중 I/O 금지
- 복구 불가능한 작업

## 정리

- NVMe는 여러 Firmware 슬롯을 지원한다
- Download → Commit 순서로 펌웨어를 업데이트한다
- Format NVM으로 Namespace를 초기화한다
- Cryptographic Erase가 가장 확실한 보안 삭제 방법이다

## 다음 장 예고

Ch 17에서는 Controller Register Map (CAP/VS/CC/CSTS/AQA/ASQ/ACQ)을 상세히 분석한다.

## 관련 항목

- [Ch 15: 성능 최적화](/blog/embedded/hardware/nvme/chapter15-performance)
- [Ch 17: Register Map](/blog/embedded/hardware/nvme/chapter17-register-maps)
