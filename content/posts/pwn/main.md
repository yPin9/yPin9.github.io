---
title: PWN note
date: 2024-10-01
tags: CTF
---


> 本筆記使用intel syntax



## Register

> 在 Binary exploitation　中，Register 扮演相當重要的角色，因為他是我們 *CPU* 能直接/快速存取的硬體，大部分的 *Instruction* 都是在對 *Register* 做操作


#### 先來理解 *Register* 的命名規則

* *x64*
    * *rax*, *rbx*, *rcx*, *rdx*,*rsi*, *rdi*, *r8*, *r9*, *r10*, *r11*, *r12*, *r13*,*r14*,*r15*,*rsp*,*rbp*
    * *r* 在這邊代表的是***64bits***

* *x86* 
    * *eax*, *rbx*, *ecx*, *edx*, *esi*, *edi*, *esp*, *ebp*
    * *e* 在這邊代表的是 ***32bits***

> 並且 ***x64*** 的機器可以使用 *e* 開頭的 *Register*


#### 下面的圖清楚的介紹 *rax*,*eax*,*ah*,*al* 關係

```c
8Bytes |----------------RAX----------------|
4Bytes                   |-------EAX-------|		
2Bytes                   |-------AX--------|
1Bytes                   |---AH---|---AL---|
```

* 以 ***$RAX*** 系列為例，***$EAX*** 是 ***$RAX*** 的右半4Bytes
    *  我們依序執行 ***$RAX = 0;*** ***$EAX= 1;*** 執行後 ***$RAX*** 就會是1

---

* ***$RSP*** ----> ***s*** means ***stack*** is point to the top of the stack
* ***$RBP*** ----> ***b*** means ***base*** is point to the botton of the stack
* ***$RIP*** ----> ***i*** means ***instrustion*** is point to the current execution's instruction

> 在暫存器的使用會有一些習慣

* $RAX ----> 放Return value or System Call number

## Stack

> 在資料結構中的 Stack 是和我這邊的示例是相反的，我比較習慣倒著的 Layout


* ***x86*** 是指32bits 的指令集架構(Instruction set)，是來自早期 intel CPU 的命名都是以86 (e.g. i386) 結尾，現在則稱呼為 IA32 (Intel Architecture, 32-bits)

* ***x64*** 是指64bits 的指令集架構(Instruction set)，是由 AMD 設計，基於 ***x86*** 指令集的擴充，將原本的 32bits 擴充為 64bits，所以 ***x64*** 又稱 ***x86-64***, ***x86_64***, ***AMD64***


> 小歷史:當初 AMD 和 Intel 在32bits 時期都在開發64bits 的指令架集，但他們方向卻大相徑庭。
> 
> AMD 設計的 ***AMD64*** 是從 ***x86*** 擴充而來，並且可以向下(前)兼容，在64bits 的環境依舊可以執行32bits 的程式。 
> 
> Intel 則是設計一款不能向下(前)兼容的全新指令集，叫做 ***IA64*** ，能與之搭配的作業系統還是不時下最被廣泛使用的Windows XP 而是 Windows server
 
> 後來AMD因為能夠向下(前)兼容獲得了市場以及開發者 (開源社群) 的青睞，Intel也發現自己選擇的路錯了，後來也開發全新的產品 intel64，基本上與 AMD64 相同





| x64 addr  | x86 addr |     | *(High memory address)* |
| --- | ------ | -------------- | ----------------------- |
|  **0x30**   | **0x18** | Argurment 1    |                   |
|  **0x28**   | **0x14** | Return address |                   |
|  **0x20**   | **0x10** | Old RBP        |  <----- ***RBP***     |
|  **0x18**   | **0x0c** | local variable |                   |
|  **0X10**   | **0x08** | local variable |                   |
|  **0X08**   | **0x04** | local variable | <------ ***RSP***     |
|  **0X00**   | **0x00** | ....           | *(Low memory address)*|


> Stack 往低地址生長，Heap 則是往高地址生長

### Calling Convention
* x86
    * 4Bytes(32bits)
    * 函式 (Function) 的參數 (Argurment) 傳遞使用 Stack
