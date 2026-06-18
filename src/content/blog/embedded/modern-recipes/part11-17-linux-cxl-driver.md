---
title: "Linux CXL 드라이버 분석 — cxl_pci·cxl_core·region·DAX"
date: 2026-06-18T09:03:00
description: "Linux kernel 6.x의 CXL 서브시스템 — cxl_pci·cxl_core·cxl_mem·region·DAX 모듈의 역할과 probe 흐름."
series: "Modern Embedded Recipes"
seriesOrder: 151
tags: [recipes, linux, cxl, kernel-driver, dax, sysfs]
draft: true
---

> Outline — [Ch 150](/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation)에서 *QEMU에 CXL 환경*을 만들었다. 이제 *Linux kernel 안에서 어떻게 처리*되는지를 코드 레벨로 본다.
>
> 다룰 것:
>
> - **drivers/cxl/ 디렉터리 구조** —
>   ```text
>   drivers/cxl/
>   ├── acpi.c        # CEDT 파싱, ACPI 통합
>   ├── core/         # cxl_core — 모든 CXL 모듈의 공통 베이스
>   │   ├── port.c    # CXL port·decoder 객체
>   │   ├── region.c  # region 관리
>   │   ├── memdev.c  # memory device 추상화
>   │   └── pmem.c    # persistent memory 통합
>   ├── pci.c         # cxl_pci — PCI subsystem 통합, MMIO 매핑
>   ├── mem.c         # cxl_mem — memory device probe·remove
>   ├── pmem.c        # cxl_pmem — persistent CXL
>   └── port.c        # cxl_port — switch·root port
>   ```
> - **모듈 의존성 체인** — `cxl_acpi` → `cxl_pci` → `cxl_core` ← `cxl_mem` ← `cxl_port`
> - **probe 흐름** —
>   1. `cxl_acpi_probe` — CEDT 읽고 root port·HDM decoder 등록
>   2. `cxl_pci_probe` — PCI subsystem이 CXL DVSEC 발견하면 호출. MMIO BAR 매핑
>   3. `cxl_mem_probe` — memory device 등록, `cxl-cli`가 보는 `mem0` 생성
>   4. `cxl_create_region` — sysfs로 user-space가 region 생성. interleave 지원
>   5. `daxctl` 또는 `numactl` — region을 DAX 또는 system RAM으로 노출
> - **HDM Decoder 관리** — `cxl_decoder` 객체. *systems physical address → device physical address* 매핑 테이블
> - **CXL Mailbox API** — `cxl_mbox_send_cmd()`로 디바이스에 *vendor command·status query·firmware update* 전송
> - **에러 처리·RAS** — `cxl_event` 인터페이스. *poison list·media error·DRAM ECC* 추적
> - **NUMA 통합** — CXL.mem이 *별도 NUMA 노드*로 등록. `numa_zonelist_order` 영향
> - **DAMON 연동** — kernel 6.2+의 DAMON이 *CXL 노드의 page activity*를 추적, *promotion/demotion* 자동화
> - **실 운영 예** —
>   - `cxl list -RT` → 토폴로지
>   - `cxl create-region -d decoder0.0 -t ram -s 128G` → region 만들기
>   - `daxctl reconfigure-device dax0.0 -m system-ram` → DAX → RAM 전환
>   - `numactl --hardware` → CXL 노드 확인
>   - `damo report access` → 활동 분포
>
> Modern Recipes 시리즈 *CXL 흐름 마무리* — 다음 단계는 *Bootloader Internals*에서 *PCIe enumeration in U-Boot* 또는 *Embedded Debugging*에서 *CXL 링크 디버깅* 챕터로 자연 연결된다.
