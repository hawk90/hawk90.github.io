---
title: "Ch 6: CCSDS Space Packet Protocol"
date: 2026-05-27T06:00:00
description: "CCSDS 133.0-B — packet 구조·APID·sequence count·user data field."
series: "Launch Vehicle Flight Software"
seriesOrder: 6
tags: [avionics, ccsds, space-packet, telemetry]
draft: true
---

> Outline — CCSDS Space Packet Protocol — *primary header*(version·type·sec hdr flag·APID·sequence flag·sequence count·packet data length)·*secondary header*(time code, ancillary)·*user data field*. APID로 *데이터 분류*. TM packet (downlink) vs TC packet (uplink). 패킷 routing와 *virtual channel*과의 관계. NASA·ESA·KARI가 모두 채택.