*  x64
    * 8Bytes (64bits)
    * 函式(Function)的第七個以上的參數(Argurment)傳遞使用 Stack
    * Syscall 不使用stack傳遞(沒有六個以上參數的 syscall)
        * 使用 Register 快速、安全，System Call 不能出錯

> 這個其實沒有那麼重要，但我怕忘記就先放這了 https://www.educative.io/answers/parameter-vs-argument


## Protect method for binary

* NX (*No eXecute*)
    * ***heap***, ***stack***, ***.bss*** 沒有執行權限
    * ***.bss*** 在目前版本(已經很久了)的 ***gcc*** 已經預設沒執行權限了
* PIE (*Posistion Independent Execution*)
    * ***.data***, ***.text***, ***.bss*** 的 *Variable/Function address* 都變成 *offset*
    * 這個 *offset* 是之於整個 *binary* 的起始位置
    * 如果要執行這個函數，會先找到 *base* 然後再加上 *offset* ，就可以順利執行函數
    * *Compiler handle*
* ASLR (*Address Space Layout Random*)
    * Random base address
        * ***Stack***, ***Share library***,***heap***
    * *OS handle* 
* Canary [/kəˈner.i/]
    * ***Canary*** 是一串透過 *kernal* 生成的值(隨機，難以預測)
    * 防止 stack overflow 
    * 在 *$rbp* 前(*$rbp + 8*) 放入 ***canary***，並且在執行時會去檢查 ***canary*** 是否被修改，如果被修改就會報 ***stack smashing detected***










## The Stack operation when we call a function

在進入正題之前先來理解我們程式在 call function 時會做哪些事

> * 為什麼 A function 不能使用 B function 的 Local variable? 
> * 每個 function 都有自己的 Stack space，那要怎麼構造這一個個的 Stack space?


*理解 The Stack operation when we call a function　後就能很清楚知道上面這些問題的解答，並且大部分的 pwn 技巧基本上都是基於這個基礎上的變化，所以理解 stack 的操作是至關重要的*


---

> 考慮以下簡易的組語

```asm
.main
    ...
    ...
    call myfunction()/ //push next RIP; jmp myFunction(); 
    mov rbx, rax
    ...
    ...
    
.myfunction()
    push rbp
    mov     rbp, rsp
    sub     rsp, 32 // here's 32 is depends on compiler and function, if function need more stack space here will be larger than 32
    ...
    ...
    leave  // mov rsp,rbp; `pop rbp`
    ret   // pop rip;
```

> 先備知識
* ***call myFunction();*** 可以拆解成以下兩個指令 
    * ***push (next RIP);*** 
        * ***(next RIP);*** 是 ***call myFunction();*** 的下一條指令 也就是 ***mov rbx, rax***
        * 執行完  ***myFunction();*** 後需要跳轉回來，就是跳轉到 ***mov rbx, rax***
    * ***jmp myFunction();***
        * 跳轉到 *Function address*
* ***leave*** 可以拆解成以下兩個指令
    * ***mov rsp,rbp;*** 
        * let ***$rsp*** return to ***init address***
            * ***init address***
                * 進入這個 *function* 前的位置，但其實不夠精確，是進入 *functuion* 前 *+0x10* 的位置，至於為什麼後面理解 *stack* 的操作就知道了
    * ***pop $rbp;*** 
        * ***$rsp*** is point old *$rbp* now,then pop to *$rbp*
* ***ret*** 等價於
    * ***pop $rip;***
        * ***$rsp*** is point return address now,then pop to ***$rbp***


```asm
.main
    ...
    ...
    call myfunction()/ //push next RIP; jmp myFunction(); 
    mov rbx, rax
    ...
    ...
    
.myfunction()
    push rbp
    mov     rbp, rsp
    sub     rsp, 32 // here's 32 is depends on compiler and function, if function need more stack space here will be larger than 32
    ...
    ...
    leave  // mov rsp,rbp; `pop rbp`
    ret   // pop rip;


```

