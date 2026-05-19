---
title: "Ch 5: 클래스, RAII, virtual, Rule of Five"
date: 2026-05-18T06:00:00
description: "특수 멤버 함수 일관(A12), Rule of Five/Zero, virtual destructor, override/final, 다중 상속 정책."
tags: [autosar, cpp, class, raii, virtual, rule-of-five, inheritance]
series: "AUTOSAR C++14"
seriesOrder: 5
draft: false
---

C++의 클래스는 *RAII*(Resource Acquisition Is Initialization)를 통해 *자원 관리의 자동화*를 가능하게 한다. 동시에 *복사·이동·상속*이 얽히면 *미묘한 함정*이 생긴다. 이 장은 그 둘을 본다.

## A10 — Inheritance

### A10-1-1 — 상속은 *가상 함수만 다형*

```c++
// 회피 — 다중 비-virtual 상속
class A { public: int Method(); };
class B { public: int Method(); };
class C : public A, public B { /* ... */ };
// c.Method() — 어느 쪽? 컴파일 에러.

// Good — 인터페이스 상속만 다중
class IReadable { public: virtual int Read() = 0; virtual ~IReadable() = default; };
class IWritable { public: virtual int Write() = 0; virtual ~IWritable() = default; };
class File : public IReadable, public IWritable { /* ... */ };
```

다중 상속은 *순수 인터페이스(abstract)* 사이만 허용. *데이터 멤버를 가진 클래스의 다중 상속* 회피.

### A10-2-1 — Non-virtual public function은 *재정의 금지*

```c++
// 위반
class Base { public: void Foo(); };
class Derived : public Base { public: void Foo(); };   // hiding, not override
```

비-virtual 함수를 derived에서 같은 이름으로 정의하면 *override가 아니라 hiding*. base 포인터로 호출 시 base 버전이 호출되어 *의도와 다름*.

### A10-3-1 — Virtual 함수의 override는 *명시*

```c++
class Base {
public:
    virtual void Foo();
    virtual ~Base() = default;
};

// 위반 — override 누락
class Derived : public Base {
public:
    void Foo();             // override 없음 — 오타 시 그냥 새 함수
};

// Good
class Derived : public Base {
public:
    void Foo() override;
};

// 더 좋음 — derived에서 더 이상 override 불가
class Final : public Derived {
public:
    void Foo() override final;
};
```

`override` 키워드는 *base에 같은 시그니처가 없으면 컴파일 에러*. 오타 차단.

### A10-3-2 — Final이 *적절히 사용*

```c++
class Foo final { /* ... */ };           // 더 이상 상속 불가
class Bar { virtual void Foo() final; }; // 이 함수 더 이상 override 불가
```

*상속이 의도되지 않은* 클래스는 `final`. 인터페이스 외 모든 클래스 후보.

### A10-3-3 — Virtual destructor를 가진 클래스 외 *public 비-virtual destructor*

```c++
class Base {
public:
    virtual void Foo() = 0;
    // ~Base() 누락 — 위반
};

Base *b = new Derived();
delete b;     // Derived destructor 호출 안 됨 — 자원 누수

// Good
class Base {
public:
    virtual void Foo() = 0;
    virtual ~Base() = default;
};
```

*다형 클래스의 destructor*는 *virtual* 필수.

### A10-4-1 — Hierarchy 깊이 *3 이하* 권장

![Class inheritance depth — A→B→C OK, D too deep](/images/blog/autosar-cpp/diagrams/ch05-hierarchy-depth.svg)

깊은 상속은 *복잡도와 결합도* 증가. *composition* 또는 *interface 한정*.

## A11 — Class Member Access

### A11-0-1 — Non-POD 클래스는 *비-public 데이터 멤버*

```c++
// 위반 — public data
class Foo {
public:
    int counter;
    std::string name;
};

// Good — encapsulation
class Foo {
public:
    int counter() const;
    void setCounter(int v);
private:
    int counter_;
    std::string name_;
};
```

POD(Plain Old Data) 클래스는 *struct로 사용*하고 *all-public 멤버* OK. 그 외에는 *private + accessor*.

### A11-0-2 — `friend` 사용 *최소화*

```c++
class Foo {
    friend class Helper;          // friend는 캡슐화 우회 — 신중히
};
```

`friend`는 *encapsulation을 깬다*. 정말 *논리적으로 한 단위*일 때만 사용.

## A12 — Special Member Functions

### A12-0-1 — Rule of Five (또는 Zero)

C++의 6개 특수 멤버 함수:
- 기본 생성자
- 소멸자
- 복사 생성자
- 복사 대입
- 이동 생성자
- 이동 대입

```c++
class Foo {
public:
    Foo();                                // default
    ~Foo();                               // destructor
    Foo(const Foo &);                     // copy ctor
    Foo &operator=(const Foo &);          // copy assign
    Foo(Foo &&) noexcept;                 // move ctor
    Foo &operator=(Foo &&) noexcept;      // move assign
};
```

**Rule of Five**: 위 다섯 중 *하나라도 직접 작성*하면 *나머지도 작성*. 일관된 의미.

**Rule of Zero**: *자원을 직접 관리하지 마라* — `std::unique_ptr`, `std::vector` 등 RAII container에 위임. 그러면 *모두 default*로 충분.

```c++
// Rule of Zero
class Foo {
private:
    std::unique_ptr<Resource> res_;
    std::vector<int> data_;
    // 모든 특수 멤버 함수 default OK — 컴파일러 생성 사용
};
```

