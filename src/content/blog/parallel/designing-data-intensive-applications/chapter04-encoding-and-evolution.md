---
title: "Ch 4: 인코딩과 진화"
date: 2026-07-01T04:00:00
description: "데이터 직렬화 — JSON / Protobuf / Avro / Thrift. 스키마 진화와 forward / backward 호환성."
tags: [DDIA, Encoding, Protobuf, Avro, SchemaEvolution]
series: "Designing Data-Intensive Applications"
seriesOrder: 4
---

## 이 챕터의 메시지

데이터는 메모리에서 디스크/네트워크로 이동할 때 **인코딩**이 필요하다. 이 결정이 시스템의 진화 가능성을 결정한다.

핵심 질문 — **스키마가 변할 때 어떻게 호환성을 유지하는가?**

## In-Memory vs Wire Format

메모리의 데이터는 객체, 포인터, 구조체. 이걸 바이트 시퀀스로 바꾸는 게 **인코딩**(serialization, marshalling).

```
객체 → 인코딩 → 바이트 → 네트워크/디스크 → 바이트 → 디코딩 → 객체
```

여러 형식 — JSON, XML, Protobuf, Avro, Thrift, MessagePack, ...

## 언어 특화 인코딩

Java `Serializable`, Python `pickle`, Ruby `Marshal` 등.

```python
import pickle
data = pickle.dumps(obj)  # 직렬화
obj2 = pickle.loads(data)  # 역직렬화
```

**문제**:
- 다른 언어와 호환 X
- 보안 위험 (Pickle은 임의 코드 실행)
- 버전 호환성 약함
- 비효율 (느림, 큼)

**권장** — 언어 특화 직렬화는 같은 언어 내에서만, 외부 노출 X.

## 텍스트 형식 — JSON, XML, CSV

JSON이 사실상 표준.

```json
{"name": "Alice", "age": 30, "country": "KR"}
```

**장점**:
- 사람이 읽음
- 모든 언어가 지원
- 단순
- 웹의 lingua franca

**단점**:
- 숫자 표현 모호 (정수? 부동소수점?)
- Binary data 부적합 (base64 인코딩 필요)
- 큼 (필드 이름 매번 반복)
- 스키마 명세 X

XML / CSV도 비슷한 한계.

## Binary 인코딩 — Protobuf, Thrift, Avro

스키마를 별도 정의하고 컴팩트한 binary로 인코딩.

### Protocol Buffers (Google)

```protobuf
message Person {
  required string name = 1;
  optional int32 age = 2;
  repeated string interests = 3;
}
```

각 필드에 **태그 번호**. 인코딩된 바이트에는 태그 번호만 들어감 (필드 이름 X).

```
JSON:     {"name":"Alice","age":30}   → 25 bytes
Protobuf: \x0A\x05Alice\x10\x1E       → 9 bytes
```

훨씬 작다. 그리고 타입이 명시적.

### Thrift (Facebook)

```thrift
struct Person {
  1: required string name,
  2: optional i32 age,
}
```

Protobuf와 매우 비슷. Facebook이 개발, 다양한 RPC 프로토콜 지원.

### Avro (Apache)

```json
{
  "type": "record",
  "name": "Person",
  "fields": [
    {"name": "name", "type": "string"},
    {"name": "age", "type": "int"}
  ]
}
```

태그 번호 없음. 대신 **스키마 자체**가 reader와 writer 사이에 공유. Hadoop 생태계의 표준.

## 스키마 진화 — Forward / Backward 호환성

데이터는 오래 산다. 코드는 자주 변한다. **새 코드가 옛 데이터를 읽을 수 있어야** 하고, **옛 코드가 새 데이터를 읽을 수 있어야** 한다.

**Backward Compatibility** — 새 코드가 옛 데이터를 읽을 수 있음.

```
Old data: {name: "Alice"}
New code: "이메일도 있어야 하는데" → optional이면 OK
```

**Forward Compatibility** — 옛 코드가 새 데이터를 읽을 수 있음.

```
New data: {name: "Alice", email: "..."}
Old code: "email 모름" → 무시하고 진행
```

**롤링 업그레이드**에서는 둘 다 필요. 일부 서버는 옛 버전, 일부는 새 버전 — 양방향 호환.

## Protobuf의 진화

**필드 추가**:

```protobuf
// V1
message Person {
  required string name = 1;
}

// V2 — email 추가
message Person {
  required string name = 1;
  optional string email = 2;  // 새 필드 (optional)
}
```

- V1 데이터 → V2 코드: name만 있음, email은 default → OK (backward)
- V2 데이터 → V1 코드: email은 모르는 태그 2번, 무시 → OK (forward)

**필드 삭제**:
- optional 필드만 삭제 가능 (required 삭제는 backward 깨짐)
- 태그 번호 재사용 X (옛 데이터의 그 태그를 잘못 해석)

**타입 변경**:
- 일부 변경만 호환 (int32 → int64는 OK)
- 신중하게

## Avro의 진화

스키마가 명시적으로 공유되므로 다른 접근.

**Writer schema**: 데이터가 쓰일 때의 스키마.
**Reader schema**: 데이터를 읽을 때의 스키마.

두 스키마가 다르면 — Avro가 자동 매핑.

- writer에 있고 reader에 없는 필드 → 무시
- reader에 있고 writer에 없는 필드 → default
- 타입 변환은 약속된 규칙

**장점** — schema registry를 두면 매우 우아.

## RPC와 메시징

인코딩의 큰 사용처.

### RPC (Remote Procedure Call)

다른 머신의 함수를 호출.

- **gRPC** — Protobuf 기반
- **Thrift RPC** — Thrift 기반
- **Avro RPC** — Avro 기반
- **REST** — JSON over HTTP (덜 형식적)

**문제** — 네트워크는 실패한다. RPC는 같은 함수 호출처럼 보이지만 그렇지 않다.

- 네트워크 지연
- 부분 실패 (요청은 갔는데 응답 못 받음)
- Idempotency 필요

### 메시지 큐

비동기 통신. 직접 호출이 아니라 큐에 메시지 넣음.

- Kafka — 로그 기반
- RabbitMQ — broker 기반
- AWS SQS / SNS

메시지 형식도 인코딩 결정. Protobuf / Avro / JSON.

## 데이터 흐름

이 챕터는 데이터가 시스템 사이를 흐르는 세 가지 패턴.

1. **DB를 통해** — DB에 쓰고 다른 곳에서 읽음
2. **RPC** — 서비스 사이 동기 호출
3. **메시지** — 서비스 사이 비동기 메시지

각각의 인코딩 선택이 시스템 진화 가능성을 결정한다.

## 정리

- 인코딩 = 메모리 객체 → 바이트 시퀀스
- **JSON** — 보편적이지만 비효율
- **Protobuf / Thrift / Avro** — binary, 효율적, 스키마 진화
- **Backward / Forward 호환성** — 롤링 업그레이드에 필수
- 필드 추가는 안전 (optional), 삭제 / 타입 변경은 신중
- **RPC** — 같은 함수 호출 아님, 부분 실패 고려
- **메시지 큐** — 비동기, 디커플링

## 다음 장 예고

다음 장부터 **Part II — 분산 데이터**. 5장은 **Replication**(복제).

## 관련 항목

- [Ch 3: Storage](/blog/parallel/designing-data-intensive-applications/chapter03-storage-and-retrieval)
- [Clean Architecture Ch 22: The Clean Architecture](/blog/programming/design/clean-architecture/chapter22-the-clean-architecture) — 경계 가로지르는 데이터
