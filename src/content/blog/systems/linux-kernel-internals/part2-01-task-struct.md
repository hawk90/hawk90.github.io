---
title: "Part 2-1: task_struct 자세히"
date: 2026-07-16T01:00:00
description: "프로세스 디스크립터 task_struct — PID / 상태 / 시그널 / 자원 등 핵심 필드."
tags: [Linux, Kernel, Process, task_struct]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 5
draft: true
---

## 작성 중

### 예정 내용
- task_struct 전체 구조 (~1000 lines)
- 식별 — pid / tgid / parent / children
- 상태 — TASK_RUNNING / INTERRUPTIBLE / UNINTERRUPTIBLE / ZOMBIE / STOPPED
- 자원 — files / fs / mm / signal
- thread_info — 스택 끝 / preempt_count
- current 매크로
