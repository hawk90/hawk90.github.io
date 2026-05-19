---
title: "Ch 3: Namespace"
date: 2026-05-16T04:00:00
description: "NVMe Namespace의 개념과 Multi-path I/O 구성을 분석한다"
series: "NVMe Deep Dive"
seriesOrder: 3
tags: [nvme, namespace, multipath, subsystem]
draft: true
---

Namespace는 NVMe에서 논리적인 스토리지 단위다. 하나의 Controller가 여러 Namespace를 관리할 수 있으며, 반대로 하나의 Namespace를 여러 Controller가 공유할 수도 있다. 이 장에서는 Namespace의 구조와 Multi-path I/O를 다룬다.

## Namespace 기본 개념

TODO: 내용 작성

- NSID (Namespace Identifier)
- 논리 블록 주소 (LBA)
- Namespace Size vs Capacity

## Identify Namespace 구조체

TODO: 내용 작성

- NSZE (Namespace Size)
- NCAP (Namespace Capacity)
- NLBAF (Number of LBA Formats)
- FLBAS (Formatted LBA Size)

## NVMe Subsystem

TODO: 내용 작성

- Subsystem NQN (NVMe Qualified Name)
- Controller 간 Namespace 공유
- ANA (Asymmetric Namespace Access)

## Multi-path I/O

TODO: 내용 작성

- Active/Active vs Active/Passive
- Linux nvme-multipath 드라이버
- 경로 선택 정책

## Namespace Management

TODO: 내용 작성

- Namespace Create/Delete
- Namespace Attach/Detach
- 동적 프로비저닝

## 정리

- Namespace는 논리적인 스토리지 블록 집합이다
- 하나의 Controller는 여러 Namespace를 가질 수 있다
- Multi-path I/O로 고가용성과 성능 향상을 달성한다
- ANA는 경로 상태를 호스트에 알린다

## 다음 장 예고

Ch 4에서는 NVMe 성능의 핵심인 Submission Queue와 Completion Queue 메커니즘을 상세히 분석한다.

## 관련 항목

- [Ch 2: Controller](/blog/embedded/hardware/nvme/chapter02-controller)
- [Ch 4: Queue 메커니즘](/blog/embedded/hardware/nvme/chapter04-queue-mechanism)
