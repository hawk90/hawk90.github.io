---
title: "Part 1-2: 커널 초기화 시퀀스"
date: 2025-07-15T02:00:00
description: "start_kernel() — 서브시스템 초기화 순서. early_init / arch_init / rest_init."
tags: [Linux, Kernel, Init]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 2
---

## 작성 중

### 예정 내용
- start_kernel() 호출 흐름
- early_init — 콘솔 / printk
- arch_init — 아키텍처별
- subsys_init — 메모리 / 스케줄러 / 파일시스템
- rest_init → kernel_init (PID 1 시작)
- initcall 매크로 / level
