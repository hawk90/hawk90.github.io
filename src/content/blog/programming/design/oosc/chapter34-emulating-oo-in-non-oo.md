---
title: "Ch 34: Emulating Object Technology in Non-O-O Environments"
date: 2026-05-19T10:00:00
description: "비OO 환경에서의 OO 에뮬레이션 — C, Fortran에서 OO 패턴."
series: "Object-Oriented Software Construction"
seriesOrder: 34
tags: [oop, meyer, emulation, c, fortran, non-oo]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> OO 언어가 아니더라도 **구조체 + 함수 포인터**로 캡슐화, 상속, 다형성을 **에뮬레이션**할 수 있다. 다만 언어 지원 없이는 번거롭고 오류 가능성이 높다.

## 왜 에뮬레이션인가

### 상황

| OO 에뮬레이션이 필요한 경우 | 설명 |
|---------------------------|------|
| 레거시 코드베이스 | C, Fortran, COBOL로 작성된 대규모 시스템. 전면 재작성 불가 |
| 제한된 환경 | 임베디드 시스템(컴파일러 제약), 실시간 시스템(런타임 오버헤드 우려) |
| 점진적 마이그레이션 | OO로 가는 중간 단계. 일부만 OO 스타일로 변환 |
| 학습 목적 | OO 개념의 저수준 이해. "마법" 없이 메커니즘 파악 |

### 에뮬레이션의 한계

| 언어 지원 없이는 |
|-----------------|
| 컴파일러가 규칙 강제 못함 |
| 수동 관리로 인한 오류 |
| 코드가 장황해짐 |
| 유지보수 어려움 |

**결론**: 에뮬레이션은 "가능"하지만 "권장"은 아니다. 진정한 OO 언어 사용이 최선.

## C에서의 OO 에뮬레이션

### 캡슐화

```c
/* point.h — 공개 인터페이스 */
typedef struct Point Point;  /* 불완전 타입 (Opaque type) */

Point* point_create(double x, double y);
void point_destroy(Point* self);
void point_move(Point* self, double dx, double dy);
double point_get_x(const Point* self);
double point_get_y(const Point* self);
double point_distance_to_origin(const Point* self);
```

```c
/* point.c — 구현 (숨겨진 구조) */
#include "point.h"
#include <stdlib.h>
#include <math.h>

struct Point {
    double x;
    double y;
};

Point* point_create(double x, double y) {
    Point* self = malloc(sizeof(Point));
    if (self) {
        self->x = x;
        self->y = y;
    }
    return self;
}

void point_destroy(Point* self) {
    free(self);
}

void point_move(Point* self, double dx, double dy) {
    self->x += dx;
    self->y += dy;
}

double point_get_x(const Point* self) {
    return self->x;
}

double point_get_y(const Point* self) {
    return self->y;
}

double point_distance_to_origin(const Point* self) {
    return sqrt(self->x * self->x + self->y * self->y);
}
```

```c
/* 사용 */
Point* p = point_create(3.0, 4.0);
point_move(p, 1.0, 1.0);
printf("Distance: %f\n", point_distance_to_origin(p));
point_destroy(p);
```

### 상속 (구조체 포함)

```c
/* figure.h — 기본 타입 */
typedef struct Figure Figure;

struct Figure {
    double x;
    double y;
};

void figure_init(Figure* self, double x, double y);
void figure_move(Figure* self, double dx, double dy);
```

```c
/* rectangle.h — 파생 타입 */
typedef struct Rectangle Rectangle;

struct Rectangle {
    Figure base;  /* 첫 번째 멤버로 기본 타입 포함 */
    double width;
    double height;
};

void rectangle_init(Rectangle* self, double x, double y,
                    double w, double h);
double rectangle_area(const Rectangle* self);
```

```c
/* rectangle.c */
#include "rectangle.h"

void rectangle_init(Rectangle* self, double x, double y,
                    double w, double h) {
    figure_init(&self->base, x, y);  /* 기본 타입 초기화 */
    self->width = w;
    self->height = h;
}

double rectangle_area(const Rectangle* self) {
    return self->width * self->height;
}
```

```c
/* 사용 — 업캐스팅 */
Rectangle rect;
rectangle_init(&rect, 0, 0, 5, 3);

Figure* fig = (Figure*)&rect;  /* 첫 멤버이므로 주소 동일 */
figure_move(fig, 10, 20);      /* 기본 타입 함수 사용 */
```

### 다형성 (함수 포인터 테이블)

```c
/* shape.h — 가상 함수 테이블 */
typedef struct Shape Shape;
typedef struct ShapeVTable ShapeVTable;

struct ShapeVTable {
    double (*area)(const Shape* self);
    double (*perimeter)(const Shape* self);
    void (*destroy)(Shape* self);
};

struct Shape {
    const ShapeVTable* vtable;  /* 가상 함수 테이블 포인터 */
    double x;
    double y;
};

void shape_init(Shape* self, const ShapeVTable* vt, double x, double y);
double shape_area(const Shape* self);
double shape_perimeter(const Shape* self);
void shape_destroy(Shape* self);
```

