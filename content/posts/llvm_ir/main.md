---
title: LLVM IR
date: 2026-03-20
tags: notes
---

# LLVM IR 詳細介紹



## 目錄

1. [什麼是 LLVM IR](#什麼是-llvm-ir)
2. [LLVM IR 的設計目標](#llvm-ir-的設計目標)
3. [IR 的三種表示形式](#ir-的三種表示形式)
4. [基本語法與結構](#基本語法與結構)
5. [型別系統](#型別系統)
6. [指令集](#指令集)
7. [SSA 形式](#ssa-形式)
8. [記憶體模型](#記憶體模型)
9. [函式與呼叫約定](#函式與呼叫約定)
10. [Metadata 與 Debug Info](#metadata-與-debug-info)
11. [Attributes 與 Linkage](#attributes-與-linkage)
12. [實際範例：從 C 到 IR](#實際範例從-c-到-ir)
13. [操作 IR 的工具](#操作-ir-的工具)

---

## 什麼是 LLVM IR

LLVM IR（Intermediate Representation，中間表示）是 LLVM 編譯器基礎架構的核心語言。它是一種低階、強型別的虛擬指令集，設計上介於高階語言（如 C、C++、Rust）和機器碼之間。

LLVM 的編譯流程可以概括為三個階段：

```
原始碼 (C/C++/Rust/...)
       ↓  前端 (Clang/rustc/...)
    LLVM IR
       ↓  中端 (優化 Pass)
    LLVM IR (優化後)
       ↓  後端 (code generation)
    機器碼 (x86/ARM/RISC-V/...)
```

IR 是這條流水線的「通用語言」，讓不同語言的前端和不同架構的後端可以彼此解耦。前端只需要生成正確的 IR，後端只需要消費 IR，優化 Pass 則在 IR 層面獨立運作，對所有語言一視同仁。

---

## LLVM IR 的設計目標

- **語言無關**：IR 不依附於任何特定的程式語言語義，可以表達 C、C++、Rust、Swift、Julia 等多種語言的語義。
- **平台無關**：IR 不針對特定機器架構，可以被編譯到 x86、ARM、RISC-V、WebAssembly 等各種目標。
- **可讀可寫**：IR 有人類可讀的文字格式（`.ll`），可以手寫、閱讀與除錯。
- **靜態單賦值（SSA）**：所有虛擬暫存器只被賦值一次，簡化資料流分析和優化。
- **強型別**：每個值都有明確的型別，型別資訊貫穿整個 IR，避免隱式轉換。

---

## IR 的三種表示形式

LLVM IR 有三種等價的表示形式，可以互相轉換：

| 形式 | 副檔名 | 說明 |
|------|--------|------|
| 文字格式（Text） | `.ll` | 人類可讀的 ASCII 文字，適合閱讀與除錯 |
| 位元碼（Bitcode） | `.bc` | 壓縮的二進位格式，適合儲存與傳輸 |
| 記憶體中的物件（In-memory） | — | 編譯器在執行期間使用的 C++ 物件圖 |

轉換指令：

```bash
# 編譯 C 檔案到 IR 文字格式
clang -S -emit-llvm foo.c -o foo.ll

# 編譯 C 檔案到 Bitcode
clang -emit-llvm -c foo.c -o foo.bc

# Bitcode 轉換為文字格式
llvm-dis foo.bc -o foo.ll

# 文字格式轉換為 Bitcode
llvm-as foo.ll -o foo.bc

# 直接執行 IR（使用 JIT）
lli foo.ll
```

---

## 基本語法與結構

### 模組（Module）

一個 `.ll` 檔案對應一個 **Module**，是 IR 的最頂層容器。一個模組包含：

- 目標資訊（target triple、data layout）
- 全域變數（global variables）
- 函式宣告與定義（function declarations/definitions）
- 型別別名（type aliases）
- Metadata

```llvm
; 模組層級的目標資訊
source_filename = "foo.c"
target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-linux-gnu"

; 全域變數
@global_var = global i32 42, align 4
@str = private unnamed_addr constant [14 x i8] c"Hello, World!\00"

; 外部函式宣告
declare i32 @printf(ptr nocapture readonly, ...)

; 函式定義
define i32 @main() {
  ; ... 函式主體
}
```

### 函式（Function）

函式由一系列 **基本塊（Basic Block）** 組成：

```llvm
define i32 @add(i32 %a, i32 %b) {
entry:
  %result = add i32 %a, %b
  ret i32 %result
}
```

- 函式以 `define` 開頭（定義）或 `declare` 開頭（宣告外部函式）
- 參數以 `%` 開頭命名
- 函式名稱以 `@` 開頭

### 基本塊（Basic Block）

基本塊是 IR 中最小的控制流單元：

- 以一個**標籤（label）**開頭（如 `entry:`）
- 包含一系列非跳轉指令
- 以一條**終止指令（terminator）**結束（`ret`、`br`、`switch` 等）
- 基本塊之間的跳轉構成**控制流圖（CFG）**

### 值（Values）

所有值在 IR 中有兩種命名方式：

- **具名值**：`%name` 或 `@name`
  - `%` 開頭：局部值（暫存器、函式參數）
  - `@` 開頭：全域值（全域變數、函式）
- **匿名值**：`%0`、`%1`、`%2`（自動編號）

```llvm
define i32 @example(i32 %x) {
entry:
  %doubled = mul i32 %x, 2       ; 具名局部值
  %result  = add i32 %doubled, 1
  ret i32 %result
}
```

### 註解

以 `;` 開頭，直到行尾：

```llvm
; 這是一行註解
%val = add i32 1, 2  ; 行尾也可以有註解
```

---

## 型別系統

LLVM IR 是強型別語言，每個值都有靜態型別。

### 整數型別

以 `i` 加上位元寬度表示，可以是任意正整數：

```llvm
i1    ; 布林值（1 bit）
i8    ; 8-bit 整數（char）
i16   ; 16-bit 整數（short）
i32   ; 32-bit 整數（int）
i64   ; 64-bit 整數（long）
i128  ; 128-bit 整數
```

### 浮點型別

```llvm
half    ; 16-bit 浮點（IEEE 754）
float   ; 32-bit 浮點（IEEE 754 單精度）
double  ; 64-bit 浮點（IEEE 754 雙精度）
x86_fp80  ; x86 80-bit 擴展精度
fp128   ; 128-bit 浮點（IEEE 754 四精度）
```

### 指標型別

在 LLVM 14 之後，指標型別統一為**不透明指標（opaque pointer）**：

```llvm
ptr   ; 不透明指標（現代 LLVM 推薦）

; 舊版本中的型別指標（已棄用）
i32*  ; 指向 i32 的指標
```

### 向量型別

SIMD 向量，元素數量為固定正整數：

```llvm
<4 x i32>    ; 4 個 i32 的向量（128-bit）
<8 x float>  ; 8 個 float 的向量（256-bit AVX）
<2 x double> ; 2 個 double 的向量
```

### 陣列型別

```llvm
[10 x i32]        ; 10 個 i32 的陣列
[3 x [4 x float]] ; 3×4 的 float 二維陣列
```

### 結構型別

```llvm
; 具名結構（型別別名）
%struct.Point = type { i32, i32 }

; 匿名結構（字面量）
{ i32, float, ptr }

; 打包結構（無對齊填充）
<{ i8, i32 }>
```

### 函式型別

```llvm
i32 (i32, i32)        ; 接受兩個 i32，回傳 i32
void (ptr, i32, ...)  ; 可變引數函式
```

### 特殊型別

```llvm
void    ; 無回傳值
label   ; 基本塊標籤
token   ; 用於 coroutine / exception 處理
metadata; Metadata 節點
```

---

## 指令集

### 終止指令（Terminator Instructions）

每個基本塊必須以終止指令結尾：

```llvm
; 無條件跳轉
br label %target

; 條件跳轉
br i1 %cond, label %true_bb, label %false_bb

; 函式回傳
ret i32 %val
ret void

; switch 跳轉表
switch i32 %val, label %default [
  i32 0, label %case0
  i32 1, label %case1
  i32 2, label %case2
]

; 間接跳轉（用於計算 goto）
indirectbr ptr %addr, [label %bb1, label %bb2]

; 呼叫後回傳（用於異常處理）
invoke i32 @foo() to label %normal unwind label %exception

; 不可達程式碼
unreachable
```

### 二元運算指令

```llvm
; 整數算術
%r = add  i32 %a, %b   ; 加法
%r = sub  i32 %a, %b   ; 減法
%r = mul  i32 %a, %b   ; 乘法
%r = udiv i32 %a, %b   ; 無號除法
%r = sdiv i32 %a, %b   ; 有號除法
%r = urem i32 %a, %b   ; 無號餘數
%r = srem i32 %a, %b   ; 有號餘數

; 帶 overflow 旗標的整數算術
%r = add nsw i32 %a, %b  ; no signed wrap
%r = add nuw i32 %a, %b  ; no unsigned wrap
%r = mul nsw nuw i32 %a, %b

; 浮點算術（必須有 fast-math flags 或不加）
%r = fadd float %a, %b
%r = fsub float %a, %b
%r = fmul float %a, %b
%r = fdiv float %a, %b
%r = frem float %a, %b

; 位元運算
%r = and  i32 %a, %b
%r = or   i32 %a, %b
%r = xor  i32 %a, %b
%r = shl  i32 %a, %b   ; 左移
%r = lshr i32 %a, %b   ; 邏輯右移（補 0）
%r = ashr i32 %a, %b   ; 算術右移（補符號位）
```

### 記憶體操作指令

```llvm
; 在堆疊上分配記憶體
%ptr = alloca i32              ; 分配一個 i32
%arr = alloca i32, i32 10      ; 分配 10 個 i32 的陣列
%ptr = alloca i32, align 16    ; 指定對齊

; 讀取記憶體
%val = load i32, ptr %ptr
%val = load i32, ptr %ptr, align 4

; 寫入記憶體
store i32 42, ptr %ptr
store i32 %val, ptr %ptr, align 4

; 計算結構體/陣列成員的位址（GEP）
; GetElementPtr — 只計算位址，不存取記憶體
%field_ptr = getelementptr %struct.Point, ptr %p, i32 0, i32 1
%elem_ptr  = getelementptr [10 x i32], ptr %arr, i32 0, i32 3

; 帶 inbounds 標記（超出範圍為 UB，允許更多優化）
%ptr2 = getelementptr inbounds i32, ptr %base, i64 %idx

; 記憶體複製（對應 memcpy/memmove/memset）
call void @llvm.memcpy.p0.p0.i64(ptr %dst, ptr %src, i64 %size, i1 false)
call void @llvm.memmove.p0.p0.i64(ptr %dst, ptr %src, i64 %size, i1 false)
call void @llvm.memset.p0.i64(ptr %dst, i8 %val, i64 %size, i1 false)
```

### 型別轉換指令

```llvm
; 整數截斷（大型別 → 小型別）
%r = trunc i64 %val to i32

; 零延伸（小型別 → 大型別，無號）
%r = zext i8 %val to i32

; 符號延伸（小型別 → 大型別，有號）
%r = sext i8 %val to i32

; 浮點截斷
%r = fptrunc double %val to float

; 浮點延伸
%r = fpext float %val to double

; 浮點轉整數
%r = fptoui float %val to i32   ; 轉無號整數
%r = fptosi float %val to i32   ; 轉有號整數

; 整數轉浮點
%r = uitofp i32 %val to float   ; 無號整數轉浮點
%r = sitofp i32 %val to float   ; 有號整數轉浮點

; 指標與整數互轉
%r = ptrtoint ptr %ptr to i64
%r = inttoptr i64 %val to ptr

; 位元重解釋（不改變位元，只改變型別）
%r = bitcast i32 %val to float
```

### 比較指令

```llvm
; 整數比較（icmp）
; 謂詞：eq, ne, ugt, uge, ult, ule, sgt, sge, slt, sle
%r = icmp eq  i32 %a, %b   ; a == b
%r = icmp ne  i32 %a, %b   ; a != b
%r = icmp slt i32 %a, %b   ; a < b（有號）
%r = icmp ult i32 %a, %b   ; a < b（無號）

; 浮點比較（fcmp）
; 有序（o）vs 無序（u）：無序代表其中一個為 NaN 時也回傳 true
; 謂詞：oeq, ogt, oge, olt, ole, one, ord, ueq, ugt, uge, ult, ule, une, uno, true, false
%r = fcmp oeq float %a, %b   ; a == b（且都不是 NaN）
%r = fcmp ult float %a, %b   ; a < b（或有 NaN）
```

### PHI 指令

PHI 節點是 SSA 形式的核心，用於在控制流匯合點選擇值：

```llvm
; 語法：%result = phi <型別> [值, 來源基本塊], ...
%val = phi i32 [ %val_from_entry, %entry ], [ %val_from_loop, %loop ]
```

PHI 節點必須放在基本塊的最前面（在非 PHI 指令之前）。

### Select 指令

類似三元運算子，無分支條件選擇：

```llvm
%r = select i1 %cond, i32 %true_val, i32 %false_val
```

### 函式呼叫指令

```llvm
; 直接呼叫
%r = call i32 @add(i32 %a, i32 %b)
call void @foo()

; 間接呼叫（透過函式指標）
%r = call i32 %fn_ptr(i32 %arg)

; 尾呼叫優化提示
%r = tail call i32 @factorial(i32 %n)
%r = musttail call i32 @factorial(i32 %n)  ; 強制尾呼叫

; 帶屬性的呼叫
%r = call i32 @foo(i32 %x) #0

; 可變引數呼叫
%r = call i32 (ptr, ...) @printf(ptr %fmt, i32 %val)
```

### Intrinsic 函式

LLVM 提供許多內建的 intrinsic 函式，以 `@llvm.` 開頭：

```llvm
; 數學函式
%r = call float @llvm.sqrt.f32(float %x)
%r = call float @llvm.fabs.f32(float %x)
%r = call float @llvm.floor.f32(float %x)
%r = call float @llvm.ceil.f32(float %x)
%r = call float @llvm.pow.f32(float %x, float %y)
%r = call float @llvm.fma.f32(float %a, float %b, float %c)

; 位元操作
%r = call i32 @llvm.ctpop.i32(i32 %x)    ; popcount（計算 1 的個數）
%r = call i32 @llvm.ctlz.i32(i32 %x, i1 false)  ; leading zeros
%r = call i32 @llvm.cttz.i32(i32 %x, i1 false)  ; trailing zeros
%r = call i32 @llvm.bswap.i32(i32 %x)    ; byte swap

; Overflow 偵測（回傳 {結果, overflow 旗標}）
%res = call {i32, i1} @llvm.sadd.with.overflow.i32(i32 %a, i32 %b)
%val  = extractvalue {i32, i1} %res, 0
%ovfl = extractvalue {i32, i1} %res, 1

; 生命週期標記（幫助優化器）
call void @llvm.lifetime.start.p0(i64 4, ptr %ptr)
call void @llvm.lifetime.end.p0(i64 4, ptr %ptr)

; Expect（分支預測提示）
%r = call i1 @llvm.expect.i1(i1 %val, i1 true)  ; 預期為 true
```

---

## SSA 形式

**靜態單賦值（Static Single Assignment，SSA）** 是 LLVM IR 最重要的特性之一。

### SSA 的規則

在 SSA 形式中，**每個虛擬暫存器只被賦值恰好一次**：

```llvm
; 不合法（%x 被賦值兩次）—— 這在 LLVM IR 中是非法的
%x = add i32 1, 2
%x = mul i32 %x, 3   ; 錯誤！

; 合法的 SSA 形式
%x1 = add i32 1, 2
%x2 = mul i32 %x1, 3
```

### SSA 的好處

- **簡化資料流分析**：def-use 鏈是顯式的，一個值的定義直接連結到所有使用
- **更容易優化**：常數傳播、死碼消除、值替換等優化都更直接
- **無需別名分析**（對暫存器）：每個暫存器名稱唯一標識一個值

### PHI 節點解決控制流匯合

當多條控制流路徑匯合時，需要 PHI 節點：

```llvm
; if (cond) { x = 1; } else { x = 2; } return x;
define i32 @example(i1 %cond) {
entry:
  br i1 %cond, label %then, label %else

then:
  br label %merge

else:
  br label %merge

merge:
  ; PHI 節點：根據來自哪個基本塊選擇值
  %x = phi i32 [ 1, %then ], [ 2, %else ]
  ret i32 %x
}
```

### mem2reg：從 alloca 到 SSA

實際上，前端（如 Clang）通常先用 `alloca` + `load`/`store` 表示局部變數，再由 `mem2reg` pass 將其提升為 SSA 形式：

```llvm
; Clang 生成的原始形式（使用 alloca）
define i32 @add(i32 %a, i32 %b) {
entry:
  %a.addr = alloca i32
  %b.addr = alloca i32
  store i32 %a, ptr %a.addr
  store i32 %b, ptr %b.addr
  %0 = load i32, ptr %a.addr
  %1 = load i32, ptr %b.addr
  %add = add i32 %0, %1
  ret i32 %add
}

; mem2reg 優化後的 SSA 形式
define i32 @add(i32 %a, i32 %b) {
entry:
  %add = add i32 %a, %b
  ret i32 %add
}
```

---

## 記憶體模型

### alloca 與堆疊

`alloca` 在**當前函式的堆疊幀**上分配記憶體，函式返回時自動釋放：

```llvm
define void @example() {
entry:
  %x = alloca i32, align 4         ; 分配局部 int 變數
  %arr = alloca [10 x i32], align 4 ; 分配局部陣列
  store i32 0, ptr %x
  ; ... 使用 %x 和 %arr
  ret void  ; 堆疊上的記憶體自動釋放
}
```

### GEP（GetElementPtr）詳解

GEP 是計算複合型別內部元素位址的指令，**只計算位址，不存取記憶體**：

```llvm
; 結構體成員存取
; struct Point { int x; int y; };
; Point p; p.y 的位址
%struct.Point = type { i32, i32 }
%p = alloca %struct.Point
; GEP 語法：getelementptr <基底型別>, <指標>, <索引列表>
; 第一個索引（i32 0）：指標解引用層次
; 第二個索引（i32 1）：結構體第 1 個欄位（y）
%y_ptr = getelementptr %struct.Point, ptr %p, i32 0, i32 1

; 陣列元素存取
; int arr[10]; &arr[3]
%arr = alloca [10 x i32]
%elem3 = getelementptr [10 x i32], ptr %arr, i32 0, i32 3

; 多層巢狀
; struct Matrix { int data[4][4]; }; &m.data[1][2]
%Matrix = type { [4 x [4 x i32]] }
%m = alloca %Matrix
%elem = getelementptr %Matrix, ptr %m, i32 0, i32 0, i32 1, i32 2
```

### Volatile 與 Atomic

```llvm
; Volatile 讀寫（避免編譯器優化掉的副作用）
%val = load volatile i32, ptr %mmio_reg
store volatile i32 %val, ptr %mmio_reg

; Atomic 操作（用於多執行緒同步）
; ordering: unordered, monotonic, acquire, release, acq_rel, seq_cst
%old = load atomic i32, ptr %ptr seq_cst
store atomic i32 %val, ptr %ptr release

; Atomic read-modify-write
; op: xchg, add, sub, and, nand, or, xor, max, min, umax, umin, fadd, fsub
%old = atomicrmw add ptr %ptr, i32 1 seq_cst

; Compare-and-swap
; cmpxchg <ptr> <期望值> <新值> <成功 ordering> <失敗 ordering>
%pair = cmpxchg ptr %ptr, i32 %expected, i32 %new seq_cst acquire
%val   = extractvalue { i32, i1 } %pair, 0  ; 舊值
%succ  = extractvalue { i32, i1 } %pair, 1  ; 是否成功
```

---

## 函式與呼叫約定

### 函式定義語法

```llvm
define [linkage] [visibility] [calling_conv] [ret_attrs]
       <ReturnType> @<FunctionName>([params]) [fn_attrs] [section]
       [comdat] [align N] [gc] [prefix] [prologue] [personality]
{
  <基本塊列表>
}
```

### 呼叫約定（Calling Convention）

```llvm
define cc10 i32 @swift_func(i32 %x)    ; Swift 呼叫約定
define ccc  i32 @c_func(i32 %x)        ; C 呼叫約定（預設）
define fastcc i32 @fast_func(i32 %x)   ; LLVM 內部快速呼叫約定
define coldcc i32 @cold_func(i32 %x)   ; 冷路徑呼叫約定
define webkit_jscc i32 @js_func(i32 %x) ; WebKit JS 呼叫約定
define tailcc i32 @tail_func(i32 %x)   ; 支援尾呼叫的呼叫約定
```

### 參數屬性（Parameter Attributes）

```llvm
define i32 @foo(
  i32 %x,
  ptr noalias %p,        ; 指標不與其他指標別名
  ptr nocapture %q,      ; 指標不會被保留（逃逸）
  ptr readonly %r,       ; 只讀指標
  ptr writeonly %w,      ; 只寫指標
  i32 zeroext %z,        ; 零延伸參數（呼叫約定用）
  i32 signext %s,        ; 符號延伸參數
  ptr nonnull %nn,       ; 非空指標
  ptr align 16 %al,      ; 對齊保證
  ptr dereferenceable(8) %d  ; 至少可以解引用 8 bytes
)
```

### 函式屬性（Function Attributes）

```llvm
define i32 @foo() #0

attributes #0 = {
  noinline          ; 禁止 inline
  alwaysinline      ; 強制 inline
  nounwind          ; 不拋出異常
  readonly          ; 不修改記憶體（只讀）
  writeonly         ; 不讀取記憶體
  norecurse         ; 不遞迴
  willreturn        ; 一定會返回（不會無限迴圈）
  speculatable      ; 可以被推測執行（無副作用）
  pure              ; 純函式（只依賴參數）
  hot               ; 熱路徑
  cold              ; 冷路徑
  optnone           ; 禁止優化（用於 -O0 或除錯）
  optsize           ; 優化程式碼大小
  sanitize_address  ; AddressSanitizer 插樁
  "frame-pointer"="all"  ; 保留 frame pointer
}
```

---

## Metadata 與 Debug Info

### Metadata 基礎

Metadata 是附加在 IR 上的額外資訊，不影響程式語義，但可以被 Pass 和工具使用：

```llvm
; Metadata 節點（以 ! 開頭）
!0 = !{i32 1, !"hello"}
!1 = !{!0, i32 42}

; 在指令上附加 Metadata
%val = load i32, ptr %ptr, !tbaa !2, !range !3

; 模組層 Metadata
!llvm.module.flags = !{!4, !5}
!4 = !{i32 1, !"wchar_size", i32 4}
!5 = !{i32 7, !"PIC Level", i32 2}
```

### TBAA（Type-Based Alias Analysis）

```llvm
; 告訴優化器這個 load/store 存取的型別，幫助別名分析
%val = load i32, ptr %ptr, !tbaa !{!"int", !{"Simple C/C++ TBAA"}}
```

### Debug Info（DWARF）

除錯資訊以 Metadata 形式嵌入 IR（當使用 `-g` 編譯時）：

```llvm
; 附加到指令的行號資訊
%x = add i32 %a, %b, !dbg !10
!10 = !DILocation(line: 42, column: 5, scope: !11)

; 函式的 Debug Info
!11 = distinct !DISubprogram(
  name: "main",
  linkageName: "_main",
  file: !12,
  line: 1,
  type: !13,
  isLocal: false,
  isDefinition: true,
  scopeLine: 1,
  unit: !14
)
```

### Loop Metadata

控制迴圈優化的 Metadata：

```llvm
; 在迴圈的回邊（back-edge）分支上附加
br i1 %cond, label %loop, label %exit, !llvm.loop !20

!20 = distinct !{
  !20,
  !{!"llvm.loop.vectorize.enable", i1 true},
  !{!"llvm.loop.vectorize.width", i32 4},
  !{!"llvm.loop.unroll.count", i32 8}
}
```

---

## Attributes 與 Linkage

### Linkage Types（連結類型）

```llvm
; 外部連結（預設，其他模組可見）
define external i32 @foo() { ... }

; 內部連結（只在本模組可見，類似 static）
define internal i32 @bar() { ... }

; 私有（更嚴格的內部，連結器不可見）
define private i32 @baz() { ... }

; Weak（允許被其他強定義覆蓋）
define weak i32 @qux() { ... }

; LinkOnce（多個模組可定義，連結時選一個）
define linkonce i32 @quux() { ... }

; Available Externally（提示性定義，不參與連結）
define available_externally i32 @corge() { ... }

; 常見使用：inline 函式
define linkonce_odr i32 @inline_func(i32 %x) { ... }
define weak_odr i32 @another(i32 %x) { ... }
```

### 全域變數

```llvm
; 全域變數宣告
@x = global i32 0                    ; 可變全域變數
@y = constant i32 42                 ; 常數全域變數
@z = external global i32             ; 外部宣告（其他模組定義）
@w = private global i32 0            ; 私有全域變數
@s = global [5 x i8] c"hello"        ; 字串全域變數

; 對齊
@aligned = global i32 0, align 64

; 指定段（section）
@data = global i32 0, section ".mydata"

; TLS（執行緒本地儲存）
@tls_var = thread_local global i32 0
```

---

## 實際範例：從 C 到 IR

### 範例 1：簡單函式

**C 程式碼：**

```c
int add(int a, int b) {
    return a + b;
}
```

**LLVM IR：**

```llvm
define i32 @add(i32 %a, i32 %b) {
entry:
  %result = add i32 %a, %b
  ret i32 %result
}
```

### 範例 2：if-else 控制流

**C 程式碼：**

```c
int max(int a, int b) {
    if (a > b) return a;
    else return b;
}
```

**LLVM IR：**

```llvm
define i32 @max(i32 %a, i32 %b) {
entry:
  %cmp = icmp sgt i32 %a, %b
  br i1 %cmp, label %return_a, label %return_b

return_a:
  ret i32 %a

return_b:
  ret i32 %b
}
```

或使用 PHI 節點的版本：

```llvm
define i32 @max(i32 %a, i32 %b) {
entry:
  %cmp = icmp sgt i32 %a, %b
  br i1 %cmp, label %then, label %else

then:
  br label %merge

else:
  br label %merge

merge:
  %result = phi i32 [ %a, %then ], [ %b, %else ]
  ret i32 %result
}
```

### 範例 3：迴圈

**C 程式碼：**

```c
int sum(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        s += i;
    }
    return s;
}
```

**LLVM IR：**

```llvm
define i32 @sum(i32 %n) {
entry:
  %cmp_init = icmp sgt i32 %n, 0
  br i1 %cmp_init, label %loop, label %exit

loop:
  ; PHI 節點：i 和 s 在迴圈迭代間的值
  %i = phi i32 [ 0, %entry ], [ %i_next, %loop ]
  %s = phi i32 [ 0, %entry ], [ %s_next, %loop ]
  %s_next = add i32 %s, %i
  %i_next = add i32 %i, 1
  %cmp = icmp slt i32 %i_next, %n
  br i1 %cmp, label %loop, label %exit

exit:
  %result = phi i32 [ 0, %entry ], [ %s_next, %loop ]
  ret i32 %result
}
```

### 範例 4：結構體與指標

**C 程式碼：**

```c
typedef struct { int x; int y; } Point;

int get_x(Point *p) {
    return p->x;
}

void set_y(Point *p, int val) {
    p->y = val;
}
```

**LLVM IR：**

```llvm
%struct.Point = type { i32, i32 }

define i32 @get_x(ptr %p) {
entry:
  ; GEP：計算 p->x 的位址（第 0 個欄位）
  %x_ptr = getelementptr %struct.Point, ptr %p, i32 0, i32 0
  %x = load i32, ptr %x_ptr
  ret i32 %x
}

define void @set_y(ptr %p, i32 %val) {
entry:
  ; GEP：計算 p->y 的位址（第 1 個欄位）
  %y_ptr = getelementptr %struct.Point, ptr %p, i32 0, i32 1
  store i32 %val, ptr %y_ptr
  ret void
}
```

### 範例 5：遞迴函式（費氏數列）

**C 程式碼：**

```c
int fib(int n) {
    if (n <= 1) return n;
    return fib(n-1) + fib(n-2);
}
```

**LLVM IR：**

```llvm
define i32 @fib(i32 %n) {
entry:
  %cmp = icmp sle i32 %n, 1
  br i1 %cmp, label %base_case, label %recursive_case

base_case:
  ret i32 %n

recursive_case:
  %n1 = sub i32 %n, 1
  %n2 = sub i32 %n, 2
  %r1 = call i32 @fib(i32 %n1)
  %r2 = call i32 @fib(i32 %n2)
  %result = add i32 %r1, %r2
  ret i32 %result
}
```

---

## 操作 IR 的工具

### 常用命令列工具

| 工具 | 說明 |
|------|------|
| `clang -S -emit-llvm` | 將 C/C++ 編譯到 IR 文字格式 |
| `clang -emit-llvm -c` | 將 C/C++ 編譯到 Bitcode |
| `llvm-dis` | Bitcode → IR 文字格式 |
| `llvm-as` | IR 文字格式 → Bitcode |
| `opt` | 對 IR 執行優化 Pass |
| `llc` | 將 IR 編譯到機器碼或組合語言 |
| `lli` | 用 JIT 直接執行 IR |
| `llvm-link` | 連結多個 Bitcode 檔案 |
| `llvm-extract` | 從模組中提取函式 |
| `llvm-diff` | 比較兩個 IR 模組 |

### 生成與查看 IR

```bash
# 生成可讀 IR（不優化）
clang -O0 -S -emit-llvm foo.c -o foo.ll

# 生成優化後的 IR
clang -O2 -S -emit-llvm foo.c -o foo_opt.ll

# 僅執行 mem2reg 優化（最小化、最易讀）
clang -O0 -Xclang -disable-O0-optnone -S -emit-llvm foo.c -o foo_raw.ll
opt -passes=mem2reg foo_raw.ll -S -o foo_ssa.ll
```

### 使用 opt 執行 Pass

```bash
# 執行單個 Pass
opt -passes=mem2reg foo.ll -S -o out.ll

# 執行多個 Pass（以逗號分隔）
opt -passes="mem2reg,instcombine,simplifycfg" foo.ll -S -o out.ll

# 執行標準優化管線
opt -O2 foo.ll -S -o out.ll

# 查看所有可用的 Pass
opt --print-passes

# 印出 Pass 執行過程的 IR（每個 Pass 後）
opt -passes="mem2reg" --print-after-all foo.ll -S -o out.ll

# 只印出特定 Pass 前後的 IR
opt -passes="mem2reg" --print-before=mem2reg --print-after=mem2reg foo.ll -S
```

### 生成 CFG 視覺化

```bash
# 生成 CFG 的 DOT 圖
opt -passes=dot-cfg foo.ll -disable-output

# 使用 Graphviz 渲染
dot -Tpng .foo.dot -o foo_cfg.png
```

### llc：IR 到機器碼

```bash
# 生成 x86-64 組合語言
llc -march=x86-64 foo.ll -o foo.s

# 生成物件檔
llc -filetype=obj foo.ll -o foo.o

# 生成 ARM 組合語言
llc -march=arm foo.ll -o foo_arm.s

# 指定 CPU 和特性
llc -march=x86-64 -mcpu=skylake -mattr=+avx2 foo.ll -o foo.s
```

### LLVM C++ API 範例

```cpp
#include "llvm/IR/IRBuilder.h"
#include "llvm/IR/LLVMContext.h"
#include "llvm/IR/Module.h"

using namespace llvm;

int main() {
    LLVMContext ctx;
    Module mod("my_module", ctx);
    IRBuilder<> builder(ctx);

    // 建立函式型別：i32 (i32, i32)
    FunctionType *ft = FunctionType::get(
        Type::getInt32Ty(ctx),
        {Type::getInt32Ty(ctx), Type::getInt32Ty(ctx)},
        false
    );

    // 建立函式
    Function *fn = Function::Create(
        ft, Function::ExternalLinkage, "add", mod
    );

    // 設定參數名稱
    auto args = fn->args().begin();
    Value *a = args++; a->setName("a");
    Value *b = args;   b->setName("b");

    // 建立基本塊
    BasicBlock *entry = BasicBlock::Create(ctx, "entry", fn);
    builder.SetInsertPoint(entry);

    // 建立 add 指令並 ret
    Value *result = builder.CreateAdd(a, b, "result");
    builder.CreateRet(result);

    // 輸出 IR
    mod.print(errs(), nullptr);
    return 0;
}
```

---

## 進一步學習資源

- [LLVM Language Reference Manual](https://llvm.org/docs/LangRef.html) — 官方 IR 完整規格
- [LLVM Programmer's Manual](https://llvm.org/docs/ProgrammersManual.html) — C++ API 使用指南
- [Writing an LLVM Pass](https://llvm.org/docs/WritingAnLLVMNewPMPass.html) — 撰寫優化 Pass
- [Kaleidoscope Tutorial](https://llvm.org/docs/tutorial/) — 從零建立 LLVM 前端
- [LLVM IR Tutorial (FOSDEM)](https://llvm.org/devmtg/) — 歷年 LLVM 開發者大會簡報
