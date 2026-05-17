---
title: "Ch 3: IOMMU와 주소 변환"
date: 2027-12-01T03:00:00
description: "Device가 보는 주소 ↔ physical 주소 — IOMMU의 역할."
series: "NPU 드라이버 개발"
seriesOrder: 3
tags: [npu, iommu, dma, address-translation]
draft: true
---

> Outline — *IOMMU* — DMA virtual address space. *Linux IOMMU API* — `iommu_domain_alloc`·`iommu_attach_device`·`iommu_map`. *Identity·DMA·unmanaged domain*. *SVA (Shared Virtual Addressing)* — CPU와 동일 VA. *ATS (Address Translation Services)* on PCIe. *NPU 보안* — isolation·DMA protection. ARM SMMU·Intel VT-d.
