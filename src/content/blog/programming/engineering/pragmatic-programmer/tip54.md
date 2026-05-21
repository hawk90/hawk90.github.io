---
title: "Tip 54: Parameterize Your App Using External Configuration"
date: 2026-05-11T06:00:00
description: "외부 설정으로 앱을 파라미터화하라. 코드를 바꾸지 않고 동작을 조정한다."
series: "The Pragmatic Programmer"
seriesOrder: 54
tags: [pragmatic-programmer, config, deployment]
draft: false
---

## 이 팁의 메시지

> **Tip 54: Parameterize Your App Using External Configuration.** When code relies on values that may change after the application has gone live, keep those values external to the app.

앱이 배포된 후 바뀔 수 있는 값은 코드 밖에 둔다.

## 하드코딩의 문제

코드 안에 값을 직접 쓰면 변경할 때마다 재배포해야 한다.

```python
# 하드코딩
def connect_db():
    return connect("localhost", 5432, "mydb")

def get_timeout():
    return 30  # 초
```

호스트, 포트, 데이터베이스 이름, 타임아웃 값이 모두 코드에 박혀 있다. 운영 환경에서 타임아웃을 60초로 늘리려면 코드를 고치고, 빌드하고, 배포해야 한다.

## 외부 설정

값을 외부 파일이나 환경 변수로 분리한다.

```yaml
# config.yaml
database:
  host: localhost
  port: 5432
  name: mydb

timeout: 30
```

```python
import yaml

def load_config():
    with open("config.yaml") as f:
        return yaml.safe_load(f)

config = load_config()

def connect_db():
    db = config["database"]
    return connect(db["host"], db["port"], db["name"])

def get_timeout():
    return config["timeout"]
```

이제 `config.yaml`만 수정하면 동작이 바뀐다. 코드 재배포 없이 운영팀이 직접 조정할 수 있다.

## 환경 변수

민감한 정보는 환경 변수로 둔다.

```python
import os

DATABASE_URL = os.environ.get("DATABASE_URL")
API_KEY = os.environ.get("API_KEY")
```

환경 변수는 코드에 남지 않으므로 저장소에 비밀이 노출되지 않는다.

## 설정 계층

여러 소스에서 설정을 합친다.

```text
1. 기본값 (코드에 내장)
2. 설정 파일 (config.yaml)
3. 환경 변수
4. 명령줄 인자
```

나중 것이 앞선 것을 덮어쓴다. 개발 환경에서는 파일을 쓰고, 운영 환경에서는 환경 변수로 재정의하는 식이다.

## 무엇을 설정으로 빼는가

| 설정으로 빼야 함 | 코드에 둬도 됨 |
|-----------------|---------------|
| 호스트, 포트, URL | 알고리즘 로직 |
| 타임아웃, 재시도 횟수 | 자료 구조 |
| 기능 플래그 (feature flag) | 클래스 관계 |
| 로깅 레벨 | 타입 정의 |
| API 키, 비밀번호 | |

기준은 "배포 후 바뀔 수 있는가?"다. 환경마다 다른 값, 운영 중 조정해야 하는 값은 설정으로 뺀다.

## 기능 플래그

신기능을 설정으로 켜고 끈다.

```yaml
features:
  new_checkout: false
  dark_mode: true
```

```python
if config["features"]["new_checkout"]:
    show_new_checkout()
else:
    show_old_checkout()
```

코드에 두 버전을 모두 두고, 설정으로 전환한다. 문제가 생기면 배포 없이 롤백할 수 있다.

## 정리

- 배포 후 바뀔 수 있는 값은 외부 설정으로 뺀다.
- 설정 파일, 환경 변수, 명령줄 인자를 조합한다.
- 민감한 정보는 환경 변수로 둔다.
- 기능 플래그로 신기능을 안전하게 배포한다.
- 코드 재배포 없이 동작을 조정할 수 있다.

## 다음 장 예고

[Tip 55: Analyze Workflow to Improve Concurrency](/blog/programming/engineering/pragmatic-programmer/tip55)에서는 동시성 개선을 위한 워크플로 분석을 다룬다.

## 관련 항목

- [Tip 53: Delegate to Services: Has-A Trumps Is-A](/blog/programming/engineering/pragmatic-programmer/tip53)
- [Tip 48: If It's Important Enough to Be Global, Wrap It in an API](/blog/programming/engineering/pragmatic-programmer/tip48)
