---
title: "Ch 13: Linux Admin 처리"
date: 2026-05-16T14:00:00
description: "Linux NVMe 드라이버의 Admin Queue 처리, Identify, Features 구현을 분석한다"
series: "NVMe Deep Dive"
seriesOrder: 13
tags: [nvme, linux, admin, ioctl]
draft: true
---

Admin 명령은 Controller 관리와 설정에 사용된다. 이 장에서는 Linux 드라이버가 Admin 명령을 어떻게 처리하는지 분석한다.

## Admin Queue 초기화

TODO: 내용 작성

- ASQ/ACQ 레지스터 설정
- Admin Queue 메모리 할당
- AQA (Admin Queue Attributes)

## 동기 명령 제출

TODO: 내용 작성

- `nvme_submit_sync_cmd()`
- 블로킹 대기
- 타임아웃 처리

## Identify 구현

TODO: 내용 작성

- `nvme_identify_ctrl()`
- `nvme_identify_ns()`
- DMA 버퍼 할당

## Get/Set Features 구현

TODO: 내용 작성

- `nvme_get_features()`
- `nvme_set_features()`
- Number of Queues 협상

## Character Device Interface

TODO: 내용 작성

- `/dev/nvme0`, `/dev/nvme0n1`
- ioctl 명령 (NVME_IOCTL_*)
- passthrough 명령

## sysfs 인터페이스

TODO: 내용 작성

- `/sys/class/nvme/nvme0/`
- model, serial, firmware_rev
- Namespace 정보

## 정리

- Admin Queue는 초기화 시 가장 먼저 생성된다
- 동기 명령 API로 Admin 명령을 제출한다
- Character device로 userspace에서 직접 명령을 보낼 수 있다
- sysfs로 Controller/Namespace 정보를 조회한다

## 다음 장 예고

Ch 14에서는 nvme-cli 도구의 사용법을 완전 정복한다.

## 관련 항목

- [Ch 12: Linux I/O 경로](/blog/embedded/hardware/nvme/chapter12-linux-io-path)
- [Ch 14: nvme-cli](/blog/embedded/hardware/nvme/chapter14-nvme-cli)
