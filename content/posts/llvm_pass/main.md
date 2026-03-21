---
title: LLVM pass(TBD)
date: 2026-02-26
tags: compiler
---


最近在學怎麼寫自己的 LLVM pass，順便記錄一下如何撰寫，以及可能會踩到的坑

## Before LLVM pass

### What is LLVM

> The LLVM Project is a collection of modular and reusable compiler and toolchain technologies

就如同 [LLVM 官網](https://llvm.org/)的介紹，LLVM 是一個可高度客製化的編譯器零件庫與開發工具集合

一般來說，LLVM 編譯的時候分成三個階段:

1. 前端 (Frontend)： 
    * 負責讀取原始碼（C++, Swift, Rust），檢查語法錯誤
    * 把它翻譯成一種 LLVM 專屬的「通用中間語言」（LLVM IR）

2. 最佳化器 (Optimizer / Middle-end)： 
    * 接收 LLVM IR，
    * 進行各種最佳化工作，讓程式碼跑得更快、佔用更少記憶體
    
3. 後端 (Backend)： 
    * 接收最佳化後的 LLVM IR，將其翻譯成特定硬體（如 Intel x86 處理器、ARM 架構手機晶片）能執行的機器碼

而 LLVM pass 就是中間層的部分，中間層可以包含多個 pass，可以由開發者自己定義最佳化的方式

> 可以發現如果 pass 是可以自定義的，那 pass 的工作就可以不僅僅是最佳化

像是在 [Fuzz (模糊測試)](https://zh.wikipedia.org/zh-tw/%E6%A8%A1%E7%B3%8A%E6%B5%8B%E8%AF%95) 領域，就會使用 pass 進行插樁，插樁並不是傳統意義上的最佳化方式，但是為了方便 fuzzing 透過 pass 插樁確實是一個再好不過的選擇了

> 所以更好的說法是我們可以透過 pass 去修改我們的 IR，這個客製化後的 IR 讓我們的工作更加容易

## Pass

