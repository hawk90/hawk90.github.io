---
title: "Ch 11: Data Types in the Kernel"
date: 2026-05-13T11:00:00
description: "u8·u32·size_t·loff_t — 커널 스타일의 데이터 타입과 endianness."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 11
tags: [linux, kernel, data-types, endianness, portability]
draft: true
---

> Outline — *고정폭 타입* — `u8`·`u16`·`u32`·`u64` vs C99 `uint8_t`류. *인터페이스 타입* — `size_t`·`ssize_t`·`loff_t`·`dev_t`. *바이트 순서* — `cpu_to_le32`·`be32_to_cpu`. *정수 오버플로 회피* — `check_add_overflow`. *링크 리스트 / hlist / list_head* — 커널 자료구조. *컨테이너 매크로* — `container_of`.
