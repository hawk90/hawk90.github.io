---
title: "Ch 6: OTA Update — 서명 / rollback 방지"
date: 2026-05-08T07:00:00
description: "안전한 펌웨어 업데이트. A/B 슬롯, delta update, 서명 검증, rollback 방지."
tags: [OTA, Firmware Update, Rollback, MCUboot, Mender]
series: "Embedded Security"
seriesOrder: 6
draft: false
---

## 한 줄 요약

> **"OTA의 본질은 *서명된 이미지*와 *되돌릴 수 있는 슬롯*입니다."** — 다운로드 채널이 아무리 안전해도, *부팅 시점*에 서명을 다시 검증하지 않으면 그 OTA는 깨진 것입니다.

OTA(Over-The-Air) 업데이트는 *현장에 나간 디바이스*를 살아 있게 만드는 거의 유일한 도구입니다. 동시에 가장 위험한 공격 표면입니다. 만 대를 한 번에 brick 시킬 수도, 만 대에 malware를 한 번에 심을 수도 있는 자리입니다.

이 장에서는 *부팅 시 검증 가능한 펌웨어 업데이트*를 어떻게 설계하는지 봅니다. 서명 알고리즘 선택, A/B 슬롯 구조, rollback 방지, delta update의 트레이드오프, 그리고 MCUboot·Mender·SWUpdate 세 가지 실무 도구를 비교합니다. Ch 2의 secure boot이 *부팅 시점의 신뢰 사슬*이었다면, OTA는 *그 사슬을 깨지 않으면서 펌웨어를 바꾸는* 메커니즘입니다.

## OTA 흐름 — 한눈에 보는 단계

OTA는 보통 다음 일곱 단계로 분해됩니다.

| 단계 | 보안 책임 |
|------|---------|
| 1. 빌드 + 서명 | 빌드 서버가 *서명 키*로 이미지에 서명 |
| 2. 배포 (CDN, HTTPS) | TLS + 인증서 pinning |
| 3. 다운로드 | 디바이스가 검증된 endpoint에서 받음 |
| 4. *비활성 슬롯*에 기록 | 활성 슬롯은 건드리지 않음 |
| 5. 서명 검증 | 부트로더 또는 update agent가 검증 |
| 6. 부팅 시도 + healthcheck | 한 번 부팅하고 OK 신호를 받음 |
| 7. commit 또는 rollback | OK면 active 전환, 실패면 이전 슬롯 복구 |

5번이 *생사를 가르는 자리*입니다. 다운로드 채널이 HTTPS여도, 부트로더가 다시 서명을 검증하지 않으면 *공격자가 flash를 직접 쓸 때* 막을 길이 없습니다. **신뢰는 디바이스 안의 루트 키에서만 출발해야 합니다.**

## 서명 알고리즘 선택 — RSA / ECDSA / Ed25519

MCU급에서 가장 흔한 세 가지입니다. 선택 기준은 *키 크기*, *서명 크기*, *검증 시간*입니다.

| 알고리즘 | 키 크기 | 서명 크기 | Cortex-M4 검증 시간 (참고) | 비고 |
|---------|--------|---------|-----------------------|------|
| RSA-2048 | 256B | 256B | ~150ms | 보편적, 호환성 좋음 |
| RSA-3072 | 384B | 384B | ~400ms | 2030년 이후 권장 |
| ECDSA P-256 | 64B | 64B | ~80ms | 작은 flash 공간 |
| Ed25519 | 32B | 64B | ~30ms | 가장 빠름, 결정론적 |

ECDSA는 *nonce 재사용*이 곧 비밀 키 누출입니다. PS3 사건이 그 예입니다. 임베디드에서 안전한 nonce 생성을 보장하기 어렵다면 *Ed25519*가 답입니다. Ed25519는 hash 기반의 결정론적 서명이라 같은 메시지에 대해 같은 서명이 나오고, nonce 누출 위험이 없습니다.

키 길이는 *디바이스 수명*을 기준으로 정합니다. 10년 이상 필드에 있을 산업·자동차 제품은 RSA-3072 또는 Ed25519 권장입니다. 소비자 IoT의 일반 수명(3~5년)이면 RSA-2048 / ECDSA P-256으로 충분합니다.

## 이미지 헤더 — 검증 가능한 메타데이터

서명을 검증하려면 *어디까지가 페이로드인지*, *어떤 키로 서명했는지*, *어떤 버전인지*가 헤더에 박혀 있어야 합니다. MCUboot 헤더 형식이 사실상 표준이 되었습니다.

