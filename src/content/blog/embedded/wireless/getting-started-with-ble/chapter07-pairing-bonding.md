---
title: "Ch 7: Pairing·Bonding — BLE 보안의 핵심"
date: 2026-05-08T07:00:00
description: "Just Works·Passkey·Numeric Comparison·OOB 4가지 페어링 방법. LE Secure Connections."
series: "Getting Started with BLE"
seriesOrder: 7
tags: [ble, security, pairing, bonding, lesc]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: false
---

## 한 줄 요약

> **"Pairing은 *한 번의 보안 협상*, Bonding은 그 결과를 *저장*해 재접속 시 재사용입니다. 4가지 association model 중 *Just Works만 MITM에 취약*하고, 나머지 셋(Passkey·Numeric Comparison·OOB)은 LE Secure Connections와 결합하면 강력합니다."** I/O capability를 정확히 신고하는 것이 모든 결정의 출발점입니다.

BLE 보안은 *세 단계*로 보면 헷갈리지 않습니다. 첫째, *Pairing*은 양측이 *임시 공유 비밀*을 만드는 절차입니다. 둘째, *Bonding*은 그 비밀(과 부가 키들)을 *영구 저장*해 다음 연결에서 재페어링 없이 암호화를 시작하는 것입니다. 셋째, *암호화·서명·privacy*는 그 키들을 *런타임에 사용*하는 동작입니다.

이번 장에서는 4가지 association model을 비교하고, Legacy Pairing과 LE Secure Connections의 차이를 ECDH P-256 곡선까지 풀어 봅니다. 그리고 LTK·IRK·CSRK 세 종류 키가 *어디에 쓰이는지*, 그 키들이 nRF·ESP32에서 *어디에 저장되는지*도 정리합니다.

## Pairing의 6단계 흐름

스펙 상 LE pairing은 정확히 *6개 PDU* 교환으로 이루어집니다. 다음 표가 LE Secure Connections 기준 순서입니다.

| 단계 | PDU | 누가 보내나 | 무엇이 들어가나 |
|------|-----|------------|----------------|
| 1 | Pairing Request | Initiator (보통 central) | I/O cap, OOB flag, AuthReq (bond/MITM/SC), key distribution flags |
| 2 | Pairing Response | Responder (보통 peripheral) | 동일 필드, 협상 결과 |
| 3 | Public Key Exchange | 양쪽 각각 | ECDH P-256 공개키 (64 byte) |
| 4 | Pairing Confirm | Responder | Cb = f4(Pkb, Pka, Nb, rb) |
| 5 | Pairing Random | 양쪽 각각 | nonce (16 byte) |
| 6 | DHKey Check | 양쪽 각각 | Ea/Eb = f6(...) |

이후 LL이 *Encryption Start* 절차를 돌려 링크가 암호화됩니다. *Legacy Pairing*은 3·4·5단계에서 ECDH 없이 *TK(Temporary Key)*만 쓰기 때문에 수동 sniffer로 *키를 복원*당할 수 있습니다. 2014년 BLE 4.2부터 추가된 *LE Secure Connections*는 ECDH로 수동 공격을 차단합니다.

```text
[Pairing 흐름 - LE Secure Connections]
Initiator                              Responder
   │                                       │
   ├─── Pairing Request ──────────────────►│
   │◄── Pairing Response ──────────────────┤
   │                                       │
   ├─── Public Key (Pka, 64B) ────────────►│
   │◄── Public Key (Pkb, 64B) ─────────────┤
   │                                       │
   │    (양쪽 각각 ECDH 계산)               │
   │    DHKey = ECDH(SK_local, PK_remote)  │
   │                                       │
   │◄── Pairing Confirm (Cb) ──────────────┤
   ├─── Pairing Random (Na) ──────────────►│
   │◄── Pairing Random (Nb) ───────────────┤
   │                                       │
   │    (association model 별 검증)         │
   │                                       │
   ├─── DHKey Check (Ea) ─────────────────►│
   │◄── DHKey Check (Eb) ──────────────────┤
   │                                       │
   ├─── LL_ENC_REQ ───────────────────────►│
   │◄── LL_ENC_RSP ────────────────────────┤
   │    (AES-CCM 암호화 시작)               │
```

