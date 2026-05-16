---
title: "Ch 5: 패키지 시스템 — .mk와 Config.in"
date: 2026-05-19T05:00:00
description: "Buildroot 패키지 작성 규약 — Config.in 옵션 노출과 .mk 빌드 레시피."
series: "Buildroot Practical"
seriesOrder: 5
tags: [embedded, buildroot, package, mk, config-in]
draft: true
---

> Outline — `package/<name>/Config.in` (Kconfig 옵션)과 `package/<name>/<name>.mk` (빌드 레시피)의 짝. *generic-package* infra의 단계 hook — `<NAME>_CONFIGURE_CMDS`·`<NAME>_BUILD_CMDS`·`<NAME>_INSTALL_TARGET_CMDS`. *autotools-package*·*cmake-package*·*python-package*의 단축형.
