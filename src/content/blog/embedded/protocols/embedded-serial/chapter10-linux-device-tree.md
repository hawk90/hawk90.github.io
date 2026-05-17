---
title: "Ch 10: 리눅스 디바이스 트리 — SPI·I2C·UART 설정"
date: 2027-03-01T10:00:00
description: "DT node로 직렬 버스와 device 매핑."
series: "Embedded Protocols 심화"
seriesOrder: 10
tags: [linux, device-tree, spi, i2c, uart]
draft: true
---

> Outline — *DT node 구조* — `spi@<addr>`·`i2c@<addr>`·`serial@<addr>`. *Compatible string* — driver binding. *Pinctrl* — pin mux 설정. *clocks·dmas·interrupts* property. *Slave device 자식 노드*. *DT overlay* — 런타임 추가. Yocto·Buildroot 통합.
