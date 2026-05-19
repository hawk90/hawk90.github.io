---
title: "Ch 4: 인코딩과 진화"
date: 2026-05-12T04:00:00
description: "데이터 직렬화 — JSON / Protobuf / Avro / Thrift. 스키마 진화와 forward / backward 호환성."
tags: [DDIA, Encoding, Protobuf, Avro, SchemaEvolution]
series: "Designing Data-Intensive Applications"
seriesOrder: 4
draft: true
---

## 이 챕터의 메시지

데이터는 메모리에서 디스크와 네트워크로 이동할 때 **인코딩**(encoding)이 필요하다. 메모리의 객체는 포인터·해시테이블·트리이지만, 디스크와 네트워크에는 순차 바이트만 흐른다. 이 변환 결정이 시스템의 **진화 가능성**을 결정한다.

핵심 질문 한 가지로 압축된다 — **스키마가 변할 때 어떻게 호환성을 유지하는가?**

코드는 자주 변한다. 데이터는 오래 산다. DB에 1년 전 쓴 레코드를 오늘의 새 코드가 읽어야 하고, 어제 막 배포한 새 코드가 쓴 데이터를 오늘 아직 배포 못 한 옛 코드가 읽어야 한다. 인코딩 포맷의 선택이 이 양방향 호환성을 결정한다.

일상적 비유로 옮기면 — 인코딩은 **번역**이다. 한국어 머릿속 생각을 영어 텍스트로 옮겨 편지에 담는 일과 같다. 그리고 스키마 진화는 **옛 책을 새 폰트로 다시 인쇄**하는 일이다. 내용은 같지만 형식이 바뀌었고, 옛 판본과 새 판본이 동시에 책장에 꽂혀 있어야 한다.

## In-Memory vs Wire Format

메모리의 데이터는 객체, 포인터, 구조체. 이걸 바이트 시퀀스로 바꾸는 게 **인코딩**(serialization, marshalling)이다.

```text
객체 → 인코딩 → 바이트 → 네트워크/디스크 → 바이트 → 디코딩 → 객체
```

메모리 표현은 CPU와 언어 런타임에 최적화돼 있다. 포인터로 객체를 가리키고, 가비지 컬렉터가 추적한다. 바이트 시퀀스는 그렇지 않다. 자기 자신만으로 의미를 가져야 한다.

여러 형식이 있다 — JSON, XML, CSV, MessagePack, BSON, Protocol Buffers, Thrift, Avro. 각 형식은 *크기*, *속도*, *언어 중립성*, *스키마 진화*, *가독성* 사이의 다른 절충점을 택한다.

## 언어 특화 인코딩

Java `Serializable`, Python `pickle`, Ruby `Marshal`, .NET `BinaryFormatter` 등.

```python
import pickle
data = pickle.dumps(obj)  # 직렬화
obj2 = pickle.loads(data)  # 역직렬화
```

언어 내부의 객체 그래프를 그대로 바이트로 뽑는다. 편하다. 그러나 외부 노출에는 부적합하다.

**문제**:

- 다른 언어와 호환이 안 된다 — Java `Serializable`이 만든 바이트는 Python이 못 읽는다
- 보안 위험이 크다 — Pickle, BinaryFormatter는 디코딩 시 임의 코드 실행 가능. CVE의 단골
- 버전 호환성이 약하다 — 클래스 정의가 바뀌면 옛 데이터를 못 읽는다
- 비효율적이다 — 느리고 크고 메타데이터가 과하다

**권장** — 언어 특화 직렬화는 같은 언어·같은 프로세스 내 일시 캐시 정도로만. 외부 노출과 영속 저장에는 절대 쓰지 않는다.

## 텍스트 형식 — JSON, XML, CSV

JSON이 사실상 표준이다.

```json
{"name": "Alice", "age": 30, "country": "KR"}
```

웹의 *lingua franca*다. REST API, 설정 파일, 로그 라인, NoSQL 문서 — 어디에나 있다.

**장점**:

- 사람이 읽는다
- 모든 언어가 지원한다
- 단순하다
- 웹과 모바일의 기본 가정이다

