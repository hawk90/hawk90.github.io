---
title: "Ch 12: PCI Drivers"
date: 2026-06-01T12:00:00
description: "pci_driver·BAR·MSI/MSI-X — PCIe 디바이스 드라이버 모델."
series: "Linux Device Drivers (LDD3)"
seriesOrder: 12
tags: [linux, driver, pci, pcie, msi]
draft: true
---

> Outline — *PCI 설정 공간* — vendor·device·class. `pci_driver` 등록 — `id_table`·`probe`·`remove`. *BAR (Base Address Register)* — `pci_resource_start`·`pci_iomap`. *MSI-X* — `pci_alloc_irq_vectors`. *PCIe 특화* — capability·link state·AER. *DMA mask* — `dma_set_mask_and_coherent`. 6.x의 `pcim_*` devres API.
