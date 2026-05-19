---
title: "Ch 7: WiFi 4 스택 — Station·SoftAP·Mesh"
date: 2026-05-01T07:00:00
description: "802.11 b/g/n. ESP-IDF WiFi API, 4가지 모드. WPA2/WPA3 보안."
series: "ESP32-C3 Mastering"
seriesOrder: 7
tags: [wifi, "802.11", esp-idf, wpa2, wpa3, esp32-c3]
draft: false
---

## 한 줄 요약

> **"ESP32-C3의 WiFi는 *event-driven*입니다. `esp_wifi_*` 호출은 *명령*일 뿐, 결과는 모두 *event handler*로 돌아옵니다."** 동기 API로 착각하면 race condition과 reconnect 지옥이 시작됩니다.

ESP32-C3는 802.11 b/g/n을 지원합니다. 2.4 GHz 단일 밴드이고, 1×1 SISO 안테나, 최대 PHY 비율 72.2 Mbps입니다. 실제 애플리케이션 throughput은 *TCP 약 20 Mbps, UDP 약 30 Mbps*가 한계입니다. 5 GHz도 802.11ac/ax도 없습니다. 대신 *대량 보급용 IoT*에 충분한 사양을 *작은 RAM 풋프린트*로 제공합니다.

이번 장에서는 WiFi 스택의 *4가지 모드*를 차례로 살펴보고, event loop 패턴, WPA2/WPA3 보안, ESP-MESH의 자가 조직 트리, 그리고 provisioning(공장 출하 후 사용자 WiFi 정보를 받는 절차)까지 다룹니다.

## ESP-IDF WiFi 스택 구조

WiFi 스택은 *4개 계층*입니다.

| 계층 | 역할 | 주요 API |
|------|------|---------|
| Driver | RF/MAC HAL | `esp_wifi_init`, `esp_wifi_start` |
| LwIP | TCP/IP 스택 | `esp_netif_*` |
| Event Loop | 비동기 이벤트 라우팅 | `esp_event_loop_create_default` |
| Application | 비즈니스 로직 | 사용자 코드 |

핵심은 *event loop*입니다. WiFi 연결 시도, 연결 성공, DHCP 완료, 끊김 같은 *모든 상태 변화*는 event로 발행됩니다. 애플리케이션은 handler를 등록해 *비동기*로 반응합니다.

```c
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "nvs_flash.h"

static void wifi_event_handler(void* arg, esp_event_base_t event_base,
                                int32_t event_id, void* event_data)
{
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        // 재연결 로직. 백오프와 retry 카운트 필수.
        esp_wifi_connect();
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t* event = (ip_event_got_ip_t*)event_data;
        ESP_LOGI("wifi", "got IP: " IPSTR, IP2STR(&event->ip_info.ip));
    }
}
```

`WIFI_EVENT`는 *링크 계층* 이벤트(연결·끊김·스캔 완료), `IP_EVENT`는 *네트워크 계층* 이벤트(IP 획득·갱신·상실)입니다. 두 베이스를 *분리*해 등록해야 의미가 분명해집니다.

## Station 모드 — 클라이언트 연결

가장 흔한 모드입니다. 가정용 라우터에 *클라이언트*로 붙는 시나리오입니다.

```c
void wifi_init_sta(void)
{
    ESP_ERROR_CHECK(nvs_flash_init());
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL, NULL));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL, NULL));

    wifi_config_t wifi_config = {
        .sta = {
            .ssid = "MyHomeWiFi",
            .password = "supersecret",
            .threshold.authmode = WIFI_AUTH_WPA2_PSK,
            .pmf_cfg = { .capable = true, .required = false },
        },
    };
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());
}
```

호출 순서가 *엄격*합니다. `nvs_flash_init` → `esp_netif_init` → `esp_event_loop_create_default` → `esp_netif_create_default_wifi_sta` → `esp_wifi_init` → `esp_wifi_set_mode` → `esp_wifi_set_config` → `esp_wifi_start`. 한 단계라도 빠지거나 순서가 바뀌면 `ESP_ERR_WIFI_NOT_INIT` 또는 `ESP_ERR_INVALID_STATE`가 반환됩니다.

`esp_wifi_start`는 *연결을 시작하지 않습니다*. 오직 *드라이버를 켤* 뿐입니다. 실제 연결은 `WIFI_EVENT_STA_START` event를 받은 뒤 `esp_wifi_connect`를 호출해야 시작됩니다.

