---
title: "Ch 8: Linux on Zynq — Kernel·Rootfs·Device Tree"
date: 2026-08-01T08:00:00
description: "PetaLinux 빌드·DT·rootfs — Zynq용 Linux 이미지 구성."
series: "The Zynq Book"
seriesOrder: 8
tags: [zynq, linux, petalinux, device-tree, yocto]
draft: true
---

> Outline — *PetaLinux 프로젝트 구조* — `project-spec/`·`build/`. *DT 생성* — XSA → device tree overlay. *Kernel config*·user-app 추가. *rootfs* — BusyBox vs full Debian. *Yocto layer* — `meta-xilinx`·`meta-xilinx-tools`. *부팅* — `image.ub`·`boot.scr`. PetaLinux 없이 *순수 Yocto*로 가는 길도.
