---
title: "Ch 9: Security"
date: 2025-05-20T09:00:00
description: "보안 채널, 접근 제어, 보안 관리 — 분산 시스템 보안의 핵심"
series: "Distributed Systems"
seriesOrder: 9
tags: [distributed-systems, security, authentication, authorization, encryption]
draft: true
type: book-review
bookTitle: "Distributed Systems: Principles and Paradigms"
bookAuthor: "Maarten van Steen, Andrew S. Tanenbaum"
---

## 보안 위협

분산 시스템은 **공격 표면**이 넓다.

### 위협 분류

```
보안 4대 위협:

┌─────────────────────────────────────────────────┐
│  가로채기 (Interception)  │ 기밀성 위협         │
│  도청, 트래픽 분석        │                     │
├───────────────────────────┼─────────────────────┤
│  방해 (Interruption)      │ 가용성 위협         │
│  서비스 거부, 파괴        │                     │
├───────────────────────────┼─────────────────────┤
│  변조 (Modification)      │ 무결성 위협         │
│  데이터 수정, 재생 공격    │                     │
├───────────────────────────┼─────────────────────┤
│  위장 (Fabrication)       │ 인증 위협           │
│  신원 위조, 스푸핑        │                     │
└─────────────────────────────────────────────────┘
```

### 가로채기 (Interception)

```
정당한 통신을 몰래 엿봄

Alice ──────msg──────▶ Bob
            │
            │ 도청
            ▼
          Eve (공격자)

위협: 기밀성 (Confidentiality)
방어: 암호화
```

### 방해 (Interruption)

```
서비스를 사용 불가능하게 만듦

Alice ─────────╳────────▶ Bob
              ↑
            공격자
         (서비스 거부)

위협: 가용성 (Availability)
방어: 복제, 분산, 필터링
```

### 변조 (Modification)

```
전송 중인 데이터를 수정

Alice ──"100원"──▶ 공격자 ──"10000원"──▶ Bob

위협: 무결성 (Integrity)
방어: 메시지 인증 코드 (MAC), 디지털 서명
```

### 위장 (Fabrication)

```
신원을 속임

공격자 (Alice인 척) ──────▶ Bob
      ↑
  "나 Alice야"

위협: 진정성 (Authenticity)
방어: 인증 (Authentication)
```

---

## 보안 채널

**안전한 통신 경로** 확립.

### 인증 (Authentication)

**상대방 신원 확인**.

**공유 비밀 기반**:

```
Challenge-Response:

Alice ─────────────────────────────▶ Bob
       "나 Alice야"

Alice ◀───── Nonce (랜덤 도전) ───── Bob

Alice ─── Encrypt(Nonce, SharedKey) ─▶ Bob

Bob: 복호화해서 Nonce 확인 → Alice 인증됨
```

**공개키 기반**:

```
디지털 서명 사용:

Alice ────── Message ──────────────▶ Bob
       ────── Sign(Hash(Msg), PrivateKey_A) ──▶

Bob: PublicKey_A로 서명 검증 → Alice가 보냄 확인
```

**Needham-Schroeder 프로토콜**:

```
KDC (Key Distribution Center) 사용:

1. Alice → KDC: "Alice, Bob과 통신하고 싶어"
2. KDC → Alice: {K_AB, Ticket}_{K_A}
   Ticket = {K_AB, Alice}_{K_B}
3. Alice → Bob: Ticket
4. Bob: 복호화해서 K_AB 획득

문제: 재생 공격에 취약 (Kerberos가 개선)
```

**Kerberos**:

```
티켓 기반 인증:

1. AS (Authentication Server)에서 TGT 획득
2. TGS (Ticket Granting Server)에서 서비스 티켓 획득
3. 서비스 티켓으로 서비스 접근

┌────────┐
│  AS    │ ──TGT──▶ Client
└────────┘             │
                       │ TGT
                       ▼
┌────────┐     서비스 티켓
│  TGS   │ ◀────────────
└────────┘ ────────────▶
                       │
                       │ 서비스 티켓
                       ▼
┌────────┐
│Service │
└────────┘
```

### 메시지 무결성과 기밀성

**기밀성 (Confidentiality)**: 암호화.

```
대칭키 암호화:
- 같은 키로 암호화/복호화
- 빠름 (AES, ChaCha20)
- 키 교환 문제

공개키 암호화:
- 공개키로 암호화, 개인키로 복호화
- 느림 (RSA, ECC)
- 키 교환 해결

하이브리드:
1. 공개키로 세션키(대칭키) 교환
2. 세션키로 데이터 암호화
```

