---
title: "Ch 2: Managing threads"
date: 2026-05-06T02:00:00
description: "std::thread 라이프사이클, join/detach, 인자 전달, 소유권 이전, 스레드 수 결정, 스레드 식별."
tags: [C++, Concurrency, std::thread, thread_guard, scoped_thread]
series: "C++ Concurrency in Action"
seriesOrder: 2
draft: false
---

스레드는 생성되고, 작업을 수행하고, 종료된다. 이 장에서는 스레드의 생애 주기를 관리하는 방법을 다룬다. `join`과 `detach`의 선택, 예외 안전성을 위한 RAII 가드, 인자 전달의 함정, `std::thread`의 이동 의미론, 그리고 런타임 스레드 수 결정과 스레드 식별까지 살펴본다.

### 스레드 생성과 소유권은 *자원 관리* 문제다

스레드를 다루는 모든 문제의 출발점은 단 한 가지다. **스레드는 자원이고, 자원은 *소유자*가 있어야 하며, 소유자가 사라질 때 *정리 의무*가 따라온다.** 힙 메모리, 파일 디스크립터, 소켓, 데이터베이스 커넥션과 본질이 같다. 단지 *비싸기 때문에* 더 신중하게 다뤄야 할 뿐이다.

C++의 답은 늘 같다. **RAII(Resource Acquisition Is Initialization)**다. 객체의 생성자에서 자원을 잡고, 소멸자에서 자원을 놓는다. `std::unique_ptr`이 힙 메모리를 그렇게 다루고, `std::fstream`이 파일 디스크립터를 그렇게 다룬다. `std::thread`도 같은 가족이다. 다만 표준이 *자동 정리*를 굳이 강제하지 않은 점이 특이하다. 소유한 스레드를 정리하지 않은 채 소멸하면 `std::terminate()`로 프로그램이 즉시 죽는다. 이 단호함은 의도된 설계다.

왜 침묵 정리(silent cleanup)를 거부했는가? 두 가지 답이 가능했다.

- **소멸자가 자동 join한다.** 안전하지만 *호출자의 의도를 모른 채* 무기한 대기에 들어갈 수 있다. 함수가 빠르게 끝나야 하는데 백그라운드 스레드가 30분짜리 작업 중이면 프로그램이 멈춘다.
- **소멸자가 자동 detach한다.** 빠르지만 *살아 있는 스레드를 백그라운드로 던지는* 결과가 된다. 그 스레드가 caller의 스택 변수에 참조를 갖고 있다면 즉시 댕글링이다.

두 답 모두 *틀린 답을 조용히* 만든다. C++ 표준이 택한 것은 *세 번째 길*이다. "프로그래머가 명시적으로 결정하라. 안 하면 죽인다." 강력하지만 솔직한 계약이다. 그래서 이 장의 모든 절은 사실상 *그 결정의 다양한 형태*를 다룬다. join할 것인가, detach할 것인가, RAII 가드로 위임할 것인가, `std::jthread`로 자동화할 것인가.

## 2.1 스레드 시작

### std::thread 생성자

`std::thread`는 callable과 인자를 받는다.

```cpp
// 1. 함수 포인터
void task() { /* ... */ }
std::thread t1(task);

// 2. 함수 객체 (functor)
struct Task {
    void operator()() const { /* ... */ }
};
std::thread t2(Task{});

// 3. 람다
std::thread t3([] { /* ... */ });

// 4. 멤버 함수
struct Worker {
    void run() { /* ... */ }
};
Worker w;
std::thread t4(&Worker::run, &w);  // 첫 인자로 객체 포인터
```

### 즉시 실행

`std::thread` 생성자가 반환되면 새 스레드는 **이미 실행 중**이다.

```cpp
std::thread t([] {
    std::cout << "Running!\n";  // 즉시 실행 시작
});
// 이 시점에서 t는 이미 작업 중
t.join();
```

생성과 실행 사이에 지연이 없다. OS가 스레드를 언제 스케줄링할지는 보장되지 않지만, 생성 직후 실행 가능 상태가 된다.

### 가장 성가신 파싱 (Most Vexing Parse)

함수 객체를 전달할 때 주의해야 한다.

```cpp
struct Task {
    void operator()() const { }
};

// 💥 함수 선언으로 파싱됨!
std::thread t(Task());  // t는 함수: thread 타입 반환, 인자는 함수 포인터

// ✓ 해결법 1: 중괄호 초기화
std::thread t1{Task()};

// ✓ 해결법 2: 추가 괄호
std::thread t2((Task()));

// ✓ 해결법 3: 변수 분리
Task task;
std::thread t3(task);

// ✓ 해결법 4: 람다 (가장 명확)
std::thread t4([] { Task{}(); });
```

### thread_guard: 첫 RAII 가드 (Listing 2.3)

`std::thread`를 생성한 직후, 같은 스코프에서 반드시 처리하고 싶다면 가장 작은 가드부터 시작한다. 책 Listing 2.3의 `thread_guard`는 join이 필요한 시점이 명확할 때 쓰는 *가벼운* 보호 장치다.

```cpp
class thread_guard {
    std::thread& t_;
public:
    explicit thread_guard(std::thread& t) : t_(t) {}

    ~thread_guard() {
        if (t_.joinable()) {
            t_.join();
        }
    }

    thread_guard(const thread_guard&) = delete;
    thread_guard& operator=(const thread_guard&) = delete;
};

struct func {
    int& i_;
    func(int& i) : i_(i) {}
    void operator()() {
        for (unsigned j = 0; j < 1'000'000; ++j) {
            i_ += 1;  // i_가 살아 있다는 전제
        }
    }
};

void f() {
    int some_local_state = 0;
    func my_func(some_local_state);
    std::thread t(my_func);
    thread_guard g(t);   // 예외가 나도 g가 join을 보장한다.

    do_something_in_current_thread();
}  // g 소멸 → t.join() → 그 다음 t 소멸
```

`thread_guard`는 *참조*만 들고 있으므로 원본 `std::thread`가 살아 있어야 의미가 있다. 소유권까지 가져가서 함수 밖으로 이동시키고 싶다면 2.3절에서 보는 `scoped_thread`를 쓴다. 우선은 *같은 스코프 안에서 join을 까먹지 않는다*는 단순한 목표만 달성한다.

소멸자 안에서 `joinable()`을 한 번 더 확인하는 점이 중요하다. 사용자가 직접 `t.join()`을 호출한 뒤에 가드가 한 번 더 호출돼도 두 번 join하지 않는다. 두 번 join하면 `std::system_error`가 던져진다.