## SoftAP 모드 — AP 동작

ESP32-C3가 *AP 노릇*을 합니다. 폰을 직접 붙여 설정 화면을 띄우는 OOBE(out-of-box experience) 시나리오, 또는 *별도 라우터 없이* 센서 노드를 모으는 용도입니다.

```c
void wifi_init_softap(void)
{
    esp_netif_create_default_wifi_ap();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    wifi_config_t wifi_config = {
        .ap = {
            .ssid = "ESP32-C3-Setup",
            .ssid_len = strlen("ESP32-C3-Setup"),
            .password = "configme",
            .max_connection = 4,
            .authmode = WIFI_AUTH_WPA2_PSK,
            .channel = 6,
        },
    };
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_AP));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());
}
```

기본 제약은 *동시 클라이언트 10대 이하*, *DHCP server 자동 활성화*, *IP 대역 192.168.4.1/24*입니다. 채널은 1·6·11이 안전합니다. 한 SoftAP가 *너무 많은 클라이언트*를 받으면 처리량이 급격히 떨어집니다. C3는 단일 코어에 RAM도 작아 *4~6대*가 현실적 한계입니다.

## Station+AP 동시 모드 — 브리지

가장 유용한 시나리오 중 하나입니다. *기존 라우터에 붙으면서* 동시에 *자체 AP*도 운영합니다. provisioning, mesh root, range extender에 쓰입니다.

```c
ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_APSTA));
ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &sta_config));
ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP,  &ap_config));
```

주의할 점은 *두 인터페이스가 같은 채널*을 써야 한다는 것입니다. ESP32-C3 라디오는 *하나*뿐이라, STA가 6번 채널에 연결되면 AP도 *자동으로 6번*으로 끌려갑니다. AP 채널을 따로 지정해도 무시됩니다.

## WPA2-Personal vs WPA3-Personal

C3는 *WPA3-Personal*과 *WPA2/WPA3 Mixed*까지 지원합니다.

| 보안 | 키 교환 | C3 지원 | 비고 |
|------|--------|---------|------|
| Open | 없음 | yes | 보안 없음 |
| WEP | RC4 | yes (호환용) | 사용 금지 |
| WPA2-Personal | 4-way handshake | yes | 사실상 표준 |
| WPA3-Personal | SAE (Dragonfly) | yes | KRACK 면역 |
| WPA2/WPA3 Mixed | 양쪽 | yes | 권장 |
| WPA2-Enterprise | EAP-TLS, PEAP | yes | 인증서 필요 |

WPA3로 갈 때는 *PMF(Protected Management Frames)*가 필수입니다. `pmf_cfg.required = true`로 켜야 합니다. WPA2/WPA3 mixed에서는 `capable = true, required = false`로 두는 것이 호환성 최대입니다.

```c
wifi_config_t wifi_config = {
    .sta = {
        .ssid = "MyWiFi",
        .password = "secret",
        .threshold.authmode = WIFI_AUTH_WPA2_WPA3_PSK,
        .pmf_cfg = { .capable = true, .required = false },
        .sae_pwe_h2e = WPA3_SAE_PWE_HASH_TO_ELEMENT,
    },
};
```

WPA2-Enterprise는 `esp_wifi_sta_wpa2_ent_*` 별도 API를 호출합니다. 사내 인증서(CA, client cert, private key)를 PEM으로 임베드하거나 NVS에 저장합니다.

## ESP-MESH — 자가 조직 트리 네트워크

ESP-MESH는 *root → layer 1 → layer 2 → ...*의 *트리*입니다. 최대 *6 layer*까지 확장됩니다. mesh 안에서는 각 노드가 *동시에 station(부모에게)·SoftAP(자식에게)* 두 역할을 합니다.

```text
            [Root]
              │ STA → Router
              │
    ┌─────────┼─────────┐
   [L1]     [L1]      [L1]   (root의 자식들)
    │         │         │
  [L2]┐    [L2]      [L2]   (L1의 자식들)
       │
     [L3]                   (최대 layer 6까지)
```

root만 *외부 라우터*에 붙습니다. 그 아래는 *내부 mesh 트래픽*만 흐릅니다. 노드가 떨어져 나가면 *자동으로 부모를 재선출*합니다. 한국에서는 *공장 IoT 센서 네트워크*나 *대규모 LED 조명 제어*에 쓰입니다.

