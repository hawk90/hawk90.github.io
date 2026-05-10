---
title: "GoF 22: Template Method"
date: 2026-02-04T11:00:00
description: "알고리즘의 골격을 base에, 단계 구현을 derived에 — Hollywood 원칙."
tags: [Design Pattern, GoF, C++, C, Behavioral]
series: "GoF Design Patterns"
seriesOrder: 22
draft: true
---

> **초안** — 정리 진행 중

## 의도

알고리즘의 **골격을 base 클래스**에 정의, 일부 단계는 **derived가 구현**. 알고리즘 구조는 유지하면서 특정 단계만 변경.

## "Hollywood 원칙"

> "Don't call us, we'll call you."

base가 흐름을 통제, derived는 hook만 제공.

## C++ 구현

```cpp
class DataMiner {
public:
    void mine(const std::string& path) {     // template method (보통 non-virtual)
        auto raw = openFile(path);
        auto parsed = parseData(raw);          // 단계 1
        auto analyzed = analyze(parsed);       // 단계 2
        report(analyzed);                      // 단계 3
        closeFile();
    }

    virtual ~DataMiner() = default;

protected:
    // 일반 단계 — base가 제공
    std::string openFile(const std::string&);
    void closeFile();

    // hook — derived가 정의
    virtual ParsedData parseData(const std::string& raw) = 0;
    virtual Result     analyze(const ParsedData& data)   = 0;
    virtual void       report(const Result& r)           = 0;
};

class CsvMiner : public DataMiner {
protected:
    ParsedData parseData(const std::string& raw) override { /* CSV 파싱 */ }
    Result     analyze(const ParsedData& d)      override { /* ... */ }
    void       report(const Result& r)           override { /* CSV 리포트 */ }
};

class JsonMiner : public DataMiner { /* JSON 버전 */ };

// 사용
CsvMiner m;
m.mine("data.csv");
```

알고리즘 골격(`mine`)은 변경 없음. 단계별 구현만 다름.

## NVI (Non-Virtual Interface)와의 관계

NVI는 template method의 일반화: public non-virtual + private virtual.

```cpp
class Widget {
public:
    int healthValue() const {     // template method (NVI)
        // 사전 처리
        int v = doHealth();
        // 사후 처리
        return v;
    }
private:
    virtual int doHealth() const = 0;
};
```

## C 구현

```c
typedef struct DataMiner {
    ParsedData (*parse_data)(struct DataMiner*, const char*);
    Result     (*analyze)(struct DataMiner*, const ParsedData*);
    void       (*report)(struct DataMiner*, const Result*);
} DataMiner;

void data_miner_mine(DataMiner* m, const char* path) {     // template method
    char* raw = open_file(path);
    ParsedData parsed = m->parse_data(m, raw);
    Result r = m->analyze(m, &parsed);
    m->report(m, &r);
    close_file();
}
```

## 트레이드오프

- **장점**: 알고리즘 골격 재사용, 변경점이 명확
- **단점**: 상속 강제 (composition + Strategy가 더 유연), Liskov 위험
