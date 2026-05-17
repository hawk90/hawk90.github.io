---
title: "Ch 13: USB Drivers"
date: 2026-06-01T13:00:00
description: "usb_driver·URB·endpoint — USB 호스트 사이드 드라이버."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 13
tags: [linux, driver, usb, urb, endpoint]
draft: true
---

> Outline — *USB 스택* — Host Controller → core → 디바이스 드라이버. `usb_driver` — `id_table`·`probe`·`disconnect`. *Endpoint 종류* — control·bulk·interrupt·isochronous. *URB (USB Request Block)* — 비동기 I/O 단위. `usb_submit_urb`·completion. *USB 3.x* 특화 — SuperSpeed·streams. *USB gadget*은 따로 (`drivers/usb/gadget/`).
