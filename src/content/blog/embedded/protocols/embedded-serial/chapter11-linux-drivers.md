---
title: "Ch 11: 리눅스 드라이버 — spidev·i2c-dev·ttyS"
date: 2027-03-01T11:00:00
description: "Userspace에서 직렬 device 다루기."
series: "Embedded Protocols 심화"
seriesOrder: 11
tags: [linux, spidev, i2c-dev, ttys, userspace]
draft: true
---

> Outline — *spidev* — `/dev/spidevX.Y`, `SPI_IOC_MESSAGE` ioctl. *i2c-dev* — `/dev/i2c-N`, `I2C_SLAVE`·`I2C_RDWR` ioctl. *ttyS·ttyUSB* — `termios`로 baud·flow control. *libgpiod*와 조합 — bit-bang 보완. *Kernel driver 작성* vs userspace 선택 기준.
