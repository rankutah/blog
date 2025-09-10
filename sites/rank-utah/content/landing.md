---
title: "landing"
layout: "flowbite"
url: "/landing/"
draft: false
markup: goldmark
faq:
  items:
    - title: "What is Flowbite?"
      expanded: false
      content: |
        Flowbite is an open-source library built on Tailwind. Read the [intro](/docs/getting-started/introduction/).
    - title: "Is there a Figma file?"
      content: |
        Yes. See the [Figma design system](https://flowbite.com/figma/).
    - title: "Flowbite vs Tailwind UI?"
      content: |
        Flowbite is MIT; Tailwind UI is paid. Many people use both. 
        - [Flowbite Pro](https://flowbite.com/pro/)
        - [Tailwind UI](https://tailwindui.com/)
---

{{< section img="../media/mountain.jpg" bleed="true" overlay="true" overlayShade="bg-black/40" imgStyle="height: 50vh" yBottom="md" align="center" spacer="false" >}}
# Website Design in Utah County {.text-white}



Professional business websites. Custom built from scratch. {{<button text="Pick 2 Colors">}}
{.text-white}
{{< /section >}}

{{< section >}}
## Pick 2 Colors
{{< /section >}}

{{< section render="raw" >}}
{{< color-picker >}}
{{< /section >}}

{{< section >}}
Sites are [custom built](https://rankutah.com) to match your brand. Simply use the toggles and pick your colors.

{{< button text="Book Now" url="/contact/" >}}
{{< /section >}}

{{< section render="raw" max="sm">}}
{{< carousel id="hero" radius="md" images="../media/mountain.jpg,../media/carwash.jpg,../media/mountain.jpg" height="h-80 md:h-[34rem]" interval="4000" >}}
{{< /section >}}

{{< section render="raw" pad="none" align="center">}}

{{< cols min="18rem" gap="4rem" row="none">}}

{{<col render="raw">}}
  {{< carousel id="hero" radius="none" images="../media/mountain.jpg,../media/carwash.jpg,../media/mountain.jpg" height="h-80 md:h-[34rem]" interval="4000" >}}
{{</col>}}

{{<col>}}
## heading

Ther is a lot more text under thisTher is a lot more text under this
Ther is a lot more text under this
Ther is a lot more text under thisTher is a lot more text under this
Ther is a lot more text under this
Ther is a lot more text under thisTher is a lot more text under this
Ther is a lot more text under this
Ther is a lot more text under thisTher is a lot more text under this
Ther is a lot more text under this
Ther is a lot more text under this

This is a **bold** part with a [link](https://)
{{</col>}}


{{</cols>}}

{{</section>}}




{{< section>}}
## This is an H2 heading 
{.center}

{{< button text="hello" url="/landing/" >}} 
{.center}

This is another test 
{.center}

### This is an H3

Numbered list

1. One is the **bolb** way
2. Two is the [link](/test/) test
3. Inline button? {{< button text="What in the world" url="/landing/" >}}
4. Three

How about simple **bold** text — what is [going](https://rankutah.com) on?

{{< button text="Get Started" url="/landing/" >}}

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

{{< section align="center" >}}
## Centered block

Everything inside is centered, but Typography remains unchanged. This is a nother thing of text. Common to the end.

{{< button text="New Peace" url="/test/" >}}
{{< /section >}}

{{< section align="left" >}}
{{< cols min="18rem" gap="4rem" row="none" >}}

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

{{< section align="center">}}
{{< cols min="18rem" gap="2rem">}}

{{< col card="true" >}}
## Carded tile

This tile uses your site’s card style.

{{< button text="Contact us" url="/contact/" >}}
{{< /col >}}

{{< col card="true" >}}
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

This should render as Markdown, **bold**, *italics*, [links](link.com), etc.

{{< cols min="18rem" gap="2rem" >}}

{{< col card="true" bg="rose-100" darkbg="rose-900" >}}
### Carded tile

A paragraph in a card.

{{< button text="Contact us" url="/contact/" >}}
{{< /col >}}

{{< col url="test.com" >}}
### Plain tile

Just Markdown in a normal tile.
{{< /col >}}

{{< /cols >}}


More **Markdown** below the grid should render too.

## Contact Us {.center}

We typically reply within one business day. {.center}
{{< /section >}}

{{< section render="raw" >}}
{{< cols render="raw" min="18rem" gap="2rem" >}}

{{< col render="raw" >}}
## Contact Us

We typically respond within one business day.
{{< /col >}}

{{< col >}}
## This is markdown
{{< /col >}}

{{< /cols >}}
{{< /section >}}

{{< section >}}
## This will render {.center}

This will be the message above the form {.center}

This is an inline phone: {{< icon name="phone" >}}

This is an inline message: {{< icon name="message" >}}

This is some more ✓ text. ✅

Another {{< icon name="check" >}} box {{< icon name="check" >}} Everything you ever want {{< icon name="check" >}} Everything you ever need

## Call Now

- Works with text
- Another point
- [Great Value](test.com)
- Good for pieces
- Pineapples
{{< /section >}}
