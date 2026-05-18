---
title: "Ch 6: ADC·터치 센서 — 아날로그 입력"
date: 2026-05-01T06:00:00
description: "12-bit SAR ADC × 2 unit, 정전식 터치 9 채널. 캘리브레이션과 노이즈."
series: "ESP32-C3 Mastering"
seriesOrder: 6
tags: [adc, touch, analog, calibration, esp32-c3]
draft: true
---

> Outline — *SAR ADC* — 12-bit, 6 channels (ADC1), attenuation 4 단계. *Calibration* — eFuse Two Point vs Vref. *Continuous mode* — DMA로 high-rate 샘플링. *Touch sensor* — 9 pads, capacitive sensing, wake-up source. *노이즈 대책* — RC filter, averaging, multisampling. ESP32(원본)와 차이 — DAC 없음. 실습 — 배터리 전압 모니터, 터치 슬라이더.
