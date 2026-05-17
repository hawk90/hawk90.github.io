---
title: "Ch 5: CAN 에러 처리 — Error Frames·Fault Confinement"
date: 2027-04-01T05:00:00
description: "Active·Passive·Bus-off — 노드의 에러 상태 머신."
series: "CAN Bus 심화"
seriesOrder: 5
tags: [can, error, fault-confinement, bus-off]
draft: true
---

> Outline — *5가지 error* — bit·stuff·CRC·form·ACK. *Transmit Error Counter (TEC)*·*Receive Error Counter (REC)*. *Error Active* (TEC<128) → *Error Passive* (128≤TEC<256) → *Bus Off* (TEC≥256). *Recovery* — 11 consecutive recessive bits. *고장 격리* — 한 노드가 버스 전체를 못 막게 한다.
