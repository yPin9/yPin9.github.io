---
title : Difference between **var and *var[] in IDA
date : '2026-01-29'
tags: CS
---


---


## 為什麼會有這篇文

> 我之前一直認為 **C 語言的 array 是一種 pointer**，但前幾天用 ida 改變數結構的時候發生了一些有趣的問題。


有一個 ***register_books*** 的 *function*，功能是什麼不重要，裡面有一個變數 ***book_list***，明顯型態不對

```C
int register_books()
{
  void **v1; // rbx
  void **v2; // rbx
  int i; // [rsp+Ch] [rbp-14h]

  for ( i = 0; i <= 9 && *(&book_list + i); ++i )
    ;
  if ( i == 10 )
    return puts("Can't register more books!");
  *(&book_list + i) = malloc(0x20uLL);
  memset(*(&book_list + i), 0, 0x20uLL);
  printf("Book No.: ");
  __isoc99_scanf("%lld", *(&book_list + i));
  printf("Book Price: ");
  __isoc99_scanf("%lld", (char *)*(&book_list + i) + 8);
  printf("Book Author: ");
  v1 = (void **)((char *)*(&book_list + i) + 16);
  *v1 = malloc(0x30uLL);
  __isoc99_scanf("%29s", *((_QWORD *)*(&book_list + i) + 2));
  printf("Book Title: ");
  v2 = (void **)((char *)*(&book_list + i) + 24);
  *v2 = malloc(0x30uLL);
  __isoc99_scanf("%29s", *((_QWORD *)*(&book_list + i) + 3));
  return printf("This book is registered at index %d\n", i);
}
```

根據邏輯逆推型態應該長以下這樣，然後套用到 ***book_list***

```C
00000000 struct __fixed books // sizeof=0x20
00000000 {
00000000     __int64 no;
00000008     __int64 price;
00000010     char *author;
00000018     char *title;
00000020 };

```

套用後長這樣

```c
int register_books()
{
  char **p_author; // rbx
  char **p_title; // rbx
  int i; // [rsp+Ch] [rbp-14h]

  for ( i = 0; i <= 9 && *(&book_list + i); ++i )
    ;
  if ( i == 10 )
    return puts("Can't register more books!");
  *(&book_list + i) = (books *)malloc(0x20uLL);
  memset(*(&book_list + i), 0, sizeof(books));
  printf("Book No.: ");
  __isoc99_scanf("%lld", *(&book_list + i));
  printf("Book Price: ");
  __isoc99_scanf("%lld", &(*(&book_list + i))->price);
  printf("Book Author: ");
  p_author = &(*(&book_list + i))->author;
  *p_author = (char *)malloc(0x30uLL);
  __isoc99_scanf("%29s", (*(&book_list + i))->author);
  printf("Book Title: ");
  p_title = &(*(&book_list + i))->title;
  *p_title = (char *)malloc(0x30uLL);
  __isoc99_scanf("%29s", (*(&book_list + i))->title);
  return printf("This book is registered at index %d\n", i);
}
```

看起來好很多了，可以發現他有個 i 去選擇是哪本書，所以應該是一個陣列

目前的形態是 ***struct books *book_list***，所以把型態改成 *pointer to pointer* 就可以變好看了，**然而事情並不是這樣的**。

可以看到下面修改後的結果，結構壞了

```C
int register_books()
{
  books **v1; // rbx
  books **v2; // rbx
  int i; // [rsp+Ch] [rbp-14h]

  for ( i = 0; i <= 9 && (&book_list)[i]; ++i )
    ;
  if ( i == 10 )
    return puts("Can't register more books!");
  (&book_list)[i] = (books **)malloc(0x20uLL);
  memset((&book_list)[i], 0, 0x20uLL);
  printf("Book No.: ");
  __isoc99_scanf("%lld", (&book_list)[i]);
  printf("Book Price: ");
  __isoc99_scanf("%lld", (&book_list)[i] + 1);
  printf("Book Author: ");
  v1 = (&book_list)[i] + 2;
  *v1 = (books *)malloc(0x30uLL);
  __isoc99_scanf("%29s", (&book_list)[i][2]);
  printf("Book Title: ");
  v2 = (&book_list)[i] + 3;
  *v2 = (books *)malloc(0x30uLL);
  __isoc99_scanf("%29s", (&book_list)[i][3]);
  return printf("This book is registered at index %d\n", i);
}
```


但如果使用 ***struct books \*book_list[]*** 而不是 ***struct books \*\*book_list***，就可以正確的 *parse* 出 *book_list* 的結構 


```C
int register_books()
{
  char **p_author; // rbx
  char **p_title; // rbx
  int i; // [rsp+Ch] [rbp-14h]

  for ( i = 0; i <= 9 && book_list[i]; ++i )
    ;
  if ( i == 10 )
    return puts("Can't register more books!");
  book_list[i] = (struct books *)malloc(0x20uLL);
  memset(book_list[i], 0, sizeof(struct books));
  printf("Book No.: ");
  __isoc99_scanf("%lld", book_list[i]);
  printf("Book Price: ");
  __isoc99_scanf("%lld", &book_list[i]->price);
  printf("Book Author: ");
  p_author = &book_list[i]->author;
  *p_author = (char *)malloc(0x30uLL);
  __isoc99_scanf("%29s", book_list[i]->author);
  printf("Book Title: ");
  p_title = &book_list[i]->title;
  *p_title = (char *)malloc(0x30uLL);
  __isoc99_scanf("%29s", book_list[i]->title);
  return printf("This book is registered at index %d\n", i);
}
```




