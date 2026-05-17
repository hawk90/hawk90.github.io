---
title: "Ch 11: 카메라 드라이버 개발 — IMX 센서 예제"
date: 2027-05-01T11:00:00
description: "Sony IMX 시리즈로 v4l2_subdev 드라이버 작성."
series: "MIPI 심화"
seriesOrder: 11
tags: [linux, v4l2-subdev, imx-sensor, camera-driver]
draft: true
---

> Outline — *Sony IMX 센서* — `imx219`·`imx290`·`imx477` 모델별 차이. *v4l2_subdev* 구조 — ops·pad. *I2C 통신*으로 register 설정. *Sensor mode* — resolution·binning·framerate table. *Power sequence*·*Stream on/off*. *Exposure·gain·HDR* control. DT binding.