### joinable 상태

생성된 스레드는 **joinable** 상태다. 이 상태에서 소멸자가 호출되면 `std::terminate()`가 발생한다.

```cpp
void bad() {
    std::thread t(task);
    // join()도 detach()도 안 함
}  // 💥 std::terminate()
```

스레드를 `join()` 또는 `detach()`하면 non-joinable 상태가 된다.

```cpp
std::thread t(task);
std::cout << t.joinable() << "\n";  // true

t.join();  // 또는 t.detach()
std::cout << t.joinable() << "\n";  // false
```

### join: 대기

`join()`은 스레드가 완료될 때까지 호출 스레드를 블로킹한다.

```cpp
std::thread t([] {
    std::this_thread::sleep_for(std::chrono::seconds(2));
    std::cout << "Done!\n";
});

std::cout << "Waiting...\n";
t.join();  // 2초 대기
std::cout << "Thread finished.\n";
```

출력:

```text
Waiting...
Done!
Thread finished.
```

`join` 후 스레드 객체는 빈 껍데기가 된다. ID가 없고, `joinable()`이 `false`가 된다. 같은 스레드에 두 번 `join`을 호출하면 `std::system_error`가 던져진다. 그래서 가드의 소멸자도 `joinable()`로 한 번 더 검증한다.

### detach: 분리

`detach()`는 스레드를 백그라운드로 보낸다. 더 이상 `std::thread` 객체로 제어할 수 없다.

```cpp
std::thread t([] {
    std::this_thread::sleep_for(std::chrono::seconds(2));
    std::cout << "Background done!\n";
});

t.detach();  // 백그라운드로
std::cout << "Main continues.\n";
// 프로그램이 2초 안에 종료되면 "Background done!"은 출력되지 않음
```

detach된 스레드는 데몬(daemon) 스레드가 된다. 메인 함수가 종료되면 함께 종료된다. C++ 런타임은 detached 스레드의 자원을 관리하지만, 그 스레드가 *접근하는 데이터*의 수명은 여전히 작성자의 책임이다.

### join과 detach — 도서관 책 비유

두 동작의 차이는 도서관에서 *책을 다루는 두 방식*으로 보면 한 번에 잡힌다.

- **`join` — 책을 직접 반납한다.** 책을 빌린 사람이 카운터까지 가서, 직원이 검사하고 시스템에 반납 처리하는 것까지 *눈으로 확인*한 뒤 떠난다. 시간이 걸리지만, 어느 책이 어디 있는지 *언제든 알 수 있다*.
- **`detach` — 책을 반납함에 던지고 떠난다.** 도서관 문 앞 무인 반납함에 책을 넣고 곧장 나간다. 직원이 언제 처리할지 모르고, 사람은 더 이상 그 책에 대한 *관심도, 책임도, 알 권리도* 없다.

비유가 강조하는 핵심은 **반납함에 들어간 책에 다시 손댈 수 없다**는 점이다. detach한 스레드는 더 이상 `std::thread` 객체로 식별·취소·동기화할 수 없다. 그 스레드가 들고 있던 자원의 수명은 *전적으로 그 스레드 자신과 데이터 작성자의 책임*이 된다.

또 한 가지. 도서관 영업이 끝나면(=프로세스 종료) 반납함에 들어 있던 책도 어떻게 처리될지 보장이 없다. detach된 스레드는 메인 함수가 끝나면 함께 강제 종료되며, 그 시점에 작업 중이었다면 *작업이 어디서 끊어졌는지 알 수 없다*. 부분적으로 쓴 파일, 부분적으로 보낸 네트워크 패킷, 부분적으로 잠근 뮤텍스가 그대로 남는다.

### join vs detach 선택 기준

| 상황 | 선택 | 이유 |
|------|------|------|
| 결과가 필요하다 | `join` | 완료까지 대기해야 결과를 받음 |
| 작업 완료 보장이 필요하다 | `join` | 종료 전 완료 확인 |
| "fire and forget" | `detach` | 결과 상관없이 백그라운드 실행 |
| 로깅, 모니터링 | `detach` | 메인 로직과 무관하게 실행 |

대부분의 경우 `join`이 안전하다. `detach`는 리소스 누수나 댕글링 참조 위험이 있다.

### detach 위험: 댕글링 참조

```cpp
void dangerous() {
    int local = 42;
    std::thread t([&local] {  // 지역 변수 참조!
        std::this_thread::sleep_for(std::chrono::seconds(1));
        std::cout << local << "\n";  // 💥 이미 파괴됨
    });
    t.detach();
}  // local 파괴. t는 아직 실행 중!
```

detach 시 캡처는 반드시 값으로 한다. 또는 힙 할당된 객체를 `shared_ptr`로 관리한다.

```cpp
void safe() {
    auto data = std::make_shared<int>(42);
    std::thread t([data] {  // shared_ptr 복사 (reference count++)
        std::this_thread::sleep_for(std::chrono::seconds(1));
        std::cout << *data << "\n";  // ✓ 안전
    });
    t.detach();
}  // data가 파괴되어도 람다가 소유권 유지
```

### detach + 댕글링 포인터: 책의 oops 예제

책 2.1.2의 `oops` 예제는 *암시적 변환 누락*과 *detach*가 겹치는 가장 흔한 버그를 보여준다.

```cpp
struct func {
    int& i_;
    func(int& i) : i_(i) {}
    void operator()() {
        for (unsigned j = 0; j < 1'000'000; ++j) {
            do_something(i_);  // ⚠ i_가 가리키는 스택이 살아 있다는 전제
        }
    }
};

void oops() {
    int some_local_state = 0;
    func my_func(some_local_state);
    std::thread my_thread(my_func);
    my_thread.detach();
}  // 💥 some_local_state 파괴.
   //   my_func은 그 참조를 가진 채 새 스레드에서 계속 실행 중.
```

문제의 두 축은 다음과 같다.

1. `func`는 caller의 스택 변수에 *참조*로 묶여 있다.
2. `my_thread.detach()`로 caller가 빠져나가도 새 스레드는 계속 실행된다.

수정 방법은 두 가지 중 하나다.

- 함수 객체가 *값*을 갖게 만든다 (`int i_;`로 바꾸고 생성자에서 복사).
- detach 대신 `join`하거나 `thread_guard`로 함수 끝까지 살려둔다.

