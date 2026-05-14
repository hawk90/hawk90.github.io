---
title: "Ch 11: Linux 드라이버 개요"
date: 2026-07-01T12:00:00
description: "Linux 커널의 NVMe 드라이버 구조 (nvme-core, nvme-pci)를 분석한다"
series: "NVMe Deep Dive"
seriesOrder: 11
tags: [nvme, linux, kernel, driver]
draft: true
---

Linux는 mainline 커널에 NVMe 드라이버를 포함하고 있다. 이 장에서는 nvme-core와 nvme-pci 모듈의 전체 구조를 분석한다.

## 모듈 구조

TODO: 내용 작성

- nvme-core: 공통 로직
- nvme-pci: PCIe 전송
- nvme-fc: Fibre Channel over Fabrics
- nvme-rdma: RDMA over Fabrics
- nvme-tcp: TCP over Fabrics

## 주요 자료구조

TODO: 내용 작성

- `struct nvme_ctrl`
- `struct nvme_ns`
- `struct nvme_queue`
- `struct nvme_command`

## nvme-core 역할

TODO: 내용 작성

- 공통 명령 처리
- Namespace 관리
- Character device (`/dev/nvme*`)
- sysfs 인터페이스

## nvme-pci 역할

TODO: 내용 작성

- PCIe 디바이스 probe/remove
- Queue 메모리 할당
- Doorbell 접근
- 인터럽트 핸들러

## blk-mq와의 통합

TODO: 내용 작성

- Hardware Queue 매핑
- `blk_mq_ops` 구현
- 태그 기반 명령 추적

## 초기화 시퀀스

TODO: 내용 작성

1. PCIe 디바이스 발견
2. BAR 매핑
3. Admin Queue 생성
4. Identify Controller
5. I/O Queue 생성
6. Namespace 스캔
7. Block device 등록

## 정리

- nvme-core는 전송 독립적인 공통 로직을 담당한다
- nvme-pci는 PCIe 전송 계층을 구현한다
- blk-mq와 통합하여 멀티큐 블록 I/O를 지원한다
- 초기화 시 Admin Queue → Identify → I/O Queue 순서로 진행한다

## 다음 장 예고

Ch 12에서는 blk-mq에서 nvme_cmd까지의 I/O 경로를 상세히 추적한다.

## 관련 항목

- [Ch 10: 에러 처리](/blog/embedded/hardware/nvme/chapter10-error-handling)
- [Ch 12: Linux I/O 경로](/blog/embedded/hardware/nvme/chapter12-linux-io-path)