**무결성 (Integrity)**: MAC 또는 디지털 서명.

```
MAC (Message Authentication Code):
- 공유 비밀키와 메시지로 태그 생성
- HMAC-SHA256

Message ──┬──────────────────▶ Receiver
          │                         │
          └── HMAC(K, Message) ────▶│
                                    │
                          비교: HMAC(K, Message) == 수신 태그?
```

**TLS (Transport Layer Security)**:

```
웹 보안의 핵심:

1. 핸드셰이크:
   - 버전, 암호 스위트 협상
   - 서버 인증서 검증
   - 세션키 교환

2. 데이터 전송:
   - 세션키로 암호화
   - MAC으로 무결성

Client                                Server
   │──ClientHello (지원 암호)──────────▶│
   │◀──ServerHello (선택 암호)──────────│
   │◀──Certificate (인증서)─────────────│
   │                                    │
   │──ClientKeyExchange────────────────▶│
   │──ChangeCipherSpec─────────────────▶│
   │──Finished (암호화)────────────────▶│
   │                                    │
   │◀──ChangeCipherSpec─────────────────│
   │◀──Finished (암호화)────────────────│
```

### 보안 그룹 통신

**여러 참가자 간 보안 통신**.

```
문제:
- N명이면 N(N-1)/2 키 쌍? 비효율
- 그룹 키 사용 → 멤버 변경 시 키 갱신 필요

해결:
- 그룹 키 관리 프로토콜
- 키 트리 (LKH - Logical Key Hierarchy)

키 트리:
         [K_root]
        ╱        ╲
   [K_left]    [K_right]
    ╱    ╲      ╱     ╲
  [K1]  [K2]  [K3]   [K4]
   │     │     │      │
  U1    U2    U3     U4

U2 탈퇴 시: K2, K_left, K_root만 갱신
```

---

## 접근 제어

**누가 무엇을 할 수 있는지** 제어.

### 접근 제어 매트릭스

```
           File1   File2   Printer
Alice      R,W     R       Print
Bob        R       R,W     -
Charlie    -       R       Print

행: 주체 (Subject)
열: 객체 (Object)
셀: 권한 (Permission)
```

**구현 방식**:

```
1. ACL (Access Control List) - 객체 중심:
   File1: [(Alice, R,W), (Bob, R)]

2. Capability - 주체 중심:
   Alice: [(File1, R,W), (File2, R), (Printer, Print)]
```

### 방화벽

**네트워크 경계 보호**.

```
┌───────────────────────────────────────────┐
│                 Internal Network           │
│   ┌─────┐  ┌─────┐  ┌─────┐              │
│   │ PC1 │  │ PC2 │  │Server│             │
│   └──┬──┘  └──┬──┘  └──┬──┘              │
│      └────────┴────────┘                  │
│                  │                         │
│           ┌──────┴──────┐                 │
│           │  Firewall   │                 │
│           └──────┬──────┘                 │
└──────────────────┼────────────────────────┘
                   │
            ═══════╧═══════
                Internet
```

**방화벽 유형**:

| 유형 | 계층 | 검사 대상 |
|------|------|----------|
| 패킷 필터 | 3-4 | IP, 포트 |
| 상태 기반 | 4 | 연결 상태 |
| 애플리케이션 | 7 | 콘텐츠 |

### 보안 이동 코드

**원격에서 다운로드한 코드 실행 보안**.

```
문제:
- 악성 코드가 시스템 파괴?
- 민감 데이터 유출?

해결책:
1. 샌드박싱 (Sandboxing):
   - 제한된 환경에서 실행
   - 파일/네트워크 접근 제한

2. 코드 서명 (Code Signing):
   - 신뢰된 개발자 서명 검증

3. 증거 기반 (Proof-Carrying Code):
   - 코드와 함께 안전성 증명 첨부
```

### 서비스 거부 (DoS)

**가용성 공격**.

```
유형:
- 대역폭 소진: 대량 트래픽
- 자원 소진: 연결/메모리 고갈
- 애플리케이션: 비용 큰 요청

DDoS (Distributed DoS):
         ┌─────┐
         │Bot 1│──╲
         └─────┘   ╲
         ┌─────┐    ╲  ┌────────┐
         │Bot 2│─────▶ │ Target │
         └─────┘    ╱  └────────┘
         ┌─────┐   ╱
         │Bot N│──╱
         └─────┘

방어:
- 트래픽 필터링
- Rate limiting
- CDN/분산
- Anycast
```

