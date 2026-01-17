---
title: Program to Process
date: 2024-07-17
tags: CS
---

# **程式碼撰寫到運行**

> 隨手學習筆記，本筆記主要講述從 Program 到 Process 的過程
## 理解預處理、編譯、組譯、連結、載入、運行

![](https://i.imgur.com/7Wtz8XM.png)

[圖源](https://aben20807.blogspot.com/2018/08/1070824-c.html)



### *預處理(Preprocessor)*

```c
//test.c 
#include<stdio.h>
#define it5 5
int main(void){
    printf("hello world");
    printf("%d",it5);
}
```
這是大家一定都看得懂的程式碼，那我們的預處理器會對這段程式碼如何呢？它會把所有巨集(Macro)、標頭檔(*其實就是所有＃開頭的指令*)，都置換掉，置換是什麼意思？
> 讓我們看實際的過程

```shell
gcc -E -o test.i test.c 
//gcc -E(only preprocesee) -o(assign output filename) [output filename] [input filename]

```
*  gcc 後面的-E 參數代表只要把 source code 進行預處理就可以了
*  -o 是指定輸出檔案的名稱，這邊我指定名稱是 test.i
* **.i 是經過預處理後的程式碼的副檔名*
> gcc 是一套強大開源的 Compiler Driver，支援數種語言，在這邊我們可以把它看成一套工具來幫助我們做預處理、編譯、組譯、連結就可以了


gcc還有很多參數可以使用，在網路上都可以輕易的查詢，後面也還會再介紹幾個

```c

//上略
...
extern char *ctermid (char *__s) __attribute__ ((__nothrow__ , __leaf__));
# 840 "/usr/include/stdio.h" 3 4
extern void flockfile (FILE *__stream) __attribute__ ((__nothrow__ , __leaf__));



extern int ftrylockfile (FILE *__stream) __attribute__ ((__nothrow__ , __leaf__)) ;


extern void funlockfile (FILE *__stream) __attribute__ ((__nothrow__ , __leaf__));
# 858 "/usr/include/stdio.h" 3 4
extern int __uflow (FILE *);
extern int __overflow (FILE *, int);
# 873 "/usr/include/stdio.h" 3 4

# 2 "test.c" 2

# 2 "test.c"
int main(void){
 printf("Hello,world");
 printf("%d",5);
    return 0;
}

```

這邊我們可以看到 ```#define it5 5``` 和 ```＃inculde<stdio.h>``` 確實都被取代了。

這邊置換成我們想要的結果後，卻多出了一些奇怪的數字那這些數字是什麼呢？

The numbers following the filename are flags:

* This indicates the start of a new file.
* This indicates returning to a file (after having included another file).
* This indicates that the following text comes from a system header file, so certain warnings should be suppressed.
* This indicates that the following text should be treated as being wrapped in an implicit extern "C" block.

[Source](https://stackoverflow.com/questions/33089168/what-do-the-numbers-mean-in-the-preprocessed-i-files-when-compiling-c-with-gcc)



大致理解預處理器到底在幹嘛了，可能心中又會有新的疑問


> 為什麼不直接 inculde source code　就好，為什麼要創造一個　HeaderFile，然後 Include 所謂的 HeaderFile，這樣感覺有點畫蛇添足*

**關於這個問題先來了解標頭檔的意義**

### 標頭檔的意義
> **就算 include 標頭檔，Compiler 在編譯時根本不知道你函數正確的位置 (使用動態連結時)**

這邊先打個岔，Binary 可以分成**動態連結**和**靜態連結**，如果是靜態連結那就會在連結的時候把正確位置填入，而動態連結則是運行時填入。
所以下面的討論都是基於動態連結，畢竟靜態連結沒什麼好說的，就是直接塞入正確位置

動態連結
* 運行時載入正確位置透過GOT,PLT 
  * Partial RELRO (gcc default)
    * Lazy binding(這個會有got hijack的問題) 
  * Full RELRO
    * 在運行的一開始就解析好所有符號

靜態連結

* 連結時填入固定位置

![first_plt_got](https://hackmd.io/_uploads/S1cxcrjpC.png)
![second_got_plt](https://hackmd.io/_uploads/H1b-5BspR.png)



以範例來說 include 標頭檔是為了 ```printf()``` 這個函數，但其實我們去 ```<stdio.h>``` 裡面查看其實他只有對```printf()``` 進行宣告而已，內部功能其實並沒有在這個檔案裡面，HeaderFile 作為編譯前會先被解析的部份，它(HeadFile)**作為宣告的集合**，是為了讓 Compiler 能認得函數的定義，知道有其函數，Compiler 才會乖乖編譯
![](https://i.imgur.com/xMXxNzH.png)

>*那這樣為什麼他能夠置卻執行 ```printf()```，是誰告訴程式函數在哪裡?又是什麼時候告訴程式的?*

**其實 Program 填寫正確函數位置要等到連結 (Linking) 時才會真正知道函數正確的位置 ，編譯器其實並不知道外部函數、變數的位置，一切都要靠動態連結器完成。**

這邊再補充一下，其實編譯器是會對 ```printf()``` 進行編譯，一般來說呼叫函式的組語是長這樣 ```call [function address]```，**只是 function address 不是填入該函數的正確位置**，而是一些與組語相關的數值(就是GOT、PLT的位置)，連結器則會根據數值和 <u>[Relocation table](https://en.wikipedia.org/wiki/Relocation_(computing))</u> 依序填入函數或變數的正確位置。

 >*既然連結器能夠知道函數和變數的位置，那回到一開始的問題，一樣都是宣告，比起 HeaderFile 我的.c file 還有定義函數行為，為什麼不 `include<xxx.c>` ，這樣不是更直觀更方便嗎？*

**如果我們直接 `include<xxx.c>`，那這樣我們當初就沒有分成兩個檔案的必要，我們需要include的原因其一就是希望能讓檔案分離、模組化**


> **延伸閱讀：標頭檔為一個完整的檔案做為插入.c/.cpp 檔案中，一般標頭檔的功能為Declaration(宣告)，而.c/.cpp作為Defined（定義），此做法可以加快編譯速度也可以避免重複宣告，只要include就可以使用。** [Why does C++ need a separate header file?](https://stackoverflow.com/questions/1305947/why-does-c-need-a-separate-header-file)
[How to use](https://docs.microsoft.com/zh-tw/cpp/cpp/header-files-cpp?view=msvc-170)



---------------------------

### *編譯(Compiler)*
* 詞法分析(lexical analyze)
    * 經過***前處理器***處理完的檔案進到 lexer 時，他會對檔案分割成一系列的 token，他需要確保檔案在進入下一個 stage(***Grammer Parser***)時，檔案內部的**變數**、**保留字**都應該符合規範，實際作法可以使用正則表達式(***Regular Expression***)去做檢查，常用工具：[lex](http://dinosaur.compilertools.net/) flex

考慮以下程式碼
```c 
array[index]= (index + 4) * (2 + 6)    
```

他會被分析成以下這些 token

| token | 類型     |
| ----- | -------- |
| array | 標識符   |
| [     | 左中括號 |
| index | 標識符   |
| ]     | 右中括號 |
| =     | 賦值     |
| (     | 左小括號 |
| index | 標識符   |
| +     | 加號     |
| 4     | 數字     |
| )     | 右小括號 |
| *     | 乘號     |
| (     | 左小括號 |
| 2     | 數字     |
| +     | 加號     |
| 6     | 數字     |
| )     | 右小括號 |




* 語法分析(Grammer Parser)

從上一個 stage 接收分析好的記號，並且進行語法分析，產生語法樹(Syntax Tree)，分析過程使用上下文無關語法(Context-free Grammer)的分析手段。產生的語法樹是由`表達式(Expression)` 為節點的樹。

> 可以看到整個語句被看成賦值表達式(assign expression)，賦值`=`的左邊是一個數組表達式，右邊是一個乘法表達式，數組表達式又是由兩個符號表達式所組成的，符號和數字是最小的表達式，他們通常存在在整顆樹的(Leaf Node)，另外有些符號有多重含義譬如說 c 語言中的 `*`，有乘法以及取值(refence)的操作，那就需要在這個階段去分類好

然後這裡也有一個工具叫做 yacc(yet another compiler compiler)

![image](https://hackmd.io/_uploads/rkPcpU0wA.png)




* 語意分析(Semantic Analyze)
    * void funciton {return 2}


* 產生中間代碼(Generate Middle Code)
    * IR
    * 多平台開發 參見 LLVM
    * 消除語法糖之類的東西
        *  方便最佳化


* 最佳化代碼


> 好懶，隨便先寫一點

#### 組譯(*Assembly*)

* 可以一一對應，把組合語言轉換成機器看得懂的機器碼


### 連結(Linking)

#### 連結器(*Linker*)
> 關於 Linker 最主要的功能就是把不同的　`.o file` 連結在一起，並且設定連結靜態庫 & 動態庫

![image](https://hackmd.io/_uploads/HkjtIoA60.png)


* Static Linking 
    * 把 program 與 靜態連結庫整合在一起，變成一個可執行的 Binary File (Binary file include Library)
* Dynamic Linking
    * 把 program 與 動態連結庫整合在一起，變成一個可執行的 Binary File (Binary file not include Library)
* Dynamic Linking? Dynamic Loading?

![image](https://hackmd.io/_uploads/BkdUHs0pC.png)




#### 載入

---
### 參考資訊

*  程序員的自我修養：鏈接、裝載與庫

* [Computer Science from the Bottom Up
](https://www.bottomupcs.com/)
