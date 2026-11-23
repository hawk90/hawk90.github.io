---
title: "ESP32-C3 WiFi 4 스택 — Station·SoftAP·Mesh 구성"
slug: "embedded/riscv/esp32-c3-mastering/chapter07-wifi-stack"
date: 2026-05-20T09:07:00
description: "ESP-IDF v5.4.2로 ESP32-C3의 Station·SoftAP·APSTA·Mesh·provisioning을 구성하고, Wi-Fi 스택이 image와 DRAM에 더하는 크기, SoftAP 접속 상한, Modem-sleep 동작을 문서와 빌드 결과로 정리합니다."
series: "ESP32-C3 Mastering"
seriesOrder: 7
tags: [wifi, "802.11", esp-idf, wpa2, wpa3, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **ESP-IDF의 Wi-Fi는 "함수 호출 + event 수신"의 두 박자로 움직입니다.** `esp_wifi_connect()`가 `ESP_OK`를 돌려줘도 연결된 것이 아니고, 연결 결과는 나중에 event로 옵니다.

C3의 Wi-Fi는 2.4 GHz 802.11 b/g/n 하나뿐인 라디오로 Station과 SoftAP을 함께 처리합니다(Ch 1). 이 장은 [ESP-IDF v5.4.2](https://github.com/espressif/esp-idf/tree/v5.4.2)의 Wi-Fi API와 [Wi-Fi Driver 가이드](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-guides/wifi.html)를 기준으로 모드별 구성과 event 처리, 보안·provisioning·절전 설정을 다룹니다.

이 장은 실제 AP에 연결하지 않았습니다. Espressif QEMU는 Wi-Fi를 흉내 내지 않고, Wi-Fi 앱은 부팅 중 Ch 6과 같은 eFuse 보정 경고 뒤에서 멈춥니다. 그래서 연결 로그와 처리량·전류 수치는 싣지 않았고, 근거는 문서·헤더·빌드 결과입니다.

## Wi-Fi 스택이 차지하는 크기

Wi-Fi를 켜는 순간 앱의 체급이 바뀝니다. ESP-IDF의 `examples/wifi/getting_started/station`을 esp32c3로 빌드한 `idf.py size` 결과를 Ch 1의 hello 예제와 나란히 놓으면 다음과 같습니다.

| 항목 | Ch 1 hello (`c3_hello`) | Wi-Fi station 예제 |
|------|------|------|
| Flash Code (`.text`) | 91914 byte | 549870 byte |
| Flash Data (`.rodata` 등) | 35844 byte | 97328 byte |
| DRAM 사용 (IRAM 코드 포함) | 55872 byte | 108656 byte |
| 그중 IRAM `.text` | 47304 byte | 80000 byte |
| app `.bin` 크기 | 0x2bf20 (180000 byte) | 0xb4700 (739072 byte) |

station 예제의 `.bin`은 1 MiB app partition의 70%를 쓰고 `0x4b900 bytes (30%) free`가 남습니다. Ch 3의 OTA 슬롯을 1 MiB로 잡았다면 Wi-Fi 앱 하나가 그 슬롯 대부분을 차지하는 셈입니다. DRAM 사용량도 정적 배치만으로 52784 byte가 늘었고, 여기에 Wi-Fi driver가 실행 중에 heap에서 받는 buffer가 더해집니다.

## ESP-IDF Wi-Fi 스택 구조

application이 다루는 구성 요소는 네 층입니다.

| 계층 | 역할 | 주요 API |
|------|------|---------|
| Wi-Fi driver | MAC·PHY 제어, 연결 상태 머신 | `esp_wifi_init`, `esp_wifi_start`, `esp_wifi_connect` |
| ESP-NETIF / lwIP | 네트워크 interface, DHCP, TCP/IP | `esp_netif_init`, `esp_netif_create_default_wifi_sta` |
| Event loop | driver와 IP 계층의 결과 전달 | `esp_event_loop_create_default`, `esp_event_handler_instance_register` |
| Application | 연결 정책, 재시도, 데이터 처리 | 사용자 코드 |

식당 주문에 비유하면 `esp_wifi_connect()`는 주문서를 넣는 일이고, `WIFI_EVENT_STA_CONNECTED`와 `IP_EVENT_STA_GOT_IP`는 "음식이 나왔다"는 호출입니다. 주문이 접수됐다(`ESP_OK`)는 것과 음식이 나왔다는 것은 다른 사건입니다. 반대로 `esp_wifi_set_mode()`나 `esp_wifi_get_ps()`처럼 반환값만으로 결과가 확정되는 API도 있습니다.

event는 두 base로 나뉩니다. `WIFI_EVENT`는 링크 계층(연결, 끊김, scan 완료), `IP_EVENT`는 네트워크 계층(IP 획득·상실)입니다. Wi-Fi 가이드는 `esp_wifi_connect()`가 먼저 설정한 AP를 scan하고, 찾지 못하면 `WIFI_EVENT_STA_DISCONNECTED`를 낸다고 적습니다. 연결 실패도 반환값이 아니라 event로 온다는 뜻입니다.

## Station 모드 — 클라이언트 연결

가정용 공유기에 클라이언트로 붙는 가장 흔한 모드입니다. 아래 코드는 초기화 순서와 event handler를 한 파일에 담았고, v5.4.2로 esp32c3 빌드를 통과했습니다.

```c title="c3-wifi-sta.c"
#include "esp_log.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "nvs_flash.h"

static void wifi_event_handler(void *arg, esp_event_base_t event_base,
                               int32_t event_id, void *event_data)
{
    (void)arg;
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_err_t error = esp_wifi_connect();
        if (error != ESP_OK) ESP_LOGW("wifi", "connect request: %s", esp_err_to_name(error));
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        /* The connection owner schedules any retry outside this callback. */
        const wifi_event_sta_disconnected_t *event = event_data;
        ESP_LOGW("wifi", "link lost, reason=%u", event->reason);
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        const ip_event_got_ip_t *event = event_data;
        ESP_LOGI("wifi", "got IP: " IPSTR, IP2STR(&event->ip_info.ip));
    }
}

static esp_event_handler_instance_t wifi_instance, ip_instance;
static esp_netif_t *station_netif;

void wifi_init_sta(const wifi_config_t *settings)
{
    ESP_ERROR_CHECK(settings ? ESP_OK : ESP_ERR_INVALID_ARG);
    ESP_ERROR_CHECK(nvs_flash_init());
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    station_netif = esp_netif_create_default_wifi_sta();
    ESP_ERROR_CHECK(station_netif ? ESP_OK : ESP_ERR_NO_MEM);

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL, &wifi_instance));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL, &ip_instance));

    wifi_config_t wifi_config = *settings;
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());
}
```

순서가 중요합니다. NVS(Wi-Fi 보정·설정 저장), ESP-NETIF, 기본 event loop, default STA netif를 만든 뒤 `esp_wifi_init()`을 부르고, handler를 등록한 다음 mode·config·start를 차례로 호출합니다. `esp_wifi_start()`가 driver를 시작하면 `WIFI_EVENT_STA_START`가 오고, handler가 그때 `esp_wifi_connect()`를 부릅니다. 위 handler는 끊김 때 바로 재접속하지 않고 reason만 기록합니다.

끊김 event의 `reason` 값은 `esp_wifi_types_generic.h`의 `wifi_err_reason_t`에 정의돼 있습니다. 진단에 자주 쓰는 값은 다음과 같습니다.

| reason | 값 | 뜻 |
|------|----|----|
| `WIFI_REASON_4WAY_HANDSHAKE_TIMEOUT` | 15 | 4-way handshake 시간 초과 |
| `WIFI_REASON_BEACON_TIMEOUT` | 200 | AP beacon을 놓침 |
| `WIFI_REASON_NO_AP_FOUND` | 201 | 설정한 AP를 찾지 못함 |
| `WIFI_REASON_AUTH_FAIL` | 202 | 인증 실패 |
| `WIFI_REASON_HANDSHAKE_TIMEOUT` | 204 | handshake 시간 초과 |

`NO_AP_FOUND`와 `AUTH_FAIL`은 원인이 다릅니다. `NO_AP_FOUND`는 AP가 없거나 멀 때, `AUTH_FAIL`은 대개 credential이 틀렸을 때 납니다. 비밀번호가 틀린 상태에서는 몇 번을 다시 시도해도 결과가 같으므로, reason에 따라 재시도 여부를 나눕니다.

### 재시도 간격 정책

아래 함수는 시도 번호에 따라 1, 2, 4, 8, 16초, 그리고 30초로 잘린 간격을 돌려주고, 6번 이후에는 `false`로 멈춥니다. 실제 timer와 취소는 연결을 소유한 task가 관리합니다.

```c title="c3-wifi-retry.c"
#include <stdint.h>
#include <stdbool.h>

bool c3_wifi_retry_delay(unsigned attempt, uint32_t *milliseconds) {
    if (!milliseconds || attempt >= 6) return false;
    uint32_t delay = UINT32_C(1000) << attempt;
    *milliseconds = delay > 30000 ? 30000 : delay;
    return true;
}
```

호스트에서 실행한 결과입니다.

```text
attempt 0 -> ok=1 1000 ms
attempt 1 -> ok=1 2000 ms
attempt 2 -> ok=1 4000 ms
attempt 3 -> ok=1 8000 ms
attempt 4 -> ok=1 16000 ms
attempt 5 -> ok=1 30000 ms
attempt 6 -> ok=0 0 ms
```

attempt 5의 간격 32000 ms가 30000 ms로 잘린 것이 보입니다. v5.4.2 event loop 문서는 이 라이브러리가 handler 실행을 다른 context로 미뤄 차례로 처리한다고 설명합니다("serializing and deferring code execution to another context"). handler가 차례로 실행되므로, 그 안에서 `vTaskDelay()`로 기다리면 뒤의 event가 모두 밀립니다. 간격은 `esp_timer`나 별도 task로 만듭니다.

## SoftAP 모드 — C3가 AP가 되는 경우

C3가 직접 AP가 되어 휴대폰을 붙이는 구성은 공유기 정보가 없는 첫 설정(provisioning)이나 공유기 없는 현장 장비에 씁니다. `esp_netif_create_default_wifi_ap()`로 AP netif를 만들고 `wifi_config_t.ap`의 `ssid`, `password`, `authmode`, `channel`, `max_connection`을 채웁니다.

접속 가능한 station 수에는 상한이 있습니다. v5.4.2 Wi-Fi 가이드의 SoftAP 설정 표는 `max_connection`의 기본값을 10으로, C3에서 지원하는 최대 연결 수(`ESP_WIFI_MAX_CONN_NUM`)를 10으로 적습니다. 같은 칸은 SoftAP과 ESP-NOW가 암호화 하드웨어 key를 공유하므로, `CONFIG_ESP_WIFI_ESPNOW_MAX_ENCRYPT_NUM`이 7을 넘으면 `max_connection`의 상한이 (17 − 그 값)으로 줄어든다는 설명도 붙어 있습니다.

## Station+AP 동시 모드 — 채널 하나를 나눠 씀

`WIFI_MODE_APSTA`는 AP interface와 station interface를 함께 켭니다. 아래 세 줄이 핵심이고, 앞의 초기화와 두 netif 생성은 생략했습니다.

```c
ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_APSTA));
ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &sta_config));
ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP,  &ap_config));
```

라디오가 하나라서 두 interface는 같은 채널을 씁니다. C3 Datasheet v2.5 Features 절은 이 동작을 "when ESP32-C3 scans in Station mode, the SoftAP channel will change along with the Station channel"이라고 적습니다. 그래서 AP 채널을 6으로 설정해도 station이 11번 채널 공유기에 붙으면 SoftAP도 11로 옮겨 가고, APSTA만으로 두 네트워크 사이에 패킷이 오가지도 않습니다. NAT은 `CONFIG_LWIP_IP_FORWARD`와 `CONFIG_LWIP_IPV4_NAPT`(기본값 n)를 켜고 `esp_netif_napt_enable()`을 호출해야 동작합니다.

## NULL 모드와 보안 설정

`WIFI_MODE_NULL`은 station과 AP interface를 모두 켜지 않는 mode입니다. driver는 초기화된 채로 남으므로, RF를 내리고 메모리를 돌려받으려면 `esp_wifi_stop()`과 `esp_wifi_deinit()`까지 호출합니다.

### WPA2·WPA3·PMF

C3 Wi-Fi MAC은 WPA2-PSK/Enterprise와 WPA3-PSK/Enterprise를 지원합니다(데이터시트 4.3.2.2절). WPA3-SAE는 `CONFIG_ESP_WIFI_ENABLE_WPA3_SAE`로 켜고, station 쪽 최소 보안 수준은 `wifi_config_t.sta.threshold.authmode`로 정합니다. 헤더 주석은 이 값을 "The weakest auth mode to accept"로 정의합니다. 값을 비워 둔 채 비밀번호가 8자 이상이면 기본값이 WPA2가 되므로, WEP/WPA 네트워크에는 붙지 않습니다.

PMF(Protected Management Frames) 설정은 `pmf_cfg`의 두 필드입니다. v5.4.2 헤더는 `capable`을 "Deprecated variable. Device will always connect in PMF mode if other device also advertises PMF capability"라고 적습니다. 상대가 PMF를 지원하면 항상 PMF로 붙는다는 뜻입니다. `required = true`로 두면 PMF를 지원하지 않는 AP에는 연결하지 않습니다. 보안 방식별 설정은 [v5.4.2 Wi-Fi Security 문서](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-guides/wifi-security.html)에 있고, Enterprise(EAP) 인증은 `esp_eap_client.h` API로 서버 CA와 client 인증서를 설정합니다.

## ESP-WIFI-MESH — 자가 조직 트리 네트워크

ESP-WIFI-MESH에서는 공유기에 root 노드 하나만 붙고, 나머지 노드는 서로를 부모·자식으로 삼아 트리를 이룹니다. 각 노드가 부모에게는 station, 자식에게는 SoftAP 역할을 동시에 합니다. 회사 조직도처럼 위로는 한 명에게 보고하고 아래로는 여러 명을 거느리는 구조입니다.

![ESP-MESH — Tree Topology](/images/blog/esp32-c3/diagrams/ch07-mesh-tree.svg)

트리의 깊이에는 정해진 상한이 있습니다. v5.4.2 `esp_mesh.h`의 `esp_mesh_set_max_layer()` 주석은 "for tree topology, the max is 25", "for chain topology, the max is 1000"이라고 적고, 이 API는 mesh 시작 전에만 부를 수 있습니다. ESP-IDF mesh 예제의 `CONFIG_MESH_MAX_LAYER`는 기본값 6, tree에서 범위 1~25입니다. mesh 가이드에 따르면 최대 layer에 있는 노드는 자식을 받지 않는 leaf node가 됩니다.

전체 lifecycle(router·mesh credential, root 선출, 송수신, 부모 재선택)은 [v5.4.2 ESP-WIFI-MESH guide](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-guides/esp-wifi-mesh.html)와 `examples/mesh/internal_communication` 예제를 따릅니다. hop 수에 따른 처리량과 지연은 이 장에서 측정하지 않았습니다.

## Provisioning — 사용자의 Wi-Fi 정보 받기

공장에서 출고된 장치는 어느 공유기에 붙을지 모릅니다. 사용자가 처음 켤 때 SSID와 비밀번호를 넘겨줘야 합니다. ESP-IDF에는 이 일을 하는 방법이 두 계열 있습니다.

| 방식 | component | 전송 경로 |
|------|------|------|
| SoftAP provisioning | `wifi_provisioning` (`wifi_prov_scheme_softap`) | C3가 SoftAP + HTTP server, 폰이 접속 |
| BLE provisioning | `wifi_provisioning` (`wifi_prov_scheme_ble`) | 폰 앱이 BLE GATT로 전달 |
| SmartConfig | `esp_smartconfig.h` (`examples/wifi/smart_config`) | 폰이 Wi-Fi packet에 정보를 실어 broadcast |

`wifi_provisioning`은 protocomm 세션 위에서 동작하고, 보안 수준을 `WIFI_PROV_SECURITY_0`, `_1`, `_2` 중에서 고릅니다. Security 1은 proof-of-possession(PoP) 문자열을 씁니다. Security 2는 `manager.h` 주석대로 "SRP6a based authentication and key exchange + AES-GCM encryption/decryption" 방식이고, username·salt·verifier를 씁니다. BLE scheme을 쓰고 이후 Bluetooth가 필요 없다면 `WIFI_PROV_SCHEME_BLE_EVENT_HANDLER_FREE_BTDM` handler로 provisioning이 끝날 때 BT 메모리를 돌려받습니다. provisioning 문서는 이 handler가 "Free both classic Bluetooth and Bluetooth LE/BTDM memory"라고 설명합니다.

예제 코드의 고정 PoP 문자열을 제품에 그대로 넣으면 같은 제품을 가진 누구나 그 값을 알게 됩니다. 그래서 제품에서는 장치마다 다른 PoP를 만들어 라벨이나 QR 코드로 제공합니다.

## 전력 절약 — Modem-sleep과 DTIM

Wi-Fi driver가 연결을 유지한 채 제공하는 절전은 Modem-sleep입니다. 연결을 유지하면서 칩 전체를 Light-sleep에 넣는 Auto Light-sleep도 있는데, 이는 v5.4.2 Low Power Mode 가이드(Wi-Fi)의 "Auto Light-sleep Mode + Wi-Fi Scenario" 절이 다루고 Ch 12에서 이어 봅니다. Wi-Fi 가이드의 Modem-sleep 설명을 표로 옮기면 다음과 같습니다.

| 설정 | 깨어나는 주기 | 대가 |
|------|------|------|
| `WIFI_PS_NONE` | 항상 깨어 있음 | 소비 전력 최대, 수신 지연 최소 |
| `WIFI_PS_MIN_MODEM` (기본값) | AP의 DTIM마다 | DTIM이 짧으면 절감 폭이 작음 |
| `WIFI_PS_MAX_MODEM` | `listen_interval`마다 | broadcast를 놓칠 수 있음 |

가이드에 따르면 기본값은 `WIFI_PS_MIN_MODEM`이고, Modem-sleep은 station-only mode에서 AP에 연결된 뒤에만 동작합니다. `listen_interval`의 단위는 AP beacon 간격이고, 0으로 두면 3이 됩니다(`esp_wifi_types_generic.h`). Modem-sleep을 켜면 수신 지연이 DTIM 주기나 listen interval만큼 늘어날 수 있다는 점도 같은 절에 있습니다. 실제 전류는 Ch 12에서 데이터시트 값으로 다룹니다.

## 연결 문제 진단

연결 문제는 단계별로 나눠 봅니다. 단계마다 확인하는 신호가 다릅니다.

| 단계 | 성공 신호 | 실패 신호 |
|------|------|------|
| driver 초기화 | `esp_wifi_init()`·`esp_wifi_start()`가 `ESP_OK` | 반환값 오류 (`ESP_ERR_WIFI_NOT_INIT` 등) |
| AP 탐색·인증 | `WIFI_EVENT_STA_CONNECTED` | `WIFI_EVENT_STA_DISCONNECTED`와 reason 201·202·15 |
| IP 획득 | `IP_EVENT_STA_GOT_IP` | event가 오지 않음 (DHCP 서버 문제) |
| 응용 통신 | socket·TLS 성공 | DNS·TLS 오류 |

이 순서대로 보면 "Wi-Fi가 안 된다"는 증상이 어느 층의 문제인지 좁혀집니다. 링크는 붙었는데 IP가 안 온다면 Wi-Fi 설정이 아니라 DHCP 쪽을 봐야 합니다.

## 정리

- Wi-Fi station 예제는 C3에서 app `.bin` 739072 byte로 1 MiB 슬롯의 70%를 쓰고, DRAM 정적 사용량이 hello 대비 52784 byte 많습니다.
- `esp_wifi_connect()`의 `ESP_OK`는 요청 접수일 뿐이고, 연결·실패·IP 획득은 event로 옵니다.
- C3 SoftAP의 최대 접속 수는 10이고, ESP-NOW 암호화 peer 수가 7을 넘으면 줄어듭니다.
- APSTA에서는 SoftAP 채널이 station 채널을 따라갑니다.
- ESP-WIFI-MESH tree는 최대 25 layer이고, 예제의 기본값은 6입니다.
- provisioning은 `wifi_provisioning`(SoftAP·BLE)과 별도의 SmartConfig로 나뉩니다.
- 기본 절전은 `WIFI_PS_MIN_MODEM`(DTIM마다 깨어남)입니다.

## 다음 편

[Ch 8: BLE 5.0 — GAP·GATT·Coded PHY](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt)에서는 또 다른 무선 인터페이스인 Bluetooth Low Energy 5.0을 다룹니다. NimBLE 스택, GATT 서비스 설계, Coded PHY를 살펴봅니다.

## 관련 항목

- [Ch 6: ADC·터치 센서](/blog/embedded/riscv/esp32-c3-mastering/chapter06-adc-touch)
- [Ch 8: BLE 5.0 — GAP·GATT·Coded PHY](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt)
- [Ch 9: ESP-IDF — 빌드 시스템과 컴포넌트 구조](/blog/embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build)
- [Ch 12: 전력 관리 — Modem/Light/Deep Sleep](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management) — modem sleep 이야기가 이어집니다
- [Industrial Ethernet Ch 8: TSN](/blog/embedded/protocols/industrial-ethernet/chapter08-tsn) — 유선 결정성과의 대비
- [원문 — ESP-IDF WiFi API Reference](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/network/esp_wifi.html)
- [원문 — ESP-MESH Programming Guide](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-guides/esp-wifi-mesh.html)
