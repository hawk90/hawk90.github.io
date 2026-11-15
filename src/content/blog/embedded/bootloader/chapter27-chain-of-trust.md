---
title: "임베디드 Chain of Trust — 다단계 서명 검증의 전체 흐름"
slug: "embedded/bootloader/chapter27-chain-of-trust"
date: 2026-05-19T09:27:00
description: "TF-A 인증 부팅, U-Boot FIT 서명, 커널 module signing과 rootfs 무결성을 구분해 살펴봅니다."
series: "Bootloader Internals"
seriesOrder: 27
tags: [embedded, bootloader, secure-boot, chain-of-trust, signing]
draft: false
topics: ["embedded"]
---

[Ch 16](/blog/embedded/bootloader/chapter16-verified-boot)에서는 U-Boot FIT 서명 기능을 살펴봤습니다. 이 장에서는 초기 firmware 인증, U-Boot에서의 image 검증, 커널 module policy와 rootfs 무결성 검사를 구분합니다. 제품이 이 단계들을 하나의 chain으로 묶는지는 각 단계의 신뢰 anchor와 검증 정책을 확인해야 판단할 수 있습니다.

## 한 줄 요약

Chain of Trust는 각 단계가 신뢰된 기준으로 다음 구성요소를 검증하고, 실패 시 실행을 막도록 설계·설정되어야 성립합니다. eFuse → TF-A → FIT → module → rootfs의 순서는 모든 시스템에 자동으로 생기지 않습니다.

## 신뢰 시작점과 검증 경계

신뢰의 시작점은 platform이 변조 방지 대상으로 정한 코드와 key material입니다. 어떤 SoC는 ROM에 고정된 검증 로직을 출발점으로 사용하고, 제품 정책에 따라 OTP/fuse에 저장한 key hash나 다른 protected storage를 추가로 사용할 수 있습니다. 키 전체를 넣는지, hash를 넣는지, 무엇을 어떤 방식으로 확인하는지는 chip family와 lifecycle에 종속됩니다.

각 로더가 다음 image를 확인하는지와 실패 시 image 실행을 차단하는지는 별도 질문입니다. 서명된 image가 저장 매체에 있다는 것만으로 검증이 적용되지는 않습니다. 가능한 흐름을 설계할 때 아래 경계를 image별로 기록하세요.

| 단계 | 확인할 질문 |
|---|---|
| SoC ROM → 첫 firmware | ROM이 해당 image format과 인증 정책을 지원하는가? 실제 security lifecycle은 무엇인가? |
| TF-A/플랫폼 firmware → 후속 firmware | 해당 빌드가 인증 기능을 포함하는가? 다음 image와 설정 정보를 어느 단계가 검증하는가? |
| U-Boot → kernel/FIT payload | FIT signature를 쓰는가? control FDT에 필요한 public key가 있고 policy가 강제되는가? |
| Linux → loadable module | module signature 검증과 enforcement가 kernel configuration/runtime policy에서 켜져 있는가? |
| Linux → root filesystem | dm-verity를 쓰는가? root hash 또는 verity metadata는 어디서 신뢰되는가? |

앞 단계에서 설정이 빠지면 그 뒤의 검증은 초기 firmware를 보호하지 못합니다. 반대로 module signing이나 dm-verity가 구성되어도 그들의 기준 key/hash가 신뢰되는 전달 경로로 공급되지 않으면 전체 chain을 설명할 수 없습니다.

## TF-A Trusted Board Boot의 범위

TF-A Trusted Board Boot(TBB)는 TF-A의 선택적 인증 기능입니다. TF-A 문서는 Root of Trust Public Key(ROTPK)와 firmware/certificate 관계를 특정 TBB 구현의 구성요소로 설명합니다. TBB build option이 포함되지 않은 TF-A image에 같은 동작을 가정하지 마세요. BL1/BL2 역할과 인증하는 image는 platform port에 따라 달라질 수 있습니다.

TF-A 2.12.12 TBB 문서는 인증 흐름과 FIP 생성, certificate 관계를 설명합니다. 이를 보드에 적용하려면 platform README, build configuration, key storage 경로, signing output과 failure behavior도 함께 확인해야 합니다. 이 장은 특정 fuse 주소, certificate bytes, key rotation command 또는 production key procedure를 제공하지 않습니다.

## U-Boot FIT 검증

U-Boot의 FIT format은 image hash와 signature를 지원합니다. U-Boot 문서에 따르면 public key는 control FDT의 `/signature` node에 저장할 수 있으며, `required` 속성으로 image 또는 선택된 configuration에 필요한 key 검증을 요구합니다. 서명 대상, key 설정, 지원 algorithm과 `bootm` 검증 동작은 U-Boot 버전 및 build configuration에 맞춰야 합니다.

