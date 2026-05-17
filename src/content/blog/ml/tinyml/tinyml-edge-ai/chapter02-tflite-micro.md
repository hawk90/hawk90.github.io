---
title: "Ch 2: TensorFlow Lite Micro 아키텍처"
date: 2028-04-01T02:00:00
description: "Bare-metal interpreter — no malloc·no OS."
series: "TinyML·Edge AI"
seriesOrder: 2
tags: [tflite-micro, interpreter, baremetal]
draft: true
---

> Outline — *TFLM* — TFLite의 MCU 변형. *No dynamic allocation*·*no OS*·*no stdlib*. *FlatBuffer model* — `.tflite` file. *OpResolver* — 사용되는 op만 link. *MicroErrorReporter*·*MicroInterpreter*. *Tensor arena* — 사용자가 buffer 제공. *Selective build* — 최종 binary 100 KB 이내.
