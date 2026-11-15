---
title: "OTA Update 보안 — 서명·Rollback 방지·롤백 카운터"
slug: "embedded/embedded-security/chapter06-ota-update"
date: 2026-05-21T09:06:00
description: "안전한 펌웨어 업데이트. A/B 슬롯, delta update, 서명 검증, rollback 방지."
tags: [OTA, firmware-update, Rollback, MCUboot, Mender]
series: "Embedded Security"
seriesOrder: 6
draft: false
topics: ["embedded"]
---


## 설치 실패 복구와 보안 downgrade를 구분하기

OTA는 새 이미지를 인증하는 일과, 설치·부팅 실패에서 복구하는 일을 함께 다룹니다. A/B 슬롯이 있다고 공격자가 가져온 옛 서명 이미지를 거부하는 것은 아니고, anti-rollback이 있다고 전원 차단 뒤 부팅이 항상 복구되는 것도 아닙니다. 두 정책과 그 상태 저장을 따로 설계해야 합니다.

이 장의 이미지 형식·host 도구 기준은 [MCUboot v2.1.0](https://github.com/mcu-tools/mcuboot/tree/9c99326b9756dbcc35b524636d99ed5f3e6cb29b)입니다. 실제 `imgtool`로 합성 payload를 서명·검증하고 변조 거부를 확인합니다. 이는 실행 가능한 firmware나 실제 MCUboot 부팅·swap·counter backend·전원 차단 시험이 아닙니다.

## 업데이트 단계와 증거

| 단계 | 필요한 확인 |
|------|------|
| 빌드·서명 | 승인한 image·metadata·key로 생성했는지 |
| 다운로드 | 인증서·hostname·권한과 version·product 대상이 맞는지 |
| 임시 저장 | 실제 비활성 영역과 충분한 공간, 쓰기 실패·중단 처리 |
| 검증 | 부트로더의 인증 범위·신뢰 anchor·보안 counter 정책 |
| Test boot | 새 image의 건강 상태와 복구 가능한 boot metadata |
| Confirm·commit | 확정 시점과 counter 갱신이 허용한 fallback을 깨지 않는지 |
| 복구·운영 | 실패 원인·장치 상태·서명키 회전과 recovery 경로 |

서명된 이미지도 다른 board·product용이면 거부해야 합니다. 전송 TLS와 부팅 인증은 역할이 다르며, 한쪽이 다른 쪽의 인증 조건을 자동 대신하지 않습니다. Device에는 검증용 공개키·신뢰 anchor가 필요하고 image 서명 private key를 넣는 구조로 가정하지 않습니다.

## MCUboot header와 TLV

[v2.1.0 image.h](https://github.com/mcu-tools/mcuboot/blob/9c99326b9756dbcc35b524636d99ed5f3e6cb29b/boot/bootutil/include/bootutil/image.h)를 기준으로 합니다. 다른 판의 TLV header나 새 algorithm 상수를 섞지 않습니다.

| 항목 | v2.1.0의 값·위치 |
|------|------|
| Image magic | 0x96f3b83d |
| 기본 header 크기 | 32 B. `ih_hdr_size`는 예약 padding을 포함한 전체 header 길이 |
| `ih_protect_tlv_size` | Protected TLV 영역 크기. 일반 `image_header`에 security counter 필드는 없음 |
| 일반 TLV info magic | 0x6907 |
| Protected TLV info magic | 0x6908 |
| SHA256 | 0x10 |
| RSA2048-PSS·RSA3072-PSS | 0x20·0x23 |
| ECDSA signature·Ed25519 | 0x22·0x24 |
| RSA 암호화 key·AES-KW | 0x30·0x31 |
| Image dependency | 0x40 |
| Security counter | 0x50, protected TLV |

인증 범위에는 header·image body·protected TLV가 포함됩니다. TLV의 상수만 맞아도 parser의 길이·overflow·중복·unknown 항목 정책이 안전하다고 판정할 수는 없습니다. 이 글의 fixture 검사는 임의의 악성 image 전체를 fuzzing한 결과가 아닙니다.

## 실제 imgtool로 host 검증하기

전용 Python 환경과 위 source를 사용하고, 테스트용 ECDSA-P256 키와 1024 B 합성 payload를 준비했습니다. 키는 이번 host 검사에만 사용하며 production key가 아닙니다. 아래 명령은 같은 source·interpreter와 파일을 사용하는 서명 부분입니다. 실제 board layout에 복사해서 쓰는 slot 설정이 아닙니다.

```bash title="mcuboot-fixture-sign.sh"
"$IMGTOOL_PYTHON" "$MCUBOOT_SOURCE/scripts/imgtool.py" sign   --key test.pem --align 4 --version 1.2.3   --header-size 0x200 --pad-header --slot-size 0x2000   --security-counter 5 payload.bin signed.bin
```

이후 `verify --key test.pem signed.bin`을 실행해 지정한 key로 확인합니다. v2.1.0의 verify는 key를 주지 않으면 hash 일치만으로 OK를 반환할 수 있으므로, 서명 확인 결과와 구분해야 합니다. 정상 이미지, payload·protected counter·signature·magic 변조, 다른 key와 낮은 counter의 정상 서명 이미지를 각각 비교했습니다.

| Host 확인 | 해석 |
|------|------|
| 정상 서명·지정 key 검증 성공 | 이 합성 이미지의 서명과 format 범위 확인 |
| Payload·protected counter 변조 거부 | 해당 변경이 인증 범위를 깨뜨림 |
| Signature·magic 변조·다른 key 거부 | 이 fixture에서 실제 도구의 실패 경로 확인 |
| Counter 4의 유효 서명도 verify 성공 | Host 서명 검증은 device counter 5와의 anti-rollback 정책을 적용하지 않음 |

따라서 `imgtool verify` 성공을 rollback 방지·boot 성공·전원 차단 복구의 증거로 사용할 수 없습니다. 이 확인은 host 도구의 기능 검사이며 key provisioning이나 MCU BootROM 형식 검증도 아닙니다.

## 슬롯·test·confirm과 counter 갱신

두 슬롯을 둬도 boot 모드에 따라 복구 방법이 달라집니다. Swap·overwrite·direct-XIP는 실제 link address·erase 단위·trailer·scratch와 image validation 설정을 맞춰야 합니다. 사용하지 않는 보편 flash 주소표를 복사하지 않습니다.

| 모드·기능 | 확인할 조건 |
|------|------|
| Swap 방식 | 이미지·trailer와 중간 swap 상태의 전원 차단 복구 |
| Direct-XIP | slot별 실행 주소와 지원되는 revert 정책 |
| Overwrite-only | 일반 swap revert가 없으므로 별도 recovery 전략 |
| Test·confirm | 건강 검사 주체, confirm API, 미확정 상태에서 재부팅될 때의 동작 |
| Watchdog·재시작 | app hang이 실제 재부팅과 bootloader 복구로 이어지는지 |

Confirm이 없으면 언제나 N초 뒤 자동 복구되는 보편 timer는 없습니다. App이 hang한 채 reset되지 않으면 bootloader의 다음 판단도 시작되지 않습니다. Healthcheck가 단순 boot 완료인지 network·data migration까지 확인하는지도 제품 정책으로 정합니다.

Security counter는 signed protected TLV와 장치의 신뢰된 counter backend를 비교합니다. MCUboot v2.1.0의 [hardware rollback protection 설계](https://github.com/mcu-tools/mcuboot/blob/9c99326b9756dbcc35b524636d99ed5f3e6cb29b/docs/design.md)는 `MCUBOOT_HW_ROLLBACK_PROT`와 platform interface를 구분합니다. 임의로 만든 OTP API나 일반 header 필드로 대체할 수 없습니다.

Counter를 너무 일찍 올려 이전 정상 image를 거부하게 되면 A/B 복구 정책과 충돌할 수 있습니다. 확정·counter update·전원 차단·허용된 recovery image를 함께 시험해야 합니다. Image version과 security counter도 같은 숫자로 자동 취급하지 않습니다.

## TLS·delta·키 회전

CA chain을 설정하는 것과 특정 certificate·public key를 pin하는 것은 다릅니다. TLS의 hostname·유효기간·revocation 정책과 key 교체·recovery를 확인하며, 파싱되지 않는 PEM placeholder를 동작 예제로 제시하지 않습니다. 어떤 방식을 택해도 device의 image 인증 정책은 별도로 남습니다.

Delta update는 정확한 base image와 patch format, 저장 공간·복구 조건이 필요합니다. 인증된 manifest가 patch·base·결과 image의 digest와 product·version을 묶는지 확인합니다. Patch에 별도 서명을 붙이는 것만이 유일한 형식은 아니며 최종 실행 image가 인증돼야 합니다. 적용 중단·잘못된 base·길이 초과·압축 해제 한계도 실패 시험에 포함합니다.

서명 private key는 HSM·offline signer 등 승인된 관리 경계에서 보호합니다. Public verification key가 같은 제품군에 공통이라는 사실만으로 device 한 대의 침해가 fleet 서명키 유출을 뜻하지는 않습니다. 유출 대상이 private key인지, device identity key인지 구분하고 key 회전·폐기 시점을 제품 수명과 incident 정책으로 정합니다.

## MCUboot·SWUpdate·Mender의 역할

| 도구 | 확인할 역할 |
|------|------|
| MCUboot | MCU image 인증·boot·slot 전환. Port·flash·boot 모드에 따른 통합 |
| SWUpdate | Linux installer framework·handler·bootloader 연계·signed description |
| Mender | Client·artifact와 배포·fleet 관리 요구에 맞춘 통합 |

[SWUpdate 2024.12](https://sbabic.github.io/swupdate/2024.12/swupdate.html)의 compound update package는 cpio 형식입니다. 내부 payload가 tar인 것과 package 자체가 tarball인 것은 다릅니다. [Signed image 문서](https://sbabic.github.io/swupdate/2024.12/signed_images.html)는 서명한 sw-description과 각 sub-image hash를 연결해 서로 다른 release의 signed image를 섞는 문제를 다룹니다. 잘린 SHA256 문자열과 고정 device 경로를 완성 package 예제로 제시하지 않습니다.

Linux A/B의 bootcount·upgrade_available·confirmed state도 사용하는 bootloader·agent와 영구 저장 backend에 맞춰야 합니다. [Bootloader A/B 장](/blog/embedded/bootloader/chapter17-ab-update)과 [Buildroot 파일시스템](/blog/embedded/buildroot/chapter08-filesystems)을 참고하되, read-only rootfs·overlayfs 자체를 image authentication이나 안전한 data migration으로 오인하지 않습니다.

## 정리

- 유효한 서명, 맞는 product, 허용된 counter, 실제 복구는 각각 확인합니다.
- MCUboot 판에 맞는 header·protected TLV와 인증 범위를 사용합니다.
- Host imgtool 성공은 device anti-rollback·boot·전원 차단 시험이 아닙니다.
- Test·confirm·watchdog·counter update의 일관성을 함께 검증합니다.
- TLS·delta·서명키·fleet 운영은 별도 신뢰 경계와 복구 책임을 가집니다.

다음 편은 **Ch 7: Side-channel 공격 — 전력 / 타이밍 / EM**.

## 관련 항목

- [Ch 2: Secure Boot — chain of trust](/blog/embedded/embedded-security/chapter02-secure-boot)
- [Ch 4: TrustZone — 실행·메모리 격리](/blog/embedded/embedded-security/chapter04-trustzone)
- [Practical RTOS Internals — Part 4-11: TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- [Buildroot Ch 8: 출력 파일시스템](/blog/embedded/buildroot/chapter08-filesystems)
- [원문 — MCUboot Documentation](https://docs.mcuboot.com/)
- [원문 — Mender — Robust OTA for Linux devices](https://docs.mender.io/)
- [원문 — SWUpdate Documentation](https://sbabic.github.io/swupdate/)
