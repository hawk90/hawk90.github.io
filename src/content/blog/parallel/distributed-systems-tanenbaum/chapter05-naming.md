---
title: "Ch 5: Naming"
date: 2025-05-20T05:00:00
description: "이름, 식별자, 주소 — 플랫 네이밍, 구조적 네이밍, 속성 기반 네이밍"
series: "Distributed Systems"
seriesOrder: 5
tags: [distributed-systems, naming, dns, dht, identifier]
draft: true
type: book-review
bookTitle: "Distributed Systems: Principles and Paradigms"
bookAuthor: "Maarten van Steen, Andrew S. Tanenbaum"
---

## 이름, 식별자, 주소

분산 시스템에서 **엔티티를 찾는 것**이 핵심 문제.

### 기본 개념

| 개념 | 설명 | 예 |
|------|------|-----|
| **이름 (Name)** | 엔티티를 참조하는 문자열 | `/home/user/file.txt` |
| **식별자 (Identifier)** | 유일하게 식별, 변하지 않음 | UUID, 주민번호 |
| **주소 (Address)** | 접근 지점 (변할 수 있음) | IP 주소, URL |

```
이름 해석 (Name Resolution):
이름 → 주소

예:
"www.example.com" → "93.184.216.34"
```

### 좋은 식별자의 조건

```
1. 최대 하나의 엔티티를 참조
2. 각 엔티티는 최대 하나의 식별자
3. 항상 같은 엔티티를 참조 (불변)
```

---

## 플랫 네이밍 (Flat Naming)

**구조 없는 식별자** (예: UUID, 해시).

### 단순 해결책

**브로드캐스팅**:
```
"ID xyz를 가진 엔티티 어디 있나?"

┌────┐  broadcast  ┌────┐
│ A  │ ──────────▶ │ B  │ "나 아님"
└────┘             └────┘
   │               ┌────┐
   └──────────────▶│ C  │ "나다!" → 주소 반환
                   └────┘
```

**문제**: 확장성 없음 (N 노드에 N 메시지).

**포워딩 포인터**:
```
엔티티가 이동하면 포인터를 남김

A → B → C → D (현재 위치)

문제: 체인이 길어지면 느림, 중간 노드 장애
```

### 홈 기반 접근 (Home-Based)

**홈 에이전트**가 현재 위치를 추적.

```
┌────────────┐
│ Home Agent │ ← 항상 알려진 주소
└─────┬──────┘
      │ 현재 위치 등록
      ▼
┌────────────┐
│   Entity   │ (이동 가능)
└────────────┘

클라이언트:
1. Home Agent에게 위치 질의
2. 실제 위치로 접근
```

**예**: 모바일 IP.

### DHT (분산 해시 테이블)

**키를 해시하여 담당 노드 결정**.

**Chord 예**:

```
링 구조:
노드 ID와 키 ID를 같은 공간에 해시

     0
    ╱ ╲
   ╱   ╲
  7     1
  │     │
  6     2
   ╲   ╱
    ╲ ╱
     5 ─ 4 ─ 3

키 k → ID k를 담당하는 노드 = k 이상인 최소 노드
```

**핑거 테이블**:
```
노드 n의 핑거 테이블:
finger[i] = successor(n + 2^i)

n=0일 때:
finger[0] = successor(1)
finger[1] = successor(2)
finger[2] = successor(4)
...

조회: O(log N) 홉
```

**가입/탈퇴**:
```
노드 가입:
1. 담당 키 범위 인수
2. 다른 노드 핑거 테이블 업데이트

노드 탈퇴:
1. 담당 키를 후임자에게 전달
2. 핑거 테이블 업데이트
```

---

## 구조적 네이밍 (Structured Naming)

**계층적 이름 공간** (예: 파일 시스템, DNS).

### 이름 공간 (Name Space)

