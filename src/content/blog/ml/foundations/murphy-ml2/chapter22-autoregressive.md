---
title: "Ch 22: Auto-regressive Models"
date: 2029-06-01T22:00:00
description: "PixelCNN·WaveNet·GPT — tractable likelihood·sequential decode."
series: "Probabilistic Machine Learning: Advanced Topics"
seriesOrder: 22
tags: [autoregressive, pixelcnn, wavenet, gpt, llm]
draft: true
---

> Outline — *AR factorization* — `p(x) = Π p(x_i | x_<i)`. *Exact likelihood·sequential sampling*. *PixelRNN·PixelCNN·Image Transformer*. *WaveNet*·dilated causal conv. *GPT·decoder-only LLM*. *Speed-up* — speculative decoding·parallel sampling·blockwise. *Limitation* — global structure 어려움. ML 응용 — modern LLM이 곧 AR.
