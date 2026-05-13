---
title: "Part 1-4: init / systemd — PID 1"
date: 2025-07-15T04:00:00
description: "kernel_init → /sbin/init. SysV init / systemd / busybox 비교."
tags: [Linux, init, systemd]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 4
draft: true
---

## 작성 중

### 예정 내용
- kernel_init thread — initramfs / rootfs 마운트
- /sbin/init execve — PID 1 시작
- SysV init — runlevel / rc.d
- systemd — unit / target / dependency
- busybox init — 임베디드
- service 시작 순서 / 병렬화
