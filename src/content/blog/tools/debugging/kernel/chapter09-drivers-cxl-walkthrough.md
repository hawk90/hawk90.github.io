---
title: "drivers/cxl 코드 분석 — 진입점부터 sysfs까지"
date: 2026-06-18T09:04:00
description: "Linux kernel drivers/cxl/ 디렉터리 — 모듈별 entry point·핵심 자료구조·sysfs interface 코드 워크스루."
series: "Kernel Debugging"
seriesOrder: 9
tags: [cxl, kernel-source, drivers, sysfs, cxl-core, code-walkthrough]
draft: true
---

> Outline — [Ch 8](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)에서 *툴*로 추적했다. 이 장은 *소스 코드*를 *진입점부터 sysfs까지* 따라간다.
>
> 다룰 것:
>
> - **모듈별 entry point**:
>   - `cxl_acpi`: `cxl_acpi_init()` → `acpi_bus_register_driver()`
>   - `cxl_pci`: `cxl_pci_init()` → `pci_register_driver()`
>   - `cxl_core`: subsystem 초기화 (`cxl_core_init`)
>   - `cxl_mem`: `cxl_mem_init()` → `cxl_driver_register()`
> - **핵심 자료구조**:
>   - `struct cxl_port` — CXL 토폴로지 노드
>   - `struct cxl_decoder` — HDM 매핑 객체
>   - `struct cxl_region` — interleave된 메모리 영역
>   - `struct cxl_memdev` — memory device 추상화
>   - `struct cxl_mailbox` — 명령 큐
> - **probe 흐름** — `cxl_pci_probe()` 코드 라인별 추적
> - **HDM Decoder 프로그래밍** — `cxl_decoder_setup()` 함수 분석
> - **Region 생성 sysfs path** — `/sys/bus/cxl/devices/decoderX.Y/create_ram_region` → `region_create_store()` → `cxl_create_region()`
> - **Mailbox API** — `cxl_mbox_send_cmd()`의 *retry·timeout·payload 검증* 로직
> - **에러 처리 경로** — `cxl_pci_err_handler` 콜백 분석
> - **DAX 통합 path** — `cxl_pmem` → `dax_create_dev()` 흐름
> - **NUMA 등록** — `cxl_region_setup()`에서 *별도 node id 할당* 코드
> - **Hot-plug 경로** — `cxl_pci_remove()` cleanup 순서
> - **lockdep·RCU 사용** — `cxl_port_mutex`, `decoder_rwsem` 등 동시성 primitive
>
> 시리즈 다음은 *Memory Diagnostics*의 *CXL 메모리 진단*과 *Postmortem*의 *CXL 디바이스 core dump*로 자연 연결된다.