```
루트
 ├─ com
 │   ├─ google
 │   │   ├─ www
 │   │   └─ mail
 │   └─ example
 │       └─ www
 └─ org
     └─ wikipedia
         └─ en
```

**절대 이름**: `/com/google/www`
**상대 이름**: `./mail` (현재 위치 기준)

### 이름 해석 (Name Resolution)

**반복적 해석 (Iterative)**:
```
클라이언트가 직접 각 서버에 질의

Client → Root NS: "www.google.com"?
       ← ".com NS 주소"
Client → .com NS: "www.google.com"?
       ← "google.com NS 주소"
Client → google.com NS: "www.google.com"?
       ← "IP 주소"
```

**재귀적 해석 (Recursive)**:
```
서버가 대신 질의

Client → Root NS: "www.google.com"?
         Root NS → .com NS → google.com NS
       ← "IP 주소" (최종 결과)
```

| 방식 | 서버 부하 | 캐싱 효율 |
|------|----------|----------|
| **Iterative** | 낮음 | 클라이언트 |
| **Recursive** | 높음 | 서버 (공유) |

### DNS 구현

```
DNS 계층:
                   . (root)
         ┌─────────┼─────────┐
         ▼         ▼         ▼
       com        org       net
         │
    ┌────┼────┐
    ▼    ▼    ▼
google amazon ...
    │
    ▼
   www
```

**레코드 유형**:

| 유형 | 설명 |
|------|------|
| **A** | 이름 → IPv4 |
| **AAAA** | 이름 → IPv6 |
| **CNAME** | 별칭 → 실제 이름 |
| **MX** | 메일 서버 |
| **NS** | 네임 서버 |
| **TXT** | 텍스트 정보 |

**캐싱과 TTL**:
```
DNS 응답에 TTL (Time To Live) 포함
TTL 동안 캐시하여 재질의 방지

트레이드오프:
- 긴 TTL: 효율적, 변경 반영 느림
- 짧은 TTL: 빠른 반영, 트래픽 증가
```

---

## 속성 기반 네이밍 (Attribute-Based)

**이름 대신 속성으로 검색**.

### 디렉토리 서비스

```
검색:
"위치=서울 AND 역할=프린터"
→ 매칭되는 엔티티들 반환
```

### LDAP (Lightweight Directory Access Protocol)

```
LDAP 트리 (DIT - Directory Information Tree):
dc=com
 └─ dc=example
     └─ ou=People
         ├─ cn=Alice
         │   ├─ mail=alice@example.com
         │   └─ department=Engineering
         └─ cn=Bob
             ├─ mail=bob@example.com
             └─ department=Sales
```

**검색 필터**:
```
(&(objectClass=person)(department=Engineering))
→ Alice 반환
```

**용도**:
- 사용자 인증 (Active Directory)
- 조직 구조
- 설정 관리

---

## 정리

- **플랫 네이밍**: 구조 없는 ID (DHT로 확장성)
- **구조적 네이밍**: 계층적 (DNS)
- **속성 기반**: 특성으로 검색 (LDAP)
- **DHT**: O(log N) 조회, P2P에 적합
- **DNS**: 인터넷 이름 해석의 핵심

---

## 핵심 비교

| 방식 | 구조 | 확장성 | 검색 유연성 |
|------|------|--------|-----------|
| 브로드캐스트 | 없음 | O(N) | 낮음 |
| DHT (Chord) | 링 | O(log N) | 낮음 (키만) |
| DNS | 트리 | O(깊이) | 중간 |
| LDAP | 트리 | 중간 | 높음 (속성) |

---

## 관련 항목

- [Ch 4: Communication](/blog/parallel/distributed-systems-tanenbaum/chapter04-communication) — 통신
- [Ch 6: Coordination](/blog/parallel/distributed-systems-tanenbaum/chapter06-coordination) — 조정
- [DDIA Ch 6: Partitioning](/blog/parallel/designing-data-intensive-applications/chapter06-partitioning) — 파티셔닝과 DHT
