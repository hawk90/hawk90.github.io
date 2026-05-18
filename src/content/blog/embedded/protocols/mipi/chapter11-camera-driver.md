---
title: "Ch 11: 카메라 드라이버 — Sony IMX 센서 V4L2 Subdev"
date: 2027-05-01T11:00:00
description: "v4l2_subdev 드라이버 — power, I²C register, mode table, stream on/off."
series: "MIPI 심화"
seriesOrder: 11
tags: [linux, v4l2-subdev, imx-sensor, camera-driver, dt-binding]
draft: true
---

## 한 줄 요약

> **"v4l2_subdev = 센서 추상화"** — power, register init, mode 설정, stream on/off만 구현하면 끝.

## 센서 드라이버의 5 책임

1. **DT 매칭** — `compatible` string으로 SoC에 등록
2. **Power 시퀀스** — 전원 ON/OFF, reset 토글
3. **I²C 통신** — register read/write, mode table 적용
4. **Format 협상** — V4L2 framework이 *어떤 해상도·format* 묻면 응답
5. **Stream 제어** — start/stop 시 *센서 register* 토글

## v4l2_subdev 구조

![v4l2_subdev struct + ops](/images/blog/mipi/diagrams/ch11-v4l2-subdev-struct.svg)

```c
#include <linux/i2c.h>
#include <linux/module.h>
#include <media/v4l2-subdev.h>
#include <media/v4l2-ctrls.h>

struct imx219 {
    struct v4l2_subdev sd;
    struct media_pad pad;
    struct v4l2_ctrl_handler ctrls;
    struct i2c_client *client;

    struct gpio_desc *reset_gpio;
    struct regulator *vana, *vdig, *vddl;

    bool streaming;
    const struct imx219_mode *mode;   // 현재 mode
};
```

## I²C Register Helpers

```c
static int imx219_read_reg(struct imx219 *sensor, u16 reg, u8 *val) {
    struct i2c_msg msgs[2];
    u8 addr_buf[2] = { reg >> 8, reg & 0xFF };
    
    msgs[0].addr = sensor->client->addr;
    msgs[0].flags = 0;
    msgs[0].len = 2;
    msgs[0].buf = addr_buf;
    
    msgs[1].addr = sensor->client->addr;
    msgs[1].flags = I2C_M_RD;
    msgs[1].len = 1;
    msgs[1].buf = val;
    
    return i2c_transfer(sensor->client->adapter, msgs, 2) == 2 ? 0 : -EIO;
}

static int imx219_write_reg(struct imx219 *sensor, u16 reg, u8 val) {
    u8 buf[3] = { reg >> 8, reg & 0xFF, val };
    return i2c_master_send(sensor->client, buf, 3) == 3 ? 0 : -EIO;
}
```

대부분 IMX 센서는 *16-bit register address*. 일부는 8-bit (옛 모델).

## Mode Table

```c
struct imx219_mode {
    u32 width;
    u32 height;
    u32 hts;       // 라인 길이 (pixel clock 단위)
    u32 vts;       // 프레임 길이 (라인 단위)
    const struct reg_value *init_seq;
};

static const struct reg_value imx219_1920x1080_30fps[] = {
    { 0x0100, 0x00 },           // streaming = 0
    { 0x30EB, 0x05 },           // manufacturer init sequence
    { 0x30EB, 0x0C },
    { 0x300A, 0xFF },
    { 0x300B, 0xFF },
    /* ... 약 100 register ... */
    { 0x0162, 0x0D },           // hts MSB
    { 0x0163, 0x78 },           // hts LSB
    { 0x0164, 0x02 },           // x_addr_start
    { 0x0165, 0xA8 },
    { 0x0166, 0x0A },           // x_addr_end
    { 0x0167, 0x27 },
    /* ... */
    { 0x0100, 0x01 },           // streaming = 1
    { 0xFFFE, 0xFF },           // end marker
};

static const struct imx219_mode imx219_modes[] = {
    { 1920, 1080, 0x0D78, 0x0473, imx219_1920x1080_30fps },
    { 3280, 2464, 0x0D78, 0x09C4, imx219_3280x2464_15fps },
    /* ... */
};
```

> 💡 *Init sequence*는 Sony NDA 문서 또는 *reference design 공개 코드*에서. 보통 *100+ register* 설정.

## Power 시퀀스

![IMX sensor power-on timing (tikz-timing)](/images/blog/mipi/diagrams/ch11-imx-power-on.svg)

