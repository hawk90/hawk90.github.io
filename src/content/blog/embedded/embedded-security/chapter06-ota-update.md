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

이 장의 이미지 형식·host 도구 기준은 [MCUboot v2.1.0](https://github.com/mcu-tools/mcuboot/tree/9c99326b9756dbcc35b524636d99ed5f3e6cb29b)입니다. 그 source의 `imgtool`로 합성 payload를 서명·검증하고 변조 거부를 확인했습니다. 실행 가능한 firmware가 아니므로 MCUboot 부팅·swap·전원 차단 시험은 아닙니다.

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

상수는 [v2.1.0 image.h](https://github.com/mcu-tools/mcuboot/blob/9c99326b9756dbcc35b524636d99ed5f3e6cb29b/boot/bootutil/include/bootutil/image.h#L45-L102)에서 옮겼습니다. 다른 판은 TLV 번호가 늘어나 있으니 판을 섞지 않습니다.

| 항목 | v2.1.0의 값·위치 |
|------|------|
| Image magic | 0x96f3b83d |
| 기본 header 크기 | 32 B. `ih_hdr_size`는 예약 padding을 포함한 전체 header 길이 |
| `ih_protect_tlv_size` | Protected TLV 영역 크기. 일반 `image_header`에 security counter 필드는 없음 |
| 일반 TLV info magic | 0x6907 |
| Protected TLV info magic | 0x6908 |
| Key hash·SHA256 | 0x01·0x10 |
| RSA2048-PSS·RSA3072-PSS | 0x20·0x23 |
| ECDSA signature·Ed25519 | 0x22·0x24 |
| RSA 암호화 key·AES-KW | 0x30·0x31 |
| Image dependency | 0x40 |
| Security counter | 0x50, protected TLV |

SHA256 TLV가 덮는 범위는 header·image body·protected TLV입니다. 아래 실행에서 protected TLV의 counter 1 bit를 바꾸자 `imgtool verify`가 "Image has an invalid hash"를 낸 것이 그 증거입니다. 일반 TLV 영역(0x6907)의 hash·서명은 hash 범위 밖이며, 서명은 SHA256 TLV 값을 대상으로 계산됩니다. 이 글의 fixture 검사는 악성 image를 fuzzing한 결과가 아닙니다.

## 실제 imgtool로 host 검증하기

Python 3.15.2 venv(`cryptography` 50.0.2)에서 v2.1.0 source의 `imgtool.py`(버전 2.1.0)를 실행했습니다. `imgtool keygen -t ecdsa-p256`으로 만든 시험용 키 두 개와 1,024 B 난수 payload를 썼습니다. 키는 이 시험에만 쓴 것이고 slot 크기도 실제 board layout이 아닙니다.

```bash title="mcuboot-fixture-sign.sh"
"$IMGTOOL_PYTHON" "$MCUBOOT_SOURCE/scripts/imgtool.py" sign \
  --key test.pem --align 4 --version 1.2.3 \
  --header-size 0x200 --pad-header --slot-size 0x2000 \
  --security-counter 5 payload.bin signed.bin
```

`imgtool dumpinfo signed.bin`이 보여 준 구조는 다음과 같습니다(데이터 byte는 줄였습니다).

```text
#### Image header (offset: 0x0) ############################
magic:              0x96f3b83d
hdr_size:           0x200
protected_tlv_size: 0xc
img_size:           0x400
version:            1.2.3+0
#### Protected TLV area (offset: 0x600) ####################
magic:     0x6908
area size: 0xc
        type: SEC_CNT (0x50)
        len:  0x4
        data: 0x05 0x00 0x00 0x00
#### TLV area (offset: 0x60c) ##############################
magic:     0x6907
area size: 0x98
        type: SHA256 (0x10)     len:  0x20
        type: KEYHASH (0x1)     len:  0x20
        type: ECDSASIG (0x22)   len:  0x48
```

Protected TLV 영역 12 B는 4 B info header와 4 B TLV header, 4 B counter 값입니다. ECDSA 서명 TLV는 72 B(`0x48`)인데, 첫 byte가 `0x30 0x46`인 DER 인코딩이라 [Ch 2](/blog/embedded/embedded-security/chapter02-secure-boot)에서 잰 P-256 DER 길이 범위(69~72 B) 안에 있습니다.

이어서 변조한 사본과 다른 키로 `imgtool verify`를 돌렸습니다.

| 입력 | `imgtool verify` 출력 | rc |
|------|------|---:|
| 정상, `--key test.pem` | Image was correctly validated | 0 |
| 정상, key 없음 | Image was correctly validated | 0 |
| 정상, `--key other.pem` | No signature found for the given key | 1 |
| Payload 1 bit 변조 | Image has an invalid hash | 1 |
| Protected counter 1 bit 변조 | Image has an invalid hash | 1 |
| 서명 마지막 byte 변조 | No signature found for the given key | 1 |
| Magic 1 bit 변조 | Invalid image magic; is this an MCUboot image? | 1 |
| Counter 4로 새로 서명, `--key test.pem` | Image was correctly validated | 0 |

두 줄을 눈여겨봅니다. 둘째 줄처럼 v2.1.0의 `verify`는 key를 주지 않으면 서명을 보지 않고 hash만 맞으면 "correctly validated"를 냅니다. CI에서 서명 확인용으로 쓴다면 `--key`를 빠뜨리지 않습니다. 마지막 줄의 counter 4 이미지도 통과합니다. Host 도구는 장치의 저장된 counter를 모르기 때문입니다. 따라서 `imgtool verify` 성공은 rollback 방지·boot 성공·전원 차단 복구의 증거가 아닙니다.

## 슬롯·test·confirm과 counter 갱신

두 슬롯을 둬도 boot 모드마다 복구 방법이 다릅니다. [MCUboot v2.1.0 `design.md`](https://github.com/mcu-tools/mcuboot/blob/9c99326b9756dbcc35b524636d99ed5f3e6cb29b/docs/design.md#L360-L376)는 swap 모드의 "test" swap을 이렇게 설명합니다. 새 이미지로 swap해 부팅한 뒤, 그 이미지가 실행 중에 스스로 "OK"를 기록하면 swap이 permanent가 되고, 기록하지 않으면 다음 부팅 때 "revert" swap으로 옛 이미지를 되돌립니다.

| 모드·기능 | 확인할 조건 |
|------|------|
| Swap 방식 | 이미지·trailer와 중간 swap 상태의 전원 차단 복구 |
| Direct-XIP | slot별로 다른 link address로 빌드. revert는 `MCUBOOT_DIRECT_XIP_REVERT`를 켤 때만 |
| Overwrite-only | revert가 없음. 대신 `MCUBOOT_DOWNGRADE_PREVENTION`(version 비교)은 이 모드에서만 동작 |
| Test·confirm | 건강 검사 주체, confirm API, 미확정 상태에서 재부팅될 때의 동작 |
| Watchdog·재시작 | app hang이 실제 재부팅과 bootloader 복구로 이어지는지 |

Revert의 계기는 시간이 아니라 *다음 reset*입니다. 위 문서도 "새 이미지가 부팅 직후 crash하면 다음 reset에서 옛 이미지로 되돌린다"고 적습니다. 그러니 새 이미지가 crash하지 않고 hang하면, watchdog이 reset을 걸어 주기 전까지 bootloader는 다시 실행되지 않습니다. 언제 "OK"를 기록할지(부팅 직후, 서버 접속 성공 뒤, data migration 뒤)는 제품이 정합니다.

Security counter는 protected TLV의 `SEC_CNT`(0x50)와 장치의 counter를 비교합니다. [MCUboot v2.1.0 `design.md`](https://github.com/mcu-tools/mcuboot/blob/9c99326b9756dbcc35b524636d99ed5f3e6cb29b/docs/design.md#L1290-L1307)의 hardware rollback protection은 `MCUBOOT_HW_ROLLBACK_PROT`로 켜고, platform이 `security_cnt.h`의 `boot_nv_security_counter_get()`·`boot_nv_security_counter_update()`를 구현해야 합니다. Image header(`struct image_header`)에는 counter 필드가 없습니다.

Counter를 test 부팅 중에 올리면, 새 이미지가 실패해 revert하려 할 때 옛 이미지의 counter가 더 낮아 거부됩니다. Revert로 돌아갈 곳이 사라지는 것입니다. MCUboot는 이 순서를 코드로 지킵니다. v2.1.0 [`loader.c`](https://github.com/mcu-tools/mcuboot/blob/9c99326b9756dbcc35b524636d99ed5f3e6cb29b/boot/bootutil/src/loader.c#L1993-L2003)의 주석대로 TEST swap 뒤에는 바로 올리지 않고, reset 뒤 swap type이 NONE이고 이미지가 `image_ok`를 기록한 경우에만 올리며, 저장된 값보다 클 때만 갱신합니다. Bootloader를 직접 만든다면 같은 순서를 지켜야 합니다. Image version과 security counter는 위 dumpinfo처럼 다른 필드(version 1.2.3, counter 5)입니다.

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