```c
/* shape.c */
void shape_init(Shape* self, const ShapeVTable* vt, double x, double y) {
    self->vtable = vt;
    self->x = x;
    self->y = y;
}

double shape_area(const Shape* self) {
    return self->vtable->area(self);  /* 동적 디스패치 */
}

double shape_perimeter(const Shape* self) {
    return self->vtable->perimeter(self);
}

void shape_destroy(Shape* self) {
    self->vtable->destroy(self);
}
```

```c
/* circle.h — 구체 타입 */
typedef struct Circle Circle;

struct Circle {
    Shape base;
    double radius;
};

Circle* circle_create(double x, double y, double r);
```

```c
/* circle.c */
#include <math.h>
#include <stdlib.h>

static double circle_area(const Shape* self) {
    const Circle* c = (const Circle*)self;
    return M_PI * c->radius * c->radius;
}

static double circle_perimeter(const Shape* self) {
    const Circle* c = (const Circle*)self;
    return 2 * M_PI * c->radius;
}

static void circle_destroy(Shape* self) {
    free(self);
}

/* Circle의 가상 함수 테이블 (정적) */
static const ShapeVTable circle_vtable = {
    .area = circle_area,
    .perimeter = circle_perimeter,
    .destroy = circle_destroy
};

Circle* circle_create(double x, double y, double r) {
    Circle* self = malloc(sizeof(Circle));
    if (self) {
        shape_init(&self->base, &circle_vtable, x, y);
        self->radius = r;
    }
    return self;
}
```

```c
/* 다형적 사용 */
Shape* shapes[3];
shapes[0] = (Shape*)circle_create(0, 0, 5);
shapes[1] = (Shape*)rectangle_create(0, 0, 4, 3);
shapes[2] = (Shape*)circle_create(1, 1, 2);

double total = 0;
for (int i = 0; i < 3; i++) {
    total += shape_area(shapes[i]);  /* 동적 디스패치 */
}

for (int i = 0; i < 3; i++) {
    shape_destroy(shapes[i]);
}
```

### 실제 사례: GLib GObject

```c
/* GObject 시스템 — GTK의 기반 */
#include <glib-object.h>

/* 타입 정의 매크로 */
G_DECLARE_FINAL_TYPE(MyWidget, my_widget, MY, WIDGET, GObject)

struct _MyWidget {
    GObject parent_instance;
    int value;
};

G_DEFINE_TYPE(MyWidget, my_widget, G_TYPE_OBJECT)

static void my_widget_class_init(MyWidgetClass *klass) {
    /* 클래스 초기화 */
}

static void my_widget_init(MyWidget *self) {
    self->value = 0;
}

/* 가상 메서드 오버라이드 */
static void my_widget_finalize(GObject *object) {
    MyWidget *self = MY_WIDGET(object);
    /* 정리 */
    G_OBJECT_CLASS(my_widget_parent_class)->finalize(object);
}
```

## Fortran에서의 OO

### Fortran 90 모듈

```fortran
! point_module.f90
module point_module
    implicit none

    ! 타입 정의
    type :: Point
        real :: x, y
    contains
        procedure :: move => point_move
        procedure :: distance => point_distance
    end type Point

contains
    subroutine point_move(self, dx, dy)
        class(Point), intent(inout) :: self
        real, intent(in) :: dx, dy
        self%x = self%x + dx
        self%y = self%y + dy
    end subroutine point_move

    function point_distance(self) result(d)
        class(Point), intent(in) :: self
        real :: d
        d = sqrt(self%x**2 + self%y**2)
    end function point_distance
end module point_module
```

### Fortran 2003 OO 기능

```fortran
! shape_module.f90
module shape_module
    implicit none

    ! 추상 타입
    type, abstract :: Shape
        real :: x, y
    contains
        procedure(area_interface), deferred :: area
        procedure :: move => shape_move
    end type Shape

    ! 추상 인터페이스
    abstract interface
        function area_interface(self) result(a)
            import :: Shape
            class(Shape), intent(in) :: self
            real :: a
        end function area_interface
    end interface

contains
    subroutine shape_move(self, dx, dy)
        class(Shape), intent(inout) :: self
        real, intent(in) :: dx, dy
        self%x = self%x + dx
        self%y = self%y + dy
    end subroutine shape_move
end module shape_module
```

```fortran
! circle_module.f90
module circle_module
    use shape_module
    implicit none

    type, extends(Shape) :: Circle
        real :: radius
    contains
        procedure :: area => circle_area
    end type Circle

contains
    function circle_area(self) result(a)
        class(Circle), intent(in) :: self
        real :: a
        real, parameter :: PI = 3.14159265359
        a = PI * self%radius**2
    end function circle_area
end module circle_module
```

```fortran
! 다형적 사용
use shape_module
use circle_module

class(Shape), allocatable :: shapes(:)

allocate(Circle :: shapes(1))
select type (s => shapes(1))
    type is (Circle)
        s%x = 0.0
        s%y = 0.0
        s%radius = 5.0
end select

print *, shapes(1)%area()  ! 동적 디스패치
```