가능한 한 쓰레드가 *공유 데이터를 직접 참조*하지 않게 만드는 편이 가장 안전하다.

## 2.2 인자 전달

### 기본 동작: 값으로 복사

`std::thread` 생성자에 넘긴 인자는 *값으로 복사*되어 새 스레드의 내부 저장소에 보관된다. 호출자 쪽에서 함수 시그니처가 *참조*를 받는다고 해도 동일하다.

```cpp
void f(int i, std::string const& s);

void caller() {
    char buffer[] = "hello";
    std::thread t(f, 42, buffer);
    t.detach();
}
```

위 코드는 두 가지 문제를 동시에 안고 있다.

1. `buffer`는 `char*`로 decay된 다음 *새 스레드 안에서* `std::string`으로 암시적 변환된다. 그런데 caller가 일찍 끝나면 `buffer`는 이미 파괴된 후다.
2. detached 스레드 입장에서는 caller의 스택을 들여다보다가 깨진 메모리를 만난다.

### 암시적 변환이 늦게 일어난다

`std::thread` 생성자는 인자를 *원래 타입 그대로* 복사해 저장한다. 변환은 새 스레드 안에서 함수 호출 직전에 일어난다. caller가 빨리 끝나면 변환 직전에 원본이 사라진다.

```cpp
void f(std::string const& s);

void oops() {
    char buffer[20];
    std::sprintf(buffer, "%d", 42);
    std::thread t(f, buffer);  // buffer를 char*로 복사
    t.detach();
}  // buffer 파괴. 새 스레드는 아직 std::string으로 변환하지 않았을 수 있다.
```

해결책은 caller 쪽에서 *먼저* 변환을 강제하는 것이다.

```cpp
void safe() {
    char buffer[20];
    std::sprintf(buffer, "%d", 42);
    std::thread t(f, std::string(buffer));  // 여기서 string 변환 완료
    t.detach();
}
```

`std::string(buffer)`를 명시적으로 생성하면 *caller의 스택 프레임이 살아 있는 동안* 변환이 끝난다. 새 스레드는 이미 완성된 `std::string`을 받아 보관한다.

### 참조로 받고 싶을 때: std::ref

기본 동작이 값 복사이므로, 진짜 *공유*하고 싶다면 `std::ref`로 감싸야 한다.

```cpp
void update(widget_data& data);

void caller() {
    widget_data data;
    std::thread t(update, std::ref(data));  // 참조로 전달
    t.join();
    // data가 update에 의해 변경된 상태
}
```

`std::ref` 없이 `std::thread t(update, data)`로 호출하면 컴파일 자체가 실패한다. 내부적으로 보관된 *복사본*에 lvalue reference를 바인딩할 수 없기 때문이다. 이 컴파일 에러는 일종의 안전 장치다. 참조를 원했다면 명시적으로 표시하라는 의미다.

### 멤버 함수 전달

멤버 함수를 스레드 함수로 쓰려면 첫 인자로 *객체*(또는 포인터)를 넘긴다.

```cpp
class X {
public:
    void do_work();
    void do_work_with(int param);
};

X my_x;
std::thread t1(&X::do_work, &my_x);            // (my_x.*do_work)()
std::thread t2(&X::do_work_with, &my_x, 42);   // (my_x.*do_work_with)(42)
```

`std::invoke`와 동일한 규칙을 따른다. 객체 자체를 *값으로* 넘기면 내부 복사본의 멤버 함수가 호출된다는 점에 주의한다. 원본을 수정하고 싶다면 포인터 또는 `std::ref`를 쓴다.

### move-only 인자

`std::unique_ptr` 같은 move-only 타입은 `std::move`로 명시 전달한다.

```cpp
void process(std::unique_ptr<big_object> p);

void caller() {
    std::unique_ptr<big_object> p(new big_object);
    p->prepare();
    std::thread t(process, std::move(p));  // 소유권 이전
    t.join();
}
```

`std::thread` 내부 저장소는 이동 가능한 타입을 정확히 처리한다. `std::move` 없이 그냥 넘기면 unique_ptr이 복사 불가이므로 컴파일 에러가 발생한다.

## 2.3 소유권 이전 (transferring ownership)

### move-only 자원으로서의 std::thread

`std::thread`는 운영 체제의 실행 자원을 *유일하게* 소유한다. 두 `std::thread` 객체가 같은 OS 스레드를 가리키지 못한다. 이 의미론은 `std::unique_ptr`과 똑같다. 둘 다 RAII로 자원을 소유하고, 둘 다 복사가 금지되며, 둘 다 `std::move`로만 이전할 수 있다.

비유로 말하면 `std::thread`는 *집 열쇠 한 벌*과 같다. 집은 OS 스레드, 열쇠는 `std::thread` 객체다. 열쇠는 한 사람이 한 번에 한 벌만 가질 수 있고, 다른 사람에게 *건네줄(이동)* 수는 있지만 *복제(복사)*할 수는 없다. 빈 열쇠고리(`joinable() == false`)에 키를 끼우는 것은 자유다. 그러나 이미 키가 끼워진 열쇠고리에 새 키를 *대충 덮어쓰면* 기존 키가 행방불명된다. 그래서 `std::thread`의 이동 대입은 *기존 키를 자동으로 회수하지 않고* 그냥 죽인다(`std::terminate()`).

`std::unique_ptr`이 *기존 자원을 자동으로 delete*해 주는 것과 *대조적*이라는 점이 핵심이다.

```cpp
std::unique_ptr<int> p(new int(1));
p = std::make_unique<int>(2);   // OK. 1은 자동 delete.

std::thread t(work);
t = std::thread(other_work);    // 💥 t가 joinable이면 std::terminate.
```

이유는 *비용의 차이*다. 메모리 한 블록을 자동으로 해제하는 것은 거의 공짜다. 그러나 *살아 있는 OS 스레드를 자동으로 join하는* 것은 임의의 시간 동안 멈출 수 있고, 자동 detach는 더 위험하다. C++ 표준은 "사용자가 명시하지 않으면 알아서 처리하지 않는다"는 원칙을 택했다.

| 측면 | `std::unique_ptr<T>` | `std::thread` |
|------|----------------------|---------------|
| 자원 | 힙에 할당된 `T` | 실행 중인 OS 스레드 |
| 복사 | 금지 | 금지 |
| 이동 | 허용 | 허용 |
| 비어 있음 | `nullptr` | `joinable() == false` |
| 누수 시 | 메모리 누수 | `std::terminate()` |
| 명시 해제 | `reset()` | `join()` / `detach()` |