```c
struct image_header {
    uint32_t ih_magic;        // 0x96f3b83d (MCUboot)
    uint32_t ih_load_addr;
    uint16_t ih_hdr_size;
    uint16_t ih_protect_tlv_size;
    uint32_t ih_img_size;     // 페이로드 크기
    uint32_t ih_flags;
    struct image_version ih_ver;  // major.minor.revision.build
    uint32_t _pad;
};

struct image_tlv_info {
    uint16_t it_magic;        // 0x6907 (protected) / 0x6908 (non-protected)
    uint16_t it_tlv_tot;
};

// TLV 종류
// 0x10: SHA256 hash
// 0x20: RSA2048 signature
// 0x22: ECDSA-P256 signature
// 0x24: Ed25519 signature
// 0x30: dependency
// 0x40: encrypted-AES128-KW
```

헤더에는 *버전*과 *protected TLV section*이 함께 있습니다. protected TLV가 *서명 대상*에 포함되어야 버전을 바꿔치기 한 공격을 막을 수 있습니다. 이게 빠지면 *서명된 v1.0 이미지를 v9.9로 위장*하는 공격이 가능합니다.

## A/B 슬롯 — 되돌릴 수 있는 구조

OTA의 *되돌릴 수 있음*을 보장하는 가장 단순한 방법은 *두 슬롯*을 두는 것입니다.

```text
Flash layout (예: STM32 1MB flash):
  0x08000000 ~ 0x08008000   MCUboot (32KB)
  0x08008000 ~ 0x08080000   Slot 0 (active, 480KB)
  0x08080000 ~ 0x080F8000   Slot 1 (standby, 480KB)
  0x080F8000 ~ 0x08100000   Scratch / metadata (32KB)
```

흐름은 다음과 같습니다.

1. 부팅 시 MCUboot이 *어느 슬롯이 active인지* 메타데이터에서 확인합니다.
2. 새 이미지를 받으면 *비active 슬롯*에 기록합니다.
3. update agent가 *"다음 부팅에 시도해 줘"* 플래그를 메타데이터에 씁니다.
4. 재부팅 → MCUboot이 새 슬롯 이미지의 서명을 검증.
5. 검증 OK면 한 번 부팅. 부팅된 app이 *N초 안에 confirm()*을 호출하지 않으면 다음 부팅에서 원래 슬롯으로 복귀.
6. confirm()이 호출되면 새 슬롯이 active로 영구 전환.

이 *test boot → confirm* 패턴이 핵심입니다. 새 펌웨어가 *부팅은 되지만 통신은 안 되는 상태*에서도 자동 복구됩니다.

### MCUboot mode 비교

| 모드 | 설명 |
|------|------|
| `DIRECT_XIP` | 두 슬롯에 각각 link된 이미지. 더 빠르지만 빌드가 까다로움. |
| `SWAP_USING_SCRATCH` | active 슬롯에서 실행. 업데이트 시 두 슬롯을 swap. |
| `SWAP_USING_MOVE` | scratch 영역 불필요. 페이지 단위로 in-place swap. |
| `OVERWRITE_ONLY` | secondary → primary 단순 복사. rollback 불가. |

`SWAP_USING_MOVE`가 *근래 가장 권장*되는 모드입니다. scratch 영역이 따로 필요 없고, rollback도 지원합니다.

## Rollback 방지 — monotonic counter

A/B 슬롯이 *오작동 복구*는 해 주지만, *공격자가 의도적으로 옛 버전을 설치하는 것*은 막지 못합니다. 공격자에게 *공식 서명을 받은 v1.0 (취약점 있음)*이 있으면, 그걸로 *v1.5 (수정됨)*을 덮어쓸 수 있습니다.

해결책은 *모노토닉 보안 카운터*입니다. 헤더에 `security_counter`를 두고, *현재 디바이스의 값보다 작으면 거부*합니다.

```c
bool image_is_acceptable(struct image_header *hdr) {
    uint32_t device_counter = read_security_counter();  // OTP/eFuse
    uint32_t image_counter  = hdr->ih_security_counter;

    if (image_counter < device_counter) {
        // 옛 버전. rollback 시도. 거부.
        return false;
    }
    return true;
}

void post_update_commit(struct image_header *hdr) {
    if (hdr->ih_security_counter > read_security_counter()) {
        write_security_counter(hdr->ih_security_counter);
    }
}
```

`security_counter`는 *OTP 또는 eFuse*에 저장되어야 합니다. 일반 flash에 두면 공격자가 다시 쓸 수 있습니다.

`version` 필드와는 *분리*해야 합니다. 같은 보안 패치 안에서 version 1.4.0과 1.4.1을 둘 다 발행할 수 있어야 하므로, *security_counter는 보안 수정이 있을 때만* 올립니다.

## TLS + 인증서 pinning — 다운로드 채널

부트로더 검증이 *마지막 방어선*이라도, 다운로드 시점에 *서버 위조*를 막아야 트래픽이 줄어듭니다.

