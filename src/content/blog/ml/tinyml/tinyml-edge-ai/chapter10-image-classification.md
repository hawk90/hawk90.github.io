---
title: "Ch 10: 이미지 분류 on MCU"
date: 2028-04-01T10:00:00
description: "96×96 grayscale·MobileNet 최소 — vision on Cortex-M."
series: "TinyML·Edge AI"
seriesOrder: 10
tags: [tinyml, vision, mobilenet, image-classification]
draft: true
---

* Outline — *Person detection·visual wake word* — Pete Warden classic example. *Model* — MobileNetV2 minimal·MicroNets. *Input size* 90-100 px grayscale로 메모리 축소. *Camera interface* — OV7670·HiMax HM01B0 (low-power). *Performance* — Cortex-M4 @ 100 MHz로 1-5 FPS. *Edge Impulse·OpenMV* 워크플로.