1. 當執行(還沒執行，準確來說是 ***$rip*** 指在第四行)第四行 ***call myfunction()*** 時的 *stack* 長這樣
 
    ***$rip***----> ***call myfunction()***


    | argurment 2    |             |
    | -------------- | ----------------------- |
    | argurment 1    |                         |
    | Return address |                         |
    | old RBP        | <----- ***$rbp***            |
    | local variable |                         |
    | local variable |                         |
    | local variable | <------ ***$rsp***           |
    | ....           |  |

2. 執行 ***call myfunction()*** 後 (***push (next RIP);*** ***jmp myFunction();*** )
    > 下一條指令被 push 進 stack，然後 jump 到 myfunction 的第一條指令
    
    ***$rip***---->  ***push rbp***

    | argurment 2    |                         |
    | -------------- | ----------------------- |
    | argurment 1    |                         |
    | Return address |                         |
    | old RBP        | <----- ***$rbp***            |
    | local variable |                         |
    | local variable |                         |
    | local variable |                         |
    | ***mov rbx, rax*** 's addr (return addr)     | <------ ***$rsp***   |

3. 執行 ***push rbp***

    > * 一般來說我們會稱 目前 ***$rsp*** 指向的地方為 ***old rbp*** 或是稱之為 ***save rbp***
    > * 這邊的 ***caller*** 是 ***main*** 所以我直接使用 ***main's RBP***，就是 ***main*** 這個 *function* 原本儲存在 ***$rbp*** 裡面的 ***value*** 也就是目前 ***$rbp*** 所儲存的 ***old RBP***

     ***$rip***---->  ***mov rbp, rsp***
    | argurment 2    |                         |
    | -------------- | ----------------------- |
    | argurment 1    |                         |
    | Return address |                         |
    | old RBP        | <----- ***$rbp***            |
    | local variable |                         |
    | local variable |                         |
    | local variable |                         |
    | ***mov rbx, rax*** 's addr (return addr)     |   |
    |main's RBP       |          <------ ***$rsp*** |
4. 執行 ***mov rbp, rsp***

    > 這樣的操作保存了 ***main*** 的重要資訊 ( ***$rbp*** 以及 ***call function*** 的下一條指令)，並且搭配下一條指令，就能把 ***myfunction*** 自己的 ***stack*** 給開好
 
     ***$rip***---->  ***sub rsp, 32***
    | argurment 2    |                         |
    | -------------- | ----------------------- |
    | argurment 1    |                         |
    | Return address |                         |
    | old RBP        |         |
    | local variable |                         |
    | local variable |                         |
    | local variable |                         |
    | ***mov rbx, rax*** 's addr (return addr)     |   |
    |main's RBP       |          <------ ***$rsp*** <----- ***$rbp***  |
5. 執行 ***sub rsp, 32***

    >這樣就開好了 ***myfunction*** 的 ***stack*** 了，這也就是每個 ***function*** 都有自己的 ***Stack space*** 的原因，以上這幾步都是 ***Compiler*** 加入的，接下來他就會執行這個 ***Function*** 實際的功能了，執行完之後就會執行 ***leave;  ret;*** 
 
     ***$rip***---->  ***...*** (這邊就是指向myfunction實際的指令，看他實際要做甚麼操作，但我很懶這邊用...簡略)
    | argurment 2    |                         |
    | -------------- | ----------------------- |
    | argurment 1    |                         |
    | Return address |                         |
    | old RBP        |                         |
    | local variable |                         |
    | local variable |                         |
    | local variable |                         |
    | ***mov rbx, rax*** 's addr (return addr)     |   |
    |main's RBP       |     <------ ***$rbp***      |
    |            |                       |
    |     | <------ ***$rsp***|
    
6. 即將執行 ***leave***

    我們假設這個 ***function*** 即將結束，並且在執行時增加了一些 ***local variable***
    
    > 接下來就可以觀察我們前面保存的資訊是怎麼幫助我們的 Register 一步步回到原本的位置
 
     ***$rip***---->  ***leave***
    | argurment 2    |                         |
    | -------------- | ----------------------- |
    | argurment 1    |                         |
    | Return address |                         |
    | old RBP        |                         |
    | local variable |                         |
    | local variable |                         |
    | local variable |                         |
    | ***mov rbx, rax*** 's addr (return addr)     |   |
    |main's RBP       |     <------ ***$rbp***      |
    |local variable  |                         |
    |local variable  |                         |
    |local variable  |                         |
    |local variable  |    <------ ***$rsp***        |
    
