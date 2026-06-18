---
title: "SPDM과 CMA 인증 흐름 — 디바이스 신원과 펌웨어 측정 검증"
date: 2026-06-17T09:02:00
description: "SPDM(Security Protocol Data Model) 메시지 흐름, CMA(Component Measurement Attestation) — PCIe·CXL 디바이스 신원 확인과 firmware integrity 검증."
series: "Embedded Security"
seriesOrder: 12
tags: [spdm, cma, attestation, pcie-security, cxl-security, dice]
draft: true
---

> Outline — [Ch 11](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)에서 *IDE가 링크를 암호화*하는 걸 봤다. 그런데 *키를 교환하기 전에* *상대편이 누구인지·신뢰할 만한지* 확인해야 한다. 그게 SPDM·CMA의 역할이다.
>
> 다룰 것:
>
> - **SPDM (Security Protocol Data Model)** — DMTF 표준 (DSP0274). PCIe·CXL·USB·MCTP 위에서 *디바이스 인증·키 교환·세션 협상*을 담당
> - **SPDM 메시지 흐름** — `GET_VERSION` → `GET_CAPABILITIES` → `NEGOTIATE_ALGORITHMS` → `GET_DIGESTS` → `GET_CERTIFICATE` → `CHALLENGE_AUTH` → `KEY_EXCHANGE` → `FINISH`
> - **인증서 체인** — Device root CA → Manufacturer → Device. *Trust anchor*가 *호스트 BIOS·OS*에 미리 박혀 있어야 함
> - **CMA (Component Measurement Attestation)** — *디바이스 firmware·configuration의 hash*를 *서명된 형태로* 호스트에 제공
> - **Measurement Block** — `GET_MEASUREMENTS` 응답. *firmware hash·configuration hash·mutable state hash* 등
> - **DICE (Device Identifier Composition Engine)** — *공장에서 박힌 UDS(Unique Device Secret)*에서 *layer별 identity*를 derive하는 표준 (TCG)
> - **TPM 2.0 연결** — host의 TPM이 CMA 결과를 *PCR에 측정값 확장*. *remote attestation*까지 연결
> - **실 예** — `lspci -vvv | grep DOE`로 *DOE (Data Object Exchange)* capability 확인 → SPDM 메시지가 *DOE 채널*로 흐름
> - **공격 시나리오** — *fake 디바이스가 진짜인 척*하는 spoofing, *firmware downgrade*, *TOCTOU* 등을 SPDM/CMA가 어떻게 막는지
>
> [Ch 13: CXL TEE 확장](/blog/embedded/embedded-security/chapter13-cxl-tee)로 이어진다. SPDM 위에서 *Confidential Computing 영역*까지 신뢰가 확장되는 그림이다.
