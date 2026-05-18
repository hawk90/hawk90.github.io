---
title: "3-11: Stream Buffer와 Message Buffer"
date: 2026-05-12T32:00:00
description: "3-11: Stream Buffer와 Message Buffer"
series: "Practical RTOS Internals"
seriesOrder: 32
tags: [stream-buffer, message-buffer, freertos, ipc, lock-free, spsc]
draft: true
---

> Outline — FreeRTOS 10+ 추가. Lock-free SPSC ring buffer 기반 — single-producer single-consumer 가정으로 queue보다 빠름. Stream: byte 단위. Message: variable-length frame. ISR-safe variant.
