---
title: "Ch 4: GPIO·LEDC·MCPWM — 디지털 출력의 세 모드"
date: 2026-05-01T04:00:00
description: "22개 GPIO, GPIO Matrix로 페리퍼럴 자유 매핑. LEDC PWM, MCPWM (모터 제어)."
series: "ESP32-C3 Mastering"
seriesOrder: 4
tags: [gpio, pwm, ledc, mcpwm, esp32-c3]
draft: true
---

> Outline — *GPIO Matrix* — 모든 페리퍼럴 신호를 임의 GPIO에 라우팅 가능 (ESP32 시리즈 특징). *Strapping pins* — boot mode 결정. *Pull-up/down*, *open-drain*, *drive strength*. *LEDC* — 6 channels, fade hardware. *MCPWM* — 2 timers × 3 operators, 데드밴드, BLDC·스테퍼. 실습 — RGB LED breathing, 서보 제어.