7. 執行 ***leave*** (***mov rsp,rbp; pop rbp;***)

    > 先執行 ***mov rsp,rbp***
    
     ***RIP***---->  ***ret***
    | argurment 2    |                         |
    | -------------- | ----------------------- |
    | argurment 1    |                         |
    | Return address |                         |
    | old RBP        |                         |
    | local variable |                         |
    | local variable |                         |
    | local variable |                         |
    | ***mov rbx, rax*** 's addr (return addr)     |   |
    |main's RBP       |     <------ ***$rbp***  <------ ***$rsp***       |
    |local variable  |                         |
    |local variable  |                         |
    |local variable  |                         |
    |local variable  |                         |
    
    > 再執行 ***pop rbp***
    
    > 這邊注意 ***pop rbp*** 會把 ***stack*** 最上面的數值放入 ***$rbp***，並且 ***$rsp*** 會減少一個單位，所以 ***$rsp*** 會指向 ***return address***

      ***$rip***---->  ***ret***
    | argurment 2    |                         |
    | -------------- | ----------------------- |
    | argurment 1    |                         |
    | Return address |                         |
    | old RBP        |        <------ ***RBP***                   |
    | local variable |                         |
    | local variable |                         |
    | local variable |                         |
    | ***mov rbx, rax*** 's addr (return addr)     |   <------ ***RSP***     |
    |main's RBP       |            |
    |local variable  |                         |
    |local variable  |                         |
    |local variable  |                         |
    |local variable  |                         |

7. 執行 ***ret*** (***pop rip***)

    > 可以回去第一步比對這兩個 ***stack*** 的 ***layout*** 完全一樣，經過這樣的操作就可以確保舊的 ***function*** 能夠保存好其 ***local variable***，在 ***call*** 一個 ***function*** 前後的 ***stack*** 都能夠一樣

    > 這樣也解釋了為什麼 ***A function*** 沒辦法使用 ***B function*** 所定義的 ***Local Variable*** (在正常情況下)
    
    ***$rip***---->  ***mov rbx, rax*** 
    | argurment 2    |                         |
    | -------------- | ----------------------- |
    | argurment 1    |                         |
    | Return address |                         |
    | old RBP        |        <------ ***RBP***                   |
    | local variable |                         |
    | local variable |                         |
    | local variable |     <------ ***RSP***                      |
    | ***mov rbx, rax*** 's addr (return addr)     |    |
    |main's RBP       |            |
    |local variable  |                         |
    |local variable  |                         |
    |local variable  |                         |
    |local variable  |                         |



> 這邊最後再補充一下，基本上 ***Linux*** 使用的 ***Calling Convention*** 是 ***Caller*** 清 ***(Clean) Stack***，所以現在 ***$rsp*** 回來後會再 ***adjust*** 回真正的位置 (如果在呼叫 ***function*** 前有使用 ***stack*** )，可以再用 ***GDB trace*** 看 ***stack*** 的變化


## BufferOverflow

介紹完 Stack 的操作後就可以介紹 Binary 中存在的 ***BufferOverflow***

> 考慮以下程式碼
``` c 
#include <stdio.h>
#include <string.h>
void success() { puts("You Hava already controlled it."); }
void vulnerable() {
  char s[12];
  gets(s);
  puts(s);
  return;
}
int main(int argc, char **argv) {
  vulnerable();
  return 0;
}
```

可以看到基本上正常操作是不會去職行到 ***success()*** ，但這個程式他使用了 ***gets()*** 去讀取使用者的輸入，而 ***gets()*** 本身並不會檢查輸入的大小是否合法(合乎程式設計者的預期)

1. 正常情況下
     
    | argurment 2    |                         |
    | -------------- | ----------------------- |
    | argurment 1    |                         |
    | Return address |                         |
    | old RBP        |                         |
    | local variable |                         |
    |  (return addr)  |                     | 
    |main's RBP       |     <------ ***$rbp***      |
    |local variable  |                         |
    |local variable  |                         |
    |local variable  |                         |
    |local variable  |    <------ ***$rsp***        |

