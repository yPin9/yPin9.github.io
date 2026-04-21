---
title: LLVM pass
date: 2026-02-26
tags: CS
---

---

## 目錄

1. [什麼是 LLVM Pass](#什麼是-llvm-pass)
2. [Pass 管理器：Legacy vs New PM](#pass-管理器legacy-vs-new-pm)
3. [Pass 的種類](#pass-的種類)
4. [New Pass Manager 架構](#new-pass-manager-架構)
5. [撰寫第一個 Pass](#撰寫第一個-pass)
6. [分析 Pass（Analysis Pass）](#分析-passanalysis-pass)
7. [轉換 Pass（Transform Pass）](#轉換-passtransform-pass)
8. [Pass 之間的依賴與保存](#pass-之間的依賴與保存)
9. [Pass Pipeline 與組合](#pass-pipeline-與組合)
10. [常用內建 Pass 介紹](#常用內建-pass-介紹)
11. [Pass 的插樁技術](#pass-的插樁技術)
12. [在 Clang 中載入外部 Pass](#在-clang-中載入外部-pass)
13. [除錯與測試 Pass](#除錯與測試-pass)
14. [完整範例：計數函式呼叫](#完整範例計數函式呼叫)

---

## 什麼是 LLVM Pass

LLVM Pass 是對 LLVM IR 進行分析或轉換的基本工作單元。整個 LLVM 的優化流水線（optimization pipeline）就是由一系列 Pass 串接而成的。

每個 Pass 做一件事：

- **分析 Pass（Analysis Pass）**：只讀取 IR，收集資訊（如支配樹、別名分析、迴圈資訊），供其他 Pass 使用。
- **轉換 Pass（Transform Pass）**：修改 IR，執行優化或插樁（如死碼消除、內聯、向量化）。

Pass 的作用範圍（granularity）從細到粗：

```
Instruction → BasicBlock → Loop → Function → Module
```

```
              ┌──────────────────────────────────────┐
              │             Module Pass               │
              │   ┌──────────────────────────────┐   │
              │   │        Function Pass          │   │
              │   │  ┌─────────────────────────┐ │   │
              │   │  │       Loop Pass          │ │   │
              │   │  │  ┌──────────────────┐   │ │   │
              │   │  │  │  BasicBlock Pass  │   │ │   │
              │   │  │  └──────────────────┘   │ │   │
              │   │  └─────────────────────────┘ │   │
              │   └──────────────────────────────┘   │
              └──────────────────────────────────────┘
```

Pass 設計原則：
- **組合性（Composable）**：Pass 可以任意組合、排列。
- **可重用性（Reusable）**：分析 Pass 的結果可以被多個轉換 Pass 共享。
- **可替換性（Substitutable）**：可以替換或插入自訂 Pass。

---

## Pass 管理器：Legacy vs New PM

LLVM 歷史上有兩套 Pass 管理器（Pass Manager），目前正在從舊版（Legacy PM）遷移到新版（New PM）：

| 特性 | Legacy Pass Manager | New Pass Manager（NPM）|
|------|---------------------|------------------------|
| 引入版本 | LLVM 早期 | LLVM 12 穩定，LLVM 14 預設啟用 |
| API 風格 | 繼承 `Pass` 基底類別 | 值語義（value semantics），模板 |
| 分析管理 | `AnalysisUsage` 靜態宣告 | `AnalysisManager` 動態查詢 |
| 分析快取 | 模組層級共享 | 精細的失效（invalidation）機制 |
| 執行緒安全 | 有限 | 更好的並行支援 |
| 狀態 | 逐漸棄用 | 現行標準，應優先使用 |

> **結論**：新專案應使用 **New Pass Manager（NPM）**。本文以 NPM 為主，附帶 Legacy PM 對照說明。

---

## Pass 的種類

### 依作用範圍分類

**New PM 中的 Pass 概念型別：**

```
IRUnitT（IR 單元）
  ├── Module           → ModulePass    （作用於整個模組）
  ├── Function         → FunctionPass  （作用於單個函式）
  ├── Loop             → LoopPass      （作用於單個迴圈）
  └── BasicBlock       → （較少直接用）
```

**分析 Pass 對應：**

```
ModuleAnalysisManager    → 管理模組層分析
FunctionAnalysisManager  → 管理函式層分析
LoopAnalysisManager      → 管理迴圈層分析
CGSCCAnalysisManager     → 管理 Call Graph SCC 層分析
```

### 依功能分類

| 類別 | 說明 | 範例 |
|------|------|------|
| 分析（Analysis） | 收集資訊，不修改 IR | DominatorTree、LoopInfo、AliasAnalysis |
| 優化（Optimization） | 改善程式效能 | mem2reg、GVN、LICM、向量化 |
| 降級（Lowering） | 將高階 IR 轉換為低階 IR | exception handling lowering |
| 插樁（Instrumentation） | 插入額外程式碼 | AddressSanitizer、PGO 插樁 |
| 驗證（Verification） | 檢查 IR 正確性 | verifier |

---

## New Pass Manager 架構

### 核心設計概念

New PM 的核心是**三個概念的分離**：

1. **Pass**：封裝一個分析或轉換操作。
2. **AnalysisManager**：快取並管理分析結果，提供按需查詢。
3. **PassManager**：排程並執行一組 Pass，管理失效。

```
PassManager<Function>
  ├── Pass A（Transform）
  │     └── 查詢 AnalysisManager → DominatorTreeAnalysis
  ├── Pass B（Transform）
  │     └── 查詢 AnalysisManager → LoopAnalysis（可能重用快取）
  └── Pass C（Analysis）
        └── 結果存入 AnalysisManager 供後續使用
```

### 關鍵標頭檔

```cpp
// Pass Manager 核心
#include "llvm/IR/PassManager.h"

// 各層分析管理器
#include "llvm/Analysis/LoopAnalysisManager.h"
#include "llvm/Analysis/CGSCCPassManager.h"

// Pass Builder（用於構建標準 pipeline）
#include "llvm/Passes/PassBuilder.h"
#include "llvm/Passes/PassPlugin.h"

// 常用分析
#include "llvm/Analysis/LoopInfo.h"
#include "llvm/Analysis/DominatorTree.h"
#include "llvm/Analysis/ScalarEvolution.h"
#include "llvm/Analysis/AliasAnalysis.h"
```

### PassBuilder 與標準 Pipeline

```cpp
#include "llvm/Passes/PassBuilder.h"

// 四個分析管理器（各層各一個）
LoopAnalysisManager LAM;
FunctionAnalysisManager FAM;
CGSCCAnalysisManager CGAM;
ModuleAnalysisManager MAM;

// PassBuilder 負責：
// 1. 向各分析管理器註冊內建分析
// 2. 提供 parsePassPipeline() 解析管線字串
// 3. buildPerModuleDefaultPipeline() 建立標準優化管線
PassBuilder PB;

// 交叉註冊（讓各層可以查詢其他層的分析）
PB.registerModuleAnalyses(MAM);
PB.registerCGSCCAnalyses(CGAM);
PB.registerFunctionAnalyses(FAM);
PB.registerLoopAnalyses(LAM);
PB.crossRegisterProxies(LAM, FAM, CGAM, MAM);

// 建立並執行 O2 優化管線
ModulePassManager MPM = PB.buildPerModuleDefaultPipeline(OptimizationLevel::O2);
MPM.run(Module, MAM);
```

---

## 撰寫第一個 Pass

### 範例：Hello World Pass（Function Pass）

這個 Pass 遍歷模組中每個函式，印出函式名稱和指令數量。

**檔案結構：**

```
HelloPass/
├── CMakeLists.txt
└── HelloPass.cpp
```

**HelloPass.cpp：**

```cpp
#include "llvm/IR/Function.h"
#include "llvm/IR/Module.h"
#include "llvm/IR/PassManager.h"
#include "llvm/Passes/PassBuilder.h"
#include "llvm/Passes/PassPlugin.h"
#include "llvm/Support/raw_ostream.h"

using namespace llvm;

// ===== Pass 定義 =====
// FunctionPass：對每個函式執行一次 run()
struct HelloPass : public PassInfoMixin<HelloPass> {

  // 核心方法：接受 Function 和 FunctionAnalysisManager
  // 回傳 PreservedAnalyses，告訴 Pass Manager 哪些分析仍然有效
  PreservedAnalyses run(Function &F, FunctionAnalysisManager &AM) {
    // 計算函式中的指令總數
    int inst_count = 0;
    for (auto &BB : F)
      for (auto &I : BB)
        inst_count++;

    errs() << "Function: " << F.getName()
           << "  (instructions: " << inst_count << ")\n";

    // 這個 Pass 沒有修改 IR，所以所有分析都仍然有效
    return PreservedAnalyses::all();
  }

  // 可選：靜態方法，表示此 Pass 不需要函式有 OptimizeNone 屬性
  static bool isRequired() { return false; }
};

// ===== 插件入口點 =====
// 讓 opt 可以用 -passes=hello 載入此 Pass
llvm::PassPluginLibraryInfo getHelloPassPluginInfo() {
  return {
    LLVM_PLUGIN_API_VERSION,
    "HelloPass",   // 插件名稱
    "v0.1",        // 版本
    [](PassBuilder &PB) {
      // 向 PassBuilder 註冊此 Pass
      PB.registerPipelineParsingCallback(
        [](StringRef Name, FunctionPassManager &FPM,
           ArrayRef<PassBuilder::PipelineElement>) {
          if (Name == "hello") {         // opt -passes=hello 的名稱
            FPM.addPass(HelloPass());
            return true;
          }
          return false;
        }
      );
    }
  };
}

// 必須定義此符號，讓 opt --load-pass-plugin 找到入口
extern "C" LLVM_ATTRIBUTE_WEAK ::llvm::PassPluginLibraryInfo
llvmGetPassPluginInfo() {
  return getHelloPassPluginInfo();
}
```

**CMakeLists.txt：**

```cmake
cmake_minimum_required(VERSION 3.20)
project(HelloPass)

# 找到 LLVM 安裝
find_package(LLVM REQUIRED CONFIG)
message(STATUS "Found LLVM ${LLVM_PACKAGE_VERSION}")
message(STATUS "Using LLVMConfig.cmake in: ${LLVM_DIR}")

list(APPEND CMAKE_MODULE_PATH "${LLVM_CMAKE_DIR}")
include(AddLLVM)

add_definitions(${LLVM_DEFINITIONS})
include_directories(${LLVM_INCLUDE_DIRS})

# 建立共享函式庫（插件）
add_library(HelloPass SHARED HelloPass.cpp)

# 連結 LLVM 函式庫
llvm_map_components_to_libnames(llvm_libs support core irreader)
target_link_libraries(HelloPass ${llvm_libs})

# 不需要前綴（LLVM 插件慣例）
set_target_properties(HelloPass PROPERTIES PREFIX "")
```

**編譯與執行：**

```bash
# 建立 build 目錄並編譯
mkdir build && cd build
cmake .. -DLLVM_DIR=/path/to/llvm/lib/cmake/llvm
make

# 準備測試用的 IR
echo 'int foo(int x) { return x + 1; }
int bar(int x, int y) { return x * y; }' > test.c
clang -S -emit-llvm test.c -o test.ll

# 使用 opt 載入並執行 Pass
opt --load-pass-plugin=./HelloPass.so --passes=hello test.ll -disable-output

# 預期輸出：
# Function: foo  (instructions: 3)
# Function: bar  (instructions: 3)
```

### Module Pass 範例

```cpp
struct ModuleInfoPass : public PassInfoMixin<ModuleInfoPass> {

  PreservedAnalyses run(Module &M, ModuleAnalysisManager &AM) {
    errs() << "Module: " << M.getName() << "\n";
    errs() << "  Functions: " << M.size() << "\n";

    int global_count = 0;
    for (auto &G : M.globals())
      global_count++;
    errs() << "  Globals: " << global_count << "\n";

    return PreservedAnalyses::all();
  }
};
```

---

## 分析 Pass（Analysis Pass）

分析 Pass 計算並快取可供其他 Pass 查詢的資訊，不修改 IR。

### 定義一個分析 Pass

```cpp
#include "llvm/IR/PassManager.h"
#include "llvm/IR/Function.h"

// 分析結果的型別（存放分析計算出的資料）
struct FunctionStats {
  std::string name;
  unsigned inst_count;
  unsigned bb_count;
  unsigned call_count;
};

// 分析 Pass 本體
struct FunctionStatsAnalysis
    : public AnalysisInfoMixin<FunctionStatsAnalysis> {

  // 必須定義：分析結果的型別
  using Result = FunctionStats;

  // 核心方法：計算並回傳分析結果
  Result run(Function &F, FunctionAnalysisManager &) {
    FunctionStats stats;
    stats.name = std::string(F.getName());
    stats.bb_count = F.size();

    for (auto &BB : F) {
      for (auto &I : BB) {
        stats.inst_count++;
        if (isa<CallInst>(&I) || isa<InvokeInst>(&I))
          stats.call_count++;
      }
    }
    return stats;
  }

  // 必須定義：唯一標識此分析的靜態 Key
  static AnalysisKey Key;
};

// 在 .cpp 檔案中定義 Key（提供存儲）
AnalysisKey FunctionStatsAnalysis::Key;
```

### 在 Transform Pass 中查詢分析結果

```cpp
struct PrintStatsPass : public PassInfoMixin<PrintStatsPass> {

  PreservedAnalyses run(Function &F, FunctionAnalysisManager &AM) {
    // 透過 AM.getResult<>() 查詢分析，
    // 若快取中沒有則自動計算
    auto &stats = AM.getResult<FunctionStatsAnalysis>(F);

    errs() << "Function: " << stats.name << "\n"
           << "  Basic Blocks : " << stats.bb_count << "\n"
           << "  Instructions : " << stats.inst_count << "\n"
           << "  Call Sites   : " << stats.call_count << "\n";

    return PreservedAnalyses::all();
  }
};
```

### 常用內建分析查詢

```cpp
PreservedAnalyses run(Function &F, FunctionAnalysisManager &AM) {
  // 支配樹（Dominator Tree）
  auto &DT = AM.getResult<DominatorTreeAnalysis>(F);

  // 後支配樹
  auto &PDT = AM.getResult<PostDominatorTreeAnalysis>(F);

  // 迴圈資訊
  auto &LI = AM.getResult<LoopAnalysis>(F);

  // Scalar Evolution（用於分析迴圈歸納變數）
  auto &SE = AM.getResult<ScalarEvolutionAnalysis>(F);

  // 別名分析（Alias Analysis）
  auto &AA = AM.getResult<AAManager>(F);

  // Target Library Info（目標平台函式庫資訊）
  auto &TLI = AM.getResult<TargetLibraryAnalysis>(F);

  // Target Transform Info（目標平台轉換代價）
  auto &TTI = AM.getResult<TargetIRAnalysis>(F);

  return PreservedAnalyses::all();
}
```

---

## 轉換 Pass（Transform Pass）

轉換 Pass 修改 IR。修改後必須正確回報哪些分析失效了。

### PreservedAnalyses：報告分析的有效性

```cpp
// 所有分析都仍然有效（Pass 沒有修改 IR）
return PreservedAnalyses::all();

// 所有分析都失效（保守做法，適合大幅修改 IR）
return PreservedAnalyses::none();

// 僅保留特定分析
PreservedAnalyses PA;
PA.preserve<DominatorTreeAnalysis>();
PA.preserve<LoopAnalysis>();
return PA;

// 保留所有分析，但標記 CFG 沒有改變
PreservedAnalyses PA = PreservedAnalyses::all();
PA.preserveSet<CFGAnalyses>();
return PA;
```

### 範例：死碼消除（簡化版）

```cpp
#include "llvm/IR/Instructions.h"
#include "llvm/Transforms/Utils/BasicBlockUtils.h"

struct SimpleDCE : public PassInfoMixin<SimpleDCE> {

  PreservedAnalyses run(Function &F, FunctionAnalysisManager &AM) {
    bool changed = false;

    // 收集無用指令（沒有使用者且有副作用的不算）
    SmallVector<Instruction *, 16> to_erase;
    for (auto &BB : F) {
      for (auto &I : BB) {
        // 若指令的結果沒有被任何人使用，
        // 且指令本身不帶副作用（isSafeToRemove），則可以刪除
        if (I.use_empty() && !I.isTerminator() &&
            !I.mayHaveSideEffects()) {
          to_erase.push_back(&I);
        }
      }
    }

    for (auto *I : to_erase) {
      I->eraseFromParent();
      changed = true;
    }

    if (!changed)
      return PreservedAnalyses::all();

    // CFG 結構未改變（只刪除了指令，沒有新增/刪除基本塊）
    PreservedAnalyses PA;
    PA.preserveSet<CFGAnalyses>();
    return PA;
  }
};
```

### 範例：常數折疊（Constant Folding）

```cpp
#include "llvm/Analysis/ConstantFolding.h"
#include "llvm/IR/Constants.h"

struct SimpleConstFold : public PassInfoMixin<SimpleConstFold> {

  PreservedAnalyses run(Function &F, FunctionAnalysisManager &AM) {
    auto &TLI = AM.getResult<TargetLibraryAnalysis>(F);
    const DataLayout &DL = F.getParent()->getDataLayout();
    bool changed = false;

    for (auto &BB : F) {
      for (auto &I : BB) {
        // 嘗試對指令進行常數折疊
        if (Constant *C = ConstantFoldInstruction(&I, DL, &TLI)) {
          // 用常數結果替換所有使用
          I.replaceAllUsesWith(C);
          changed = true;
        }
      }
    }

    // 清理被替換但仍留在 BB 中的指令
    if (changed) {
      for (auto &BB : F) {
        SmallVector<Instruction *, 8> dead;
        for (auto &I : BB)
          if (I.use_empty() && !I.isTerminator())
            dead.push_back(&I);
        for (auto *I : dead)
          I->eraseFromParent();
    }

    return changed ? PreservedAnalyses::none() : PreservedAnalyses::all();
  }
};
```

### 範例：修改指令（替換 mul x, 2 為 shl x, 1）

```cpp
struct MulToShift : public PassInfoMixin<MulToShift> {

  PreservedAnalyses run(Function &F, FunctionAnalysisManager &AM) {
    SmallVector<Instruction *, 16> to_replace;

    for (auto &BB : F)
      for (auto &I : BB)
        if (auto *mul = dyn_cast<BinaryOperator>(&I))
          if (mul->getOpcode() == Instruction::Mul)
            if (auto *C = dyn_cast<ConstantInt>(mul->getOperand(1)))
              if (C->getValue().isPowerOf2())
                to_replace.push_back(mul);

    if (to_replace.empty())
      return PreservedAnalyses::all();

    IRBuilder<> Builder(F.getContext());
    for (auto *I : to_replace) {
      auto *mul = cast<BinaryOperator>(I);
      auto *C = cast<ConstantInt>(mul->getOperand(1));

      // 將 mul x, 2^n 替換為 shl x, n
      Builder.SetInsertPoint(mul);
      unsigned shift_amount = C->getValue().logBase2();
      Value *shift = Builder.CreateShl(
        mul->getOperand(0),
        ConstantInt::get(mul->getType(), shift_amount),
        mul->getName() + ".shl"
      );
      mul->replaceAllUsesWith(shift);
      mul->eraseFromParent();
    }

    PreservedAnalyses PA;
    PA.preserveSet<CFGAnalyses>();
    return PA;
  }
};
```

---

## Pass 之間的依賴與保存

### 分析依賴

當 Pass 需要某個分析時，直接透過 `AM.getResult<>()` 查詢即可，AnalysisManager 會自動：
1. 檢查快取中是否有有效的結果
2. 若無（或已失效），執行對應的分析 Pass 並快取結果

```cpp
// 在 Function Pass 中查詢函式層分析
PreservedAnalyses run(Function &F, FunctionAnalysisManager &FAM) {
  auto &DT = FAM.getResult<DominatorTreeAnalysis>(F);
  auto &LI = FAM.getResult<LoopAnalysis>(F);
  // ...
}

// 在 Module Pass 中查詢函式層分析（需要透過 proxy）
PreservedAnalyses run(Module &M, ModuleAnalysisManager &MAM) {
  // 取得函式分析管理器的代理
  auto &FAMProxy = MAM.getResult<FunctionAnalysisManagerModuleProxy>(M);
  auto &FAM = FAMProxy.getManager();

  for (auto &F : M) {
    auto &DT = FAM.getResult<DominatorTreeAnalysis>(F);
    // ...
  }
}
```

### 分析失效機制

```cpp
// 在 Transform Pass 中，若修改了函式的 CFG，
// 必須標記相關分析失效
PreservedAnalyses run(Function &F, FunctionAnalysisManager &AM) {
  // ... 修改 CFG ...

  // 方法 1：保守地宣告所有分析失效
  return PreservedAnalyses::none();

  // 方法 2：精確指出哪些分析失效
  PreservedAnalyses PA;
  // DominatorTree 因為 CFG 改變而失效（不保留）
  // LoopInfo 因為 CFG 改變而失效（不保留）
  // 但 AliasAnalysis 可能仍然有效（保留）
  PA.preserve<AAManager>();
  return PA;

  // 方法 3：若只修改了指令但未改變 CFG
  PreservedAnalyses PA = PreservedAnalyses::all();
  // CFGAnalyses 是一組預定義的「CFG 相關分析」集合
  // 若 CFG 沒變，可以保留這組分析
  PA.preserveSet<CFGAnalyses>();
  return PA;
}
```

### 手動失效分析

```cpp
// 在某些情況下需要手動告知 AM 某個分析已失效
AM.invalidate<DominatorTreeAnalysis>(F);

// 失效某個函式的所有分析
AM.invalidate(F, PreservedAnalyses::none());
```

---

## Pass Pipeline 與組合

### 使用字串指定 Pipeline

`opt` 工具使用 `-passes=` 選項接受管線字串：

```bash
# 執行單個 Pass
opt -passes=mem2reg foo.ll -S -o out.ll

# 執行多個 Function Pass（逗號分隔，依序執行）
opt -passes="mem2reg,instcombine,simplifycfg" foo.ll -S -o out.ll

# 明確指定作用範圍
opt -passes="function(mem2reg,instcombine)" foo.ll -S -o out.ll
opt -passes="module(inline,function(mem2reg))" foo.ll -S -o out.ll

# 迴圈 Pass 需要包在 loop() 中
opt -passes="function(loop(licm))" foo.ll -S -o out.ll

# 預設優化級別（等同 clang -O2）
opt -O2 foo.ll -S -o out.ll
opt -passes="default<O2>" foo.ll -S -o out.ll

# 加入自訂 Pass（需先載入插件）
opt --load-pass-plugin=./MyPass.so \
    -passes="function(my-pass,mem2reg)" foo.ll -S -o out.ll
```

### 在程式碼中構建 Pipeline

```cpp
// 建立函式層管線
FunctionPassManager FPM;
FPM.addPass(PromotePass());          // mem2reg
FPM.addPass(InstCombinePass());      // instcombine
FPM.addPass(SimplifyCFGPass());      // simplifycfg

// 將函式管線包入模組管線
ModulePassManager MPM;
MPM.addPass(createModuleToFunctionPassAdaptor(std::move(FPM)));

// 執行
MPM.run(M, MAM);
```

### Pass Adaptor

Pass Manager 用 Adaptor 在不同層之間橋接：

```cpp
// 讓 FunctionPassManager 在 Module 層執行
// （對模組中每個函式執行函式管線）
MPM.addPass(createModuleToFunctionPassAdaptor(std::move(FPM)));

// 讓 LoopPassManager 在 Function 層執行
FPM.addPass(createFunctionToLoopPassAdaptor(std::move(LPM)));

// 讓 CGSCCPassManager 在 Module 層執行
// （用於 Call Graph SCC 的跨函式優化，如 inlining）
MPM.addPass(createModuleToPostOrderCGSCCPassAdaptor(std::move(CGPM)));
```

### 在特定點注入自訂 Pass

PassBuilder 提供回調機制，讓插件在標準管線的特定點注入 Pass：

```cpp
PB.registerPipelineParsingCallback(/*...*/);  // 解析 -passes= 字串

// 在 O0 之後、其他優化之前
PB.registerPipelineStartEPCallback(
  [](ModulePassManager &MPM, OptimizationLevel) {
    MPM.addPass(MyModulePass());
  }
);

// 在向量化之前
PB.registerVectorizerStartEPCallback(
  [](FunctionPassManager &FPM, OptimizationLevel) {
    FPM.addPass(MyFunctionPass());
  }
);

// 在 Peephole 優化（instcombine）時
PB.registerPeepholeEPCallback(
  [](FunctionPassManager &FPM, OptimizationLevel) {
    FPM.addPass(MyPeepholePass());
  }
);

// 在函式簡化管線中
PB.registerScalarOptimizerLateEPCallback(
  [](FunctionPassManager &FPM, OptimizationLevel) {
    FPM.addPass(MyScalarPass());
  }
);

// 在最後一個模組優化之後
PB.registerOptimizerLastEPCallback(
  [](ModulePassManager &MPM, OptimizationLevel) {
    MPM.addPass(MyFinalPass());
  }
);
```

---

## 常用內建 Pass 介紹

### 純量優化 Pass

| Pass 名稱 | opt 字串 | 說明 |
|-----------|---------|------|
| mem2reg | `mem2reg` | 將 alloca/load/store 轉換為 SSA 暫存器，是 SSA 構造的核心 |
| InstCombine | `instcombine` | 指令合併：合併多個指令為更少的指令，進行代數化簡 |
| SimplifyCFG | `simplifycfg` | 簡化控制流圖：合併基本塊、消除死分支、簡化 switch |
| SROA | `sroa` | Scalar Replacement of Aggregates：把結構體拆成純量 |
| GVN | `gvn` | Global Value Numbering：消除冗餘計算（全域公共子式消除） |
| SCCP | `sccp` | Sparse Conditional Constant Propagation：常數傳播 |
| DCE | `dce` | Dead Code Elimination：消除永遠不會執行的程式碼 |
| ADCE | `adce` | Aggressive DCE：更激進的死碼消除 |
| CorrelatedValuePropagation | `correlated-propagation` | 利用條件資訊傳播值的範圍 |
| JumpThreading | `jump-threading` | 跳轉串接：消除不必要的間接跳轉 |
| TailCallElim | `tailcallelim` | 尾呼叫消除：將尾呼叫轉換為迴圈 |
| Reassociate | `reassociate` | 重新結合算術表達式以利後續優化 |
| EarlyCSE | `early-cse` | 早期公共子式消除 |

### 迴圈優化 Pass

| Pass 名稱 | opt 字串 | 說明 |
|-----------|---------|------|
| LoopSimplify | `loop-simplify` | 將迴圈轉換為標準形式（有 preheader、唯一 exit） |
| LCSSA | `lcssa` | Loop-Closed SSA Form：讓迴圈外的使用都透過 exit PHI |
| LICM | `licm` | Loop-Invariant Code Motion：將不變的計算提出迴圈 |
| LoopUnroll | `loop-unroll` | 迴圈展開：複製迴圈體減少分支開銷 |
| LoopVectorize | `loop-vectorize` | 迴圈向量化：自動使用 SIMD 指令 |
| LoopUnswitch | `loop-unswitch` | 迴圈外提條件：把迴圈內的不變條件移到迴圈外 |
| LoopRotate | `loop-rotate` | 迴圈旋轉：將 while 型迴圈轉為 do-while 型 |
| LoopIdiom | `loop-idiom` | 識別並替換迴圈為 memset/memcpy 等函式庫呼叫 |
| IndVarSimplify | `indvars` | 歸納變數化簡：簡化迴圈的歸納變數 |

### 跨函式優化 Pass

| Pass 名稱 | opt 字串 | 說明 |
|-----------|---------|------|
| Inliner | `inline` | 函式內聯：把小函式的呼叫替換為函式體 |
| ArgumentPromotion | `argpromotion` | 把傳指標的參數改成傳值（若可能）|
| DeadArgumentElimination | `deadargelim` | 消除未使用的函式參數 |
| GlobalDCE | `globaldce` | 消除未使用的全域變數和函式 |
| GlobalOpt | `globalopt` | 全域變數優化：常數化、刪除、轉化 |
| IPConstantPropagation | `ipconstprop` | 跨函式常數傳播 |
| MergeFunctions | `mergefunc` | 合併功能相同的函式（減少程式碼大小）|

---

## Pass 的插樁技術

插樁（Instrumentation）Pass 是一類特殊的轉換 Pass，不是為了優化，而是在程式中插入額外的程式碼（如計數器、檢查、記錄）。

### 範例：計數每個 BasicBlock 的執行次數

```cpp
#include "llvm/IR/IRBuilder.h"
#include "llvm/IR/Module.h"
#include "llvm/Passes/PassBuilder.h"
#include "llvm/Passes/PassPlugin.h"

using namespace llvm;

struct BBCounterPass : public PassInfoMixin<BBCounterPass> {

  PreservedAnalyses run(Module &M, ModuleAnalysisManager &MAM) {
    auto &Ctx = M.getContext();
    IRBuilder<> Builder(Ctx);

    // 宣告外部計數陣列（在 runtime 函式庫中定義）
    // 或直接用全域計數器
    FunctionCallee CounterFn = M.getOrInsertFunction(
      "__bb_counter",
      FunctionType::get(
        Type::getVoidTy(Ctx),
        {Type::getInt64Ty(Ctx)},  // BB 的唯一 ID
        false
      )
    );

    uint64_t bb_id = 0;
    for (auto &F : M) {
      if (F.isDeclaration()) continue;
      for (auto &BB : F) {
        // 在每個基本塊的第一個指令之前插入計數呼叫
        Builder.SetInsertPoint(&*BB.getFirstInsertionPt());
        Builder.CreateCall(CounterFn,
          {ConstantInt::get(Type::getInt64Ty(Ctx), bb_id++)});
      }
    }

    return PreservedAnalyses::none();
  }
};
```

### 範例：記憶體存取追蹤（簡化版 AddressSanitizer）

```cpp
struct MemTracerPass : public PassInfoMixin<MemTracerPass> {

  PreservedAnalyses run(Function &F, FunctionAnalysisManager &AM) {
    auto &M = *F.getParent();
    auto &Ctx = M.getContext();
    IRBuilder<> Builder(Ctx);

    // 宣告追蹤函式
    FunctionCallee LoadTraceFn = M.getOrInsertFunction(
      "__trace_load",
      FunctionType::get(Type::getVoidTy(Ctx),
                        {Type::getInt64Ty(Ctx)}, false)
    );
    FunctionCallee StoreTraceFn = M.getOrInsertFunction(
      "__trace_store",
      FunctionType::get(Type::getVoidTy(Ctx),
                        {Type::getInt64Ty(Ctx)}, false)
    );

    SmallVector<Instruction *, 32> mem_accesses;
    for (auto &BB : F)
      for (auto &I : BB)
        if (isa<LoadInst>(&I) || isa<StoreInst>(&I))
          mem_accesses.push_back(&I);

    for (auto *I : mem_accesses) {
      Builder.SetInsertPoint(I);
      Value *ptr = nullptr;
      FunctionCallee *trace_fn = nullptr;

      if (auto *LI = dyn_cast<LoadInst>(I)) {
        ptr = LI->getPointerOperand();
        trace_fn = &LoadTraceFn;
      } else {
        ptr = cast<StoreInst>(I)->getPointerOperand();
        trace_fn = &StoreTraceFn;
      }

      // 將指標轉換為整數（位址）
      Value *addr = Builder.CreatePtrToInt(
        ptr, Type::getInt64Ty(Ctx));
      Builder.CreateCall(*trace_fn, {addr});
    }

    return PreservedAnalyses::none();
  }
};
```

### 範例：Profile-Guided Optimization 插樁（邊緣計數）

```cpp
struct EdgeProfilePass : public PassInfoMixin<EdgeProfilePass> {

  PreservedAnalyses run(Function &F, FunctionAnalysisManager &AM) {
    auto &M = *F.getParent();
    auto &Ctx = M.getContext();

    // 為每條 CFG 邊建立全域計數器
    for (auto &BB : F) {
      auto *term = BB.getTerminator();
      for (unsigned i = 0; i < term->getNumSuccessors(); i++) {
        // 建立全域計數器
        std::string counter_name = ("__edge_" + F.getName() +
          "_" + BB.getName() + "_" +
          std::to_string(i)).str();

        auto *counter = new GlobalVariable(
          M, Type::getInt64Ty(Ctx),
          false,                           // 非常數
          GlobalValue::InternalLinkage,
          ConstantInt::get(Type::getInt64Ty(Ctx), 0),
          counter_name
        );

        // 在邊的目標基本塊入口插入遞增
        BasicBlock *succ = term->getSuccessor(i);
        IRBuilder<> Builder(&*succ->getFirstInsertionPt());
        Value *cur = Builder.CreateLoad(Type::getInt64Ty(Ctx), counter);
        Value *inc = Builder.CreateAdd(
          cur, ConstantInt::get(Type::getInt64Ty(Ctx), 1));
        Builder.CreateStore(inc, counter);
      }
    }

    return PreservedAnalyses::none();
  }
};
```

---

## 在 Clang 中載入外部 Pass

除了透過 `opt` 執行 Pass，也可以讓 Pass 在 Clang 的完整編譯流程中執行。

### 方法一：-fpass-plugin 選項（LLVM 13+）

```bash
# 直接在 Clang 編譯時載入外部 Pass
clang -fpass-plugin=./MyPass.so foo.c -o foo

# 搭配優化級別
clang -O2 -fpass-plugin=./MyPass.so foo.c -o foo
```

Pass 插件需要在 `getHelloPassPluginInfo()` 中使用以下回調之一注入：

```cpp
// 最常用：在 Pipeline 末端注入
PB.registerOptimizerLastEPCallback(
  [](ModulePassManager &MPM, OptimizationLevel OL) {
    MPM.addPass(MyPass());
  }
);

// 或在 Pipeline 開頭注入
PB.registerPipelineStartEPCallback(
  [](ModulePassManager &MPM, OptimizationLevel OL) {
    MPM.addPass(createModuleToFunctionPassAdaptor(MyFunctionPass()));
  }
);
```

### 方法二：Clang Plugin（更深度整合）

Clang Plugin 在 AST 層面操作，可以存取語義資訊，並注入 IR Pass：

```cpp
// ClangPlugin.cpp
#include "clang/Frontend/FrontendPluginRegistry.h"
#include "clang/CodeGen/BackendUtil.h"

class MyPlugin : public clang::PluginASTAction {
  // ...
  void ExecuteAction() override {
    // 可以在這裡修改 CodeGen 管線
  }
};

static clang::FrontendPluginRegistry::Add<MyPlugin>
X("my-plugin", "My Clang Plugin");
```

---

## 除錯與測試 Pass

### 印出 Pass 執行前後的 IR

```bash
# 在所有 Pass 執行前後各印一次 IR
opt -passes="mem2reg" --print-before-all --print-after-all foo.ll -S

# 只印特定 Pass 前後
opt -passes="mem2reg,instcombine" \
    --print-before=instcombine \
    --print-after=instcombine foo.ll -S

# 印出 Pass 管線（不執行）
opt -passes="default<O2>" --print-pipeline-passes foo.ll -disable-output
```

### Pass 執行統計

```bash
# 統計每個 Pass 的執行次數和是否修改了 IR
opt -passes="default<O2>" --stats foo.ll -disable-output

# 計時每個 Pass 的執行時間
opt -passes="default<O2>" --time-passes foo.ll -disable-output
```

### 使用 Verifier

```bash
# 在每個 Pass 之後執行驗證（Debug build 中預設啟用）
opt -passes="mem2reg" --verify-each foo.ll -S -o out.ll

# 只驗證輸入 IR 是否合法
opt -passes=verify foo.ll -disable-output
```

### 使用 FileCheck 測試

LLVM 的測試基礎架構使用 `FileCheck` 來驗證 Pass 的輸出：

```llvm
; test/hello_pass.ll
; RUN: opt --load-pass-plugin=%builddir/HelloPass.so \
; RUN:     --passes=hello %s -disable-output 2>&1 | FileCheck %s

; CHECK: Function: foo
; CHECK: Function: bar

define i32 @foo(i32 %x) {
  %r = add i32 %x, 1
  ret i32 %r
}

define i32 @bar(i32 %x, i32 %y) {
  %r = mul i32 %x, %y
  ret i32 %r
}
```

```bash
# 執行測試
llvm-lit test/hello_pass.ll

# 或直接用 FileCheck
opt --load-pass-plugin=./HelloPass.so --passes=hello test.ll \
    -disable-output 2>&1 | FileCheck test/hello_pass.ll
```

### 在 Pass 中使用 LLVM_DEBUG

```cpp
#include "llvm/Support/Debug.h"
#define DEBUG_TYPE "my-pass"

PreservedAnalyses run(Function &F, FunctionAnalysisManager &AM) {
  LLVM_DEBUG(dbgs() << "Running MyPass on " << F.getName() << "\n");

  for (auto &BB : F) {
    LLVM_DEBUG({
      dbgs() << "  Processing BB: " << BB.getName() << "\n";
      BB.dump();
    });
  }

  return PreservedAnalyses::all();
}
```

```bash
# 啟用除錯輸出（需要 LLVM Debug build）
opt --passes=my-pass --debug-only=my-pass foo.ll -disable-output

# 啟用所有除錯輸出
opt --passes=my-pass --debug foo.ll -disable-output
```

### 使用 STATISTIC 追蹤計數

```cpp
#include "llvm/ADT/Statistic.h"
#define DEBUG_TYPE "my-pass"

// 宣告統計變數
STATISTIC(NumInstructionsRemoved, "Number of instructions removed");
STATISTIC(NumFunctionsProcessed, "Number of functions processed");

PreservedAnalyses run(Function &F, FunctionAnalysisManager &AM) {
  NumFunctionsProcessed++;

  SmallVector<Instruction *, 16> dead;
  for (auto &BB : F)
    for (auto &I : BB)
      if (I.use_empty() && !I.isTerminator())
        dead.push_back(&I);

  for (auto *I : dead) {
    I->eraseFromParent();
    NumInstructionsRemoved++;
  }

  return dead.empty() ? PreservedAnalyses::all()
                      : PreservedAnalyses::none();
}
```

```bash
# 顯示統計（需要 LLVM Assertions build）
opt --passes=my-pass --stats foo.ll -disable-output
# 輸出：
# ===-------------------------------------------------------------------------===
#                           ... Statistics Collected ...
# ===-------------------------------------------------------------------------===
#   5 my-pass - Number of instructions removed
#   2 my-pass - Number of functions processed
```

---

## 完整範例：計數函式呼叫

這個範例實現一個完整的插樁 Pass，在執行期統計每個函式被呼叫的次數並在程式結束時印出報告。

**CallCounter.cpp：**

```cpp
#include "llvm/IR/Function.h"
#include "llvm/IR/IRBuilder.h"
#include "llvm/IR/Instructions.h"
#include "llvm/IR/Module.h"
#include "llvm/IR/PassManager.h"
#include "llvm/Passes/PassBuilder.h"
#include "llvm/Passes/PassPlugin.h"
#include "llvm/Support/raw_ostream.h"
#include "llvm/Transforms/Utils/ModuleUtils.h"

using namespace llvm;

static const char *CounterPrefix = "__callcount_";
static const char *PrintFnName = "__print_callcounts";

// 插入印出函式（在程式結束時呼叫）
static void insertPrintFunction(Module &M,
                                 SmallVector<GlobalVariable *, 16> &counters,
                                 SmallVector<std::string, 16> &names) {
  auto &Ctx = M.getContext();
  IRBuilder<> Builder(Ctx);

  // 定義 __print_callcounts 函式
  auto *VoidTy = Type::getVoidTy(Ctx);
  auto *PrintFT = FunctionType::get(VoidTy, false);
  auto *PrintFn = Function::Create(
    PrintFT, GlobalValue::InternalLinkage, PrintFnName, M);

  BasicBlock *entry = BasicBlock::Create(Ctx, "entry", PrintFn);
  Builder.SetInsertPoint(entry);

  // 宣告 printf
  auto *I64Ty = Type::getInt64Ty(Ctx);
  auto *I8PtrTy = PointerType::getUnqual(Ctx);
  FunctionCallee PrintfFn = M.getOrInsertFunction(
    "printf",
    FunctionType::get(Type::getInt32Ty(Ctx), {I8PtrTy}, true)
  );

  // 印出標題
  Value *header = Builder.CreateGlobalStringPtr(
    "\n=== Call Count Report ===\n");
  Builder.CreateCall(PrintfFn, {header});

  // 印出每個函式的計數
  Value *fmt = Builder.CreateGlobalStringPtr("  %-30s : %lld\n");
  for (size_t i = 0; i < counters.size(); i++) {
    Value *name_str = Builder.CreateGlobalStringPtr(names[i]);
    Value *count = Builder.CreateLoad(I64Ty, counters[i]);
    Builder.CreateCall(PrintfFn, {fmt, name_str, count});
  }

  Builder.CreateRetVoid();

  // 使用 atexit 或 llvm.global_dtors 在程式結束時呼叫印出函式
  appendToGlobalDtors(M, PrintFn, 0);
}

// 主 Pass
struct CallCounterPass : public PassInfoMixin<CallCounterPass> {

  PreservedAnalyses run(Module &M, ModuleAnalysisManager &MAM) {
    auto &Ctx = M.getContext();
    auto *I64Ty = Type::getInt64Ty(Ctx);
    IRBuilder<> Builder(Ctx);

    SmallVector<GlobalVariable *, 16> counters;
    SmallVector<std::string, 16> names;

    // 第一步：為每個函式建立全域計數器，並在函式入口插入遞增
    for (auto &F : M) {
      if (F.isDeclaration()) continue;
      if (F.getName().starts_with(CounterPrefix)) continue;
      if (F.getName() == PrintFnName) continue;

      std::string fname = std::string(F.getName());
      std::string counter_name = CounterPrefix + fname;

      // 建立 i64 型別的全域計數器，初始化為 0
      auto *counter = new GlobalVariable(
        M,
        I64Ty,
        false,
        GlobalValue::InternalLinkage,
        ConstantInt::get(I64Ty, 0),
        counter_name
      );

      counters.push_back(counter);
      names.push_back(fname);

      // 在函式的 entry 基本塊最前面插入計數器遞增
      BasicBlock &entry_bb = F.getEntryBlock();
      Builder.SetInsertPoint(&*entry_bb.getFirstInsertionPt());

      Value *cur = Builder.CreateLoad(I64Ty, counter, "cur_count");
      Value *inc = Builder.CreateAdd(
        cur,
        ConstantInt::get(I64Ty, 1),
        "inc_count"
      );
      Builder.CreateStore(inc, counter);
    }

    if (counters.empty())
      return PreservedAnalyses::all();

    // 第二步：插入印出函式並在程式結束時呼叫
    insertPrintFunction(M, counters, names);

    return PreservedAnalyses::none();
  }
};

// 插件入口
llvm::PassPluginLibraryInfo getCallCounterPluginInfo() {
  return {
    LLVM_PLUGIN_API_VERSION, "CallCounter", "v1.0",
    [](PassBuilder &PB) {
      // 支援 -passes=callcounter
      PB.registerPipelineParsingCallback(
        [](StringRef Name, ModulePassManager &MPM,
           ArrayRef<PassBuilder::PipelineElement>) {
          if (Name == "callcounter") {
            MPM.addPass(CallCounterPass());
            return true;
          }
          return false;
        }
      );
      // 也可以在 -O2 等標準管線中自動插入
      PB.registerOptimizerLastEPCallback(
        [](ModulePassManager &MPM, OptimizationLevel OL) {
          // 只在有優化時插入（可依需求調整）
          if (OL != OptimizationLevel::O0)
            MPM.addPass(CallCounterPass());
        }
      );
    }
  };
}

extern "C" LLVM_ATTRIBUTE_WEAK ::llvm::PassPluginLibraryInfo
llvmGetPassPluginInfo() {
  return getCallCounterPluginInfo();
}
```

**測試程式 test.c：**

```c
#include <stdio.h>

int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}

void greet(const char *name) {
    printf("Hello, %s!\n", name);
}

int main() {
    greet("World");
    greet("LLVM");
    printf("fib(10) = %d\n", fib(10));
    return 0;
}
```

**編譯與執行：**

```bash
# 編譯 Pass
mkdir build && cd build
cmake .. && make

# 插樁並執行
clang -fpass-plugin=./CallCounter.so -O1 ../test.c -o test
./test

# 預期輸出：
# Hello, World!
# Hello, LLVM!
# fib(10) = 55
#
# === Call Count Report ===
#   main                           : 1
#   greet                          : 2
#   fib                            : 177
```

---

## Legacy Pass Manager（對照參考）

雖然 Legacy PM 已逐漸棄用，許多舊程式碼和文章仍使用它，以下提供對照：

```cpp
// Legacy PM 的 Function Pass
#include "llvm/Pass.h"
#include "llvm/IR/Function.h"
#include "llvm/Support/raw_ostream.h"

namespace {
struct LegacyHelloPass : public FunctionPass {
  static char ID;
  LegacyHelloPass() : FunctionPass(ID) {}

  // 核心方法：回傳 true 代表修改了 IR
  bool runOnFunction(Function &F) override {
    errs() << "Function: " << F.getName() << "\n";
    return false;  // 沒有修改
  }

  // 宣告依賴的分析
  void getAnalysisUsage(AnalysisUsage &AU) const override {
    AU.setPreservesAll();  // 不修改任何分析
    // AU.addRequired<DominatorTreeWrapperPass>();  // 依賴支配樹
    // AU.addPreserved<LoopInfoWrapperPass>();       // 保留迴圈資訊
  }
};
}

char LegacyHelloPass::ID = 0;

// 靜態註冊（使用 opt 的 -legacy 前綴）
static RegisterPass<LegacyHelloPass>
X("legacy-hello", "Legacy Hello Pass",
  false,  // 不修改 CFG
  false   // 不是純分析 Pass
);
```

| New PM | Legacy PM |
|--------|-----------|
| `PassInfoMixin<T>` | `FunctionPass`, `ModulePass` |
| `run(Function&, FAM&)` | `runOnFunction(Function&)` |
| `PreservedAnalyses` 回傳值 | `bool` 回傳值（是否修改） |
| `AM.getResult<Analysis>()` | `getAnalysis<WrapperPass>()` |
| `AnalysisInfoMixin<T>` | `ModulePass` + `AnalysisUsage` |
| Plugin callback | `RegisterPass<T>` |

---

## 進一步學習資源

- [Writing an LLVM Pass (New PM)](https://llvm.org/docs/WritingAnLLVMNewPMPass.html) — 官方新版 Pass Manager 教學
- [LLVM Passes](https://llvm.org/docs/Passes.html) — 所有內建 Pass 的文件
- [LLVM Programmer's Manual](https://llvm.org/docs/ProgrammersManual.html) — IR 操作 API 參考
- [LLVM for Grad Students](https://www.cs.cornell.edu/~asampson/blog/llvm.html) — 面向研究者的 LLVM 入門
- [llvm-tutor](https://github.com/banach-space/llvm-tutor) — 包含 10+ 個範例 Pass 的教學專案（強烈推薦）
- [LLVM Developer Meeting Talks](https://llvm.org/devmtg/) — 歷年開發者大會演講影片
