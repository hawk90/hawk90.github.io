---
title: "Ch 9: CoE — CANopen over EtherCAT (그리고 다른 oE)"
date: 2026-05-15T09:00:00
description: "EtherCAT mailbox에 얹은 CANopen — Object Dictionary, PDO, SDO 그대로 활용."
series: "Industrial Ethernet"
seriesOrder: 9
tags: [coe, canopen, ethercat, mailbox]
draft: true
---

> Outline — *왜 CoE* — 기존 CANopen 디바이스 프로파일(DS-402 모션 등) 재활용. *Object Dictionary* — index/subindex 기반 16-bit 주소 공간. *SDO (Service Data Object)* — request-response, mailbox. *PDO (Process Data Object)* — cyclic, EtherCAT process data로 매핑. *EoE* — Ethernet over EtherCAT (TCP/IP tunneling). *FoE* — File over EtherCAT (펌웨어 업데이트). *SoE* — Sercos over EtherCAT. *AoE* — ADS over EtherCAT (Beckhoff). 디바이스 프로파일 표준의 힘.
