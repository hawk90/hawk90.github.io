---
title: "ESP32-C3 WiFi 4 스택 — Station·SoftAP·Mesh 구성"
slug: "embedded/riscv/esp32-c3-mastering/chapter07-wifi-stack"
date: 2026-05-20T09:07:00
description: "ESP-IDF v5.4.2의 STA·SoftAP·APSTA·NULL 모드와 이벤트·재시도·PMF·프로비저닝 수명을 확인합니다."
series: "ESP32-C3 Mastering"
seriesOrder: 7
tags: [wifi, "802.11", esp-idf, wpa2, wpa3, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **API 반환값과 비동기 연결 결과를 구분합니다.** 설정·조회처럼 동기적으로 끝나는 Wi-Fi API도 있으므로 모든 결과가 event로만 온다는 설명은 정확하지 않습니다.

기준은 ESP-IDF v5.4.2 commit `f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0`입니다. C3는2.4GHz 802.11b/g/n을 사용하지만 PHY link rate와 application throughput은 다릅니다. 출처 없는 고정TCP/UDP·거리별 처리량·평균 전류 표와 S3를2×2 Wi-Fi로 설명한 문구는 제외했습니다. 이 장은 실제 AP·RF·전류를 측정한 결과가 아닙니다.

STA·SoftAP·APSTA·NULL 모드, event 처리와 인증·provisioning의 경계를 다룹니다. 구성과 실제 연결·server 검증·복구 성공은 별도로 확인합니다.

## ESP-IDF WiFi 스택 구조

아래 표는 application에서 구분할 구성 요소입니다.

| 계층 | 역할 | 주요 API |
|------|------|---------|
| Driver | RF/MAC HAL | `esp_wifi_init`, `esp_wifi_start` |
| ESP-NETIF / lwIP | 네트워크 interface 관리 / TCP/IP 처리 | `esp_netif_*`는 관리 추상화 |
| Event Loop | 비동기 이벤트 라우팅 | `esp_event_loop_create_default` |
| Application | 비즈니스 로직 | 사용자 코드 |

핵심은 *event loop*입니다. 연결·연결 해제·IP 취득 등은 event로 관찰하며 각 API의 반환값도 확인합니다. 애플리케이션은 handler를 등록해 *비동기*로 반응합니다.

```c
#include "esp_log.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "nvs_flash.h"

static void wifi_event_handler(void* arg, esp_event_base_t event_base,
                                int32_t event_id, void* event_data)
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
        ip_event_got_ip_t* event = (ip_event_got_ip_t*)event_data;
        ESP_LOGI("wifi", "got IP: " IPSTR, IP2STR(&event->ip_info.ip));
    }
}
```

`WIFI_EVENT`는 *링크 계층* 이벤트(연결·끊김·스캔 완료), `IP_EVENT`는 *네트워크 계층* 이벤트(IP 획득·갱신·상실)입니다. 두 베이스를 *분리*해 등록해야 의미가 분명해집니다.

## Station 모드 — 클라이언트 연결

가장 흔한 모드입니다. 가정용 라우터에 *클라이언트*로 붙는 시나리오입니다.

```c
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

위 초기화는 runtime의 일회성 boot 예입니다. SSID·credential·인증 정책은 caller가 준비한 설정을 받습니다. 기본 event loop·ESP-NETIF·Wi-Fi driver를 여러 owner가 반복 생성하지 않습니다. 종료 시 연결 요청을 중단하고 보관한 instance로 handler를 unregister한 뒤 driver/default Wi-Fi netif 등 소유 자원을 정리합니다. 모든 순서 오류가 같은 error code로 표현되는 것은 아닙니다.

`esp_wifi_start()`는 driver를 시작하고, station 연결 요청은 `esp_wifi_connect()`로 수행합니다. `WIFI_EVENT_STA_CONNECTED`와 `IP_EVENT_STA_GOT_IP`도 같은 단계가 아닙니다. 위 handler는 disconnect 때 즉시 재시도하지 않습니다.

### 재시도 간격 정책

아래는6번까지1/2/4/8/16/30초 간격을 돌려주는 **순수 정책 예**입니다. 실제 timer·jitter·취소·성공 뒤 counter 초기화는 connection owner가 관리합니다. Credential 오류·사용자의 의도적 disconnect·영구 중지 상태를 무한 재연결로 덮지 않습니다.

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

Event callback 안에서 delay/sleep하거나 block하는 방식으로 backoff를 구현하지 않습니다. Timer 만료 뒤에도 session이 살아 있고 재시도가 여전히 필요한지 확인한 다음 owner가 connect 요청 결과를 처리합니다.

## SoftAP 모드 — AP 동작

ESP32-C3가 *AP 노릇*을 합니다. 폰을 직접 붙여 설정 화면을 띄우는 OOBE(out-of-box experience) 시나리오, 또는 *별도 라우터 없이* 센서 노드를 모으는 용도입니다.

SoftAP도 NVS·ESP-NETIF·event loop·Wi-Fi 초기화가 필요합니다. STA 예와 별도의 독립 boot 경로를 만들거나, 공통 owner 아래 AP netif와 AP 설정을 준비합니다. `wifi_config_t.ap`의 SSID 길이·password·authmode·channel·max_connection을 실제 지원 범위로 지정하고 반환값을 확인합니다.

DHCP server·IP 대역은 default helper와 application 설정에 달려 있습니다. 동시 client 수의 hardware/config 상한과 실제 workload 한계는 다른 값이며4~6대가 보편 한계라는 측정 없는 설명은 제외했습니다. Channel 선택은 국가 규제·주변 AP·실제 환경을 확인합니다.

## Station+AP 동시 모드 — 두 interface

APSTA는 AP와 station interface를 함께 켭니다. 이것만으로 L2 bridge·NAT·range extender를 구현하는 것은 아니며 packet forwarding과 주소 정책은 별도입니다.

```c
ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_APSTA));
ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &sta_config));
ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP,  &ap_config));
```

주의할 점은 *두 인터페이스가 같은 채널*을 써야 한다는 것입니다. ESP32-C3 라디오는 *하나*뿐이라, STA가 6번 채널에 연결되면 AP도 *자동으로 6번*으로 끌려갑니다. APSTA의 channel 제약은 scan·연결 상태와 driver contract를 함께 확인합니다. 단일 radio에 독립된 두 channel의 고정 동작을 가정하지 않습니다.

## NULL 모드와 보안 설정

`WIFI_MODE_NULL`은 station/AP interface를 켜지 않는 mode입니다. Wi-Fi subsystem의 init/start/stop/deinit과 mode 선택은 다른 수명 단계입니다. 제품에서 RF를 완전히 끄려는 요구를 mode 변경 하나로 입증하지 않습니다.

### WPA2·WPA3·PMF

기준 [Wi-Fi security 문서](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-guides/wifi-security.html)와 application의 인증 정책을 맞춥니다. `pmf_cfg.capable`은 deprecated이며 내부적으로 true가 됩니다. `required`는 PMF가 없는 peer를 거부하는 정책이므로 AP 지원과 호환성을 확인합니다.

WPA3라는 이름만으로 KRACK를 포함한 모든 구현 취약점에 면역이라고 보장하지 않습니다. Mixed mode도 모든 제품의 기본 권고로 일반화하지 않습니다. Enterprise는 선택한 EAP 방식에 따라 credential·server identity/CA·client certificate 검증을 구성하고 기준 `esp_eap_client.h` API를 확인합니다. Password와 private key를 log에 출력하지 않습니다.

## ESP-MESH — 자가 조직 트리 네트워크

ESP-MESH는 *root → layer 1 → layer 2 → ...*의 *트리*입니다. 최대 layer·capacity는 선택한 ESP-MESH 설정과 SDK 제약을 확인합니다. mesh 안에서는 각 노드가 *동시에 station(부모에게)·SoftAP(자식에게)* 두 역할을 합니다.

![ESP-MESH — Tree Topology](/images/blog/esp32-c3/diagrams/ch07-mesh-tree.svg)

root만 *외부 라우터*에 붙습니다. 그 아래는 *내부 mesh 트래픽*만 흐릅니다. 노드가 떨어져 나가면 *자동으로 부모를 재선출*합니다. 특정 지역·회사의 내부 채택을 근거 없이 제품 사례로 제시하지 않습니다.

설정 전 NVS·ESP-NETIF·event loop·Wi-Fi·mesh 초기화와 event handler 수명을 준비합니다. `esp_mesh_set_config()`와 start 몇 줄만으로 완성 network를 만든다고 읽지 않습니다. Router/mesh credential, root election, send/receive와 연결 복구는 [기준 ESP-MESH guide](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-guides/esp-wifi-mesh.html)의 전체 lifecycle을 따릅니다.

Hop별 처리량이 항상 절반 또는3layer에서1Mbps 이하라는 고정 규칙은 없습니다. Topology·경쟁·재전송·payload·radio coexistence와 workload를 고정해 end-to-end latency·delivery와 자원 사용을 측정합니다.

## Provisioning — 사용자 WiFi 정보 받기

공장 출하 단계에서는 *어느 라우터에 붙을지 알 수 없습니다*. 사용자가 *처음 켤 때* 알려 줘야 합니다. ESP-IDF는 *wifi_provisioning* 컴포넌트를 제공합니다.

| 방식 | 채널 | 사용자 경험 |
|------|------|------------|
| SoftAP provisioning | ESP가 AP, 폰이 STA | 폰을 ESP의 AP에 붙임 |
| BLE provisioning | BLE GATT | 폰 앱이 BLE로 전달 |
| SmartConfig | broadcast 패킷 | 폰이 WiFi packet에 정보 embed |

Manager/scheme 초기화, 선택한 security version의 credential 구조, start·종료 event·deinit과 BT memory release 정책을 한 수명으로 관리합니다. `WIFI_PROV_SECURITY_1`의 PoP 문자열과 Security2의 username/salt/verifier 입력은 같은 인자가 아닙니다. Config·client 지원·위협 모델에 맞는 버전을 고정하고 실제 인증 실패·잘못된 PoP·중복 시작·중단·다음 boot를 검증합니다.

공유된 고정 example PoP를 모든 제품에 그대로 넣지 않습니다. 제품별 credential provisioning·교체·복구와 client 검증을 정합니다. 이 장에서는 실제 provisioning client나 암호화 handshake를 실행하지 않았습니다.

## 전력 절약 — Modem Sleep와 DTIM

`WIFI_PS_MIN_MODEM`, `WIFI_PS_MAX_MODEM`, `WIFI_PS_NONE`의 의미는 연결 상태·DTIM·listen interval과 관련됩니다. 수치 없는 설명을 특정 평균 전류·latency 보장으로 바꾸지 않습니다. 자세한 power-management 설정과 실제 측정 조건은 [Ch12](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management)에서 다룹니다.

## 연결 문제 진단

Driver init 여부와 API 오류, association/authentication, IP 취득, socket/TLS의 단계를 나눕니다. `ESP_ERR_WIFI_NOT_INIT` 하나를 ESP-NETIF 누락이라고 단정하지 않습니다. Reason code·AP 설정·credential·SDK log와 의도적 disconnect 여부를 함께 기록합니다.

재시도는 제한된 backoff·취소·session 수명·동시 connect 요청을 관리합니다. 성능 비교는 동일 AP·channel width·power-save·거리·간섭·packet 크기·TCP/UDP 설정과 SDK/LwIP configuration을 기록해 반복 측정합니다. 다른 칩을 특정 처리량 개선책으로 단정하지 않습니다.

## 정리

Mode·driver 수명·link/IP event·인증 정책은 별개입니다. 비동기 결과와 동기 오류를 함께 처리하고 연결 owner가 제한된 재시도와 종료를 관리합니다. Mesh·provisioning·절전은 설정 예가 실제 network 성공·보안·전류 측정을 대신하지 않습니다.

## 다음 편

[Ch 8: BLE 5.0 — GAP·GATT·Coded PHY](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt)에서는 또 다른 무선 인터페이스인 *Bluetooth Low Energy 5.0*을 다룹니다. NimBLE 스택, GATT 서비스 설계, Coded PHY의 peer 지원과 실제 측정 조건까지 살펴봅니다.

## 관련 항목

- [Ch 6: ADC·터치 센서](/blog/embedded/riscv/esp32-c3-mastering/chapter06-adc-touch)
- [Ch 8: BLE 5.0 — GAP·GATT·Coded PHY](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt)
- [Ch 9: ESP-IDF — 빌드 시스템과 컴포넌트 구조](/blog/embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build)
- [Ch 12: 전력 관리 — Modem/Light/Deep Sleep](/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management) — modem sleep 이어집니다
- [Industrial Ethernet Ch 8: TSN](/blog/embedded/protocols/industrial-ethernet/chapter08-tsn) — 유선 결정성과의 대비
- [원문 — ESP-IDF WiFi API Reference](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/network/esp_wifi.html)
- [원문 — ESP-MESH Programming Guide](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-guides/esp-wifi-mesh.html)
