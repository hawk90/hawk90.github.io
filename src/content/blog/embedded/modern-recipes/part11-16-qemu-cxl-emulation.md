---
title: "QEMU CXL Type 3 디바이스 에뮬레이션 — 노트북에서 CXL 개발 환경 구축"
date: 2026-06-18T09:02:00
description: "QEMU 8.0+ CXL 지원 — 노트북에서 CXL Type 3 디바이스를 에뮬레이션해 드라이버·BIOS 개발 환경 만들기."
series: "Modern Embedded Recipes"
seriesOrder: 150
tags: [recipes, cxl, qemu, emulation, virtualization, type-3]
draft: true
---

> Outline — [Ch 149](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)에서 *CXL이 PCIe 위에 어떻게 얹히는지* 봤다. 실 하드웨어 없이 *드라이버·BIOS 개발*을 시작하려면 QEMU 에뮬레이션이 필요하다.
>
> 다룰 것:
>
> - **QEMU 8.0+ CXL 지원** — *Type 3 memory expander*가 stable. Type 1/2는 experimental
> - **호스트 머신 모델** — `-machine q35,cxl=on` 옵션. *PCIe 5.0 root port*와 *CXL host bridge* 자동 생성
> - **CXL device 추가 옵션** —
>   ```bash
>   qemu-system-x86_64 \
>     -machine q35,cxl=on \
>     -m 8G,slots=8,maxmem=32G \
>     -device pxb-cxl,bus_nr=12,bus=pcie.0,id=cxl.1 \
>     -device cxl-rp,port=0,bus=cxl.1,id=root_port0,chassis=0,slot=0 \
>     -device cxl-type3,bus=root_port0,memdev=mem0,id=cxl-mem0 \
>     -object memory-backend-file,id=mem0,share=on,mem-path=./cxl-mem,size=256M
>   ```
> - **Linux guest 측 인식** — `lspci`로 CXL device 발견, `cxl list -RT`로 토폴로지 확인
> - **CEDT (CXL Early Discovery Table)** — QEMU가 *자동 생성*. ACPI table dump로 확인
> - **Region 생성과 DAX 노출** — `cxl create-region`, `daxctl reconfigure-device`로 *system RAM* 또는 *DAX* 모드 전환
> - **드라이버 개발 워크플로** — guest 안에서 *cxl 모듈 컴파일·load·테스트* 사이클
> - **한계** — *latency 시뮬레이션 정확도 떨어짐* (실 PCIe link 부재), *CXL.cache 미지원*, *fabric 시뮬레이션 제한*
> - **대체 도구** — Intel CXL Modeling Project, gem5 CXL 모델 (정밀도 ↑, 속도 ↓)
> - **실 활용** — *드라이버 prototype*, *kernel module 검증*, *BIOS·UEFI CXL 코드 개발*에 충분. *성능 측정*은 실 HW 필수
>
> 다음 편(Ch 151)은 *Linux kernel CXL 드라이버 코드*를 분석해 *QEMU 에뮬레이션 환경*에서 *어떻게 동작하는지* 본다.