## 에뮬레이션 기법 요약

### 캡슐화

**기법**: 불완전 타입(Opaque pointer). 헤더에 선언만, 정의는 `.c`에.

| 장점 | 단점 |
|------|------|
| 구현 세부사항 숨김 | 동적 할당 필수 |
| ABI 안정성 | 간접 참조 오버헤드 |

### 상속

**기법**: 구조체 포함(첫 멤버). 업캐스팅 가능.

| 장점 | 단점 |
|------|------|
| 단일 상속 에뮬레이션 | 컴파일러 검증 없음 |
| 메모리 레이아웃 예측 가능 | 다중 상속 복잡 |

### 다형성

**기법**: 가상 함수 테이블(vtable). 함수 포인터 구조체.

| 장점 | 단점 |
|------|------|
| 진정한 동적 디스패치 | 수동 vtable 관리 |
| 런타임 다형성 | 타입 안전성 부재 |
| — | 오류 발생 쉬움 |

### 계약

**기법**: assert 매크로. 수동 검증 코드.

```c
#include <assert.h>

void stack_push(Stack* s, int item) {
    assert(s != NULL);               /* 전조건 */
    assert(!stack_is_full(s));

    /* 구현 */

    assert(!stack_is_empty(s));      /* 후조건 */
}
```

| 한계 |
|------|
| 불변식 자동 검사 없음 |
| 상속 시 계약 강화 검증 없음 |

## 실제 사례

### Linux 커널

```c
/* 커널의 OO 패턴 — 파일 시스템 */
struct file_operations {
    struct module *owner;
    loff_t (*llseek)(struct file *, loff_t, int);
    ssize_t (*read)(struct file *, char __user *, size_t, loff_t *);
    ssize_t (*write)(struct file *, const char __user *, size_t, loff_t *);
    int (*open)(struct inode *, struct file *);
    int (*release)(struct inode *, struct file *);
    /* ... */
};

/* 구체 파일 시스템은 이 인터페이스 구현 */
static const struct file_operations ext4_file_operations = {
    .llseek     = ext4_llseek,
    .read_iter  = ext4_file_read_iter,
    .write_iter = ext4_file_write_iter,
    .open       = ext4_file_open,
    .release    = ext4_release_file,
    /* ... */
};
```

### X Window System

```c
/* Xt Intrinsics — 위젯 클래스 계층 */
typedef struct _WidgetClassPart {
    WidgetClass  superclass;
    String       class_name;
    Cardinal     widget_size;
    XtProc       class_initialize;
    XtWidgetProc realize;
    /* ... */
} WidgetClassPart;

/* 상속: 구조체 시작에 부모 포함 */
typedef struct _CommandClassPart {
    WidgetClassPart  core_class;
    LabelClassPart   label_class;
    CommandClassPart command_class;
} CommandClassRec;
```

## 권장사항

### 언제 에뮬레이션을 쓸까

| 에뮬레이션이 적합한 경우 | 에뮬레이션을 피해야 할 경우 |
|------------------------|--------------------------|
| 레거시 코드와의 통합 필수 | 새 프로젝트 (OO 언어 선택) |
| 컴파일러 제약으로 OO 언어 사용 불가 | 복잡한 상속 계층 |
| 성능이 극도로 중요 (vtable 오버헤드 제어) | 안전성이 중요한 시스템 |
| 기존 C 코드베이스에 점진적 OO 도입 | 팀이 OO 경험 부족 |

### 에뮬레이션 모범 사례

| 규칙 | 예 |
|------|-----|
| 일관된 명명 규칙 | `type_method(Type* self, ...)` |
| 생성/소멸 쌍 | `type_create()` / `type_destroy()` |
| 불완전 타입으로 캡슐화 | `typedef struct Type Type;` |
| vtable은 const static | `static const TypeVTable vtable = {...};` |
| 매크로로 반복 줄이기 | `#define DEFINE_CLASS(name) ...` |
| 문서화 | 어떤 함수가 "가상"인지 명시 |

## 정리

- **캡슐화**: 불완전 타입(opaque pointer)으로 구현 숨김
- **상속**: 구조체 첫 멤버로 기본 타입 포함
- **다형성**: 함수 포인터 테이블(vtable) 패턴
- **계약**: assert 매크로로 수동 검증
- **한계**: 컴파일러 지원 없이 오류 발생 쉬움
- **실제 사례**: Linux 커널, GLib, X Window

## 다음 장 예고

Chapter 35에서는 **Simula부터 Java까지, 주요 OO 언어들**을 비교한다. 각 언어의 설계 철학과 특징을 살펴본다.

## 관련 항목

- [Ch 33: OO Programming and Ada](/blog/programming/design/oosc/chapter33-oo-programming-and-ada) — Ada의 OO
- [Ch 35: Simula to Java and Beyond](/blog/programming/design/oosc/chapter35-simula-to-java-and-beyond) — 언어 비교
- [Ch 4: Approaches to Reusability](/blog/programming/design/oosc/chapter04-approaches-to-reusability) — 재사용성