**단점**:

- 숫자 표현이 모호하다 — 정수인지 부동소수점인지, JavaScript는 53비트 한계, 64비트 정수는 문자열로 보내는 관습
- 바이너리 데이터에 부적합 — base64로 인코딩해야 하고 크기가 33% 증가
- 큰 페이로드 — 필드 이름이 매 객체마다 반복
- 스키마가 없다 — 필드 누락·타입 변경을 런타임에야 발견
- 일관성 없는 처리 — 정렬되지 않은 키, 중복 키 처리가 파서마다 다름

XML은 더 장황하고 도구 체인이 무거워 신규 시스템에서는 거의 안 쓴다. CSV는 단순하지만 escaping과 newline 처리가 표준화돼 있지 않다. 모두 *텍스트 기반의 같은 한계*를 공유한다.

### Binary 변형들

텍스트 JSON의 크기·속도 문제를 풀려고 *바이너리 JSON*이 만들어졌다.

- **MessagePack** — JSON 호환 모델, 컴팩트한 바이너리. 같은 객체가 JSON 25바이트 → MessagePack 18바이트
- **BSON** — MongoDB의 바이너리 JSON. 길이 프리픽스로 빠른 skip, 추가 타입(ObjectId, Date)
- **CBOR** — IETF 표준 (RFC 7049). IoT에서 종종 사용
- **UBJSON** — 단순화된 바이너리 JSON

핵심 한계는 그대로 남는다 — **필드 이름을 매번 페이로드에 담는다**. 진짜 절약은 *스키마*를 도입해 필드 이름을 빼야 가능하다.

```text
JSON:          {"name":"Alice","age":30}   → 25 bytes
MessagePack:   \x82\xa4name\xa5Alice...     → 18 bytes
Protobuf:      \x0A\x05Alice\x10\x1E         → 9 bytes
```

MessagePack은 9바이트 → 18바이트로 가는 중간 지점이다. 진짜 차이는 *스키마 있는 인코딩*에서 나온다.

## Schema-based Binary Encoding — Protobuf, Thrift, Avro

스키마를 별도로 정의하고, 페이로드에서는 필드 이름을 빼고 **태그 번호 또는 위치**로만 식별한다. 결과적으로 크기가 작고 타입 안정성이 강하다.

### Protocol Buffers (Google)

```protobuf
message Person {
  required string name = 1;
  optional int32 age = 2;
  repeated string interests = 3;
}
```

각 필드에 **태그 번호**가 붙는다. 인코딩된 바이트에는 태그 번호와 wire type만 들어가고, 필드 이름은 없다.

```text
JSON:     {"name":"Alice","age":30}   → 25 bytes
Protobuf: \x0A\x05Alice\x10\x1E       → 9 bytes
```

훨씬 작다. 그리고 타입이 명시적이다. `.proto` 파일에서 각 언어의 stub 코드를 생성한다.

- `proto3`는 `required`를 없애고 모든 필드를 optional로 통일
- 미지 태그는 디코더가 무시 — forward compatibility의 핵심
- 가변 길이 정수(varint) 인코딩 — 작은 수는 1바이트

### Thrift (Facebook)

```thrift
struct Person {
  1: required string name,
  2: optional i32 age,
  3: list<string> interests,
}
```

Protobuf와 매우 비슷한 설계. Facebook이 만들었고 다양한 RPC 프로토콜·트랜스포트를 지원한다.

- BinaryProtocol — 단순 바이너리
- CompactProtocol — Protobuf 수준 컴팩트
- JSON Protocol — JSON 호환 (디버깅용)

세 가지 wire protocol을 같은 IDL에서 선택할 수 있다는 점이 Protobuf와 다르다.

### Avro (Apache)

```json
{
  "type": "record",
  "name": "Person",
  "fields": [
    {"name": "name", "type": "string"},
    {"name": "age", "type": ["null", "int"], "default": null},
    {"name": "interests", "type": {"type": "array", "items": "string"}}
  ]
}
```