>在回到標題的問題之前，我們先複習一下 pointer to pointer 和 array of pointer 在組合語言的差異

考慮以下程式碼

```C
#include <stdio.h>

int main() {
    int arrayA[10];
    int *pointerA;
    printf("size of arrayA is %d\n",sizeof(arrayA));
    printf("size of pointerA is %d",sizeof(pointerA));
}

/*
Output
size of arrayA is 40
size of pointerA is 8
*/
```
* ***arrayA*** 是一塊連續的記憶體空間


* ***pointerA*** 是存放某個位置的變數



這沒有問題，當初學 C 語言的時候，這兩個概念也都是在兩個不同的章節裡，但是學到後面會看到類似這樣的概念

* 陣列的變數名稱(***arrayA***)代表「指向第一個元素的指標」
* 所以 **\*(arrayA + 1)** 等價於 **array[1]**

> 因為不完整的知識，讓我以為在所有的情況下 array 都可以當作指標操作

實際上 **\*(arrayA + 1)** 等價於 **array[1]** 是一種語法糖，並不代表他們的型別/型態是一樣的(*其實顯而易見，只是我以為在所有地方都可以這樣交換身份操作*)
{{< quote >}} 
從組合語言的角度可以更清楚看到這兩個型別的差異
{{< /quote >}} 
高階語言如下

```C
int x = 123;
int *p = &x;
```

會編譯成以下組語

```asm
lea rax, [rbp-4]    ; //&x
mov QWORD PTR [rbp-16], rax  ; //p = &x
```

用兩種不同的方式去賦值

```C
int a[10];
a[1] = 1;
*(a+ 2) = 2;
```

```asm
mov     DWORD PTR [%rbp-60], 1 //a[1] = 1

lea     %rax, [%rbp-64] // a
add     %rax, 8 //a+2
mov     DWORD PTR [%rax],2 // *(a+2) = 2
```

* 根據上面的例子可以很清楚看到 ***a[1] = 1*** 直接取值，一次到位
* 而 ***\*(a+2) = 2*** 需要先定到 ***a[]*** 的位置加上偏移，在取值，總共取兩次

> 就是這樣的差異導致 ida 的 Decompiler 出現問題

回到前面 **book_list** 也就是我遇到的問題

假設 **book_list** 是一個全域變數，位於地址 0x400000

1. 當定義為 ***pointer to pointer*** (*struct books \*\*book_list*)

    * ***pointer to pointer*** 是一個**變數**，它需要佔用記憶體空間來**存放另一個地址**
    * 在 ***0x400000*** 的位置，存放著另一個地址（例如 ***0x500000***才是真正的陣列開頭）
    * 要拿到第 *i* 本書，*CPU* 必須做**兩次記憶體讀取**
        * 去 ***0x400000*** 讀取數值（拿到 ***0x500000***）。
        * 去 ***0x500000 + i\*8*** 讀取數值（拿到第 *i* 本書的結構指標）。

但在這個 *Binary* 中，指令並沒有做第一次讀取。程式碼直接把 ***0x400000*** 當作陣列的開頭來用

在 *IDA* 中設定為 *Pointer to pointer*後，IDA 發現組合語言其實是直接對 ***0x400000*** 進行偏移存取（Offset access）時，IDA 的反編譯器會試圖修復這個邏輯衝突：



>「使用者說這是一個 Pointer（代表數值在別的地方），但組語指令卻直接操作這個變數本身的地址。好吧，那我只好用 &book_list 來表示操作的是**指標變數本身的地址**，而不是它指向的目標」

2. 當定義為 *Array* (***struct books \*book_list[]***)

    * 陣列是一個**標籤**，它標記了**一塊連續的記憶體空間**
    * *0x400000* 就是陣列的第一個元素
    * 要拿到第 *i* 本書，*CPU* 只需要做一次
    * 直接計算 ***0x400000 + i\*8***
    * 讀取該處數值

*IDA Decompiler* 發現這完全符合組語的行為，所以 *IDA* 會生成乾淨的 ***book_list[i]***


#### 為什麼 IDA 會產生 (&book_list)[i]？

> 為什麼 IDA 沒辦法產出正確的程式碼？

這其實是 *IDA* 的一種***機制***

我們告訴 *IDA* ***book_list*** 是一個 ***struct books \*\*（Pointer）*** 結構
* 存取它應該要先讀取它指向的地址，再進行偏移（*Load -> Offset -> Load*）

實際上組合語言直接對 ***book_list*** 的地址進行**偏移再存取**（*Offset -> Load*）。這代表 ***book_list*** 在組語層級上其實是一個**陣列**

當這兩者衝突時，*IDA* 為了讓 ***Type* 定義（*Pointer*）在邏輯上成立，同時又要符合組語的行為**（*Array*），它只好把這個 *Pointer* 變數**降級**使用

> 不讀取 *Pointer* 裡面的值，而是取 *Pointer* 變數自己在記憶體中的地址 ***(&book_list)***，並把它當成陣列的起點


* ***book_list[i]***：去讀 ***book_list*** 指向的地方（*Pointer*）。

* ***(&book_list)[i]***：把 ***book_list*** 本身所在的記憶體當成陣列（*Array*）。

在逆向時，如果看到 ***(&var)[i]*** 這種寫法，通常代表把一個 *Array* 誤判成了 *Pointer*。只要把型態改回 ***Type \*var[]*** 就可以了








