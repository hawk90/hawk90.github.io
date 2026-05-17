---
title: "Ch 4: ioctl 인터페이스 설계"
date: 2027-12-01T04:00:00
description: "Userspace ↔ driver 약속 — 한 번 만들면 영원히 지원."
series: "NPU 드라이버 개발"
seriesOrder: 4
tags: [npu, ioctl, uapi, abi]
draft: true
---

> Outline — *ioctl 설계 원칙* — versionable·forward-compatible·64-bit safe. *struct 크기* — `__u64`·reserved field. *Cmd encoding* — `_IO`·`_IOR`·`_IOW`·`_IOWR`. *DRM ioctl pattern* — DRM_IOCTL_*·DRM_AUTH·DRM_MASTER 권한. *Capability discovery*. *Deprecation policy* — UAPI는 stable contract.
