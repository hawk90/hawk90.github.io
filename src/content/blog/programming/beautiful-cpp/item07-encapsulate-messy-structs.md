---
title: "항목 7: 지저분한 구조체는 코드에 펼쳐놓지 말고 캡슐화하라"
date: 2026-05-10T10:00:00
description: "외부 C API의 거친 자원 관리를 RAII 래퍼로 한 곳에 가두는 법"
tags: [C++, RAII, Encapsulation]
series: "Beautiful C++"
seriesOrder: 7
draft: true
---


## 핵심 내용

- 외부 라이브러리·OS API가 노출하는 C 스타일 구조체는 종종 **수동 초기화·해제**가 필요하다
- 이런 코드를 호출 지점마다 흩뿌리면 누락·중복·이중 해제로 이어진다
- 얇은 RAII 래퍼 클래스에 한 번만 가두면 호출부는 깔끔해지고 자원 안전성이 자동으로 따라온다

## 예제 코드

```cpp
// Bad: 지저분한 C API가 호출부에 노출됨
sqlite3* db = nullptr;
if (sqlite3_open("data.db", &db) != SQLITE_OK) {
    sqlite3_close(db);  // 실수로 빠뜨리기 쉬움
    return;
}
// ... 사용 ...
sqlite3_close(db);

// Good: 한 곳에서만 캡슐화
class Database {
    sqlite3* db_ = nullptr;
public:
    explicit Database(const char* path) {
        if (sqlite3_open(path, &db_) != SQLITE_OK)
            throw std::runtime_error(sqlite3_errmsg(db_));
    }
    ~Database() { if (db_) sqlite3_close(db_); }

    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;

    sqlite3* handle() const { return db_; }
};
```

## 정리

지저분함은 **한 군데에 가두는 게 핵심**이다. 외부의 거친 API를 RAII 래퍼로 한 번 감싸면 나머지 코드는 평온해진다.
