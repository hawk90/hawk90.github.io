---
title: "Ch 15: 성능 최적화"
date: 2026-05-16T16:00:00
description: "NVMe 성능 최적화: Queue Depth, 폴링 모드, NUMA 최적화를 분석한다"
series: "NVMe Deep Dive"
seriesOrder: 15
tags: [nvme, performance, polling, numa, tuning]
draft: true
---

NVMe의 잠재력을 최대한 끌어내려면 시스템 레벨 최적화가 필요하다. 이 장에서는 Queue Depth, 폴링 모드, NUMA 최적화를 다룬다.

## Queue Depth 튜닝

TODO: 내용 작성

- 적정 Queue Depth 찾기
- fio의 `--iodepth` 옵션
- 레이턴시 vs 처리량 트레이드오프

## 폴링 모드

TODO: 내용 작성

- 인터럽트 오버헤드
- `io_uring` 폴링
- `nvme.poll_queues` 커널 파라미터
- 폴링 CPU 점유율

## NUMA 최적화

TODO: 내용 작성

- PCIe 디바이스 NUMA 노드 확인

```bash
cat /sys/class/nvme/nvme0/device/numa_node
```

- 로컬 NUMA 노드에서 I/O 수행
- numactl 활용

## IRQ Affinity

TODO: 내용 작성

```bash
cat /proc/interrupts | grep nvme
echo 8 > /proc/irq/N/smp_affinity_list
```

- irqbalance 비활성화
- CPU 코어별 Queue 매핑

## I/O Scheduler

TODO: 내용 작성

- `none` (passthrough)
- `mq-deadline`
- NVMe에 none이 권장되는 이유

## fio 벤치마크

TODO: 내용 작성

```bash
fio --name=test --ioengine=io_uring --direct=1 \
    --bs=4k --rw=randread --iodepth=64 \
    --numjobs=4 --filename=/dev/nvme0n1
```

## 정리

- Queue Depth는 처리량과 레이턴시의 균형점을 찾아야 한다
- 폴링 모드로 마이크로초 단위 레이턴시를 달성할 수 있다
- NUMA 로컬리티가 대역폭에 큰 영향을 미친다
- NVMe에는 I/O Scheduler `none`이 일반적으로 최적이다

## 다음 장 예고

Ch 16에서는 Firmware 업데이트, Format, Secure Erase 절차를 다룬다.

## 관련 항목

- [Ch 14: nvme-cli](/blog/embedded/hardware/nvme/chapter14-nvme-cli)
- [Ch 16: Firmware와 Format](/blog/embedded/hardware/nvme/chapter16-firmware)
