---
title: "Ch 7: UART 기초 — 보레이트·프레이밍"
date: 2027-03-01T07:00:00
description: "Start·Data·Parity·Stop — 비동기 직렬의 정석."
series: "Embedded Protocols 심화"
seriesOrder: 7
tags: [uart, baud, parity, framing]
draft: true
---

> Outline — *Asynchronous* — clock 공유 없이 양단 baud rate 일치. *Frame* — start bit + data (5-9 bit) + parity + stop bit. *Common baud* — 9600·115200·921600. *Oversampling* — receiver가 8/16× clock으로 추출. *Framing error*·*overrun*·*parity error*.