이 유사성을 머리에 두면 다음 코드의 의미가 즉시 명확해진다.

```cpp
void some_function();
void some_other_function();

std::thread t1(some_function);          // t1이 자원을 소유
std::thread t2 = std::move(t1);         // 이전. t1은 비어 있음.
t1 = std::thread(some_other_function);  // 임시(rvalue) → t1으로 이동
std::thread t3;                         // 기본 생성. 비어 있음.
t3 = std::move(t2);                     // t2 → t3. t2 비어 있음.
t1 = std::move(t3);                     // 💥 t1은 이미 joinable.
                                        //   대입 직전 std::terminate().
```

마지막 줄이 책의 핵심 경고다. 이동 대입 연산자는 *기존에 소유하던 스레드를 자동으로 join하지 않는다*. 이미 joinable인 객체에 새 스레드를 대입하면 `std::terminate()`가 호출된다. unique_ptr이 이미 가진 포인터를 자동 delete해주는 것과 *대조적*이다. 스레드는 너무 비싼 자원이라 silent join은 위험하다고 본 선택이다.

따라서 새 스레드를 대입하기 전에는 반드시 비어 있는 상태로 만든다.

```cpp
if (t1.joinable()) {
    t1.join();         // 또는 detach
}
t1 = std::move(t3);    // 이제 안전
```

### 함수에서 std::thread 반환

이동 의미론 덕분에 팩토리 함수로 스레드를 반환할 수 있다.

```cpp
std::thread make_worker() {
    return std::thread(worker_loop);   // rvalue → 이동 반환
}

std::thread make_worker_from_state(some_state s) {
    std::thread t(worker_loop, std::move(s));
    return t;                          // NRVO 또는 implicit move
}

void caller() {
    std::thread t = make_worker();
    t.join();
}
```

### 함수 인자로 std::thread 받기

소유권을 함수 *안으로* 전달할 때는 by-value 매개변수로 받는다. unique_ptr 받는 패턴과 동일하다.

```cpp
void consume(std::thread t) {
    t.join();
}

void caller() {
    consume(std::thread(worker));            // 직접 임시
    std::thread t(worker);
    consume(std::move(t));                   // 명시 이동
}
```

### scoped_thread: 소유권을 가진 가드 (Listing 2.6)

`thread_guard`는 참조만 들고 있어서 *같은 스코프*에서만 안전했다. 책 Listing 2.6의 `scoped_thread`는 한 단계 더 나간다. 생성자에서 `std::thread`를 *이동*으로 받아 소유권을 가져온다. 따라서 컨테이너에 넣거나 함수 사이로 옮길 수 있다.

```cpp
class scoped_thread {
    std::thread t_;
public:
    explicit scoped_thread(std::thread t) : t_(std::move(t)) {
        if (!t_.joinable()) {
            throw std::logic_error("No thread");
        }
    }

    ~scoped_thread() {
        t_.join();
    }

    scoped_thread(scoped_thread&&) = default;
    scoped_thread& operator=(scoped_thread&&) = default;

    scoped_thread(const scoped_thread&) = delete;
    scoped_thread& operator=(const scoped_thread&) = delete;
};

void f() {
    int some_local_state = 0;
    scoped_thread t{std::thread(func(some_local_state))};
    do_something_in_current_thread();
}  // t 소멸 → join
```

핵심 차이는 두 가지다.

1. 생성자에서 joinable을 *강제* 검증한다. 비어 있는 스레드를 가드로 감싸는 실수를 컴파일 직후 런타임에 발견한다.
2. 소멸자에서 별도의 `joinable()` 체크가 없다. 클래스 불변식(생성 시점에 joinable이었다)이 이를 보장한다. 단, `scoped_thread`를 이동시키면 *소스* 객체는 비어 있게 되므로 이동 이후의 소멸자가 비어 있는 스레드를 join하려 들지 않도록 멤버 `std::thread`의 기본 이동 의미론에 맡긴다. `std::thread`의 이동된-from 상태는 빈 상태이고, 빈 상태에 join을 호출하면 던진다. 책의 원본 Listing 2.6은 이동 연산자를 명시하지 않고 자동 생성을 받는데, 보수적으로 이동 후 소멸자에서 `joinable()`을 한 번 더 확인하는 변형을 두는 코드베이스도 많다.

### 컨테이너에 스레드 모으기

이동 가능 덕분에 `std::vector<std::thread>`가 자연스럽게 동작한다. 책 Listing 2.7의 패턴이다.

```cpp
void do_work(unsigned id);

void f() {
    std::vector<std::thread> threads;
    for (unsigned i = 0; i < 20; ++i) {
        threads.emplace_back(do_work, i);
    }
    for (auto& entry : threads) {
        entry.join();
    }
}
```

`push_back(std::thread(do_work, i))`로도 동작하지만 `emplace_back`은 임시 생성을 *제자리*에서 한다. 둘 다 *복사 없이* 이동만 일어난다.

`std::vector<scoped_thread>`로 더 안전하게 만들 수도 있다. 벡터가 파괴되면 모든 가드가 join을 보장한다.

### 예외 안전성과 join: 가드 패턴 다시 보기

스레드를 시작한 함수에서 예외가 발생하면 `t.join()` 호출 줄이 실행되지 않을 수 있다. 그 상태로 함수가 종료되면 joinable 객체의 소멸자가 호출되어 `std::terminate()`로 가는 길이 열린다.

```cpp
void work(int x);

void risky() {
    std::thread t(work, 42);
    process();   // 💥 예외 발생!
    t.join();    // 도달 못함.
}                // t 소멸자 → std::terminate()
```

가장 단순한 보강은 `try`/`catch`로 양쪽 경로에서 모두 join하는 것이다.

```cpp
void safer() {
    std::thread t(work, 42);
    try {
        process();
    } catch (...) {
        t.join();
        throw;
    }
    t.join();
}
```

그러나 코드가 지저분하고, 여러 `std::thread`가 함수 안에 공존하면 더 복잡해진다. 이 패턴을 RAII로 묶은 것이 2.1의 `thread_guard`이고, 소유권까지 가져가는 변형이 2.3의 `scoped_thread`다. 가드를 도입한 함수는 정상 경로와 예외 경로의 정리 코드가 완전히 동일해진다.

## 2.4 런타임 스레드 수 결정

### hardware_concurrency

하드웨어가 지원하는 동시 스레드 수를 반환한다.

