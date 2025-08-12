---
title:   "landing"
layout:  "flowbite"
url:     "/landing/"
draft:   false
markup: goldmark
---

{{< section >}}
## This is an H2 heading 
{.center}

[button](test.com)
{.btn .center}

This is another test
{.center}

### This is an H3

Numbered list
1. One
2. Two 
3. Three

{{< button
    text="What in the world"
    url="/landing/"
>}}

How about simple **bold** text

what is [going]("https://rankutah.com") on?

{{< button-outline
    text="Get Started"
    url="/landing/"
>}}

- This is some markdown
- Another list
- And again

![image](../media/carwash.jpg){.mx-auto}

{{< img
    src="../media/carwash.jpg"
    width="100"
>}}

{{< /section >}}



{{< section >}}
## Default section
Body copy uses the page’s `.prose` styles. This only sets width/padding.
1. This is another type of content
2. And another
{{< /section >}}

{{< section align="center" y="md" >}}
## Centered block

Everything inside is centered, but Typography remains unchanged.

This is a nother thing of text. Common to the end. 

{{< button text ="New Peace" url = "/test/" >}}

{{< /section >}}

{{< section align="left">}}
{{< cols min="18rem" gap="2rem" >}}
  {{< col >}}  
  ## A title
  Some text…
  ![image](../media/carwash.jpg)
  {{< /col >}}
  
  {{< col >}}
  ## Another major text
  More text...
  {{< /col >}}
  {{< col >}}
  ## This is what needs to happen
  When you need to do this, do it
  
  {{< button text="CTA" url="/contact/" >}}
  {{< /col >}}

  {{< col >}}
  ## This is what needs to happen 

  List of things

  1. one
  2. two
  3. three
  



  When you need to do this, do it
  {.text-center} 
  
  
  {{< button text="CTA" url="/contact/" >}}
  {.text-center}

  {{< /col >}}

{{< /cols >}}

{{< /section >}}


{{<section>}}

{{< cols min="18rem" gap="2rem" >}}
  {{< col card="true" >}}
  ## Noteworthy technology acquisitions 2021
  Here are the biggest enterprise technology acquisitions of 2021 so far, in reverse chronological order.
  
  [This is a link]("https://rankutah.com")
  
  {{< button text="CTA" url="/contact/" >}}
  {{< /col >}}
  
  {{< col card="true" url="/posts/noteworthy/" >}}
  ### Clickable card
  Short teaser…
  {{< /col >}}

{{< /cols >}}

{{</section>}}