2. 也是正常情況下(當使用者輸入合法數量個變數)
    
     
    | argurment 2    |                         |
    | -------------- | ----------------------- |
    | argurment 1    |                         |
    | Return address |                         |
    | old RBP        |                         |
    | local variable |                         |
    |  (return addr)  |                     | 
    |main's RBP       |     <------ ***$rbp***      |
    |aaaaaaaaaaaaaa  |                         |
    |aaaaaaaaaaaaaa  |                         |
    |aaaaaaaaaaaaaa |                         |
    |local variable  |    <------ ***$rsp***        |

3. 過多的輸入
    > 可以看到 ***$rbp*** 和 ***return address*** 都被蓋過去了，這就是所謂的 ***BufferOverflow***，一但我們可以控制 ***return address***，我們就可以在那邊填入 ***sucess()*** 的 ***address***s 這樣程式就會運行 ***sucess()***
     
    | argurment 2    |                         |
    | -------------- | ----------------------- |
    | argurment 1    |                         |
    | Return address |                         |
    | old RBP        |                         |
    | local variable |                         |
    |  address of **sucess()**  |                     | 
    |***aaaaaaaaaaaaaa***      |     <------ ***$rbp***      |
    |***aaaaaaaaaaaaaa***  |                         |
    |***aaaaaaaaaaaaaa***  |                         |
    |***aaaaaaaaaaaaaa*** |                         |
    |local variable  |    <------ ***$rsp***        |

> 最後在 ***leave;ret;*** 時，***$rip***就會跳轉到被覆蓋到的 ***Return address*** 也就是 ***address of*** **success()**，進而達到控制程式的執行流程



要預防 ***Bufferoverflow*** 可以透過限制輸入者可以輸入的字數，以及使用 ***canary***

> Canary[/kəˈner.i/] 會加在 ***return address*** 前一個單位，他是亂數產生，在執行時會確保 ***canary*** 的值不被改變，一旦使用者的輸入蓋過(***canary*** 改變) 則會 ***crash***， 而要去猜 ***canary*** 也不太實際

### Shellcode

> 但其實在大部分情況，不會有上面這種把寫好的後門塞在程式裡面讓我們使用，所以我們需要自己塞 ***shellcode*** 進 ***stack***，然後把 ***return address*** 設在 shellcode 的起始位置

> ***Shellcode*** 就是 ***machine code***，因為程式本身就是執行 ***machine code***，所以我們把 ***Shellcode*** 直接塞進程式，如果 ***$rip*** 指到我們的 ***Shellcode*** 程式就會執行我們的 ***Shellcode***

1. 大概會長下面這樣
    
     
    | Address |     Value      |               |
    |:-------:|:--------------:| ------------- |
    |  0x148  |  *shellcode*   |               |
    |  0x140  |  *shellcode*   |               |
    |  0x138  |  *shellcode*   |               |
    |  0x130  |  *shellcode*  |               |
    |  0x128  |    **0x130**     |               |
    |  0x120  |    AAAAAAAA    | <------ ***$rbp*** |
    |  0x118  | aaaaaaaaaaaaaa |               |
    |  0x110  | aaaaaaaaaaaaaa |               |
    |  0x108  | aaaaaaaaaaaaaa |               |
    |  0x100  | local variable | <------ ***$rsp*** |


這樣 ***ret*** 就會執行 ***0x130*** 那邊的指令，而 ***0x130*** 是我們塞入的 ***Shellcode***，所以我們就達成控制程式流程了



