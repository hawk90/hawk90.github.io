---
title: "Ch 3: Char Drivers"
date: 2026-05-13T03:00:00
description: "Char device — scull 예제로 본 major/minor·file_operations·cdev·open/release/read/write."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 3
tags: [linux, driver, char-device, cdev, scull]
draft: true
---

> Outline — *scull* 예제 — kernel의 가장 단순한 char driver. major·minor 번호 — `register_chrdev_region`·`alloc_chrdev_region`. `struct file_operations`. `cdev_init`·`cdev_add`. open·release·read·write·llseek. 6.x — `struct class`·sysfs class 자동 device 노드 생성. *큰 챕터 — 필요 시 §3.1-§3.5로 분할 가능*.
