---
title: "항목 9: 생성·소멸 중에는 가상 함수를 호출하지 말라"
date: 2025-02-02T14:00:00
description: "construction/destruction 중 vtable이 base를 가리키는 이유와 함정."
tags: [C++, Effective C++, Virtual, Constructor, Destructor]
series: "Effective C++"
seriesOrder: 9
draft: true
---

> **초안** — 정리 진행 중

## 개요

생성자나 소멸자 안에서 가상 함수를 호출하면, **현재 실행 중인 클래스 레벨**의 함수가 호출됩니다 — derived의 오버라이드가 호출되지 않습니다.

## 함정 예제

```cpp
class Transaction {
public:
    Transaction() { logTransaction(); }    // base 생성자에서 호출
    virtual void logTransaction() const = 0;
};

class BuyTransaction : public Transaction {
public:
    void logTransaction() const override { /* buy specific */ }
};

BuyTransaction b;   // 1. Transaction() 호출
                    // 2. logTransaction() — Transaction::logTransaction()이 호출됨!
                    //    아직 BuyTransaction 부분은 생성 전
                    //    pure virtual이라 → undefined behavior
```

## 왜 이렇게 동작하나

**생성 순서**: base part 생성 → derived part 생성. base 생성자 실행 중에는 derived 부분이 아직 없으므로, vtable이 base를 가리키도록 설정되어 있음.

**소멸 순서**: derived part 소멸 → base part 소멸. base 소멸자 실행 중에는 derived 부분이 이미 사라졌으므로 마찬가지.

## 해결 — non-virtual + 명시적 인자

```cpp
class Transaction {
public:
    explicit Transaction(const std::string& logInfo) {
        logTransaction(logInfo);   // non-virtual
    }

    void logTransaction(const std::string& info) const;   // non-virtual
};

class BuyTransaction : public Transaction {
public:
    BuyTransaction(/* params */)
        : Transaction(createLogString(/* ... */)) {}    // 정보를 base로 전달

private:
    static std::string createLogString(/* ... */);   // static — this 없음
};
```

derived가 어떤 정보로 로그할지 결정해 base에 넘겨주는 방식.

## 핵심 정리

1. 생성자/소멸자 안의 가상 함수는 현재 실행 중인 클래스의 버전이 호출됨
2. derived 오버라이드는 호출되지 않음 → 의도와 다름
3. pure virtual을 부르면 UB
4. 해결: non-virtual + 인자 전달, 또는 static helper로 정보 만들어 base에 위임