여기서 *association model*은 4·5단계의 *Pairing Confirm/Random*을 어떤 방식으로 검증할지를 결정합니다. I/O capability를 양쪽이 신고하면 *Volume 3 Part H Table 2.8*의 매트릭스로 자동 결정됩니다.

## 4가지 Association Model

| 모델 | I/O 요구 | MITM 방어 | 사용자 동작 | 전형적 사용처 |
|------|---------|----------|------------|--------------|
| Just Works | 없음 | 없음 | 없음 | 비콘, 저가 센서 |
| Passkey Entry | 한 쪽 display, 다른 쪽 keyboard | 있음 | 6자리 숫자 입력 | 키보드, 헤드셋 |
| Numeric Comparison | 양쪽 display + yes/no 입력 | 있음 (LESC 전용) | 두 숫자 비교 후 확인 | 스마트폰 ↔ 스마트워치 |
| Out-of-Band (OOB) | NFC, QR 등 별도 채널 | 있음 (채널 강도에 따름) | NFC 태깅 등 | 양산 IoT provisioning |

*Just Works*는 양측이 *공개된 nonce*만 교환해 키를 만듭니다. 그 자체로는 수동 공격(eavesdropping)은 LESC가 막아주지만, *능동 MITM*(중간에 사람이 끼어들어 양쪽과 각각 페어링)은 막지 못합니다. 사용자 입장에서는 *아무 확인 없이* 페어링이 끝나기 때문에 "이 디바이스가 진짜 내가 의도한 것인지" 확신할 방법이 없습니다.

*Passkey Entry*는 6자리 숫자(0~999999)를 한 쪽이 표시하고 다른 쪽이 입력합니다. 비트 단위로 20-bit 엔트로피인데, MITM 공격자가 한 번에 통과할 확률이 1/1000000입니다. *Numeric Comparison*은 양쪽이 *같은 숫자를 표시*하고 사용자가 "같다"를 누릅니다. LESC에서만 가능하고 가장 사용자 친화적입니다. *OOB*는 NFC·QR·USB 등 *별도 채널*로 키 자료를 전달합니다. 양산 IoT에서는 *QR로 LTK seed*를 받아 첫 페어링을 OOB로 끝내는 패턴이 자주 보입니다.

```c
// nRF Connect SDK — I/O capability 선언
static struct bt_conn_auth_cb auth_cb = {
    .passkey_display = passkey_display_cb,    // 디스플레이 가능
    .passkey_entry = NULL,                    // 키패드 없음
    .passkey_confirm = passkey_confirm_cb,    // Numeric Comparison
    .cancel = auth_cancel_cb,
    .pairing_confirm = NULL,
};

static void passkey_display_cb(struct bt_conn *conn, unsigned int passkey)
{
    char addr[BT_ADDR_LE_STR_LEN];
    bt_addr_le_to_str(bt_conn_get_dst(conn), addr, sizeof(addr));
    printk("Passkey for %s: %06u\n", addr, passkey);
    /* 사용자가 모바일 앱에 이 6자리를 입력 */
}

static void passkey_confirm_cb(struct bt_conn *conn, unsigned int passkey)
{
    /* 표시 후 사용자 yes/no 입력 대기 */
    printk("Confirm passkey %06u? Press button to accept.\n", passkey);
    /* 버튼 ISR에서 bt_conn_auth_passkey_confirm(conn) 호출 */
}

int main(void)
{
    bt_enable(NULL);
    bt_conn_auth_cb_register(&auth_cb);
    /* ... */
}
```

I/O capability를 잘못 신고하면 의도와 다른 모델로 떨어집니다. *디스플레이가 없는 디바이스*가 `DISPLAY_ONLY`로 신고하면 페어링 자체가 실패하거나 Just Works로 fallback합니다. 양산 직전에 반드시 *각 model의 자동 협상*을 sniffer로 확인합니다.

## Legacy Pairing vs LE Secure Connections