```cpp
unsigned int n = std::thread::hardware_concurrency();
std::cout << "Cores: " << n << "\n";  // 예: 8
```

이 값은 *힌트*다. 표준은 정확한 코어 수를 약속하지 않는다. 하이퍼스레딩이 있는 머신에서는 논리 코어 수, 컨테이너 환경에서는 사용 가능한 물리 코어 수, 가상화 환경에서는 vCPU 수가 보고되는 식으로 운영 환경마다 다르다.

### 0이 반환되는 경우

`hardware_concurrency()`가 **0을 반환할 수 있다**. 표준이 명시한 가능성이다. 시스템이 정보를 제공하지 못하는 환경(예: 일부 임베디드 RTOS, 매우 오래된 libstdc++ 이식)에서 발생한다.

```cpp
unsigned int num_threads = std::thread::hardware_concurrency();
if (num_threads == 0) {
    num_threads = 2;   // 보수적인 기본값
}
```

0을 그대로 두면 이후의 나눗셈에서 `division by zero`가 터지거나, 스레드를 *하나도 만들지 않은 채* 작업이 사라지는 조용한 실패가 발생한다. 코드 첫 줄에서 *항상* 기본값으로 대체한다.

### 작업 분할

`std::accumulate`를 병렬로 만드는 책 Listing 2.8의 패턴이다.

```cpp
template<typename Iterator, typename T>
T parallel_accumulate(Iterator first, Iterator last, T init) {
    unsigned long const length = std::distance(first, last);
    if (!length) return init;

    unsigned long const min_per_thread = 25;
    unsigned long const max_threads =
        (length + min_per_thread - 1) / min_per_thread;

    unsigned long const hardware = std::thread::hardware_concurrency();
    unsigned long const hw_threads = hardware ? hardware : 2;

    unsigned long const num_threads = std::min(hw_threads, max_threads);
    unsigned long const block_size = length / num_threads;

    std::vector<T> results(num_threads);
    std::vector<std::thread> threads(num_threads - 1);

    Iterator block_start = first;
    for (unsigned long i = 0; i < (num_threads - 1); ++i) {
        Iterator block_end = block_start;
        std::advance(block_end, block_size);
        threads[i] = std::thread(
            accumulate_block<Iterator, T>(),
            block_start, block_end, std::ref(results[i]));
        block_start = block_end;
    }
    accumulate_block<Iterator, T>()(block_start, last, results[num_threads - 1]);

    for (auto& t : threads) t.join();
    return std::accumulate(results.begin(), results.end(), init);
}
```

핵심은 다음 두 가지다.

1. 너무 적은 데이터에 너무 많은 스레드를 만들지 않도록 `min_per_thread`로 상한을 둔다.
2. `hardware_concurrency()`가 0이면 안전 기본값으로 갈아 끼운다.

### 과다 구독(oversubscription)의 비용

스레드 수가 *물리 코어 수*를 크게 넘어가면 다음 비용이 누적된다.

| 비용 | 대략적 크기 | 영향 |
|------|------------|------|
| 스택 메모리 | 1~8 MB / 스레드 | 가상 메모리·페이지 테이블 압박 |
| 생성 시간 | 수십 μs ~ 수 ms | 짧은 작업에서 *오버헤드 > 작업 자체* |
| 컨텍스트 스위칭 | 수 μs / 회 | TLB·캐시 무효화 |
| 캐시 오염 | 측정 어려움 | 워킹 셋이 L1/L2를 못 채움 |
| OS 스케줄러 큐 | O(N) | 큐 관리 비용 증가 |

특히 캐시 오염이 자주 간과된다. 4코어 머신에 32개의 스레드를 띄우면 각 스레드의 활성 시간이 1/8로 쪼개진다. 그 사이 캐시가 다른 스레드의 데이터로 덮여, 깨어났을 때 L1 미스부터 시작한다. 결과적으로 동시성을 늘려서 *느려지는* 역설이 발생한다.

### CPU 바운드 vs I/O 바운드

이상적인 스레드 수는 워크로드 성격에 따라 다르다.

- **CPU 바운드** (수치 계산, 압축, 암호화): `hardware_concurrency()`와 같거나 1~2개 적게. 컨텍스트 스위칭 자체가 손해다.
- **I/O 바운드** (파일·소켓·DB 대기): `hardware_concurrency()`의 수 배까지 늘려도 도움이 된다. 스레드 대부분이 블로킹 상태이므로 코어를 점유하지 않는다.
- **혼합형**: 일반적으로 `hardware_concurrency() + (대기 비율 추정치)` 정도가 출발점이다.

정확한 수는 *프로파일링으로* 결정한다. 책의 다음 장들과 17~18장에서 스레드 풀과 작업 단위 분할을 다룬다.

## 2.5 스레드 식별

### std::thread::id 얻기

스레드를 식별하는 표준 타입은 `std::thread::id`다. 두 가지 경로로 얻는다.

```cpp
std::thread::id main_id = std::this_thread::get_id();   // 현재 스레드

std::thread t([] { /* ... */ });
std::thread::id worker_id = t.get_id();                 // 다른 스레드
```

`std::thread::get_id()`는 빈 스레드 객체에 대해 *기본 생성된* `std::thread::id`를 돌려준다. 이 값은 "스레드 없음"을 의미하며, 어떤 활성 스레드의 id와도 같지 않다.

```cpp
std::thread empty;
std::thread::id no_thread = empty.get_id();
assert(no_thread == std::thread::id{});  // 기본 생성된 id와 동일
```

### 비교 연산: 전순서(total order)

`std::thread::id`는 `operator==`, `operator!=`뿐 아니라 `<`, `<=`, `>`, `>=` 모두 지원한다. 표준은 활성 스레드 id 집합에 *전순서*가 존재한다고 보장한다. 정렬 가능한 키로 쓸 수 있다는 뜻이다.

```cpp
std::thread::id a = std::this_thread::get_id();
std::thread::id b = some_thread.get_id();

if (a == b) std::cout << "same\n";
if (a < b)  std::cout << "a precedes b\n";  // 정렬 가능
```

이 순서는 *임의*다. 스레드 우선순위나 생성 순서를 의미하지 않는다. 단지 *일관된* 순서일 뿐이다. 같은 프로그램 실행 안에서 두 id의 대소 관계는 안정적이다.

전순서가 있다는 사실 덕분에 `std::map<std::thread::id, ...>`가 자연스럽게 동작한다.