태그 번호가 없다. 대신 **스키마 자체**가 reader와 writer 사이에 공유된다. 페이로드는 *필드 값만* 순서대로 담는다. 그래서 Avro 페이로드는 셋 중 가장 작은 경우가 많다.

Hadoop 생태계의 표준이고, Kafka의 Schema Registry가 이 모델을 채택했다.

### 세 포맷 비교

| 측면 | Protobuf | Thrift | Avro |
|------|----------|--------|------|
| 식별 | 태그 번호 | 태그 번호 | 위치 + 스키마 |
| 스키마 | `.proto` IDL | `.thrift` IDL | JSON / IDL |
| 코드 생성 | 강제 | 강제 | 선택 (동적 가능) |
| 페이로드 크기 | 작음 | 작음 | 가장 작음 |
| 동적 스키마 | 약함 | 약함 | 강함 |
| 주 생태계 | gRPC | Facebook 내부 | Hadoop / Kafka |

선택 기준 — RPC와 강타입 코드 생성이라면 Protobuf, 동적 스키마와 데이터 파이프라인이라면 Avro.

## Avro의 reader/writer schema 매칭

Avro의 가장 흥미로운 디자인이다. **writer schema**는 데이터가 쓰일 때의 스키마이고, **reader schema**는 데이터를 읽을 때의 스키마다. 둘이 *반드시 같을 필요가 없다*.

두 스키마가 다르면 Avro 라이브러리가 *resolution* 규칙으로 자동 매핑한다.

```text
Writer schema:           Reader schema:
{name, age, country}     {name, age, country, email}
                                              ^^^^^^
                                              default 적용
```

매칭 규칙은 명확하다.

- **writer에 있고 reader에 없는 필드** → 디코더가 읽되 결과에서 무시
- **reader에 있고 writer에 없는 필드** → reader 스키마의 default 값
- **이름 일치** → 위치가 달라도 매핑 (Protobuf와 다른 점)
- **타입 변환** → `int` → `long`, `float` → `double` 등 정해진 약속 규칙

이 모델의 진가는 **schema registry**와 결합할 때 드러난다.

```text
Producer → 데이터 + writer schema ID → Registry
Consumer → schema ID로 writer schema 조회 → reader schema와 resolution
```

페이로드에는 schema ID(4바이트) + 값들만 들어간다. 매우 컴팩트하다. Kafka + Confluent Schema Registry가 정확히 이 모델이다.

## Backward·Forward Compatibility

데이터는 오래 산다. 코드는 자주 변한다. **새 코드가 옛 데이터를 읽을 수 있어야** 하고, **옛 코드가 새 데이터를 읽을 수 있어야** 한다. 둘은 다른 방향이고 서로 헷갈리기 쉽다.

### Backward Compatibility — 새 코드가 옛 데이터를 읽음

```text
Old data (V1):  {name: "Alice"}
New code (V2):  {name, email} 기대
                → email 누락 → default 적용 → OK
```

V2 코드가 V1 데이터를 읽을 수 있다. 새 필드를 *optional*로 추가하고 default를 정의하면 자연스럽게 성립한다.

### Forward Compatibility — 옛 코드가 새 데이터를 읽음

```text
New data (V2):  {name: "Alice", email: "..."}
Old code (V1):  {name}만 앎
                → email 태그를 모름 → 무시하고 진행 → OK
```

V1 코드가 V2 데이터를 읽을 수 있다. 옛 코드가 *모르는 태그를 무시하는* 동작이 핵심이다. Protobuf와 Avro 모두 이 동작을 보장한다.

### 둘 다 필요한 이유 — 롤링 업그레이드

분산 시스템에서 모든 노드를 동시에 새 버전으로 바꿀 수 없다. 한 번에 한 노드씩 업그레이드한다. 그 사이에는 옛 버전과 새 버전이 *공존*한다.

```text
N1: V2 (새) → V2 데이터 씀
N2: V1 (옛) → V2 데이터 읽음 → forward 필요
N3: V1 (옛) → V1 데이터 씀
N1: V2 (새) → V1 데이터 읽음 → backward 필요
```