---

## 보안 관리

### 키 관리

**암호키의 생성, 분배, 저장, 폐기**.

```
키 수명 주기:
생성 → 분배 → 활성화 → 사용 → 폐기

키 분배 방법:
1. 사전 공유 (Pre-shared)
2. 키 교환 프로토콜 (DH, ECDH)
3. KDC (Key Distribution Center)
4. PKI (Public Key Infrastructure)
```

**Diffie-Hellman 키 교환**:

```
공개 파라미터: p (큰 소수), g (생성자)

Alice:
- 비밀: a
- 공개: A = g^a mod p

Bob:
- 비밀: b
- 공개: B = g^b mod p

교환:
Alice ───── A ─────▶ Bob
Alice ◀──── B ────── Bob

공유 비밀:
Alice: K = B^a mod p = g^(ab) mod p
Bob:   K = A^b mod p = g^(ab) mod p

도청자: A, B만 알아도 K 계산 불가 (이산 로그 문제)
```

### 인증 기관 (CA)

**공개키와 신원 연결**.

```
인증서 체인:

┌──────────────┐
│   Root CA    │  ← 자체 서명, 브라우저에 내장
│ (Trust Anchor)│
└──────┬───────┘
       │ 서명
       ▼
┌──────────────┐
│Intermediate CA│
└──────┬───────┘
       │ 서명
       ▼
┌──────────────┐
│End-Entity Cert│  ← 웹사이트 인증서
│(example.com)  │
└──────────────┘
```

**X.509 인증서 구조**:

```
- 버전
- 일련번호
- 서명 알고리즘
- 발급자 (CA)
- 유효 기간
- 주체 (소유자)
- 주체 공개키
- 확장 (용도, SAN 등)
- CA 서명
```

**인증서 폐기**:

```
폐기 사유:
- 개인키 유출
- CA 신뢰 상실
- 소유자 정보 변경

폐기 확인:
1. CRL (Certificate Revocation List)
   - CA가 주기적으로 발행하는 폐기 목록

2. OCSP (Online Certificate Status Protocol)
   - 실시간 상태 조회
```

### 능력 기반 시스템 (Capability)

**토큰으로 권한 표현**.

```
능력 (Capability):
- 객체 참조 + 허용된 연산
- 위조 불가능 (암호학적)
- 전달 가능

예:
Alice의 Capability: [FileID: 123, Ops: READ|WRITE, Signature]

Alice → Bob: Capability 전달 (위임)
Bob: Capability로 파일 접근

장점: 분산 환경에 적합, 권한 위임 쉬움
단점: 폐기 어려움
```

---

## 정리

- **위협 4종**: 가로채기, 방해, 변조, 위장
- **보안 채널**: 인증 + 암호화 + 무결성
- **인증**: Challenge-Response, Kerberos, PKI
- **접근 제어**: ACL vs Capability
- **키 관리**: DH, PKI, CA

---

## 핵심 비교

| 위협 | 보안 속성 | 방어 |
|------|----------|------|
| 가로채기 | 기밀성 | 암호화 |
| 방해 | 가용성 | 복제, 필터링 |
| 변조 | 무결성 | MAC, 서명 |
| 위장 | 인증 | Challenge-Response |

| 인증 방식 | 기반 | 장점 | 단점 |
|----------|------|------|------|
| 공유 비밀 | 대칭키 | 빠름 | 키 분배 |
| 공개키 | 비대칭키 | 키 분배 쉬움 | 느림, PKI 필요 |
| Kerberos | 티켓 | SSO | KDC 의존 |

| 접근 제어 | 저장 위치 | 장점 | 단점 |
|----------|----------|------|------|
| ACL | 객체 | 권한 확인 쉬움 | 주체별 권한 파악 어려움 |
| Capability | 주체 | 위임 쉬움 | 폐기 어려움 |

---

## 관련 항목

- [Ch 8: Fault Tolerance](/blog/parallel/distributed-systems-tanenbaum/chapter08-fault-tolerance) — 장애 허용
- [Ch 4: Communication](/blog/parallel/distributed-systems-tanenbaum/chapter04-communication) — 통신 (TLS 위치)
- [Ch 1: Introduction](/blog/parallel/distributed-systems-tanenbaum/chapter01-introduction) — 8가지 오류 (보안 가정)
