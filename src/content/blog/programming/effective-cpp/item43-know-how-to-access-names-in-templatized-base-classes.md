---
title: "항목 43: 템플릿화된 base 클래스의 이름에 접근하는 방법을 알아두라"
date: 2025-02-07T12:00:00
description: "템플릿 base의 멤버 접근에 this->, using, 명시 자격 — 세 가지 방법."
tags: [C++, Effective C++, Template, Inheritance]
series: "Effective C++"
seriesOrder: 43
draft: true
---

> **초안** — 정리 진행 중

## 개요

derived가 템플릿 base를 상속할 때, base의 멤버 함수에 그냥 접근하면 컴파일 에러가 날 수 있습니다. 템플릿 인스턴스화 시점에 base가 무엇인지 모르기 때문입니다 (특수화로 다른 멤버를 가질 수 있음).

## 함정

```cpp
template<typename Company>
class MsgSender {
public:
    void sendClear(const MsgInfo& info) { /* clear text 전송 */ }
};

template<typename Company>
class LoggingMsgSender : public MsgSender<Company> {
public:
    void sendClearMsg(const MsgInfo& info) {
        // log 전 처리
        sendClear(info);     // 에러! 컴파일러가 sendClear를 못 찾음
    }
};
```

왜? `MsgSender<Company>`가 특수화되어 `sendClear`가 없을 수도 있다고 컴파일러가 의심.

```cpp
template<>
class MsgSender<CompanyZ> {     // 특수화 — sendClear 없음
public:
    void sendSecret(const MsgInfo& info);
};
```

## 해결 — 세 가지

### 1. `this->`

```cpp
this->sendClear(info);    // base 검색 강제
```

가장 단순. 이 시점에 컴파일러가 `this`의 base 계층 탐색.

### 2. `using` 선언

```cpp
template<typename Company>
class LoggingMsgSender : public MsgSender<Company> {
public:
    using MsgSender<Company>::sendClear;    // base의 이름을 derived 스코프로

    void sendClearMsg(const MsgInfo& info) {
        sendClear(info);    // OK
    }
};
```

### 3. 명시 자격

```cpp
MsgSender<Company>::sendClear(info);
```

다만 virtual 함수의 동적 디스패치를 막아 평소엔 권장 X.

## 권장: `this->`

가장 짧고 동적 디스패치도 유지. 가독성도 좋음.

## 핵심 정리

1. 템플릿 base의 멤버는 그냥 호출 못 함 (컴파일러가 의심)
2. `this->`, `using`, 명시 자격 세 가지 해결법
3. 보통 `this->`가 가장 간단·안전
4. 템플릿 특수화로 base가 다를 수 있다는 점이 원인