```c
mesh_cfg_t mesh_cfg = MESH_INIT_CONFIG_DEFAULT();
memcpy(mesh_cfg.mesh_id.addr, MESH_ID, 6);
mesh_cfg.channel = 0;          // 0이면 root가 채널을 결정
mesh_cfg.router.ssid_len = strlen(ROUTER_SSID);
memcpy(mesh_cfg.router.ssid, ROUTER_SSID, mesh_cfg.router.ssid_len);
memcpy(mesh_cfg.router.password, ROUTER_PASS, strlen(ROUTER_PASS));
mesh_cfg.mesh_ap.max_connection = 6;
memcpy(mesh_cfg.mesh_ap.password, MESH_AP_PASS, strlen(MESH_AP_PASS));

ESP_ERROR_CHECK(esp_mesh_set_config(&mesh_cfg));
ESP_ERROR_CHECK(esp_mesh_start());
```

mesh는 *대역폭이 layer마다 절반*으로 떨어집니다. layer 3쯤 가면 throughput이 1 Mbps 이하로 내려갑니다. *고대역 application*에는 부적합하고, *주기적 small payload*에 적합합니다.

## Provisioning — 사용자 WiFi 정보 받기

공장 출하 단계에서는 *어느 라우터에 붙을지 알 수 없습니다*. 사용자가 *처음 켤 때* 알려 줘야 합니다. ESP-IDF는 *wifi_provisioning* 컴포넌트를 제공합니다.

| 방식 | 채널 | 사용자 경험 |
|------|------|------------|
| SoftAP provisioning | ESP가 AP, 폰이 STA | 폰을 ESP의 AP에 붙임 |
| BLE provisioning | BLE GATT | 폰 앱이 BLE로 전달 |
| SmartConfig | broadcast 패킷 | 폰이 WiFi packet에 정보 embed |

```c
wifi_prov_mgr_config_t config = {
    .scheme = wifi_prov_scheme_ble,
    .scheme_event_handler = WIFI_PROV_SCHEME_BLE_EVENT_HANDLER_FREE_BTDM,
};
ESP_ERROR_CHECK(wifi_prov_mgr_init(config));

const char *pop = "abcd1234";  // proof of possession
ESP_ERROR_CHECK(wifi_prov_mgr_start_provisioning(
    WIFI_PROV_SECURITY_1, pop, "PROV_C3", NULL));
```

`WIFI_PROV_SECURITY_1`은 X25519 키 교환 + AES-CTR, `_SECURITY_2`는 SRP6a + AES-GCM입니다. 양산 제품에서는 *Security 2* + 디바이스별 *username/password*를 권장합니다. PoP(proof of possession)는 *제품 라벨에 인쇄된 코드*가 흔한 패턴입니다.

## 전력 절약 — Modem Sleep와 DTIM

연결 상태에서 *지속 전류*를 줄이는 핵심은 *modem sleep*입니다. STA가 AP에 *DTIM beacon만 듣는다*는 약속을 보내고, 그 사이는 라디오를 끕니다.

```c
ESP_ERROR_CHECK(esp_wifi_set_ps(WIFI_PS_MIN_MODEM));
// WIFI_PS_MIN_MODEM — DTIM마다 깸 (기본)
// WIFI_PS_MAX_MODEM — 사용자 지정 listen_interval마다 깸
// WIFI_PS_NONE      — 절전 끔
```

DTIM은 *AP가 broadcast 전에 알려 주는 beacon 주기*입니다. 가정용 라우터는 보통 DTIM=1 또는 3입니다. listen_interval을 *DTIM의 배수*로 키우면 깨는 빈도가 *N배 감소*하지만, *broadcast packet을 놓칠 위험*도 늘어납니다.

| listen_interval | 평균 전류 | 응답 지연 |
|----------------|---------|---------|
| 1 | 15 mA | < 100 ms |
| 3 | 5 mA | < 300 ms |
| 10 | 1.5 mA | < 1 s |
| 30 | < 500 µA | < 3 s |

## 처리량의 현실

C3 데이터시트가 약속하는 PHY 비율은 72.2 Mbps입니다. *애플리케이션*에서 실제로 나오는 throughput은 *훨씬 낮습니다*.

| 시나리오 | TCP | UDP |
|---------|-----|-----|
| STA → AP, 1 m 거리 | 18~20 Mbps | 28~30 Mbps |
| STA → AP, 5 m 벽 1개 | 12~15 Mbps | 20~25 Mbps |
| STA → AP, 10 m 벽 2개 | 5~8 Mbps | 10~15 Mbps |
| Mesh L2 노드 | 3~5 Mbps | 5~8 Mbps |

