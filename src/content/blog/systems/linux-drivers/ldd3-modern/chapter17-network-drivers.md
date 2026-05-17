---
title: "Ch 17: Network Drivers"
date: 2026-06-01T17:00:00
description: "net_device·NAPI·sk_buff — 네트워크 드라이버의 송수신 경로."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 18
tags: [linux, driver, network, napi, skb]
draft: true
---

> Outline — `net_device`·`netdev_ops` — register/unregister. *sk_buff (skb)* — 패킷 표현. *수신 경로* — IRQ → NAPI poll → `netif_receive_skb`. *송신 경로* — `ndo_start_xmit`·queue management. *NAPI* — interrupt mitigation. 6.x의 *XDP (eXpress Data Path)* — BPF 훅. *checksum offload*·*GSO*·*RSS*.
