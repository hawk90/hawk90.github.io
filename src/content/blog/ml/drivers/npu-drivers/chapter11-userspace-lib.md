---
title: "Ch 11: 유저스페이스 라이브러리 설계"
date: 2027-12-01T11:00:00
description: "Kernel UAPI 위에 — UMD·runtime·compiler integration."
series: "NPU 드라이버 개발"
seriesOrder: 11
tags: [npu, umd, runtime, library-design]
draft: true
---

> Outline — *KMD + UMD split* — kernel mode·user mode. *Stable ABI vs versioned* 결정. *Device discovery* — `/dev/accelN`·sysfs. *Context·queue·buffer 객체* — UMD가 추상. *Command stream builder*·*compiler integration* — MLIR backend가 cmd stream을 토하도록. *Multi-process* synchronization.