```c
static int imx219_power_on(struct imx219 *sensor) {
    int ret;
    
    // 1. VDDL (1.05V) — 디지털 코어
    ret = regulator_enable(sensor->vddl);
    if (ret) return ret;
    usleep_range(100, 200);
    
    // 2. VANA (2.8V) — 아날로그
    ret = regulator_enable(sensor->vana);
    if (ret) goto err_vana;
    usleep_range(100, 200);
    
    // 3. VDIG (1.8V) — IO
    ret = regulator_enable(sensor->vdig);
    if (ret) goto err_vdig;
    usleep_range(200, 300);
    
    // 4. Clock enable
    ret = clk_prepare_enable(sensor->xclk);
    if (ret) goto err_clk;
    
    // 5. Reset deassert
    gpiod_set_value_cansleep(sensor->reset_gpio, 0);
    usleep_range(6500, 7000);    // T0: 6.5 ms (Sony spec)
    
    return 0;

err_clk:
    regulator_disable(sensor->vdig);
err_vdig:
    regulator_disable(sensor->vana);
err_vana:
    regulator_disable(sensor->vddl);
    return ret;
}
```

데이터시트의 *"Power-On Sequence"* 표 — 전원·클럭·reset 순서와 *각 wait time*. 잘못된 순서 = *센서 영구 손상* 가능.

## v4l2_subdev Ops

```c
static int imx219_set_fmt(struct v4l2_subdev *sd,
                           struct v4l2_subdev_state *state,
                           struct v4l2_subdev_format *fmt) {
    struct imx219 *sensor = to_imx219(sd);
    const struct imx219_mode *mode;
    
    // 가장 가까운 mode 찾기
    mode = imx219_find_best_mode(fmt->format.width, fmt->format.height);
    fmt->format.width = mode->width;
    fmt->format.height = mode->height;
    fmt->format.code = MEDIA_BUS_FMT_SRGGB10_1X10;
    fmt->format.field = V4L2_FIELD_NONE;
    
    if (fmt->which == V4L2_SUBDEV_FORMAT_ACTIVE)
        sensor->mode = mode;
    
    return 0;
}

static int imx219_s_stream(struct v4l2_subdev *sd, int enable) {
    struct imx219 *sensor = to_imx219(sd);
    int ret;
    
    if (enable) {
        // 1. Power on
        ret = imx219_power_on(sensor);
        if (ret) return ret;
        
        // 2. Init register sequence (current mode)
        ret = imx219_write_seq(sensor, sensor->mode->init_seq);
        if (ret) goto err;
        
        // 3. Streaming on
        ret = imx219_write_reg(sensor, 0x0100, 0x01);
        if (ret) goto err;
        
        sensor->streaming = true;
    } else {
        imx219_write_reg(sensor, 0x0100, 0x00);
        imx219_power_off(sensor);
        sensor->streaming = false;
    }
    return 0;

err:
    imx219_power_off(sensor);
    return ret;
}

static const struct v4l2_subdev_video_ops imx219_video_ops = {
    .s_stream = imx219_s_stream,
};

static const struct v4l2_subdev_pad_ops imx219_pad_ops = {
    .enum_mbus_code = imx219_enum_mbus_code,
    .get_fmt = imx219_get_fmt,
    .set_fmt = imx219_set_fmt,
    .enum_frame_size = imx219_enum_frame_size,
    .enum_frame_interval = imx219_enum_frame_interval,
};

static const struct v4l2_subdev_ops imx219_subdev_ops = {
    .video = &imx219_video_ops,
    .pad = &imx219_pad_ops,
};
```

## Controls — Exposure, Gain, ...

```c
static int imx219_set_ctrl(struct v4l2_ctrl *ctrl) {
    struct imx219 *sensor = container_of(ctrl->handler, struct imx219, ctrls);
    
    if (!sensor->streaming) return 0;
    
    switch (ctrl->id) {
    case V4L2_CID_EXPOSURE:
        // 16-bit, line 단위
        imx219_write_reg(sensor, 0x015A, ctrl->val >> 8);
        imx219_write_reg(sensor, 0x015B, ctrl->val & 0xFF);
        break;
    case V4L2_CID_ANALOGUE_GAIN:
        imx219_write_reg(sensor, 0x0157, ctrl->val);
        break;
    case V4L2_CID_HFLIP:
    case V4L2_CID_VFLIP:
        imx219_set_orientation(sensor);
        break;
    }
    return 0;
}

static const struct v4l2_ctrl_ops imx219_ctrl_ops = {
    .s_ctrl = imx219_set_ctrl,
};

// 초기화 시
v4l2_ctrl_handler_init(&sensor->ctrls, 6);
v4l2_ctrl_new_std(&sensor->ctrls, &imx219_ctrl_ops,
                  V4L2_CID_EXPOSURE, 4, 65535, 1, 1000);
v4l2_ctrl_new_std(&sensor->ctrls, &imx219_ctrl_ops,
                  V4L2_CID_ANALOGUE_GAIN, 0, 232, 1, 0);
// ...
sensor->sd.ctrl_handler = &sensor->ctrls;
```

`v4l2-ctl --list-ctrls` 명령으로 *모든 control 노출*.