### A12-1-1 — *모든 비-static 멤버* 초기화 명시

```c++
// 위반 — name_ 초기화 누락
class Foo {
public:
    Foo() : counter_(0) {}            // name_ 안 초기화 → default 생성자 (string OK)
                                      // int 같은 POD면 미초기화
private:
    int counter_;
    std::string name_;
};

// Good — 모든 멤버 명시
class Foo {
public:
    Foo() : counter_{0}, name_{} {}
private:
    int counter_;
    std::string name_;
};

// 또는 in-class member initializer
class Foo {
private:
    int counter_ = 0;
    std::string name_;            // default ctor — empty string
};
```

C++11의 *in-class member initializer*가 가장 깔끔.

### A12-1-2 — Constructor 안에서 *virtual 함수 호출 금지*

```c++
// 위반
class Base {
public:
    Base() { Init(); }                // 위반 — virtual call in ctor
    virtual void Init();
};

class Derived : public Base {
public:
    void Init() override;             // Base ctor에서 호출되지 않음 — base의 Init만
};
```

생성자 안의 virtual call은 *base 버전만* 호출됨(derived는 아직 생성되지 않음). 의도와 다름.

### A12-1-5 — Common initialization 패턴은 *delegated constructor*

```c++
class Foo {
public:
    Foo() : Foo(0, "") {}             // delegate
    Foo(int n) : Foo(n, "") {}        // delegate
    Foo(int n, std::string s) : counter_(n), name_(std::move(s)) {}   // 본 ctor
private:
    int counter_;
    std::string name_;
};
```

C++11의 *delegating constructor*로 중복 제거.

### A12-4-1 — Polymorphic class의 destructor는 *virtual* 또는 *protected non-virtual*

```c++
// Good — public virtual
class Base {
public:
    virtual ~Base() = default;
};

// 또는 derived 만이 base를 통해 destroy하는 경우
class Base {
protected:
    ~Base() = default;          // protected — derived만 호출 가능
};
```

### A12-4-2 — *Polymorphic class*는 *clone을 통해 복사*

```c++
class Base {
public:
    virtual std::unique_ptr<Base> Clone() const = 0;
    virtual ~Base() = default;
};

class Derived : public Base {
public:
    std::unique_ptr<Base> Clone() const override {
        return std::make_unique<Derived>(*this);
    }
};
```

Base 객체를 *value로 복사*하면 *slicing* — derived 부분 잘림. Clone 패턴으로 *정확한 타입 복제*.

### A12-7-1 — `default`, `delete`로 *명시*

```c++
class Foo {
public:
    Foo() = default;                  // 명시적 default
    Foo(const Foo &) = delete;        // 명시적 삭제 (copy 금지)
    Foo &operator=(const Foo &) = delete;
    Foo(Foo &&) = default;
    Foo &operator=(Foo &&) = default;
    ~Foo() = default;
};
```

`= default` / `= delete`는 *의도를 명시*. 컴파일러 자동 생성보다 *명확*.

### A12-8-1 — *Self-assignment 안전*

```c++
Foo &Foo::operator=(const Foo &rhs) {
    // 위반 — self-assignment에서 자원 해제 후 자기 자신 복사
    delete data_;
    data_ = new int[rhs.size_];
    memcpy(data_, rhs.data_, rhs.size_);

    return *this;
}

// Good — copy-and-swap
Foo &Foo::operator=(Foo rhs) {        // value로 받음 — copy or move
    swap(*this, rhs);                  // self-assign이면 무해
    return *this;
}
```

## RAII 패턴

```c++
class FileHandle {
public:
    explicit FileHandle(const std::string &path)
        : fp_(std::fopen(path.c_str(), "r")) {
        if (!fp_) throw std::runtime_error("open failed");
    }

    ~FileHandle() noexcept {
        if (fp_) std::fclose(fp_);
    }

    // 복사 금지
    FileHandle(const FileHandle &) = delete;
    FileHandle &operator=(const FileHandle &) = delete;

    // 이동 OK
    FileHandle(FileHandle &&other) noexcept : fp_(other.fp_) {
        other.fp_ = nullptr;
    }
    FileHandle &operator=(FileHandle &&other) noexcept {
        if (this != &other) {
            if (fp_) std::fclose(fp_);
            fp_ = other.fp_;
            other.fp_ = nullptr;
        }
        return *this;
    }

private:
    std::FILE *fp_;
};
```

이 패턴 하나가 *C의 goto cleanup, deviation, 누수* 모두 해결한다. AUTOSAR C++의 *핵심 가치*.

## 정리

- 다중 상속은 *순수 인터페이스끼리만*.
- Override는 `override` 명시. final로 *더 이상 상속 금지*.
- Virtual destructor — *다형 클래스 필수*.
- Rule of Five 또는 Rule of Zero — *일관성*.
- Constructor 안 virtual 호출 금지.
- Polymorphic 객체 복사는 *Clone 패턴*.
- RAII가 *자원 관리의 정답*.

## 다음 장 예고

6장은 템플릿. 제네릭 프로그래밍, SFINAE, type traits, template 함정.

## 관련 항목

- [Ch 4 — Functions, Lambdas](/blog/embedded/automotive/autosar-cpp/chapter04-functions-lambdas)
- [Ch 6 — Templates](/blog/embedded/automotive/autosar-cpp/chapter06-templates)