```c
// mbedTLS 예시 — 서버 인증서 pinning
static const char SERVER_CERT_PEM[] =
    "-----BEGIN CERTIFICATE-----\n"
    "MIIDXTCCAkWgAwIBAgIJAKl ... (디바이스가 신뢰할 단 하나의 CA) ...\n"
    "-----END CERTIFICATE-----\n";

mbedtls_x509_crt cacert;
mbedtls_x509_crt_init(&cacert);
mbedtls_x509_crt_parse(&cacert, SERVER_CERT_PEM, sizeof(SERVER_CERT_PEM));

mbedtls_ssl_conf_ca_chain(&conf, &cacert, NULL);
mbedtls_ssl_conf_authmode(&conf, MBEDTLS_SSL_VERIFY_REQUIRED);
```

*pinning*이 핵심입니다. 시스템 CA store 전체를 신뢰하면 공격자가 *어떤* CA에서든 인증서를 받아 MITM할 수 있습니다. 임베디드에서는 *우리 서버의 CA 하나*만 신뢰합니다. 단점은 *CA 갱신 시 OTA 자체를 OTA로 갱신해야 한다*는 점이라서, *두 개의 CA*(현재 + 다음)를 미리 심어 두는 것이 일반적입니다.

## Delta update — 다운로드 크기 줄이기

쇠한 LTE 회선에서 200MB rootfs를 전체 다 받으면 분 단위가 걸리고 데이터 비용도 큽니다. *delta update*는 *이전 버전과 새 버전의 차이*만 전송합니다.

가장 흔한 도구 두 가지입니다.

| 도구 | 알고리즘 | 비고 |
|------|---------|------|
| `bsdiff` / `bspatch` | suffix sort 기반 | 가장 보편적, BSD 라이선스 |
| `detools` | bsdiff + heatshrink | 임베디드 친화, MCU에서 patch 가능 |
| `xdelta3` | VCDIFF (RFC 3284) | 빠름, 큰 파일 효율 좋음 |
| `zchunk` | chunked, restartable | 대용량 OS 이미지 |

예시 — 200MB 이미지 v1.0 → v1.1 변경분이 5MB라면, bsdiff 결과물은 보통 3~8MB입니다.

```bash
# 빌드 서버에서
bsdiff firmware-v1.0.bin firmware-v1.1.bin firmware-v1.0-to-v1.1.patch
sign-tool firmware-v1.0-to-v1.1.patch > firmware-v1.0-to-v1.1.patch.sig

# 디바이스에서
verify_signature(patch, patch_sig);
bspatch(active_slot, standby_slot, patch);   // 표준 슬롯에 새 이미지 생성
verify_image_signature(standby_slot);        // 완성된 이미지 자체도 다시 검증
```

*delta 자체*와 *결과 이미지* 둘 다 서명을 검증해야 합니다. patch만 검증하고 결과를 그대로 두면, patch 적용 중 비트 오류가 generate한 잘못된 이미지가 부팅에 들어갑니다.

## 실무 도구 — MCUboot / Mender / SWUpdate

세 도구가 영역을 분담합니다.

| 도구 | 영역 | 트리거 |
|------|------|--------|
| **MCUboot** | 부트로더 (MCU/Cortex-M, RISC-V) | flash 메타데이터로 슬롯 선택 |
| **SWUpdate** | Linux 임베디드 (single-board) | tarball-based update package |
| **Mender** | Linux 임베디드 + fleet management | cloud server + client agent |

### MCUboot

Cortex-M 류 MCU의 사실상 표준입니다. Zephyr·NCS·MCUXpresso 등이 모두 채택했습니다.

```bash
# 이미지 빌드 (Zephyr 예)
west build -b nrf52840dk_nrf52840 samples/hello_world
imgtool sign --key root-rsa-2048.pem \
             --version 1.2.3 \
             --header-size 0x200 \
             --pad-header \
             --slot-size 0x80000 \
             --security-counter 5 \
             build/zephyr/zephyr.bin \
             build/zephyr/zephyr.signed.bin
```

### SWUpdate

`.swu` 패키지(cpio archive + sw-description)를 검증·적용합니다. A/B 파티션, 단일 이미지, *컨테이너 단위 업데이트*까지 지원합니다.

```text
# sw-description (예시)
software = {
  version = "1.2.3";
  description = "Production release";

  hardware-compatibility: [ "1.0" ];

  images: (
    {
      filename = "rootfs.squashfs";
      device   = "/dev/mmcblk0p2";  # 비활성 슬롯
      type     = "raw";
      sha256   = "abc123...";
    }
  );
}
```

### Mender

Mender는 SWUpdate의 *상위 계층*에 가깝습니다. 클라이언트 agent + 백엔드(자체 호스팅 가능)로 *fleet 단위 배포·롤백*까지 관리합니다. 디바이스가 만 대를 넘어가면 거의 필수입니다.

## Linux 환경 — A/B rootfs + dual kernel