## probe + DT 매칭

```c
static int imx219_probe(struct i2c_client *client) {
    struct imx219 *sensor;
    int ret;
    
    sensor = devm_kzalloc(&client->dev, sizeof(*sensor), GFP_KERNEL);
    sensor->client = client;
    
    // GPIO·regulator·clock 획득
    sensor->reset_gpio = devm_gpiod_get(&client->dev, "reset", GPIOD_OUT_HIGH);
    sensor->vana = devm_regulator_get(&client->dev, "VANA");
    sensor->vdig = devm_regulator_get(&client->dev, "VDIG");
    sensor->vddl = devm_regulator_get(&client->dev, "VDDL");
    sensor->xclk = devm_clk_get(&client->dev, NULL);
    
    // v4l2_subdev 초기화
    v4l2_i2c_subdev_init(&sensor->sd, client, &imx219_subdev_ops);
    sensor->sd.flags |= V4L2_SUBDEV_FL_HAS_DEVNODE;
    
    // Media pad
    sensor->pad.flags = MEDIA_PAD_FL_SOURCE;
    media_entity_pads_init(&sensor->sd.entity, 1, &sensor->pad);
    sensor->sd.entity.function = MEDIA_ENT_F_CAM_SENSOR;
    
    // ID 확인 — 센서 살아있나 확인
    ret = imx219_power_on(sensor);
    if (ret) return ret;
    
    u8 chip_id_msb, chip_id_lsb;
    imx219_read_reg(sensor, 0x0000, &chip_id_msb);
    imx219_read_reg(sensor, 0x0001, &chip_id_lsb);
    u16 chip_id = (chip_id_msb << 8) | chip_id_lsb;
    if (chip_id != 0x0219) {
        dev_err(&client->dev, "Wrong chip ID: 0x%04x\n", chip_id);
        return -ENODEV;
    }
    
    imx219_power_off(sensor);
    
    // Async 등록 — CSI receiver에서 잡아감
    ret = v4l2_async_register_subdev_sensor(&sensor->sd);
    return ret;
}

static const struct of_device_id imx219_of_match[] = {
    { .compatible = "sony,imx219" },
    {}
};
MODULE_DEVICE_TABLE(of, imx219_of_match);

static struct i2c_driver imx219_driver = {
    .driver = {
        .name = "imx219",
        .of_match_table = imx219_of_match,
    },
    .probe = imx219_probe,
};
module_i2c_driver(imx219_driver);

MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("Sony IMX219 sensor driver");
```

## DT 바인딩 예 — Raspberry Pi CM4

```dts
&i2c0 {
    imx219_0: imx219@10 {
        compatible = "sony,imx219";
        reg = <0x10>;
        clocks = <&cam0_clk>;
        clock-names = "xclk";
        
        VANA-supply = <&cam0_reg>;
        VDIG-supply = <&cam_dummy_reg>;
        VDDL-supply = <&cam_dummy_reg>;
        
        reset-gpios = <&gpio 27 GPIO_ACTIVE_HIGH>;
        
        port {
            imx219_0_endpoint: endpoint {
                remote-endpoint = <&csi1_ep>;
                clock-lanes = <0>;
                data-lanes = <1 2>;
                clock-noncontinuous;
                link-frequencies = /bits/ 64 <456000000>;
            };
        };
    };
};
```

## 자주 만나는 함정

> ⚠️ Init sequence 잘못

100+ register 중 *한 비트 잘못*이면 *센서가 ID는 응답하지만 stream 안 함*. *Sony reference code 그대로* 쓰는 게 안전.

> ⚠️ Power 순서

VDDL → VANA → VDIG 순서 잘못 → *센서 영구 손상*. 데이터시트 그대로.

> ⚠️ Link frequency 미설정

DT의 `link-frequencies`가 *D-PHY HS clock*. 잘못된 값이면 CSI receiver와 *bit time 안 맞아* 데이터 깨짐.

> ⚠️ Async binding 실패

`v4l2_async_register_subdev_sensor` 호출했지만 *CSI receiver가 안 잡아감* → `media-ctl -p` 에서 entity 안 보임. DT의 *endpoint 연결* (remote-endpoint) 확인.

## 정리

- v4l2_subdev 드라이버 = **power + I²C + mode + stream + control**.
- I²C로 *register table* 적용해 sensor mode 설정.
- **Power 순서 정확히** (regulator → clock → reset).
- Mode table은 *제조사 reference code*.
- **DT binding**의 `data-lanes`, `link-frequencies` 정확히.

다음 편 (마지막) — **디버깅** — MIPI 신호 분석.

## 관련 항목

- [Ch 10: Linux Media](/blog/embedded/protocols/mipi/chapter10-linux-media)
- [Ch 12: MIPI 디버깅](/blog/embedded/protocols/mipi/chapter12-debugging)