이유는 여러 가지입니다. C3는 1×1 SISO라 *MIMO 이득*이 없고, 2.4 GHz는 *간섭이 심하며*, IDF의 LwIP 구현이 *zero-copy가 아니라* 사본을 한 번 더 만들기 때문입니다. *벌크 전송이 주된 application*이면 ESP32-S3(2×2 듀얼 코어)나 ESP32-C6(WiFi 6) 쪽이 적합합니다.

## 자주 하는 실수와 troubleshooting

```text
증상                              원인                              해결
─────────────────────────────────────────────────────────────────────────
WIFI_EVENT_STA_START 뒤 무반응   handler에서 esp_wifi_connect 안 함  handler 안에서 connect 호출
endless reconnect 루프            disconnect handler가 즉시 retry     백오프(exponential) + 카운트 제한
ESP_ERR_WIFI_NOT_INIT            esp_netif_init 누락                  순서 엄수
AP 채널 무시됨                    STA가 다른 채널에 붙음               APSTA에서는 STA 채널 따라감
WPA3 연결 실패                    PMF 옵션 미설정                      pmf_cfg.capable = true
throughput이 1 Mbps 이하          DTIM listen_interval 너무 큼         WIFI_PS_NONE으로 테스트
mesh root election 실패           mesh_id 불일치 또는 channel 0 미통일 모든 노드 같은 mesh_id, channel 0 권장
```

가장 흔한 함정은 *reconnect 폭주*입니다. `WIFI_EVENT_STA_DISCONNECTED` 핸들러에서 *바로 `esp_wifi_connect`를 호출*하면, AP가 다운된 상태에서 *초당 수십 회 재시도*가 발생합니다. 백오프(1s → 2s → 4s → 8s)와 *최대 retry count*를 반드시 둡니다.

## 정리

- ESP32-C3의 WiFi는 *event-driven*입니다. `esp_wifi_*` 호출은 명령일 뿐 결과는 event handler로 옵니다.
- 모드는 *4가지*입니다. STA, SoftAP, APSTA, NULL. APSTA는 라디오 하나라서 *채널이 통일*됩니다.
- 보안은 *WPA2-Personal*이 기본, *WPA2/WPA3 Mixed*가 권장입니다. WPA3는 PMF가 필수입니다.
- ESP-MESH는 *최대 6 layer*의 트리이고 *root만 외부 라우터*에 붙습니다. 대역폭은 layer마다 절반으로 줍니다.
- Provisioning은 *BLE 방식*이 양산에 가장 깔끔합니다. PoP는 제품 라벨 코드가 표준입니다.
- *Modem sleep + DTIM listen_interval*로 STA 평균 전류를 *15 mA → 1.5 mA*까지 끌어내릴 수 있습니다.
- 실제 throughput은 *TCP 약 20 Mbps, UDP 약 30 Mbps*가 최선입니다. C3는 IoT용이지 벌크 전송용이 아닙니다.
- *reconnect 폭주*는 신규 펌웨어의 1순위 버그입니다. 백오프와 retry count는 처음부터 박아 두는 것이 안전합니다.

## 다음 편

[Ch 8: BLE 5.0 — GAP·GATT·Coded PHY](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt)에서는 또 다른 무선 인터페이스인 *Bluetooth Low Energy 5.0*을 다룹니다. NimBLE 스택, GATT 서비스 설계, Coded PHY로 *4배 거리 확장*하기까지 살펴봅니다.

## 관련 항목

- [Ch 6: ADC·터치 센서](/blog/embedded/riscv/esp32-c3-mastering/chapter06-adc-touch)
- [Ch 8: BLE 5.0 — GAP·GATT·Coded PHY](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt)
- [Ch 9: ESP-IDF — 빌드 시스템과 컴포넌트 구조](/blog/embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build)
- [Ch 12: 전력 관리 — Modem/Light/Deep Sleep](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management) — modem sleep 이어집니다
- [Industrial Ethernet Ch 8: TSN](/blog/embedded/protocols/industrial-ethernet/chapter08-tsn) — 유선 결정성과의 대비
- [원문 — ESP-IDF WiFi API Reference](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/network/esp_wifi.html)
- [원문 — ESP-MESH Programming Guide](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-guides/esp-wifi-mesh.html)
