---
title: "Ch 10: BYOC — NPU 백엔드 통합"
date: 2028-02-01T10:00:00
description: "기존 ML compiler에 vendor 가속기 끼우기."
series: "ML 컴파일러"
seriesOrder: 10
tags: [byoc, backend, npu-integration, vendor]
draft: true
---

> Outline — *BYOC (Bring Your Own Codegen)* — TVM의 vendor 진입 API. *Partition* — graph를 supported/unsupported 영역 분리. *Codegen function*. *Runtime module* — 벤더 SDK 호출. *MLIR BYOC equivalent* — `func.call_extern`·`extension dialect`. *Vendor sample* — Ethos-N·Arm Compute Library·OpenVINO.
