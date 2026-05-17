---
title: "Ch 10: 리눅스 미디어 서브시스템 — V4L2·DRM/KMS"
date: 2027-05-01T10:00:00
description: "V4L2 (capture) + DRM/KMS (display) — MIPI device의 Linux 통합."
series: "MIPI 심화"
seriesOrder: 10
tags: [linux, v4l2, drm, kms, media]
draft: true
---

> Outline — *V4L2 (Video4Linux 2)* — `/dev/videoN`·`/dev/v4l-subdevN`. *Media controller* — entity graph (sensor → CSI receiver → ISP → DMA). *DRM/KMS* — plane·CRTC·encoder·bridge·panel. *DSI bridge driver*. *Async subdev binding*. *Format negotiation* — `set_fmt`.