> 慢慢找，總會有喜歡的
[Shellcode DataBase](https://www.exploit-db.com/shellcodes)


## ROP 

![1726856309133](https://hackmd.io/_uploads/rkmAnEiTR.png)



![image](https://hackmd.io/_uploads/HkS8-IbTR.png)



> 隨著 NX 的開啟，我們往緩衝區塞入 ***Shellcode*** 的方式被阻擋後就可以嘗試 ***ROP***

ROP(*Return Oriented Programming*)，是一種程式設計方式，主要是透過一連串的 ***return***，完成程式邏輯。

因為 *NX* 的開啟，導致我們無法使用自己的 ***Shellcode*** ，所以我們可以把 ***Return Address*** 直接接到 *Binary* 可執行的 ***section*** (一般就是接回 ***.text***，利用原本就在程式碼中可執行的程式碼)，尋找我們需要的 Gadget(一般來說 ***gadgets*** 是指程式碼片段，像我上(上)面那張圖的 ***pop rax; ret;*** 就是存在在程式碼中的某一個可執行區段，那他就算是一個 ***gadget***) ，並且再利用 ***ROP*** 的概念，串成我們預期執行的指令

> * 基本概念就是我們透過尋找程式碼中本來就存在的可執行片段，這個可執行片段我們稱呼為 ***gadget***，然後把一些都是以 ***ret*** 結尾的 ***Gadgets*** 接在一起組合起來就是 ***ROP chain***
> * ***Gadgets*** 就像積木，而我們就是透過有限的 ***gadgets*** (積木) 組合出我們希望程式執行流程

至於為什麼一定要 ***ret*** 結尾可以看我下面的範例(其實**跳轉/控制程式執行流程的指令都可以** *e.g. jmp ...*)


1. 我們假設以下情況，當 ***function*** 執行完準備要 ***ret*** 時，這邊記得 ***ret*** 的意思相當於 ***pop $rip***

> ***$rip*** -> ***ret***


| Address | ...........    | <------ ***$rbp*** |
|:-------:| -------------- | ------------- |
|         |                |               |
|         |                |               |
|         |                |               |
|         |                |               |
|         |                |               |
|         |                |               |
|         |                |               |
|         |                |               |
|  0x120  | argurment 1    |               |
|  0x118  | Return address |               |
|  0x110  | old RBP        |               |
|  0x108  | local variable |               |
|  0x100  | (return addr)  | <------ ***$rsp*** |
    
    
2. 我們塞入我們找到的 ***gadget*** 的 *Address*
    > 補充一下，實際上應該是先塞 ***payload***，然後等待 ***function return***，不過不影響我們這邊解釋 ***ROP*** 的基本原理
    
    > 這邊我們假設我們的目標是執行完我們的 ROP 後 
    
    * ***$rdi*** = 0x100    
    
    * ***$rsi*** = 0x200 
    
    * ***$rdx*** = 0x300 
    
    > 並且我們透過 ROPgadget 找到以下存在在可執行段的可使用的 gadget
    
    * `0x40500` 存放 ***pop rdi; ret;***
    
    *  `0x40800` 存放 ***pop rsi; ret;***
    
    * `0x40990` 存放 ***pop rdx; ret***


    | Address |    ...........    | <------ ***$rbp*** |
    |:-------:|:-----------------:|:-------------:|
    |  0x128  |       0x300       |               |
    |  0x120  |     `0x40990`     |               |
    |  0x118  |       0x200       |               |
    |  0x110  |     `0x40800`     |               |
    |  0x108  |       0x100       |               |
    |  0x100  |     `0x40500`     | <------ ***$rsp*** |
    | 0x40500 | ***pop rdi; ret;*** |               |
    | 0x40800 | ***pop rsi; ret;*** |               |
    | 0x40990 | ***pop rdx; ret*** |               |
    
    
    

3. 當主函數執行 ***ret*** 時，也就是 
***pop $rip;*** 
***$rsp + 8;***
    
    > 可以看到 ***$rsp*** 變成指向 stack 中下一個元素 並且把原本儲存在 ***$rsp*** 中的 *value* 放進 ***$rip***
   
   ***$rip*** = `0x40500`
   * ***$rsp*** = 0x108
   * ***$rdi*** = 
   * ***$rsi*** = 
   * ***$rdx*** =
    
    | Address |    ...........     | <------ ***RBP***  |
    |:-------:|:------------------:|:--------------:|
    |  0x128  |       0x300        |                |
    |  0x120  |     `0x40990`      |                |
    |  0x118  |       0x200        |                |
    |  0x110  |     `0x40800`      |                |
    |  0x108  |       0x100        | <------ ***$rsp*** |
    |  0x100  |     `0x40500`      |                |
    | 0x40500 | ***pop $rdi; ret;*** | <------ ***$rip*** |
    | 0x40800 | ***pop $rsi; ret;*** |                |
    | 0x40990 | ***pop $rdx; ret;*** |                |
    
3. 接著程式就會繼續執行 ***pop $rdi; ret;***
也就是 ***pop rdi;*** ***pop $rip;***，我們一步一步來先執行 ***pop rdi;*** 執行完後就會像下面這樣
    * ***$rip*** = 0x40500
    * ***$rsp*** = 0x110
    * ***$rdi*** = 0x100
    * ***$rsi*** = 
    * ***$rdx*** =
 
 
 
    | Address |    ...........     | <------ ***$rbp*** |
    |:-------:|:------------------:|:--------------:|
    |  0x128  |       0x300        |                |
    |  0x120  |     `0x40990`      |                |
    |  0x118  |       0x200        |                |
    |  0x110  |     `0x40800`      | <------ ***$rsp*** |
    |  0x108  |       0x100        |                |
    |  0x100  |     `0x40500`      |                |
    | 0x40500 | ***pop $rdi; ret;*** | <------ ***$rip*** |
    | 0x40800 | ***pop $rsi; ret;*** |                |
    | 0x40990 | `pop $rdx;` `ret`  |                |

3. 接著繼續執行 ***ret;*** 也就是 ***pop $rip;*** 執行完後就會像下面這樣
    * ***$rip*** = 0x40800
    * ***$rsp*** = 0x118
    * ***$rdi*** = 0x100
    * ***$rsi*** = 
    * ***$rdx*** =
 
 
    | Address |    ...........     | <------ ***$rbp*** |
    |:-------:|:------------------:|:--------------:|
    |  0x128  |       0x300        |                |
    |  0x120  |     `0x40990`      |                |
    |  0x118  |       0x200        | <------ ***$rsp*** |
    |  0x110  |     `0x40800`      |                |
    |  0x108  |       0x100        |                |
    |  0x100  |     `0x40500`      |                |
    | 0x40500 | ***pop $rdi; ret;*** |                |
    | 0x40800 | ***pop $rsi; ret;*** | <------ `$rip` |
    | 0x40990 | ***pop $rdx; ret;*** |                |




3.  接著繼續執行 ***pop $rsi; ret;***，那就跟前面的操作一樣，我就不多解釋，可以指令搭配圖表理解。執行完 ***pop $rsi; ret;*** 的 ***pop $rsi;*** 後 
    * ***$rip*** = 0x40800
    * ***$rsp*** = 0x120
    * ***$rdi*** = 0x100
    * ***$rsi*** = 0x200
    * ***$rdx*** =

    
    | Address |    ...........     | <------ ***$rbp*** |
    |:-------:|:------------------:|:--------------:|
    |  0x128  |       0x300        |                |
    |  0x120  |     `0x40990`      | <------ ***$rsp*** |
    |  0x118  |       0x200        |                |
    |  0x110  |     `0x40800`      |                |
    |  0x108  |       0x100        |                |
    |  0x100  |     `0x40500`      |                |
    | 0x40500 | ***pop $rdi; ret;*** |                |
    | 0x40800 | ***pop $rsi; ret;*** |  <-----***$rip***  |
    | 0x40990 | ***pop $rdx; ret;*** |               |
    
3.  執行完 ***pop $rsi; ret;*** 的 ***ret;*** 後
    * ***$rip*** = 0x40990
    * ***$rsp*** = 0x128
    * ***$rdi*** = 0x100
    * ***$rsi*** = 0x200
    * ***$rdx*** =

    
    | Address |    ...........     | <------ ***$rbp*** |
    |:-------:|:------------------:|:--------------:|
    |  0x128  |       0x300        | <------ ***$rsp*** |
    |  0x120  |     `0x40990`      |                |
    |  0x118  |       0x200        |                |
    |  0x110  |     `0x40800`      |                |
    |  0x108  |       0x100        |                |
    |  0x100  |     `0x40500`      |                |
    | 0x40500 | ***pop $rdi; ret;*** |                |
    | 0x40800 | ***pop $rsi; ret;*** |                |
    | 0x40990 | ***pop $rdx; ret;*** |  <-----***$rip***  |
    
3.  執行完 ***pop $rsi; ret;*** 的 ***ret;*** 後
    * ***$rip*** = 0x40990
    * ***$rsp*** = 0x128
    * ***$rdi*** = 0x100
    * ***$rsi*** = 0x200
    * ***$rdx*** =

    
    | Address |    ...........     | <------ ***$rbp*** |
    |:-------:|:------------------:|:--------------:|
    |  0x128  |       0x300        | <------ ***$rsp*** |
    |  0x120  |     `0x40990`      |                |
    |  0x118  |       0x200        |                |
    |  0x110  |     `0x40800`      |                |
    |  0x108  |       0x100        |                |
    |  0x100  |     `0x40500`      |                |
    | 0x40500 | ***pop $rdi; ret;*** |                |
    | 0x40800 | ***pop $rsi; ret;*** |                |
    | 0x40990 | ***pop $rdx; ret;*** |  <-----***$rip***  |
    
    
3.  從前面的例子我們可以知道 ***pop $rdx; ret;*** 的這樣一個 ***pattern*** 其實就是把目前 ***$rsp*** 所儲存的 ***data*** 放進 ***$rdx***，然後 ***$rsp + 8*** 儲存的 ***data*** 放進 ***$rip***

    > 用程式碼表達的話就像下面這樣
    ```c
    pop $register; 
    // $register = $rsp; 然後$rsp 指到 stack 的下一個元素，就是資料結構 stack 的 pop 基本操作
    ret; 
    // $rip = $rsp
    ```
    > 執行完 ***pop $rdx; ret;*** 之後，因為我們沒有繼續控制 ***$rip*** 的關係，所以他跑掉了，不過我們已經達成我們的目的了，現在所有暫存器(***$rdi*** ***$rsi*** ***$rdx***)，都已經塞入我們想要的數值了
    
    * ***$rip*** = 0x40990
    * ***$rsp*** = 0x128
    * ***$rdi*** = 0x100
    * ***$rsi*** = 0x200
    * ***$rdx*** = 0x300

    | Address |    ...........     | <------ `$rbp`<------ ***$rsp*** |
    |:-------:|:------------------:|:--------------:|
    |  0x128  |       0x300        |  |
    |  0x120  |     `0x40990`      |                |
    |  0x118  |       0x200        |                |
    |  0x110  |     `0x40800`      |                |
    |  0x108  |       0x100        |                |
    |  0x100  |     `0x40500`      |                |
    | 0x40500 | ***pop $rdi; ret;*** |                |
    | 0x40800 | ***pop $rsi; ret;*** |                |
    | 0x40990 | ***pop $rdx; ret;*** |    |


















不斷的使用 ***ret*** 結尾的 ***gadget*** 控制 ***RIP*** 的位置，就是整個 ***ROP attack*** 的精神，從這個想法又可以往外延伸出不同的攻擊手法 ***ret2xxx*** 系列的方法都是 ***ROP*** 的延伸手法

> 一般可以使用 [ROPgadget](https://github.com/JonathanSalwan/ROPgadget)　來找 gadget

> 也可以使用 [onegadget](https://github.com/david942j/one_gadget)就不需要串 ROP，但他會有條件

## Ret2Libc

> 雖然 ROP 看起來相當萬能，但我們大部份好用的 gadget 都放在動態連結庫(***libc.so***)裡面，然後大部分程式都是 Dynamic Linking 的關係，我們的 Program 必須載入到 Memory 才會知道動態連結庫的位置，然後又因為 ASLR，每次動態庫的 Base 都會不一樣，所以我們需要先 Leak 出 Libc 的位置，這個方法就叫做 ret2libc

Ret2libc = leak libc base address + ROP


## Libc offset

> 一直忘記

```c=
readelf -s libc.so.6 | grep <function>
```