```cpp
std::map<std::thread::id, std::string> thread_names;
thread_names[std::this_thread::get_id()] = "main";
```

### 해시 가능: unordered_map의 키

`std::hash`는 `std::thread::id`에 대해 특수화되어 있다. 따라서 해시 컨테이너의 키로 직접 쓸 수 있다.

```cpp
#include <unordered_map>
#include <thread>

std::unordered_map<std::thread::id, ThreadStats> stats;

void worker() {
    auto id = std::this_thread::get_id();
    stats[id].iterations++;   // 자기 슬롯만 갱신
}
```

`std::map`보다 `std::unordered_map`이 빠른 경우가 많다. 로깅·프로파일링처럼 *수많은 스레드*가 자기 슬롯을 빈번히 갱신할 때 평균 O(1) 검색이 큰 차이를 만든다.

다만 `std::unordered_map`은 *스레드 안전하지 않다*. 여러 스레드가 동시에 쓰려면 다음 중 하나가 필요하다.

- 한 스레드 전용 슬롯에만 접근하도록 *외부 동기화* 없이 설계하기.
- `std::mutex`로 보호하기.
- `concurrent_hash_map`(TBB) 같은 락프리 컨테이너.

### id를 식별·디스패치에 활용

대표적인 패턴은 *마스터 스레드*만 특별한 일을 수행하는 것이다.

```cpp
std::thread::id master_id;

void some_core_part_of_algorithm() {
    if (std::this_thread::get_id() == master_id) {
        do_master_thread_work();   // 마스터만 수행
    }
    do_common_work();              // 모두 수행
}
```

또는 디버깅·로깅에 ID를 함께 찍어 어떤 스레드가 어떤 출력을 냈는지 추적한다.

```cpp
std::cout << "[tid=" << std::this_thread::get_id() << "] enter critical\n";
```

`<<` 연산자는 표준이 제공한다. 구현은 *읽을 수 있는 표현*을 출력할 의무만 지고, 정확한 포맷(예: 정수/16진수)은 구현 정의다. 같은 id를 두 번 출력하면 같은 문자열이 나오는 것만 보장된다.

### 사용 후 id 재사용 가능성

`std::thread::id`는 스레드가 종료된 후 *재사용*될 수 있다. OS는 종료된 스레드의 핸들/번호를 새 스레드에 부여할 수 있고, C++ 구현은 그 표현을 그대로 id로 노출하기도 한다. 따라서 다음 두 규칙을 지킨다.

1. *오랜 시간* id를 보관하지 않는다. 종료된 스레드의 id가 다른 스레드의 id와 우연히 같아질 수 있다.
2. 키로 쓸 때는 *살아 있는 동안만* 사용한다. 스레드 종료 시점에 컨테이너에서 제거하는 정책이 안전하다.

## 2.6 네이티브 핸들

### native_handle

플랫폼별 기능이 필요하면 네이티브 핸들을 사용한다.

```cpp
std::thread t(work);

#ifdef __linux__
pthread_t handle = t.native_handle();
// POSIX 스레드 API 사용
pthread_setname_np(handle, "worker");
#endif

t.join();
```

이식성을 포기하는 대신 플랫폼별 고급 기능(우선순위, CPU 친밀성 등)을 사용할 수 있다.

## 부록: std::jthread (C++20)

이 절은 책 2판이 다루는 *경계* 너머의 C++20 추가 기능을 짧게 정리한다. `scoped_thread`의 자동 join이 *표준 자체*에 포함된 형태가 `std::jthread`다. 새 코드를 작성한다면 우선 검토 대상으로 둔다.

### 자동 join

```cpp
void demo() {
    std::jthread t([] {
        std::cout << "Working...\n";
    });
    // join() 호출 불필요
}  // 자동 join
```

### 협력적 취소: stop_token

`std::jthread`의 핵심 기능은 협력적 취소(cooperative cancellation)다.

```cpp
#include <thread>
#include <stop_token>

void cancelable_work(std::stop_token stop) {
    while (!stop.stop_requested()) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    std::cout << "Cancelled!\n";
}

int main() {
    std::jthread t(cancelable_work);
    std::this_thread::sleep_for(std::chrono::seconds(1));
    t.request_stop();
}
```

첫 번째 매개변수가 `std::stop_token`이면 자동으로 전달된다.

### stop_callback

취소 시 콜백을 등록할 수도 있다.

```cpp
void with_callback(std::stop_token stop) {
    std::stop_callback cb(stop, [] {
        std::cout << "Cleanup on cancel!\n";
    });
    while (!stop.stop_requested()) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
}
```

### get_stop_source / get_stop_token

```cpp
std::jthread t(some_work);

std::stop_source source = t.get_stop_source();
std::stop_token token   = t.get_stop_token();

source.request_stop();              // == t.request_stop()
bool requested = token.stop_requested();
```

## 부록: C11 스레드 관리

C11은 `<threads.h>`에서 스레드 관리 기능을 제공한다. 책의 직접 범위는 아니지만, C/C++ 혼용 코드에서 만나면 매핑을 알아두면 도움이 된다.

### C11 스레드 생성

```c
#include <stdio.h>
#include <threads.h>

int task(void* arg) {
    int* value = (int*)arg;
    printf("Thread received: %d\n", *value);
    return *value * 2;  // 반환값
}

int main(void) {
    thrd_t t;
    int arg = 21;

    if (thrd_create(&t, task, &arg) != thrd_success) {
        return 1;
    }

    int result;
    thrd_join(t, &result);
    printf("Thread returned: %d\n", result);  // 42

    return 0;
}
```

### C11 vs C++11 스레드 관리 비교

| 기능 | C11 | C++11 |
|------|-----|-------|
| 생성 | `thrd_create(&t, func, arg)` | `std::thread t(func, args...)` |
| join | `thrd_join(t, &result)` | `t.join()` |
| detach | `thrd_detach(t)` | `t.detach()` |
| 현재 스레드 ID | `thrd_current()` | `std::this_thread::get_id()` |
| 양보 | `thrd_yield()` | `std::this_thread::yield()` |
| sleep | `thrd_sleep(&ts, NULL)` | `std::this_thread::sleep_for()` |
| 종료 | `thrd_exit(result)` | `return` 또는 예외 |

### C11 스레드 분리와 sleep

```c
#include <threads.h>
#include <time.h>

int background_task(void* arg) {
    (void)arg;
    return 0;
}

void demo(void) {
    thrd_t t;
    thrd_create(&t, background_task, NULL);
    thrd_detach(t);

    struct timespec duration = { .tv_sec = 0, .tv_nsec = 500000000 };
    thrd_sleep(&duration, NULL);
}
```

