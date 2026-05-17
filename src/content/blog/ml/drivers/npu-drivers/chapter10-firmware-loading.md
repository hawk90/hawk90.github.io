---
title: "Ch 10: 펌웨어 로딩"
date: 2027-12-01T10:00:00
description: "request_firmware·signed firmware·secure boot — 펌웨어의 일생."
series: "NPU 드라이버 개발"
seriesOrder: 10
tags: [npu, firmware, request-firmware, secure-boot]
draft: true
---

> Outline — *request_firmware API* — `request_firmware`·*async* variant. */lib/firmware* 경로·blob 배포. *Linux-firmware* 트리. *Firmware authentication* — signed blob·hash 검증. *Version negotiation*. *Crash recovery* — 펌웨어 재로드. *DT firmware-name property*. *Reset sequence*.
