---
title: "Ch 9: 멀티큐"
date: 2026-07-01T10:00:00
description: "NVMe 멀티큐 전략, Weighted Round Robin, CPU Affinity를 분석한다"
series: "NVMe Deep Dive"
seriesOrder: 9
tags: [nvme, multiqueue, wrr, numa, affinity]
draft: true
---

NVMe의 강점 중 하나는 수만 개의 I/O Queue를 지원하는 것이다. 이 장에서는 멀티큐 전략, 중재 메커니즘, CPU Affinity를 분석한다.

## 멀티큐의 필요성

TODO: 내용 작성

- 코어당 Queue로 락 경합 제거
- MSI-X 인터럽트 분산
- NUMA 로컬리티 최적화

## Queue 개수 결정

TODO: 내용 작성

- Controller가 지원하는 최대 Queue 수
- Set Features (FID=07h)로 요청
- 일반적 전략: CPU 코어 수만큼

## Arbitration 메커니즘

TODO: 내용 작성

- Round Robin
- Weighted Round Robin with Urgent Priority Class
- Vendor Specific

## Weighted Round Robin (WRR)

TODO: 내용 작성

- Urgent, High, Medium, Low 우선순위
- QPRIO (Queue Priority) 설정
- Arbitration Burst 설정

## CPU Affinity

TODO: 내용 작성

- MSI-X 벡터와 CPU 매핑
- irqbalance vs 수동 설정
- `/proc/irq/N/smp_affinity`

## NUMA 최적화

TODO: 내용 작성

- PCIe 디바이스의 NUMA 노드 확인
- 로컬 메모리 할당
- numactl 활용

## 정리

- 코어당 Queue 할당으로 락 경합을 제거한다
- WRR로 Queue 간 우선순위를 조정한다
- MSI-X 인터럽트를 적절히 분산해야 한다
- NUMA 토폴로지를 고려한 메모리 배치가 중요하다

## 다음 장 예고

Ch 10에서는 에러 처리와 복구 전략, AER(Asynchronous Event Reporting)을 다룬다.

## 관련 항목

- [Ch 8: Completion](/blog/embedded/hardware/nvme/chapter08-completion)
- [Ch 10: 에러 처리](/blog/embedded/hardware/nvme/chapter10-error-handling)
