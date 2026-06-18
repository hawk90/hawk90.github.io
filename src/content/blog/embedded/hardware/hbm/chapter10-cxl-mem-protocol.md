---
title: "CXL.mem 프로토콜 분해 — M2S·S2M 메시지와 HDM Decoder"
date: 2026-06-15T09:02:00
description: "CXL.mem 트랜잭션 흐름 — M2S Req·S2M NDR/DRS, HDM Decoder의 주소 매핑, BI·Snoop Filter 동작."
series: "HBM·GDDR 심화"
seriesOrder: 10
tags: [cxl, cxl-mem, hdm-decoder, cache-coherency]
draft: true
---

> Outline — [Ch 9](/blog/embedded/hardware/hbm/chapter09-cxl-mem)에서 *CXL.mem의 자리*를 봤다. 이 장은 *프로토콜 내부*를 본다.
>
> 다룰 것:
>
> - *M2S Req·RwD·BIRsp* 메시지 종류와 의미
> - *S2M NDR·DRS·BISnp* 응답 흐름
> - *HDM Decoder*가 *system physical address*를 *device physical address*로 매핑하는 과정
> - *Bias-based Coherency (BI)* — host bias vs device bias
> - *Snoop Filter*와 *Back-Invalidation*의 역할
> - *flit packing*과 *credit-based flow control*
> - 실 예: `cxl list -RT`로 본 HDM decoder 구성과 region 매핑
>
> [Ch 11: CXL Type 1·2·3 디바이스 분류](/blog/embedded/hardware/hbm/chapter11-cxl-device-types)로 이어진다.
