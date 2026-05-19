---
title: "Ch 14: nvme-cli"
date: 2026-05-16T15:00:00
description: "nvme-cli 도구를 활용한 NVMe 디바이스 관리와 진단을 완전 정복한다"
series: "NVMe Deep Dive"
seriesOrder: 14
tags: [nvme, nvme-cli, diagnostic, admin]
draft: true
---

nvme-cli는 Linux에서 NVMe 디바이스를 관리하고 진단하는 표준 도구다. 이 장에서는 핵심 명령어를 완전 정복한다.

## 설치와 기본 사용

TODO: 내용 작성

```bash
apt install nvme-cli
nvme list
nvme version
```

## 디바이스 정보 조회

TODO: 내용 작성

```bash
nvme id-ctrl /dev/nvme0
nvme id-ns /dev/nvme0n1
nvme list-ns /dev/nvme0
```

## S.M.A.R.T. 정보

TODO: 내용 작성

```bash
nvme smart-log /dev/nvme0
nvme error-log /dev/nvme0
```

## Namespace 관리

TODO: 내용 작성

```bash
nvme create-ns /dev/nvme0 --nsze=... --ncap=...
nvme attach-ns /dev/nvme0 --namespace-id=1 --controllers=0
nvme delete-ns /dev/nvme0 --namespace-id=1
```

## Features 조회/설정

TODO: 내용 작성

```bash
nvme get-feature /dev/nvme0 --feature-id=0x07
nvme set-feature /dev/nvme0 --feature-id=0x07 --value=...
```

## Firmware 관리

TODO: 내용 작성

```bash
nvme fw-download /dev/nvme0 --fw=firmware.bin
nvme fw-commit /dev/nvme0 --slot=1 --action=1
nvme fw-log /dev/nvme0
```

## Format NVM

TODO: 내용 작성

```bash
nvme format /dev/nvme0n1 --ses=0 --lbaf=0
```

## Secure Erase

TODO: 내용 작성

```bash
nvme format /dev/nvme0n1 --ses=1  # User Data Erase
nvme format /dev/nvme0n1 --ses=2  # Cryptographic Erase
```

## 성능 테스트 연동

TODO: 내용 작성

```bash
nvme io-passthru /dev/nvme0n1 --opcode=0x02 ...
```

## 정리

- `nvme list`로 시스템의 NVMe 디바이스를 조회한다
- `nvme id-ctrl/id-ns`로 상세 정보를 확인한다
- `nvme smart-log`로 건강 상태를 모니터링한다
- Namespace 생성/삭제, Firmware 업데이트, Format을 수행할 수 있다

## 다음 장 예고

Ch 15에서는 Queue Depth, 폴링 모드, NUMA 최적화를 통한 성능 튜닝을 다룬다.

## 관련 항목

- [Ch 13: Linux Admin 처리](/blog/embedded/hardware/nvme/chapter13-linux-admin)
- [Ch 15: 성능 최적화](/blog/embedded/hardware/nvme/chapter15-performance)
