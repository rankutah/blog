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


{{< section >}}

# This is an H1 heading 
{.center}

{{< button text="hello" url="/landing/">}}
{.btn .center}

This is another test
{.center}

### This is an H3

Numbered list
1. One is the **bolb** way
2. Two is the [link](/test/) test
3. Inline button? {{<button>}} {{<button-outline text="Button" >}} is the way? 
4. Three

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
{{< cols min="18rem" gap="4rem" >}}
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
  {{< button-outline text="CTA" url="/contact/" >}}
  {.center}
  {{< /col >}}

  {{< col>}}
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


{{< section align="left" >}}

{{< cols min="18rem" gap="2rem" >}}

  {{< col >}}
  ## Carded tile
  This tile uses your site’s card style.
  
  {{< button text="Contact us" url="/contact/" >}}
  {{< /col >}}

  {{< col >}}
  ## Plain tile
  This one is not a card. It just renders your Markdown normally.
  {{< /col >}}

  {{< col card="true" url="/services/" >}}
  ## Linked card
  Clicking anywhere in this card goes to **/services/**.
  {{< /col >}}

{{< /cols >}}

{{< /section >}}



{{< section >}}

## A heading outside the grid
This should render as Markdown, **bold**, *italics*, links, etc.

{{< cols min="18rem" gap="2rem" >}}

  {{< col >}}
  ### Carded tile
  A paragraph in a card.
  {{< button text="Contact us" url="/contact/" >}}
  {{< /col >}}

  {{< col>}}
  ### Plain tile
  Just Markdown in a normal tile.
  {{< /col >}}

{{< /cols >}}

More **Markdown** below the grid should render too.

{{< /section >}}
