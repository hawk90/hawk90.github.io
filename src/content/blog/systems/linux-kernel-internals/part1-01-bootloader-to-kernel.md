---
title: "Part 1-1: 부트로더에서 커널 진입까지"
date: 2025-07-15T01:00:00
description: "BIOS / UEFI → GRUB → vmlinuz. real mode → protected → long mode."
tags: [Linux, Kernel, Boot, GRUB]
series: "리눅스 커널의 구조와 원리"
seriesOrder: 1
draft: true
---

## 작성 중

### 예정 내용
- BIOS / UEFI 차이
- MBR / GPT 부트 섹터
- GRUB 2 — stage1 / stage2
- vmlinuz 압축 해제
- real → protected → long mode 전환
- start_kernel() 진입