Configuration signature와 개별 image signature는 서로 다른 선택지입니다. `required = "conf"`는 해당 U-Boot 설정에서 selected configuration 검증을 요구하는 옵션이지, 모든 FIT이 반드시 configuration signature만 써야 한다는 뜻은 아닙니다. 필수 key를 지정하지 않았거나 unsigned fallback format이 허용되어 있으면 예상한 거부 정책이 적용되지 않을 수 있습니다. 정확한 결과는 해당 빌드의 control FDT와 FIT positive/negative test로 확인하세요.

## Module signing과 root filesystem

Linux module signing은 kernel이 loadable module을 받아들일 때 수행하는 검증 정책입니다. Linux 문서는 `CONFIG_MODULE_SIG_FORCE` 또는 `module.sig_enforce=1` 설정 시 유효 서명을 kernel이 가진 key로 확인한다고 설명합니다. 기본 permissive 정책에서는 unsigned 또는 unknown-key 모듈을 허용할 수 있습니다. 그러므로 module signing이 앞선 boot firmware 검증에 자동으로 연결된다고 표현하지 않습니다.

`dm-verity`는 block device의 읽기 내용을 hash tree로 검증합니다. root hash를 누가 보호하고 kernel/bootloader로 어떻게 전달하는지는 제품의 별도 정책입니다. FIT에 root hash가 들어 있다는 것만으로 검증된 값이 되거나, 모든 U-Boot·Linux 조합이 이를 자동 연결한다고 가정하지 마세요.

## anti-rollback과 key rotation

Replay 방지와 key rotation은 platform별 보안 정책입니다. anti-rollback version을 fuse bit count에 대응시키거나, 모든 BootROM이 firmware header의 버전을 비교한다고 일반화할 수 없습니다. version state가 어디에 저장되고, 어느 검증 단계에서 비교되며, update 성공·복구와 power loss에 따라 언제 갱신되는지 제품 문서에서 확인해야 합니다.

마찬가지로 key rotation은 고정된 한 방법이 아닙니다. 인증서 중간 key 교체, 여러 root key 허용, revocation bit 또는 secure storage 등 platform이 제공하는 경로를 확인해야 합니다. 테스트 계획 없이 OTP를 갱신하는 예제를 따라 하지 마세요.

## 실패를 검증하는 방법

제품별 실패 메시지는 다르므로 합성 serial log를 보편적인 출력처럼 제시하지 않습니다. 재현 가능한 검증에는 승인된 test key로 서명한 정상 image와 바뀐 image, 잘못된/누락 key, 선택된 FIT configuration, module enforcement 설정 및 verity root-hash mismatch 사례가 필요합니다. 각 시험은 실패 지점과 실행이 실제로 차단됐는지를 기록해야 합니다.

NXP의 AN4581은 HABv4를 쓰는 특정 i.MX 50/53/6/7 family에 대한 secure boot application note입니다. 이는 “NXP 전 SoC 공통” reference manual이 아니며 다른 i.MX family나 AHAB에 이 절차를 적용하지 않습니다. 정확한 chip과 security manual revision을 정하지 않은 상태에서는 vendor-specific fuse/ROM 검증을 완료했다고 할 수 없습니다.

이 글의 수정 과정에서는 SoC/board, TF-A build, U-Boot build, key fixture와 Linux image가 없어 서명·거부·rollback·module·verity 시험을 실행하지 않았습니다.

## 정리

- 변경 불가 trust anchor와 각 단계의 verifier/enforcement를 제품별로 추적합니다.
- TF-A TBB, U-Boot FIT, Linux module signing과 dm-verity는 각각 선택·설정되는 경계입니다.
- `required = "conf"`는 FIT의 configuration verification option이며, universal FIT policy가 아닙니다.
- Module signing은 kernel module load policy이고, 앞선 firmware authentication을 대신하지 않습니다.
- OTP rollback state, fuse map, vendor key hierarchy와 오류 출력은 정확한 SoC·revision의 1차 자료가 있어야 설명할 수 있습니다.

## 다음 장 예고

다음 장에서는 [Ch 28: Flash layout 설계](/blog/embedded/bootloader/chapter28-flash-layout)를 다룹니다. Image 서명이 맞더라도 저장 위치와 update 정책은 별도로 검증해야 합니다.

## 관련 항목

- [Ch 16: Verified Boot](/blog/embedded/bootloader/chapter16-verified-boot)
- [Ch 23: BootROM·eFuse·OTP](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp)
- [Ch 25: TF-A 통합](/blog/embedded/bootloader/chapter25-tfa-optee)
- [TF-A v2.12.12: Trusted Board Boot](https://trustedfirmware-a.readthedocs.io/en/lts-v2.12.12/design/trusted-board-boot.html)
- [U-Boot v2025.01: FIT signature verification](https://docs.u-boot.org/en/v2025.01/usage/fit/signature.html)
- [Linux: Kernel module signing](https://www.kernel.org/doc/html/latest/admin-guide/module-signing.html)
- [Linux: dm-verity target](https://docs.kernel.org/admin-guide/device-mapper/verity.html)
- [NXP AN4581: Secure Boot on i.MX 50/53/6/7 using HABv4](https://www.nxp.com/docs/en/application-note/AN4581.pdf)
