---
title: "EFI·UEFI에서 CXL 초기화 — CEDT 생성과 HDM Decoder 사전 설정"
date: 2026-06-19T09:02:00
description: "EDK II 기반 UEFI에서 CXL 디바이스 초기화 — CEDT(CXL Early Discovery Table) 생성, HDM Decoder 사전 설정, ACPI handoff."
series: "Bootloader Internals"
seriesOrder: 35
tags: [embedded, bootloader, uefi, edk2, cxl, cedt, acpi, hdm-decoder]
draft: true
---

> Outline — [Ch 34](/blog/embedded/bootloader/chapter34-pcie-enumeration)에서 *U-Boot의 PCIe enumeration*과 *CXL DVSEC scan*을 봤다. EDK II 기반 UEFI는 *비슷한 흐름*에 *ACPI 통합*이 추가된다.
>
> 다룰 것:
>
> - **EDK II CXL 모듈** — `CxlBus`, `CxlMemDxe`, `CxlPortDxe`. 어디서 enumeration이 일어나고 어떻게 driver dispatch되는지
> - **CEDT(CXL Early Discovery Table) 구조** —
>   ```text
>   CEDT
>   ├── CHBS (CXL Host Bridge Structure) — host bridge 정보
>   ├── CFMWS (CXL Fixed Memory Window Structure) — 메모리 매핑 window
>   └── CXIMS (CXL XOR Interleave Math Structure) — interleave 규칙
>   ```
> - **CFMWS 작성 흐름** — UEFI가 enumeration 결과를 보고 *memory window를 결정*. *Window size·HDM Decoder 매핑·interleave 패턴* 채움
> - **HDM Decoder 사전 설정** — UEFI가 *각 CXL 디바이스의 HDM Decoder*를 *target SPA(System Physical Address) 범위로 프로그래밍*. *커널이 깨어났을 때 즉시 memory 사용 가능*
> - **CXL Memory Window Hot-add** — CFMWS가 *부팅 시 결정된 영역*과 *hot-add 가능 영역*을 *분리해서* 알림
> - **EFI Memory Map vs ACPI SRAT** — CXL.mem 영역은 *EFI Memory Map에 ConventionalMemory로 들어가지 않고* *SRAT의 별도 NUMA 노드*로 등록
> - **Coherency Domain ID** — CEDT가 *동일 coherency domain*에 속한 디바이스를 식별. fabric 토폴로지에서 중요
> - **SPDM 인증 통합 (옵션)** — UEFI가 *부팅 시 SPDM으로 디바이스 인증*. 신원 검증된 디바이스만 *active memory window*로 매핑 (보안 부팅)
> - **실 예 — EDK II + QEMU**:
>   ```bash
>   $ qemu-system-x86_64 -bios OVMF.fd -machine q35,cxl=on ...
>   # Linux guest에서
>   $ acpidump -b
>   $ iasl -d cedt.dat
>   # CEDT 내용 확인
>   ```
> - **상용 BIOS 사례** — Intel·AMI·Insyde BIOS의 CXL 코드 차이, *Granite Rapids·Turin* 양산 SoC의 UEFI 흐름
> - **트러블슈팅** — `dmesg`에서 *CEDT 누락*, *CFMWS conflict*, *HDM Decoder programming 실패* 사례
>
> [Ch 36: 부트 시 메모리 토폴로지 결정](/blog/embedded/bootloader/chapter36-boot-memory-topology)으로 이어진다. DDR DIMM·CXL.mem·HBM이 *하나의 메모리 토폴로지*로 *어떻게 통합 인식*되는지를 본다.