### C11 스레드 로컬 저장소

```c
#include <threads.h>

thread_local int tls_var = 0;  // C11 keyword

tss_t key;

void destructor(void* data) { free(data); }

int worker(void* arg) {
    (void)arg;
    int* data = malloc(sizeof(int));
    *data = 42;
    tss_set(key, data);

    int* retrieved = tss_get(key);
    printf("TSS value: %d\n", *retrieved);
    return 0;
}
```

C11 `thrd_join`은 반환값을 받지만 C++ `std::thread::join()`은 받지 않는다. C++에서 결과를 받으려면 `std::future`를 쓴다. 4장에서 다룬다.

## 시스템 사례 — 다른 스레드 라이브러리는 어떻게 설계했는가

`std::thread`가 어떤 결정을 내렸는지는 *다른 라이브러리의 결정*과 비교하면 선명해진다. 세 가지 비교 대상을 본다. C++ 표준이 등장하기 전에 사실상의 표준이었던 Boost.Thread, GUI 프레임워크의 대표 사례인 Qt QThread, 그리고 같은 C++ 표준 안에서 더 높은 수준의 추상을 제공하는 `std::async`다.

### Boost.Thread — std::thread의 직계 조상

C++11 이전, *이식 가능한 스레드*가 필요한 모든 프로젝트는 Boost.Thread를 썼다. 인터페이스는 거의 `std::thread`와 같다.

```cpp
#include <boost/thread.hpp>

void worker() { /* ... */ }

boost::thread t(worker);
t.join();
```

C++11이 표준화하면서 Boost.Thread의 설계가 거의 그대로 표준에 들어왔다. 차이는 *오히려 Boost가 더 풍부*하다는 점이다.

| 기능 | `std::thread` (C++17) | Boost.Thread |
|------|----------------------|---------------|
| 기본 생성·이동 | 동일 | 동일 |
| `interrupt()` (협력적 인터럽트) | 없음 | 있음 (`boost::this_thread::interruption_point()`) |
| `boost::thread_group` | 없음 | 있음 (스레드 묶음 관리) |
| 시간 제한 잠금 | C++14 `timed_mutex` | 있음 |
| `shared_mutex` | C++17 | 있음 (먼저 도입) |

C++20의 `std::jthread` + `std::stop_token`은 사실 Boost의 `interrupt()` 메커니즘을 표준 형태로 다듬은 것이다. 새 코드는 표준을 우선하되, Boost 환경에서는 *표준이 아직 갖지 못한* 도구가 있다는 점은 알아두면 좋다.

### Qt QThread — GUI 시그널·슬롯과의 통합

Qt 프레임워크의 `QThread`는 *목적이 다르다*. 단순한 OS 스레드 래퍼가 아니라 *Qt 객체 시스템과 통합된* 스레드 추상이다.

```cpp
#include <QThread>
#include <QObject>

class Worker : public QObject {
    Q_OBJECT
public slots:
    void doWork() {
        // 이 슬롯은 Worker가 *moveToThread*된 스레드의 컨텍스트에서 실행됨
    }
signals:
    void finished();
};

QThread thread;
Worker* worker = new Worker;
worker->moveToThread(&thread);
QObject::connect(&thread, &QThread::started, worker, &Worker::doWork);
QObject::connect(worker, &Worker::finished, &thread, &QThread::quit);
thread.start();
```

핵심은 **객체의 *thread affinity***다. Qt의 모든 `QObject`는 *자신이 속한 스레드*를 알고, 시그널·슬롯 호출은 자동으로 *올바른 스레드의 이벤트 루프로 디스패치*된다. GUI 객체는 메인 스레드에서만 만들고 다뤄야 한다는 Qt의 규칙이 이 위에 서 있다.

`std::thread`에는 이런 *프레임워크 통합*이 없다. 같은 일을 하려면 `std::condition_variable`로 큐를 만들고, 메인 스레드에서 명시적으로 디스패치해야 한다. Qt가 그것을 자동화한 대가로 *Qt 의존성*이 따라붙는 셈이다.

### std::async vs std::thread — 결과 받기와 자동 join

같은 C++ 표준 안에서도 `std::async`는 `std::thread`보다 *한 단계 높은* 추상이다.

```cpp
#include <future>

int compute() {
    return 42;
}

void demo() {
    std::future<int> f = std::async(std::launch::async, compute);
    // 다른 일을 하다가…
    int result = f.get();   // compute가 끝날 때까지 대기. 결과 수신.
}
```

차이를 정리하면 다음과 같다.

| 측면 | `std::thread` | `std::async` |
|------|---------------|---------------|
| 반환값 수신 | 불가능 (out 인자나 future 직접 구성 필요) | `std::future<T>` 반환 |
| 예외 전파 | 호출자에 자동 전파 안 됨 | `future::get()`에서 자동 재던지기 |
| 정리 | `join` 또는 `detach` 강제 | `future` 소멸 시 자동 동기화 (정책 따라) |
| 스레드 풀 사용 | 매번 새 OS 스레드 | 구현에 따라 풀 사용 가능 |
| 정책 | 없음 | `std::launch::async` / `std::launch::deferred` |

`std::async`의 두 함정. 첫째, `std::launch::deferred`만 쓰면 *지연 호출*이 되어 `get()` 시점에 동기 실행된다(=새 스레드 없음). 기본 정책은 `async | deferred`로 구현이 임의 선택하므로, *반드시* 비동기여야 하면 `std::launch::async`를 명시한다. 둘째, async 정책의 `std::future` 소멸자는 *블로킹된다*. 임시 future는 그 자리에서 블록되니 "왜 함수 끝에서 멈추지?"의 원인이 된다.

세 라이브러리의 *철학 차이*를 한 표로 본다.

| 라이브러리 | 추상 수준 | 자동 join | 결과 수신 | 통합 |
|------------|----------|-----------|-----------|------|
| `std::thread` | 최저 (OS 스레드 래퍼) | 없음 (`std::terminate`) | 없음 | 없음 |
| `std::jthread` (C++20) | 중간 | 자동 | 없음 | `stop_token` |
| `std::async` | 중간 | future 소멸 시 (정책 의존) | `future<T>` | 예외 전파 |
| Boost.Thread | 중간 | 없음 | 없음 | `interrupt`, `thread_group` |
| Qt `QThread` | 높음 (프레임워크 객체) | 있음 (`quit`/`wait`) | 시그널·슬롯 | 이벤트 루프 통합 |

