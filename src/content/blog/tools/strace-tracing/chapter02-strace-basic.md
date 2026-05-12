---
title: "Ch 2: strace 기초 — syscall 트레이싱"
date: 2026-08-30T02:00:00
description: "ptrace 기반. strace 옵션 — -e, -p, -f, -o, -tt -T."
tags: [strace, ptrace, syscall]
series: "System Tracing"
seriesOrder: 2
draft: true
---

## 예정 내용
- strace ./prog — 기본
- -f — fork 추적
- -e trace=read,write — 필터
- -p PID — 실행 중 attach
- -o file — 파일 출력
- -tt -T — 타임스탬프 / 소요 시간
- 비용 — 30-1000x 느려짐