두 호환성이 모두 보장돼야 무중단 배포가 가능하다.

### 호환성을 깨는 변경

| 변경 | Backward | Forward | 비고 |
|------|----------|---------|------|
| optional 필드 추가 | OK | OK | 가장 안전 |
| required 필드 추가 | X | X | default 없으면 옛 데이터 fail |
| optional 필드 삭제 | OK | OK | 태그 재사용 X |
| required 필드 삭제 | X | OK | 새 코드가 옛 데이터 못 검증 |
| 태그 번호 변경 | X | X | 절대 금지 |
| 타입 변경 | 일부만 | 일부만 | int32→int64 OK, string↔int X |
| 필드 이름 변경 (Protobuf) | OK | OK | 태그가 진짜 식별자 |
| 필드 이름 변경 (Avro) | X | X | 이름이 식별자, alias 필요 |

## RPC vs Message-Passing

인코딩의 큰 사용처가 *서비스 간 통신*이다. 크게 두 패턴 — **동기 RPC**와 **비동기 메시징**.

### RPC (Remote Procedure Call)

다른 머신의 함수를 마치 로컬 함수처럼 호출한다는 추상.

- **gRPC** — Google, Protobuf + HTTP/2 기반. 양방향 스트리밍, 데드라인, 인터셉터
- **Thrift RPC** — Facebook 내부 표준, 다양한 트랜스포트
- **Avro RPC** — Hadoop 생태계, 거의 안 보임
- **REST** — JSON over HTTP, 형식이 덜 엄격, 가장 흔함
- **GraphQL** — 클라이언트 주도 쿼리, REST 대안

RPC의 본질적 어려움 — **네트워크는 함수 호출이 아니다**.

- 네트워크 지연이 함수 호출보다 자릿수 이상 크다
- 부분 실패가 가능하다 — 요청은 갔는데 응답을 못 받음
- 같은 요청을 다시 보내도 안전해야 한다 — **idempotency**
- 호출자와 피호출자가 다른 시각·다른 버전·다른 언어에 있다

"로컬 함수처럼"이라는 추상이 누수되는 지점들이다. *retry, timeout, circuit breaker, deadline propagation*이 RPC 라이브러리의 핵심 기능인 이유.

### Message-Passing — 비동기 큐

직접 호출이 아니라 중간에 **broker**를 둔다. 송신자는 큐에 메시지를 넣고 즉시 반환, 수신자는 큐에서 꺼내 처리한다.

- **Kafka** — 로그 기반, 영속, partition 단위 순서 보장, 재처리 가능
- **RabbitMQ / ActiveMQ** — broker 기반, 라우팅 규칙 풍부, 메시지 소비 후 삭제
- **AWS SQS / SNS** — 관리형 큐와 pub/sub
- **NATS** — 경량 pub/sub

장점이 분명하다.

- **디커플링** — 송신자는 수신자가 살아있는지 모름
- **버퍼링** — 트래픽 스파이크를 흡수
- **다수 소비자** — 같은 메시지를 여러 서비스가 받음 (Kafka의 consumer group)
- **재처리** — 영속 로그면 옛 메시지를 다시 흘려보낼 수 있음

메시지 형식도 인코딩 결정이다. Protobuf / Avro / JSON 중에서 고른다. Kafka + Avro + Schema Registry가 산업 표준 조합 중 하나다.

### 같은 비교를 표로

| 측면 | RPC | Message Queue |
|------|-----|---------------|
| 통신 모드 | 동기 (보통) | 비동기 |
| 결합도 | 송수신 모두 살아있어야 | 디커플링 |
| 응답 | 즉시 | 별도 큐 또는 callback |
| 백프레셔 | 클라이언트 측 | broker 큐 길이 |
| 재시도 | 호출자 책임 | broker가 보장 |
| 흔한 인코딩 | Protobuf, JSON | Avro, Protobuf, JSON |

## 시스템 사례

### gRPC + Protobuf

Google 사내 표준에서 출발해 오픈소스. 마이크로서비스 통신의 사실상 표준 중 하나.

