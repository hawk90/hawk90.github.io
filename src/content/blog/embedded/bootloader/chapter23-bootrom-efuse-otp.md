---
title: "SoC BootROM·eFuse·OTP — 부팅의 0단계 분석"
slug: "embedded/bootloader/chapter23-bootrom-efuse-otp"
date: 2026-05-19T09:23:00
description: "전원 인가 직후 mask ROM의 역할과, SoC별 eFuse/OTP 보안 설정을 확인하는 방법."
series: "Bootloader Internals"
seriesOrder: 23
tags: [embedded, bootloader, bootrom, efuse, otp, secure-boot]
draft: false
topics: ["embedded"]
---

BootROM은 칩이 reset된 뒤 외부 펌웨어로 제어를 넘기기 전 실행되는 SoC 고유 코드입니다. 부팅 매체 선택, 이미지 형식, 인증 정책과 실패 동작은 제품군과 revision마다 다릅니다. eFuse와 OTP도 같은 이름만으로 저장 방식이나 되돌릴 수 있는 범위를 일반화할 수 없습니다. 특정 설정을 설명하려면 정확한 SoC reference manual, security manual, errata와 제조사 프로비저닝 절차가 필요합니다.

## 한 줄 요약

BootROM과 OTP 설정은 SoC 문서에 종속됩니다. 주소·비트값·명령은 대상 부품과 문서 revision을 확인하지 않고 실행하거나 이식하지 마세요.

## BootROM이 맡는 단계

전원 인가 뒤 reset vector에서 시작한 코드는 칩의 boot configuration을 읽고, 지원하는 부팅 경로에서 다음 이미지를 찾거나 인증한 뒤 다음 단계로 제어를 넘깁니다. 구체적으로 어떤 매체와 헤더를 지원하는지, 외부 RAM을 언제 초기화하는지, 실패 시 어떤 순서로 재시도하는지는 SoC마다 다릅니다. 이를 한 가지 공통 순서나 주소 표로 나타낼 수 없습니다.

보드 strap, 핀 상태, 보안 lifecycle, fuse 설정이 선택 결과에 영향을 줄 수 있습니다. 같은 SoC 이름이어도 silicon revision, 보드 배선과 ROM 버전에 따라 차이가 생길 수 있으므로 정확한 부품명과 revision을 먼저 고정하세요.

## eFuse와 OTP를 읽을 때

`eFuse`, `OTP`, `fuse bank`는 SoC 문서에서 사용하는 저장소 이름입니다. 프로그래밍 방식, read/write 권한, ECC/lock 의미, 테스트 목적 영역의 제한은 칩마다 다릅니다. 모든 OTP가 같은 0→1 규칙을 따른다거나 특정 비트가 반드시 영구적이라고 단정하지 마세요. 읽기 명령조차 보안 상태에 따라 권한이 제한되거나 로그에 민감한 값이 노출될 수 있습니다.

보안 관련 자료를 검토할 때 다음 질문을 해당 제조사 문서로 답할 수 있어야 합니다.

1. 제품명·silicon revision·boot ROM revision은 무엇인가?
2. fuse field의 이름, 폭, 인코딩, reset/default 의미는 공식 reference/security manual의 어느 절에 있는가?
3. secure boot에서 인증하는 각 이미지와 키/해시의 소유자는 누구인가?
4. lifecycle 전환, debug 접근, recovery 및 실패 동작은 어떤 조건에서 달라지는가?
5. 생산 도구와 승인된 provisioning 절차에서 미리 읽고 검증해야 할 항목은 무엇인가?

값이나 주소가 문서에서 확인되지 않으면 추정 표를 채우지 말고 미확인으로 남기세요. 이 장은 특정 제품의 fuse map을 제공하지 않습니다.

## Secure boot와 anti-rollback

Secure boot은 보통 초기 신뢰 지점에서 후속 이미지의 진위를 확인하는 설계입니다. 실제 서명 형식, 검증 주체, 키 해시 저장 위치, 인증되는 부트 체인은 제품별 문서와 구현을 확인해야 합니다. “공개 키 해시 하나를 ROM이 검사한다”는 설명을 모든 SoC의 동작으로 일반화할 수 없습니다.

Anti-rollback도 별도 구현·정책입니다. 보안 버전 값을 fuse에 저장하는 방식, secure storage를 사용하는 방식, 어느 부트 단계에서 비교하는지는 플랫폼마다 다릅니다. 단순한 비트 개수나 `popcount`로 monotonic counter를 표현할 수 있다고 가정하지 마세요. update 절차가 버전 상태를 언제 올리는지와 복구·전원 차단 시 동작도 함께 검증해야 합니다.

## 생산 설정은 문서와 승인 절차로 확인

잘못된 보안 lifecycle 또는 키 설정은 부팅과 디버그 접근에 영향을 줄 수 있습니다. 이 글에서는 `fuse prog` 같은 쓰기 명령, bank/word 주소, key hash, secure boot 활성화 값 또는 JTAG 잠금 값을 제시하지 않습니다. 실제 쓰기 절차는 특정 부품용 제조사 문서와 보드 공급자의 승인된 생산 절차가 확보된 경우에만 다뤄야 합니다. 개발용 시료, 생산 샘플과 양산 장치의 정책이 동일하다고 가정하지 마세요.

검증 기록에는 최소한 부품과 revision, 문서 버전, 읽기 전 값, 승인된 변경 항목, 장치 상태, 복구 가능성, 독립된 검토자와 결과를 남깁니다. 실제 OTP 쓰기 여부와 결과는 이 문서 수정 과정에서 수행하지 않았습니다.

## 정리

- ROM의 부팅 경로와 보안 동작은 SoC·revision 별 primary source로 확인합니다.
- eFuse/OTP 저장 방식, bit polarity, field 주소를 다른 칩에서 가져오지 않습니다.
- secure boot과 anti-rollback은 구현이 서로 다를 수 있으므로 각각의 검증 지점과 update 정책을 확인합니다.
- 확인되지 않은 fuse map과 쓰기 명령은 예시로도 싣지 않습니다.
- 이 장의 내용은 일반적인 검토 틀이며 특정 SoC 프로비저닝 절차를 검증한 결과가 아닙니다.

## 다음 장 예고

다음 편은 **Ch 24: SPL·TPL 내부 해부**입니다. U-Boot 문서에 정의된 선택적 boot phase와 보드별 구성을 구분합니다.

## 관련 항목

- [Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages) — 초기 단계의 역할
- [Ch 16: Verified Boot](/blog/embedded/bootloader/chapter16-verified-boot) — U-Boot 기반 검증 부팅
- [Ch 27: Chain of Trust](/blog/embedded/bootloader/chapter27-chain-of-trust) — 단계별 신뢰 연결
- [Ch 24: SPL·TPL 내부 해부](/blog/embedded/bootloader/chapter24-spl-deep) — U-Boot의 xPL 단계
- SoC별 최신 reference manual, security manual, errata와 공식 provisioning 문서
