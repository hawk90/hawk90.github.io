---
title: "Ch 3: 메모리 맵·플래시·SPIFFS/LittleFS"
date: 2026-05-01T03:00:00
description: "ESP32-C3 메모리 구조 — 400KB SRAM, 4MB SPI flash, MMU. 파일시스템 선택."
series: "ESP32-C3 Mastering"
seriesOrder: 3
tags: [memory, flash, mmu, spiffs, littlefs, esp32-c3]
draft: true
---

> Outline — *메모리 맵* — IRAM·DRAM·RTC SRAM·external flash via MMU. *플래시 파티션 테이블* — bootloader·partition·factory·NVS·spiffs. *NVS* — non-volatile storage for key/value. *파일시스템* — SPIFFS (legacy) vs LittleFS (powerfail-safe, ESP-IDF 5.x 권장). *OTA* — A/B 파티션. *Heap regions* — IRAM exec heap, DRAM data heap. capabilities-based allocator (`MALLOC_CAP_*`).