새 코드를 시작할 때의 선택 가이드는 이렇다. **결과를 받아야 한다면 `std::async`나 `std::packaged_task`**, **수명 관리만 자동화하고 협력적 취소가 필요하면 `std::jthread`**, **최저 수준 제어가 필요한 라이브러리 작성이면 `std::thread` + RAII 가드**다. Qt 환경이라면 `QThread`가 자연스러운 선택이지만, *비-Qt 코드와 섞일* 때는 두 세계의 스레드 모델이 충돌하지 않는지 점검해야 한다.

## 정리

- `std::thread`는 생성 즉시 실행을 시작한다. 스케줄링 시점은 OS가 정하지만 객체 생성 직후 실행 가능 상태가 된다.
- 모든 joinable 스레드에는 `join()` 또는 `detach()`가 반드시 호출돼야 한다. 그렇지 않은 채 소멸자가 호출되면 `std::terminate()`가 발생한다.
- `detach`는 댕글링 참조의 가장 흔한 원인이다. detach 시에는 값 캡처를 쓰거나, 데이터를 `shared_ptr`로 관리한다.
- 예외 안전성은 RAII 가드로 해결한다. `thread_guard`는 같은 스코프에서만 안전하고, 소유권 이전이 필요하면 `scoped_thread`를 쓴다.
- `std::thread`는 `std::unique_ptr`과 같은 move-only 의미론을 따른다. 복사는 금지, 이동은 허용된다.
- 이동 대입은 *기존 스레드를 자동 join하지 않는다*. 이미 joinable인 객체에 대입하면 `std::terminate()`로 간다.
- `hardware_concurrency()`는 힌트일 뿐이며 0을 반환할 수 있다. 첫 줄에서 항상 보수적인 기본값으로 대체한다.
- 과다 구독은 스택·캐시·스케줄링 비용을 동시에 키운다. CPU 바운드는 코어 수 근처, I/O 바운드는 그보다 많이.
- `std::thread::id`는 전순서와 해시를 모두 제공한다. `std::map`/`std::unordered_map`의 키로 직접 쓸 수 있다.
- 종료된 스레드의 id는 재사용될 수 있으므로 *살아 있는 동안*만 키로 다룬다.

## 한국 개발자의 함정

다음 다섯 가지가 실무에서 가장 자주 마주치는 함정이다.

1. **Most Vexing Parse**에 당한다. `std::thread t(Task());` 형태는 `t`를 *함수 선언*으로 해석한다. 중괄호 초기화, 추가 괄호, 변수 분리, 람다 중 어느 한 가지를 써서 피한다.
2. **detach 후 참조 캡처**가 댕글링을 만든다. 지역 변수에 대한 참조를 캡처한 람다를 detach하면, caller가 빠져나간 시점에 새 스레드는 깨진 메모리를 참조한다. 진짜 fire-and-forget이 아니면 `join`을 쓴다.
3. **`std::thread` 복사 시도**는 컴파일이 막아준다. `std::thread`는 unique 자원이므로 `std::move`로만 전달할 수 있다. 컨테이너에 넣을 때는 `emplace_back` 또는 `push_back(std::move(t))`를 쓴다.
4. **`std::jthread`의 진짜 가치는 stop_token**이다. 자동 join은 부수 효과에 가깝다. 첫 인자가 `std::stop_token`이면 자동으로 전달되므로, 루프 안에서 `stop_requested()`를 검사해 협력적 취소를 구현한다.
5. **`hardware_concurrency() × 2 = 적정 스레드`라는 미신**을 믿는다. 워크로드 성격에 따라 다르다. CPU 바운드는 코어 수 근처, I/O 바운드는 그보다 훨씬 많이. 정확한 수는 프로파일링으로 결정한다.

## 실무 적용

표준 도구를 실제 시스템에 어떻게 매핑하는지 정리한다.

| 이론 (책) | 실무 (현장) |
|-----------|-------------|
| `thread_guard` / `scoped_thread` | `std::jthread` (C++20) |
| `stop_token` / `stop_source` | 협력적 취소, graceful shutdown |
| `native_handle` | `pthread_setname_np`, `SetThreadPriority` |
| 스레드 풀 직접 구현 | ASIO `io_context`, `std::async` (제한적) |

플랫폼별 네이티브 기능은 다음과 같다.

- **POSIX**: `pthread_setname_np`, `pthread_setaffinity_np`로 이름과 CPU 친밀성 설정.
- **Windows**: `SetThreadPriority`, `SetThreadAffinityMask`.
- **macOS**: `pthread_set_qos_class_self_np`로 QoS 클래스 지정.

`std::jthread`와 `std::thread`의 선택 기준은 단순하다. 새 코드라면 `std::jthread`를 기본으로, 명시적 라이프사이클 제어가 필요하면 `std::thread` + RAII 가드를, 매우 짧고 결과를 받아야 하는 작업이면 `std::async`를 검토한다.

## 자기 점검

다음 질문에 한 줄로 답할 수 있는지 확인한다.

- Most Vexing Parse의 해결 방법 네 가지를 들 수 있는가?
- `join`과 `detach`가 예외 경로에서 어떻게 다르게 동작하는가?
- `thread_guard`와 `scoped_thread`의 핵심 차이는 무엇인가?
- `std::thread`가 `std::unique_ptr`과 닮은 점과 다른 점은 무엇인가? (힌트: 이동 대입 시 자동 정리 여부)
- `hardware_concurrency()`가 0을 반환할 수 있다는 사실을 코드에서 어떻게 다루는가?
- `std::thread::id`를 `std::unordered_map`의 키로 쓸 수 있는 이유는 무엇인가?
- 종료된 스레드의 id를 장기 보관하면 안 되는 이유는?

## 다음 장 예고

다음 장에서는 스레드 간 데이터 공유를 다룬다. race condition, `std::mutex`, lock guard, deadlock 회피, `std::shared_mutex`를 살펴본다.

## 관련 항목

- [Ch 1: Hello Concurrent World](/blog/parallel/cpp-concurrency-in-action/chapter01-hello-concurrent-world)
- [Ch 3: Sharing Data](/blog/parallel/cpp-concurrency-in-action/chapter03-sharing-data-between-threads)
- [AMP Ch 1: Introduction](/blog/parallel/parallel-principles/ch01-introduction)
