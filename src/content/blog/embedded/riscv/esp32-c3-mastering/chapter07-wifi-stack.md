---
title: "Ch 7: WiFi 4 스택 — Station·SoftAP·Mesh"
date: 2026-05-01T07:00:00
description: "802.11 b/g/n. ESP-IDF WiFi API, 4가지 모드. WPA2/WPA3 보안."
series: "ESP32-C3 Mastering"
seriesOrder: 7
tags: [wifi, "802.11", esp-idf, wpa2, wpa3, esp32-c3]
draft: true
---

> Outline — *모드 4종* — Station, SoftAP, Station+AP, Mesh. *Event loop* — `esp_event_handler_register`. *연결 흐름* — scan → connect → IP. *WPA2-Personal / WPA3-Personal / Enterprise*. *Power save* — modem sleep, DTIM listen interval. *ESP-MESH* — self-organizing tree mesh. *Smart Config / SoftAP provisioning*. *최대 처리량* — TCP 약 20Mbps, UDP 30Mbps (2.4GHz 한계).