- `.proto`에서 클라이언트·서버 stub 자동 생성
- HTTP/2 위에서 멀티플렉싱, server streaming, bidirectional streaming
- 데드라인이 호출 체인을 따라 전파됨
- Envoy / Istio의 service mesh가 gRPC를 일급으로 다룸

### Kafka + Avro + Schema Registry

데이터 파이프라인의 산업 표준 조합.

```text
Producer (Avro encode) → Kafka topic → Consumer (Avro decode)
       ↓                                       ↑
       └─── Schema Registry (writer/reader) ───┘
```

- Producer가 새 스키마를 등록하면 Registry가 *호환성 규칙* 검증
- 페이로드는 schema ID(4바이트) + Avro 인코딩 값
- Consumer가 ID로 writer schema를 조회하고 자신의 reader schema와 resolution
- 스키마 진화가 *강제로* 호환되는 방향만 허용됨

### REST + JSON

가장 흔하고 가장 단순. 마이크로서비스 입문, 외부 공개 API의 기본값.

- 사람이 디버깅하기 쉽다 — `curl`로 충분
- 스키마는 OpenAPI / Swagger로 별도 명세
- 성능과 타입 안정성을 양보하는 대신 *진입 장벽이 낮다*
- 내부 호출이 많아지고 스키마 검증이 필요해지면 gRPC로 옮겨가는 패턴

### 어떤 조합을 언제 쓰는가

| 시나리오 | 추천 |
|---------|------|
| 외부 공개 API | REST + JSON (OpenAPI) |
| 내부 마이크로서비스 동기 호출 | gRPC + Protobuf |
| 이벤트 파이프라인 | Kafka + Avro |
| 모바일 ↔ 서버 | gRPC-Web 또는 REST |
| 실시간 양방향 | gRPC streaming, WebSocket + Protobuf |
| 빠른 프로토타입 | REST + JSON |

## 데이터 흐름의 세 패턴

이 챕터의 정리는 데이터가 시스템 사이를 흐르는 *세 가지 패턴*이다.

1. **DB를 통해** — 한 프로세스가 DB에 쓰고 다른 프로세스가 읽음. 둘 사이 시간 간격이 크다. 옛 데이터를 새 코드가 읽을 수 있어야 하고, 그 반대도 성립해야 한다.
2. **RPC** — 서비스 사이 동기 호출. 송수신자가 동시에 살아있어야. 인코딩 + 버전 협상이 양쪽 모두 필요.
3. **메시지** — 서비스 사이 비동기 메시지. 송수신자가 시간적으로도 디커플링. 영속 로그라면 한참 뒤의 코드가 옛 메시지를 처리하기도 함.

각 경우 인코딩의 선택이 *시스템 진화 가능성*을 결정한다.

### DB Through Time

DB는 *시간을 가로지르는* 메시징이다. 어제의 코드가 쓴 데이터를 오늘의 코드가 읽는다. 데이터가 *코드보다 오래 산다*는 점이 가장 중요한 통찰이다.

이 관점에서 보면 *마이그레이션*도 인코딩 문제다.

- **Eager migration** — 스키마 변경 시 모든 행을 새 형식으로 변환. 큰 테이블에서는 시간이 오래 걸리고 lock 발생
- **Lazy migration** — 옛 형식 데이터를 그대로 두고 *읽을 때*에 새 형식으로 변환. 코드가 *옛 형식과 새 형식 모두* 읽을 수 있어야 함

대부분의 운영 시스템은 lazy migration을 선호한다. 그러려면 *backward compatibility*가 강력하게 보장되는 인코딩 포맷이 필요하다.

### Service Through Network

RPC의 본질은 *공간*을 가로지르는 통신이다. 같은 시각에 다른 머신·다른 네트워크에 있는 두 프로세스가 메시지를 주고받는다.

핵심 어려움.

- **Latency** — 함수 호출의 1000배 이상
- **부분 실패** — 요청은 도착했는데 응답은 사라짐. 다시 보내면 *두 번* 처리될 수도 있음
- **버전 불일치** — 클라이언트와 서버가 다른 버전. 호환성이 양쪽 모두에서 필요
- **타임아웃** — 무한 대기는 자원 누수. 데드라인 전파가 필요