BLE 보안의 *진짜 분기*는 association model이 아니라 *어떤 키 교환 알고리즘을 쓰는가*입니다. Legacy는 *TK 기반*, LESC는 *ECDH P-256 기반*입니다.

| 항목 | Legacy Pairing | LE Secure Connections |
|------|---------------|----------------------|
| 도입 | BLE 4.0 | BLE 4.2 |
| 키 교환 | TK + nonce ⇒ STK ⇒ LTK | ECDH P-256 ⇒ DHKey ⇒ LTK |
| 수동 공격(eavesdrop) | 취약 (TK 노출 시 키 복원) | 강력 (ECDH로 차단) |
| 능동 공격(MITM) | association model에 의존 | association model에 의존 |
| Numeric Comparison | 불가 | 가능 |
| ECC 연산 비용 | 없음 | P-256 1회 (~수십 ms on M4) |

ECDH P-256은 *NIST P-256 곡선* 위의 Diffie-Hellman입니다. 양쪽이 각자 *32-byte 개인키*를 만들고 *64-byte 공개키*를 교환한 뒤, 상대 공개키와 자기 개인키로 *공유 비밀 DHKey(32 byte)*를 계산합니다. 도청자는 두 공개키를 보더라도 *이산로그 문제*를 풀어야 DHKey를 얻습니다.

```c
// LESC 활성화 (Zephyr/NCS)
CONFIG_BT_SMP=y
CONFIG_BT_SMP_SC_ONLY=y           # LESC 강제, Legacy 거부
CONFIG_BT_SMP_SC_PAIR_ONLY=y      # 더 엄격
CONFIG_BT_BONDABLE=y              # bond 저장 허용
CONFIG_BT_FIXED_PASSKEY=n         # 양산은 고정 키 금지

// 또는 펌웨어 런타임 결정
struct bt_le_oob oob_local;
bt_le_oob_get_local(BT_ID_DEFAULT, &oob_local);
// oob_local.le_sc_data.r, .c 를 QR/NFC로 전달
```

*Legacy를 거부*하는 설정을 양산 펌웨어에서는 권장합니다. 예전 폰(Android 6 이하)이 떨어져 나가는 단점은 있지만, *Legacy fallback이 있으면 downgrade 공격*에 노출됩니다.

## 키 분배 - LTK·IRK·CSRK

페어링이 끝나면 *세 종류의 키*를 양쪽이 *분배*합니다. 어떤 키를 분배할지는 Pairing Request의 *Key Distribution flags*에서 결정합니다.

| 키 | 용도 | 길이 | 분배 방향 | 비고 |
|----|------|------|----------|------|
| LTK (Long Term Key) | 링크 암호화(AES-CCM) | 16 B | LESC는 *양쪽 자동 도출*, Legacy는 분배 | 다음 연결에서 페어링 없이 재암호화 |
| IRK (Identity Resolving Key) | RPA(Resolvable Private Address) 해석 | 16 B | 양방향 분배 | privacy 기능 |
| CSRK (Connection Signature Resolving Key) | Unauthenticated signed data 서명 | 16 B | 양방향 분배 | 거의 안 씀 |
| EDIV·Rand | Legacy에서 LTK 인덱싱 | 2+8 B | Legacy 전용 | LESC는 LTK 자체로 인덱싱 |

```c
// nRF Connect SDK — 분배할 키 명시
static struct bt_smp_pairing_features feat = {
    .io_capability = BT_SMP_IO_DISPLAY_YESNO,
    .oob_data_flag = 0,
    .auth_req = BT_SMP_AUTH_BONDING | BT_SMP_AUTH_SC | BT_SMP_AUTH_MITM,
    .max_enc_key_size = 16,
    .init_key_dist = BT_SMP_DIST_ENC_KEY | BT_SMP_DIST_ID_KEY,
    .resp_key_dist = BT_SMP_DIST_ENC_KEY | BT_SMP_DIST_ID_KEY,
};
```

가장 중요한 것은 *LTK*입니다. 한 번 페어링 후 LTK가 양측에 저장되면, 다음 연결에서는 *LL_ENC_REQ → LL_START_ENC_REQ*만 거치고 즉시 암호화 링크가 시작됩니다. 사용자에게는 *재페어링 없이 자동 재연결*로 보입니다. 이것이 *Bonding*의 본질입니다.

