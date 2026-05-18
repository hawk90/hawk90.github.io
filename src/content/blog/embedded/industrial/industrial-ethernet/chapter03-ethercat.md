---
title: "Ch 3: EtherCAT — 'Process on the Fly'와 Distributed Clock"
date: 2026-05-15T03:00:00
description: "Beckhoff의 산업용 이더넷. 슬레이브가 패킷을 통과시키며 데이터를 빼고 채운다."
series: "Industrial Ethernet"
seriesOrder: 3
tags: [ethercat, beckhoff, distributed-clock, real-time]
draft: true
---

> Outline — *Process on the Fly* — 슬레이브 ESC 칩이 패킷이 지나가는 중에 데이터 추출·삽입. 한 패킷이 line topology 전체를 한 사이클에 순회. *Cycle time* — 100µs (1000 axes 기준). *Distributed Clock (DC)* — 64-bit µs 시계, 슬레이브 간 jitter <1µs. *Mailbox protocol* — CoE (CANopen), EoE, FoE, SoE. *Topology* — line, ring with cable redundancy. *ESC IP* — ET1100, ET1200 (Beckhoff), 또는 FPGA. 자동차 모션·반도체 장비의 1위.