Linux 임베디드에서 흔한 파티션 구조입니다. squashfs root는 [Buildroot Ch 8: 출력 파일시스템](/blog/embedded/buildroot/chapter08-filesystems)에서 다룬 *read-only + overlayfs* 패턴과 결합됩니다.

```text
mmcblk0p1   /boot      (FAT32, bootloader가 읽음)
mmcblk0p2   rootfs A   (squashfs, 1GB)
mmcblk0p3   rootfs B   (squashfs, 1GB)
mmcblk0p4   /data      (ext4, 영구 데이터 + overlay 백업)
```

`/boot`에는 *두 커널 + 두 device-tree*가 함께 있고, U-Boot 환경변수(`bootcount`, `upgrade_available`)로 시도/확정을 관리합니다.

```text
# U-Boot bootcmd 발췌
if test ${upgrade_available} = 1; then
    setexpr bootcount ${bootcount} + 1
    if test ${bootcount} -gt 3; then
        setenv upgrade_available 0
        setenv mmcpart ${mmcpart_old}
    fi
fi
load mmc 0:1 ${kernel_addr} zImage-${mmcpart}
```

세 번 시도해서 user-space가 *confirm*을 못 주면 옛 슬롯으로 돌아갑니다.

## 자주 하는 실수

### TLS만 검증하고 부트로더 검증을 생략한다

가장 흔한 실수입니다. *서버를 신뢰*해서 다운로드 받은 이미지를 그대로 flash에 쓰는 흐름. 공격자가 *디바이스에 직접 접근*(JTAG, SWD, USB DFU)하면 끝장입니다. 부트로더에서 *항상 서명을 다시 검증*해야 합니다.

### security_counter를 flash에 둔다

flash에 두면 공격자가 다시 쓸 수 있습니다. *OTP/eFuse* 또는 *TrustZone secure storage*에 두어야 의미가 있습니다. [Ch 4: TrustZone](/blog/embedded/embedded-security/chapter04-trustzone)에서 다룬 secure 측 storage가 이런 자리에 쓰입니다.

### confirm 없이 active 전환

새 이미지를 받고 *바로* active로 전환하는 흐름. 새 이미지에 부팅은 되지만 네트워크가 죽는 버그가 있으면 *현장 출동*이 필요합니다. 항상 *test boot → confirm*입니다.

### 같은 키로 모든 디바이스에 서명

한 디바이스가 털리면 *전 fleet*이 위협받습니다. 그렇다고 디바이스별 키를 두는 것도 비현실적이라, 보통 *제품군별 키 + HSM 보호*로 합의합니다. 키 회전 계획(2~3년)도 미리 세웁니다.

### delta patch만 검증

patch 자체는 서명 OK여도 *적용 결과*가 비트 오류로 깨졌을 수 있습니다. *결과 이미지의 서명*까지 검증하는 흐름이 안전합니다.

### CA pinning 없이 system store 신뢰

임베디드에서 system CA store(예: `/etc/ssl/certs`)는 보통 *너무 큽니다*. 침해된 CA가 하나만 있어도 MITM이 가능합니다. *우리 CA 하나*만 신뢰하도록 pinning합니다.

## 정리

- OTA의 *생사를 가르는 자리*는 부트로더의 서명 검증입니다. TLS는 보조 방어선입니다.
- ECDSA는 nonce 관리가 까다로워 *Ed25519*가 임베디드에서 더 안전한 선택입니다.
- *A/B 슬롯 + test boot + confirm* 패턴이 자동 rollback의 기본입니다.
- *security_counter*가 OTP에 있어야 의도적 downgrade를 막을 수 있습니다.
- delta update는 LTE/저대역 환경에서 필수이지만, *patch + 결과 이미지* 둘 다 서명 검증해야 합니다.
- MCU급에는 MCUboot, Linux 임베디드에는 SWUpdate/Mender가 사실상 표준입니다.
- 인증서는 *pinning*하고, 회전을 대비해 *두 개의 CA*를 미리 심어 둡니다.

다음 편은 **Ch 7: Side-channel 공격 — 전력 / 타이밍 / EM**.

## 관련 항목

- [Ch 2: Secure Boot — chain of trust](/blog/embedded/embedded-security/chapter02-secure-boot)
- [Ch 4: TrustZone — secure storage 활용처](/blog/embedded/embedded-security/chapter04-trustzone)
- [Practical RTOS Internals — Part 4-11: TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- [Buildroot Ch 8: 출력 파일시스템](/blog/embedded/buildroot/chapter08-filesystems)
- [원문 — MCUboot Documentation](https://docs.mcuboot.com/)
- [원문 — Mender — Robust OTA for Linux devices](https://docs.mender.io/)
- [원문 — SWUpdate Documentation](https://sbabic.github.io/swupdate/)
