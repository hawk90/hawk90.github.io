---
title: "Ch 6: I2C 문제 해결 — Stuck Bus·풀업 저항"
date: 2027-03-01T06:00:00
description: "현장에서 만나는 I2C 버그 패턴과 처방."
series: "Embedded Protocols 심화"
seriesOrder: 6
tags: [i2c, debugging, stuck-bus, pullup]
draft: true
---

> Outline — *Stuck bus* — slave가 SDA를 low로 hold → bus recovery (manual 9-clock pulse). *풀업 저항* 계산 — bus capacitance와 trip time. *Glitch on START/STOP*. *Voltage level mismatch* — level shifter. *Crosstalk·noise*. *Logic analyzer 사용*과 protocol decoder.
