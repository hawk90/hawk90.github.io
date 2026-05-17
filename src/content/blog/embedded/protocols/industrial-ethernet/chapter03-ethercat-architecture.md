---
title: "Ch 3: EtherCAT 아키텍처 — Processing on the Fly"
date: 2027-06-01T03:00:00
description: "Slave가 프레임을 통과시키면서 읽고 쓴다 — EtherCAT 핵심."
series: "Industrial Ethernet 심화"
seriesOrder: 3
tags: [ethercat, beckhoff, on-the-fly]
draft: true
---

> Outline — *EtherCAT 모델* — 1 master + N slave를 *daisy-chain*. *Frame이 slave를 통과하면서 in-flight 읽기/쓰기*. *FMMU·Sync Manager* — slave 하드웨어 자원. *μs cycle*. *Distributed Clock (DC)* — sub-μs 동기. *Beckhoff 종속성* vs *ETG (EtherCAT Technology Group)* 표준화.
