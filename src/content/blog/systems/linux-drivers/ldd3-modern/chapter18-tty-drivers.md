---
title: "Ch 18: TTY and Serial Drivers"
date: 2026-05-13T18:00:00
description: "tty_driver·uart_driver·line discipline — 직렬·터미널 드라이버."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 19
tags: [linux, driver, tty, serial, uart]
draft: true
---

> Outline — TTY 계층 — line discipline → tty_driver → driver. `uart_driver`·`uart_port` — serial subsystem. *console* — `console` 구조체와 boot console. *flow control* — RTS/CTS. *N_TTY*·N_PPP·N_HDLC line discipline. 6.x의 *serdev bus* — UART에 붙은 디바이스 (Bluetooth chip 등) 모델링.