### Async Through Time and Space

메시지 큐는 *시간과 공간 모두*를 가로지른다. 송신자가 메시지를 보낸 후 죽어도 수신자는 그 메시지를 처리한다. 영속 로그(Kafka)라면 *한참 뒤의 새 consumer*가 옛 메시지를 다시 처리하기도 한다.

이게 가장 까다로운 호환성 시나리오를 만든다. *몇 년 전의* 코드가 인코딩한 메시지를 *오늘 만든* 새 consumer가 읽을 수 있어야 한다. Avro + Schema Registry가 이 시나리오에 가장 잘 어울리는 이유다.

## 추가 주제 — 진화의 함정

### Default 값과 Sentinel

옛 데이터에 없는 필드의 default를 어떻게 정할 것인가.

- **명시적 default** — Avro와 proto3의 권장. 의미가 명확
- **언어 default** — null, 0, "". 의미가 *없음*과 혼동될 위험
- **Sentinel 값** — `-1`, `INT_MIN` 같은 특수 값. 도메인 위반 가능성

`age = 0`이 *0살*인지 *모름*인지 구분 안 됨. *Nullable* 타입이나 *명시적 sentinel*이 안전.

### 태그 번호 재사용 금지

Protobuf와 Thrift에서 *절대* 하지 말아야 할 변경 — 태그 번호 재사용.

```protobuf
// V1
message User {
  string name = 1;
  string email = 2;  // 옛날에 썼다가 삭제
}

// V2 — 태그 2를 다른 의미로 재사용 ❌
message User {
  string name = 1;
  int32 age = 2;  // BUG: 옛 데이터의 email 바이트를 age로 해석
}
```

Protobuf는 `reserved 2;`로 태그 번호를 영구 예약할 수 있다. 항상 써야 한다.

### Avro의 별명(Aliases)

필드 이름이 식별자인 Avro에서 이름을 바꾸려면.

```json
{"name": "email_address", "aliases": ["email"], "type": "string"}
```

새 이름이 식별자, 옛 이름은 alias로 등록. 둘 다 매칭.

### Sealed Object 변경

암호화·서명된 객체에서는 *bit-for-bit identical* 디코딩이 필요. 이런 경우 호환성 규칙이 더 빡빡하다 — 필드 순서도 보존해야 함. Avro의 *canonical encoding*이 이 용도.

## Modeling Choice — Document vs Schema

인코딩 포맷 선택이 데이터 모델 결정과도 얽힌다.

| 포맷 | 잘 맞는 데이터 모델 |
|------|---------------------|
| JSON / BSON | Document (nested, 자유 형식) |
| Protobuf / Thrift | Strongly-typed records (RPC) |
| Avro | Append-only logs, streaming |
| Parquet / ORC | Columnar analytical |

데이터가 *유연하고 nested*이면 document, *RPC API*면 Protobuf, *event log*면 Avro, *analytical*이면 column store. 각 선택이 진화 전략까지 결정한다.

## Columnar — Parquet과 ORC

분석 워크로드에서 *column-oriented* 인코딩이 표준.

- **Parquet** — Apache, 가장 널리 쓰임. Spark·Presto·BigQuery에서 일급
- **ORC** — Optimized Row Columnar, Hive 생태계
- **Arrow** — in-memory columnar, Parquet/ORC의 메모리 짝

핵심 아이디어 — 같은 column의 값들이 *연속 저장*. 같은 타입·비슷한 분포라서 *압축률*과 *vectorized processing* 모두 유리.

```text
Row-oriented:    [r1: name=A, age=30] [r2: name=B, age=25] ...
Column-oriented: [name: A, B, C, ...] [age: 30, 25, 28, ...]
```

스키마 진화 규칙도 다르다. Column 추가는 *옛 파일에 그 column이 없음*을 표현해야 함. Parquet의 *schema evolution* 규칙이 이걸 명시.

### Dictionary Encoding과 Bitpacking

같은 값이 반복되면 dictionary로 압축.

