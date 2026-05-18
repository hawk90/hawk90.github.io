---
title: "Ch 5: 시리얼 통신 4종 — UART·SPI·I2C·I2S"
date: 2026-05-01T05:00:00
description: "주변 디바이스와의 4대 통신. DMA 활용, 인터럽트 vs polling."
series: "ESP32-C3 Mastering"
seriesOrder: 5
tags: [uart, spi, i2c, i2s, dma, esp32-c3]
draft: true
---

> Outline — *UART* — 2 controllers, RS-232/485 호환. *SPI* — Master/Slave, GP-SPI 2종, DMA 지원. *I2C* — 1 controller, 100k/400k/1MHz. *I2S* — 1 controller (오디오·PCM·PDM). *DMA descriptor ring* — ESP-IDF DMA API. *Polling vs interrupt vs DMA* — 처리량·지연 비교. 실습 — SSD1306 OLED (I2C), SD card (SPI), I2S DAC.
