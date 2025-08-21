---
title:   "landing"
layout:  "flowbite"
url:     "/landing/"
draft:   false
markup: goldmark
faq:
  items:
    - title: "What is Flowbite?"
      expanded: false
      content: |
        Flowbite is an open-source library built on Tailwind. Read the
        [intro](/docs/getting-started/introduction/).
    - title: "Is there a Figma file?"
      content: |
        Yes. See the [Figma design system](https://flowbite.com/figma/).
    - title: "Flowbite vs Tailwind UI?"
      content: |
        Flowbite is MIT; Tailwind UI is paid. Many people use both.

        - [Flowbite Pro](https://flowbite.com/pro/)
        - [Tailwind UI](https://tailwindui.com/)
---
{{% section classes="border-4 border-rose-500 p-6 rounded-lg" %}}
**Hello** from Section 👋

This should be bold, and tags should NOT print.
{{% /section %}}



{{< ui name="ping" >}}{{< /ui >}}


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




{{< ui name="faq" id="faq" param="faq.items" >}}{{< /ui >}}




{{< ui name="button" text="Primary Action" url="/contact/" >}}{{< /ui >}}

{{< ui name="button" text="Secondary" url="/about/" variant="outline" >}}{{< /ui >}}

{{< ui name="button" text="Primary" url="/about/" variant="solid" >}}{{< /ui >}}


{{< ui name="section" max="2xl" py="xl" >}}
  {{< ui name="grid" min="18rem" gap="2rem" ji="center" ai="stretch" >}}

    {{< ui name="stack" gap="sm" align="center" >}}
    ### Service One
    ![Logo](/static/media/logo1.png){.self-center width="96"}
    Quick blurb about value.
    {{< ui name="button" text="Learn more" url="/service-1/" >}}{{< /ui >}}
    {{< /ui >}}

    {{< ui name="stack" gap="sm" align="center" >}}
    ### Service Two
    ![Logo](/static/media/logo2.png){.self-center width="96"}
    Another small blurb.
    {{< ui name="button" variant="outline" text="See details" url="/service-2/" >}}{{< /ui >}}
    {{< /ui >}}

    {{< ui name="stack" gap="sm" align="center" >}}
    ### Service Three
    ![Logo](/static/media/logo3.png){.self-center width="96"}
    Third thing clients love.
    {{< ui name="button" text="Get started" url="/service-3/" >}}{{< /ui >}}
    {{< /ui >}}

  {{< /ui >}}
{{< /ui >}}