*IRK*는 *privacy*를 위해 필요합니다. 광고나 연결에서 디바이스가 *고정 MAC*을 노출하면 추적 위협이 됩니다. IRK를 공유한 디바이스끼리는 *Resolvable Private Address(RPA)*를 주기적으로 바꿔도 *자기 짝*을 알아봅니다.

*CSRK*는 *Connection Signature*에 쓰이는데, 실제로는 *암호화된 채널에서 서명을 다시 쓸 필요가 거의 없어* 거의 사용되지 않습니다. 키 분배 flag에서 빼도 무방한 경우가 많습니다.

## Bonding 저장 - 어디에 저장되는가

Pairing의 결과를 영구 저장하면 Bonding입니다. *저장 위치*가 플랫폼마다 다릅니다.

| 플랫폼 | 저장 위치 | 영속성 | 비고 |
|--------|----------|--------|------|
| nRF Connect SDK | NVS(Settings subsys, internal flash) | 펌웨어 OTA에도 보존 가능 | `bt/keys/` 키-값 |
| ESP-IDF NimBLE | NVS partition `nvs` | 파티션 테이블 유지 시 보존 | `ble_hs_store` namespace |
| ESP-IDF Bluedroid | NVS + 자체 영역 | 동일 | 더 큰 footprint |
| Linux BlueZ | `/var/lib/bluetooth/<adapter>/<peer>/` | 디스크 | text key 파일 |
| Android / iOS | OS 시스템 영역 | OS 관리 | 앱이 직접 접근 불가 |

```c
// nRF Connect SDK - 모든 bond 삭제 (공장 초기화)
int err = bt_unpair(BT_ID_DEFAULT, BT_ADDR_LE_ANY);
if (err) {
    printk("bt_unpair failed: %d\n", err);
}

// 특정 peer만 삭제
bt_addr_le_t peer = {...};
bt_unpair(BT_ID_DEFAULT, &peer);

// bond 목록 순회
static void bond_info(const struct bt_bond_info *info, void *user_data) {
    char addr[BT_ADDR_LE_STR_LEN];
    bt_addr_le_to_str(&info->addr, addr, sizeof(addr));
    printk("Bonded: %s\n", addr);
}
bt_foreach_bond(BT_ID_DEFAULT, bond_info, NULL);
```

ESP32 NimBLE은 *기본적으로 RAM에 키를 보관*합니다(`ble_store_ram.c`). NVS에 영구 저장하려면 `nimble_port_init` 전에 `ble_store_config_init()`를 호출해야 합니다. *처음 만지면 흔히 빠지는 함정*입니다.

```c
// ESP-IDF NimBLE - 영구 bond 저장 활성화
#include "store/config/ble_store_config.h"

void app_main(void)
{
    nvs_flash_init();
    nimble_port_init();
    ble_store_config_init();          // 이 호출이 핵심
    ble_hs_cfg.sm_bonding = 1;
    ble_hs_cfg.sm_sc = 1;
    /* ... */
}
```

펌웨어 OTA로 *NVS partition table이 바뀌면 모든 bond가 날아갑니다*. 양산 펌웨어는 *bond 보존 OTA*가 필수입니다. NCS는 `CONFIG_SETTINGS_NVS`로 자동 보존되고, ESP-IDF는 NVS partition을 OTA에서 *건드리지 말아야* 합니다.

## 한 줄짜리 의사결정

양산 IoT라면 다음 두 줄을 기본으로 잡고 시작합니다.

```text
LE Secure Connections + Bonding + 적절한 association model
(I/O가 있으면 Numeric Comparison, 없으면 Just Works + OOB 보조)
```

*Just Works만 단독*으로 양산에 쓰면 안 됩니다. 의료·결제·열쇠 등 *높은 보안 요구*에는 *Numeric Comparison*이나 *OOB*가 필수입니다. 일반 센서·조명 같은 *낮은 가치 자산*은 Just Works로 가되, 첫 페어링을 *물리적으로 격리된 환경*(공장 출고 시 QR)에서 끝내는 패턴이 권장됩니다.

