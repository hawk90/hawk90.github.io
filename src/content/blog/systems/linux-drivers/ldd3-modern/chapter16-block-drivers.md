---
title: "Ch 16: Block Drivers"
date: 2026-06-01T16:00:00
description: "blk-mq·request_queue·bio — 블록 디바이스 드라이버 모델."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 17
tags: [linux, driver, block, blk-mq, nvme]
draft: true
---

> Outline — LDD3 시절 *legacy request* → 6.x는 *blk-mq* (multi-queue). `blk_mq_ops` — `queue_rq`·`init_hctx`. *bio* — I/O 단위. *gendisk* — 디스크 표현. *I/O scheduler* — mq-deadline·BFQ·Kyber·none. NVMe는 별도 (`drivers/nvme/`). *zoned device* — sequential write.
