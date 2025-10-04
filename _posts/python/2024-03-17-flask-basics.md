---
layout: post
title: "Flask 웹 애플리케이션 시작하기"
date: 2024-03-17
categories: [Python]
tags: [python, flask, web]
---

# Flask로 웹 애플리케이션 만들기

Flask는 Python의 경량 웹 프레임워크입니다.

## 설치

```bash
pip install flask
```

## 기본 애플리케이션

```python
from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def hello_world():
    return 'Hello, World!'

@app.route('/user/<name>')
def user_profile(name):
    return f'Welcome, {name}!'

@app.route('/api/data')
def get_data():
    data = {
        'status': 'success',
        'items': [1, 2, 3, 4, 5]
    }
    return data  # Flask가 자동으로 JSON 변환

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

## 템플릿 렌더링

```python
@app.route('/dashboard')
def dashboard():
    user_data = {
        'name': 'Hawk',
        'projects': ['Project A', 'Project B']
    }
    return render_template('dashboard.html', **user_data)
```

Flask로 RESTful API와 웹 페이지를 쉽게 만들 수 있습니다.