## 자주 하는 실수

```text
증상                                    원인                           해결
─────────────────────────────────────────────────────────────────────────────
재연결마다 다시 페어링                   bond 저장 안 됨                ble_store_config_init() 호출
                                                                       또는 NCS Settings subsys 활성화
Just Works로 자동 떨어짐                I/O cap mismatch              양쪽 io_capability 정확히 신고
LESC 협상 실패                          Legacy fallback 꺼져 있음     상대가 BLE 4.2+ 인지 확인
OTA 후 bond 날아감                      NVS partition 변경           bond 보존 OTA 전략 적용
NoMITM인데 키패드 요구                  AuthReq.MITM=1 설정         낮은 자산이면 MITM=0
Pairing Failed (0x05)                  Pairing not supported       양쪽 SMP 활성화 확인
Pairing Failed (0x06)                  Encryption key size 불충분    max_key_size=16 확인
RPA가 해석 안 됨                        IRK 분배 안 했음             init/resp_key_dist에 ID_KEY 포함
```

가장 흔한 함정은 *재페어링 루프*입니다. 페어링은 성공했는데 다음 연결에서 또 페어링을 요구하는 증상은 *bond가 저장되지 않은 것*이 거의 100%입니다. NCS는 `CONFIG_BT_SETTINGS=y`, ESP-IDF NimBLE은 `ble_store_config_init()` 호출이 필수입니다.

## 정리

- *Pairing*은 한 번의 보안 협상, *Bonding*은 그 결과를 영구 저장하는 후속 동작입니다.
- 4가지 association model은 *I/O capability*에 따라 자동 결정됩니다. *Just Works만 MITM에 취약*하고 나머지는 LESC와 결합 시 강력합니다.
- *LE Secure Connections*는 ECDH P-256으로 *수동 공격*을 차단합니다. 양산 펌웨어는 LESC만 허용하는 설정이 안전합니다.
- 분배되는 키는 *LTK(암호화)*, *IRK(privacy)*, *CSRK(서명)* 세 종류입니다. LTK가 가장 중요하고, CSRK는 거의 안 씁니다.
- Bond 저장 위치는 플랫폼마다 다릅니다. *NCS는 NVS Settings*, *NimBLE은 ble_store_config_init() 호출 필요*입니다.
- 펌웨어 OTA에서 *NVS partition을 건드리면 모든 bond가 날아갑니다*. bond 보존 전략을 OTA 설계에 포함해야 합니다.
- 재페어링 루프, Just Works fallback, OTA 후 bond 손실이 세 대표 실수입니다. 양산 전에 sniffer로 페어링 시퀀스를 *실제로* 확인합니다.

## 다음 편

[Ch 8: Advertising·Scanning — 발견의 비대칭](/blog/embedded/wireless/getting-started-with-ble/chapter08-advertising-scanning)에서는 *연결 이전* 단계인 광고와 스캐닝을 다룹니다. 채널 37·38·39의 주파수 선택, adv interval과 jitter, 그리고 iBeacon·Eddystone·AltBeacon의 페이로드 포맷까지 한 번에 정리합니다.

## 관련 항목

- [Ch 6: 표준 서비스와 직접 만든 서비스](/blog/embedded/wireless/getting-started-with-ble/chapter06-services-characteristics) — 보안 이전의 데이터 모델
- [Ch 8: Advertising·Scanning — 발견의 비대칭](/blog/embedded/wireless/getting-started-with-ble/chapter08-advertising-scanning)
- [Ch 11: nRF Connect SDK 실습](/blog/embedded/wireless/getting-started-with-ble/chapter11-nrf-connect-sdk) — 본문 코드의 실제 환경
- [ESP32-C3 Mastering Ch 8: BLE 5.0 — GAP·GATT·Coded PHY](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt) — NimBLE에서의 pairing 설정
- [원문 — Bluetooth Core 5.4, Vol 3 Part H (Security Manager)](https://www.bluetooth.com/specifications/specs/core-specification-5-4/)
