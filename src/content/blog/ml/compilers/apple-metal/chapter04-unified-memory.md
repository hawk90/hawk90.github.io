---
title: "Ch 4: Unified Memory와 Storage Mode"
date: 2027-11-01T04:00:00
description: "CPU·GPU·ANE가 같은 물리 메모리를 공유한다."
series: "Apple Metal Stack"
seriesOrder: 4
tags: [metal, unified-memory, storage-mode, apple-silicon]
draft: true
---

> Outline — *Apple Silicon UMA* — CPU와 GPU가 같은 LPDDR5. *Storage mode* — `shared`·`managed`·`private`·`memoryless`. *Resource hazard*·sync. *Heap allocator*·*Argument Buffer*. *Zero-copy* 가능성. *CUDA host-device transfer 모델과 차이* — explicit copy 불필요. *AGX cache coherency*.
