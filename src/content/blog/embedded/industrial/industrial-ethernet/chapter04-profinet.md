---
title: "Ch 4: PROFINET — RT vs IRT, Siemens 생태계"
date: 2026-05-15T04:00:00
description: "PROFIBUS의 후속. 3 등급 (TCP/IP, RT, IRT) — 후자로 갈수록 결정성·하드웨어 요구↑."
series: "Industrial Ethernet"
seriesOrder: 4
tags: [profinet, profibus, siemens, irt]
draft: true
---

> Outline — *3 conformance classes* — CC-A (TCP/IP 위 무수정 이더넷), CC-B (RT), CC-C (IRT). *RT (Real-Time)* — VLAN priority + 우회 IP stack, cycle ~1ms. *IRT (Isochronous Real-Time)* — schedule slots, jitter <1µs, special ASIC (ERTEC). *PROFIenergy* — 절전 프로파일. *GSDML* — 디바이스 description XML. *Topology* — line, ring (MRP), star. *주요 시장* — 유럽 자동차 (VW, BMW), Siemens PLC와 결합.
