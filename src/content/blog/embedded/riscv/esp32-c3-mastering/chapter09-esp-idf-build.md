---
title: "Ch 9: ESP-IDF — 빌드 시스템과 컴포넌트 구조"
date: 2026-05-01T09:00:00
description: "CMake 기반 ESP-IDF 빌드. 컴포넌트(component) 모델로 라이브러리 모듈화."
series: "ESP32-C3 Mastering"
seriesOrder: 9
tags: [esp-idf, cmake, build, component, esp32-c3]
draft: true
---

> Outline — *idf.py* — wrapper around CMake. *프로젝트 구조* — `main/`, `components/`, `sdkconfig`. *menuconfig* — Kconfig 기반 설정. *Component* — 자체 CMakeLists, Kconfig, 의존성 선언. *Component Manager* — `idf_component.yml`로 외부 component 임포트. *Build flavors* — Debug/Release, custom partition table. *Toolchain* — riscv32-esp-elf-gcc, LTO. 흔한 함정 — flash size mismatch, sdkconfig diff.