```text
country = ["KR", "KR", "US", "KR", "JP", "KR", "US"]
dictionary = {0: "KR", 1: "US", 2: "JP"}
encoded = [0, 0, 1, 0, 2, 0, 1]  ← 2비트씩 패킹 가능
```

low-cardinality column에서 압축률이 10배 이상.

## Compatibility 체크 자동화

수작업 호환성 검증은 위험하다. 자동화가 표준.

- **buf** — Protobuf linting과 *breaking change detection*. CI에 통합
- **Confluent Schema Registry** — Avro 등록 시 호환성 규칙 자동 검증 (BACKWARD, FORWARD, FULL 등)
- **proto-breaking-change-detector** — Google 사내 도구의 오픈소스 변형

PR 단계에서 *호환성 깨는 변경*을 차단. 운영 시스템에서 필수.

### Schema Registry의 호환성 모드

| 모드 | 의미 | 안전한 변경 |
|------|------|-------------|
| BACKWARD | 새 reader가 옛 데이터 읽음 | 필드 삭제, optional 추가 |
| FORWARD | 옛 reader가 새 데이터 읽음 | 필드 추가, required 삭제 |
| FULL | 양방향 | optional 필드 add/remove |
| NONE | 검증 안 함 | 모든 변경 (위험) |

대부분의 운영 시스템은 BACKWARD 또는 FULL을 강제.

## Encoding의 미래 — gRPC-Web, Flatbuffers, Cap'n Proto

새로운 포맷들도 등장하고 있다.

- **gRPC-Web** — 브라우저에서 gRPC. HTTP/1.1 호환 변환
- **FlatBuffers** — Google, *zero-copy* 디코딩. 게임·모바일
- **Cap'n Proto** — Sandstorm, zero-copy + RPC
- **Bond** — Microsoft, Protobuf 대안

Zero-copy의 의미 — 디코딩 시 메모리 할당과 파싱이 거의 없음. 임베디드·실시간에서 유리. 그러나 *진화 가능성*은 Protobuf보다 약함.

선택의 본질은 변하지 않는다 — *크기, 속도, 진화 가능성, 언어 지원, 운영 도구*의 절충점.

## 정리

- 인코딩 = 메모리 객체 → 바이트 시퀀스. 일종의 *번역*이다
- **언어 특화** 직렬화는 외부 노출 금지 — 보안과 호환성 문제
- **JSON·XML·CSV** — 보편적이지만 비효율, 스키마 없음, 숫자·바이너리 처리 약함
- **MessagePack·BSON** — JSON의 컴팩트한 바이너리, 그러나 필드 이름은 여전히 포함
- **Protobuf·Thrift·Avro** — 스키마 기반, 컴팩트, 진화 가능
- **Avro의 reader/writer resolution** — 동적 스키마와 Schema Registry에 적합
- **Backward** — 새 코드가 옛 데이터 읽음. **Forward** — 옛 코드가 새 데이터 읽음. 둘 다 *롤링 업그레이드*에 필요
- 안전한 변경 — optional 필드 추가, 태그 번호 보존, default 정의
- **RPC** — 동기, 부분 실패와 idempotency가 핵심. gRPC가 사실상 표준
- **메시지 큐** — 비동기, 디커플링, 영속 로그. Kafka + Avro가 표준 조합
- 외부 공개는 REST + JSON, 내부는 gRPC + Protobuf, 파이프라인은 Kafka + Avro

## 다음 장 예고

다음 장부터 **Part II — 분산 데이터**. 5장은 **Replication**(복제) — 같은 데이터를 여러 노드에 두는 모델 세 가지와 그로부터 따라 나오는 일관성 문제들.

## 관련 항목

- [Ch 3: Storage](/blog/parallel/designing-data-intensive-applications/chapter03-storage-and-retrieval)
- [Ch 5: Replication](/blog/parallel/designing-data-intensive-applications/chapter05-replication)
- [Clean Architecture Ch 22: The Clean Architecture](/blog/programming/design/clean-architecture/chapter22-the-clean-architecture) — 경계 가로지르는 데이터
